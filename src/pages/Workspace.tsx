import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Camera, CameraOff, Play, Pause, RotateCcw, Send, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Toggle } from '../components/Toggle';
import { Input } from '../components/Input';
import { cn } from '../utils/cn';
import { SUPPORTED_SIGN_LANGUAGES } from '../constants/languages';
import { useAppData } from '../context/AppDataContext';
import { loadModel, isModelAvailable, classify } from '../utils/inference';

const COMMIT_CONFIDENCE = 0.8;
const COMMIT_WINDOW = 10;
const COMMIT_MIN_HITS = 8;
const SUPPRESS_MS = 1500;

type Mode = 'sign-to-text' | 'text-to-sign';

interface TranscriptEntry {
  id: number;
  time: string;
  text: string;
  conf?: number;
  direction: 'outbound' | 'inbound' | 'meta';
}

const now = () => new Date().toLocaleTimeString('en-US', { hour12: false });

function makeSessionStart(code: 'ISL' | 'ASL' | 'BSL'): TranscriptEntry[] {
  return [
    { id: Date.now(), time: now(), text: `Session started · ${code} engine ready`, direction: 'meta' },
  ];
}

export function Workspace() {
  const { state, addHistoryEntry, incrementReports } = useAppData();
  const [mode, setMode] = useState<Mode>('sign-to-text');
  const [activeLanguage, setActiveLanguage] = useState<'ISL' | 'ASL' | 'BSL'>(state.user.primaryLanguage);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const [live, setLive] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(() => makeSessionStart(state.user.primaryLanguage));
  const [inputText, setInputText] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [liveConfidence, setLiveConfidence] = useState<number | null>(null); // rounded %, not 0-1
  const lastConfPctRef = useRef<number | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const recentLabelsRef = useRef<string[]>([]);
  const suppressRef = useRef<{ label: string; until: number } | null>(null);
  const speakerOnRef = useRef(speakerOn);
  const activeLanguageRef = useRef(activeLanguage);
  const liveRef = useRef(live);

  useEffect(() => {
    setActiveLanguage(state.user.primaryLanguage);
  }, [state.user.primaryLanguage]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  useEffect(() => { speakerOnRef.current = speakerOn; }, [speakerOn]);
  useEffect(() => { activeLanguageRef.current = activeLanguage; }, [activeLanguage]);
  useEffect(() => { liveRef.current = live; }, [live]);

  // Load the (ASL-only) classifier model once; UI shows "model unavailable" if this fails.
  useEffect(() => {
    loadModel().then(setModelReady);
  }, []);

  const commitDetection = useCallback((label: string, confidence: number) => {
    const conf = Math.round(confidence * 100);
    setTranscript(prev => [
      ...prev,
      { id: Date.now(), time: now(), text: label, conf, direction: 'outbound' },
    ]);
    addHistoryEntry({
      text: label,
      type: 'sign-to-text',
      conf,
      languageCode: activeLanguageRef.current,
    });
    if (speakerOnRef.current) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(label));
    }
  }, [addHistoryEntry]);

  // Debounce/commit: a detection only lands in the transcript once it's confident AND stable
  // across recent frames, then the same label is suppressed briefly to avoid re-committing it.
  const handleDetection = useCallback((result: { label: string; confidence: number } | null) => {
    if (!result) {
      setLiveConfidence(null);
      return;
    }
    setLiveConfidence(result.confidence);

    const recent = recentLabelsRef.current;
    recent.push(result.label);
    if (recent.length > COMMIT_WINDOW) recent.shift();

    const nowMs = Date.now();
    const suppressed = suppressRef.current;
    if (suppressed && suppressed.label === result.label && nowMs < suppressed.until) return;

    const hits = recent.filter((l) => l === result.label).length;
    if (result.confidence >= COMMIT_CONFIDENCE && hits >= COMMIT_MIN_HITS) {
      commitDetection(result.label, result.confidence);
      suppressRef.current = { label: result.label, until: nowMs + SUPPRESS_MS };
      recentLabelsRef.current = [];
    }
  }, [commitDetection]);

  // Kept in a ref so the landmarker effect below doesn't have to depend on it (its identity
  // changes every commit, since it closes over addHistoryEntry from context) and tear the
  // HandLandmarker down/rebuild it after every committed sign.
  const handleDetectionRef = useRef(handleDetection);
  useEffect(() => { handleDetectionRef.current = handleDetection; }, [handleDetection]);

  // Camera: start/stop the actual media stream when the toggle flips.
  useEffect(() => {
    if (!cameraOn || mode !== 'sign-to-text') return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    const videoEl = videoRef.current;

    navigator.mediaDevices.getUserMedia({ video: true })
      .then((s) => {
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        stream = s;
        setCameraError(null);
        if (videoEl) videoEl.srcObject = s;
      })
      .catch((err) => {
        setCameraError(err.name === 'NotAllowedError' ? 'Camera permission denied.' : 'Could not access camera.');
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      if (videoEl) videoEl.srcObject = null;
    };
  }, [cameraOn, mode]);

  // Landmarks + classification: run a HandLandmarker over the live video while the camera is on.
  useEffect(() => {
    if (!cameraOn || mode !== 'sign-to-text') return;
    let cancelled = false;

    FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
    ).then((vision) =>
      HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        },
        numHands: 1,
        runningMode: 'VIDEO',
      })
    ).then((landmarker) => {
      if (cancelled) { landmarker.close(); return; }
      handLandmarkerRef.current = landmarker;

      const loop = () => {
        const video = videoRef.current;
        if (video && video.readyState >= 2 && liveRef.current && isModelAvailable()) {
          const result = landmarker.detectForVideo(video, performance.now());
          const hand = result.landmarks[0];
          handleDetectionRef.current(hand ? classify(hand) : null);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    }).catch((err) => {
      console.error('inference: failed to init HandLandmarker', err);
    });

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      handLandmarkerRef.current?.close();
      handLandmarkerRef.current = null;
    };
  }, [cameraOn, mode]);

  const sendText = () => {
    if (!inputText.trim()) return;
    const clean = inputText.trim();

    setTranscript(prev => [
      ...prev,
      { id: Date.now(), time: now(), text: clean, direction: 'inbound' },
    ]);
    addHistoryEntry({
      text: clean,
      type: mode,
      conf: mode === 'sign-to-text' ? 98 : undefined,
      languageCode: activeLanguage,
    });

    setInputText('');
    setTimeout(() => {
      setTranscript(prev => [
        ...prev,
        { id: Date.now() + 1, time: now(), text: 'Text-to-sign output queued…', direction: 'meta' },
      ]);
    }, 600);
  };

  const sendReport = () => {
    incrementReports();
    setReportSent(true);
    setTimeout(() => { setReportOpen(false); setReportSent(false); setReportText(''); }, 1800);
  };

  const resetSession = () => {
    setTranscript(makeSessionStart(activeLanguage));
  };

  return (
    <div className="flex flex-col h-[calc(100svh-3.5rem)] gap-4 p-4 md:p-6 max-w-7xl mx-auto">

      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Toggle
            checked={mode === 'text-to-sign'}
            onChange={(c) => setMode(c ? 'text-to-sign' : 'sign-to-text')}
            label={mode === 'sign-to-text' ? 'Sign → Text' : 'Text → Sign'}
          />
          <div className="hidden sm:block h-5 w-px bg-border" />
          <select
            value={activeLanguage}
            onChange={(e) => setActiveLanguage(e.target.value as 'ISL' | 'ASL' | 'BSL')}
            className="h-8 rounded-md border border-border bg-surface-alt text-sm px-3 text-text-primary outline-none focus:border-primary"
            aria-label="Sign language"
          >
            {SUPPORTED_SIGN_LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>{language.label}</option>
            ))}
          </select>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setReportOpen(true)}
          className="gap-2"
        >
          <AlertTriangle size={14} /> Report error
        </Button>
      </div>

      {/* Main workspace */}
      <div className="flex flex-1 flex-col lg:flex-row gap-4 min-h-0">

        {/* Camera / Avatar panel */}
        <div className="flex-1 flex flex-col gap-3 min-h-65">
          <Card padding="none" className="flex-1 relative overflow-hidden bg-[#0D0A14]">
            {mode === 'sign-to-text' ? (
              cameraOn ? (
                <>
                  <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />

                  {cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20 p-6 text-center">
                      <p className="text-sm text-error font-medium">{cameraError}</p>
                    </div>
                  )}

                  {/* Live ember indicator */}
                  {live && !cameraError && (
                    <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-black/60 backdrop-blur z-10">
                      <span className="w-2 h-2 rounded-full bg-ember ember-pulse" />
                      <span className="text-[11px] font-mono-sb text-white/80">Live</span>
                    </div>
                  )}
                  {/* Confidence badge */}
                  {!cameraError && (
                    <div className="absolute top-3 right-3 px-2.5 py-1.5 rounded-md bg-black/60 backdrop-blur z-10">
                      <span className="text-[11px] font-mono-sb text-success">
                        {liveConfidence !== null ? `${Math.round(liveConfidence * 100)}% conf.` : '— conf.'}
                      </span>
                    </div>
                  )}
                  {!modelReady && !cameraError && (
                    <div className="absolute bottom-3 left-3 px-2.5 py-1.5 rounded-md bg-black/60 backdrop-blur z-10">
                      <span className="text-[11px] font-mono-sb text-error">Model unavailable</span>
                    </div>
                  )}
                  {activeLanguage !== 'ASL' && !cameraError && (
                    <div className="absolute bottom-3 right-3 px-2.5 py-1.5 rounded-md bg-black/60 backdrop-blur z-10">
                      <span className="text-[11px] font-mono-sb text-white/70">ASL model only (demo)</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                  <div className="w-36 h-28 rounded-xl border border-border bg-surface-alt mb-5" aria-hidden="true" />
                  <p className="text-sm font-medium text-text-secondary mb-1">Camera is off</p>
                  <p className="text-xs text-text-secondary mb-4">Turn it back on to start translating.</p>
                  <Button variant="secondary" size="sm" onClick={() => setCameraOn(true)}>
                    Enable camera
                  </Button>
                </div>
              )
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                <div className="w-35 h-30 rounded-xl border border-border bg-surface-alt" aria-hidden="true" />
              </div>
            )}
          </Card>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2 p-3 bg-surface border border-border rounded-2xl">
            <Button variant="icon" size="sm" onClick={() => setMicOn(v => !v)} aria-label={micOn ? 'Mute' : 'Unmute'}>
              {micOn ? <Mic size={17} className="text-primary" /> : <MicOff size={17} />}
            </Button>
            <Button variant="icon" size="sm" onClick={() => setCameraOn(v => !v)} aria-label={cameraOn ? 'Disable camera' : 'Enable camera'}>
              {cameraOn ? <Camera size={17} className="text-primary" /> : <CameraOff size={17} />}
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button variant="icon" size="sm" onClick={() => setLive(v => !v)} aria-label={live ? 'Pause translation' : 'Resume translation'}>
              {live ? <Pause size={17} /> : <Play size={17} />}
            </Button>
            <Button
              variant="icon"
              size="sm"
              onClick={resetSession}
              aria-label="Clear session"
            >
              <RotateCcw size={17} />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Toggle
              checked={speakerOn}
              onChange={setSpeakerOn}
              label="Speak"
            />
            {speakerOn ? <Volume2 size={17} className="text-primary" /> : <VolumeX size={17} />}
          </div>
        </div>

        {/* Transcript panel */}
        <Card padding="none" className="w-full lg:w-80 xl:w-96 flex flex-col min-h-75 lg:h-auto">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-sm font-semibold">Transcript</h2>
              <p className="text-[10px] font-mono-sb text-text-secondary mt-0.5">{transcript.length} entries</p>
            </div>
            <button
              onClick={resetSession}
              className="text-xs text-text-secondary hover:text-primary transition-colors"
            >
              Clear
            </button>
          </div>

          <div
            ref={transcriptRef}
            className="flex-1 overflow-y-auto scrollbar-thin p-4 flex flex-col gap-2"
          >
            <AnimatePresence initial={false}>
              {transcript.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {entry.direction === 'meta' ? (
                    <p className="text-[11px] font-mono-sb text-text-secondary text-center py-1">
                      — {entry.text} —
                    </p>
                  ) : (
                    <div className={cn('flex flex-col', entry.direction === 'inbound' ? 'items-end' : 'items-start')}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-[10px] font-mono-sb text-text-secondary">{entry.time}</span>
                        {entry.conf && (
                          <span className="text-[10px] font-mono-sb text-success">{entry.conf}%</span>
                        )}
                      </div>
                      <div
                        className={cn(
                          'max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm',
                          entry.direction === 'inbound'
                            ? 'bg-primary text-white rounded-br-sm'
                            : 'bg-surface-alt border border-border text-text-primary rounded-bl-sm'
                        )}
                      >
                        {entry.text}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Input row */}
          <div className="p-3 border-t border-border flex gap-2 shrink-0">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendText()}
              placeholder={mode === 'sign-to-text' ? 'Enter recognized sign text…' : 'Type text for text-to-sign…'}
              className="flex-1 h-9 text-xs"
              aria-label="Translation input"
            />
            <Button
              size="sm"
              onClick={sendText}
              disabled={!inputText.trim()}
              aria-label="Send"
              className="px-3"
            >
              <Send size={15} />
            </Button>
          </div>
        </Card>
      </div>

      {/* Report Error Modal */}
      <AnimatePresence>
        {reportOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(21,18,31,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setReportOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 4 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-surface rounded-2xl border border-border p-6 shadow-[0_16px_64px_rgba(0,0,0,0.4)]"
            >
              {reportSent ? (
                <div className="text-center py-4">
                  <p className="text-success font-semibold text-lg mb-1">Report sent</p>
                  <p className="text-sm text-text-secondary">Thank you for helping us improve.</p>
                </div>
              ) : (
                <>
                  <h3 className="font-general font-semibold text-lg mb-1" style={{ fontFamily: 'var(--font-general)' }}>
                    Report incorrect translation
                  </h3>
                  <p className="text-sm text-text-secondary mb-4">
                    Describe what the output should have been.
                  </p>
                  <textarea
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    className="w-full h-28 rounded-lg border border-border bg-surface-alt p-3 text-sm outline-none focus:border-primary resize-none mb-4"
                    placeholder="e.g. 'The sign shown was 'hospital' but output was 'house'"
                    aria-label="Report description"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setReportOpen(false)}>Cancel</Button>
                    <Button size="sm" disabled={!reportText.trim()} onClick={sendReport}>Submit report</Button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}