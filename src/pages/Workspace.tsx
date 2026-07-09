import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Camera, CameraOff, Play, Pause, RotateCcw, Send, AlertTriangle, MessageSquare, Video, ChevronDown, Check, ShieldAlert } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { AvatarPlaceholder } from '../components/AvatarPlaceholder';
import { cn } from '../utils/cn';
import { SUPPORTED_SIGN_LANGUAGES } from '../constants/languages';
import { useAppData } from '../context/AppDataContext';
import { useSignDetector, type SignPrediction } from '../hooks/useSignDetector';
import type { Landmark } from '../lib/aslClassifier';

// Frames a letter must stay stable before it is committed to the word buffer.
const COMMIT_FRAMES = 8;
// Frames of no-hand before the current word is flushed to the transcript.
const FLUSH_FRAMES = 22;
// Minimum classifier confidence to accept a letter.
const MIN_CONF = 0.55;
// Below this, an accepted letter is still shown but visually flagged as an
// uncertain guess (the geometric classifier is inherently ambiguous on the
// closed-fist letter family — see docs/SIGN_DETECTION.md).
const LOW_CONF = 0.7;

type Mode = 'sign-to-text' | 'text-to-sign';

interface TranscriptEntry {
  id: number;
  time: string;
  text: string;
  conf?: number;
  lowConfidence?: boolean;
  direction: 'outbound' | 'inbound' | 'meta';
}

const now = () => new Date().toLocaleTimeString('en-US', { hour12: false });

// FIX: Removed the unused language argument completely to bypass the TS compilation block
function makeSessionStart(): TranscriptEntry[] {
  return [
    { id: Date.now(), time: now(), text: `Session started · Local translation engine responsive`, direction: 'meta' },
  ];
}

export function Workspace() {
  const { state, addHistoryEntry, incrementReports } = useAppData();
  const [mode, setMode] = useState<Mode>('sign-to-text');
  const [activeLanguage, setActiveLanguage] = useState<'ISL' | 'ASL' | 'BSL'>(state.user.primaryLanguage);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const [live, setLive] = useState(true);
  // FIX: Called cleanly without passing an unused param
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(() => makeSessionStart());
  const [inputText, setInputText] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportSent, setReportSent] = useState(false);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Live sign-detection wiring ──────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [detected, setDetected] = useState<{ letter: string; conf: number }>({ letter: '', conf: 0 });
  const [currentWord, setCurrentWord] = useState('');

  // Accumulation state kept in refs so the per-frame callback stays stable.
  const candidateRef = useRef('');
  const candidateStableRef = useRef(0);
  const lastCommittedRef = useRef('');
  const wordBufferRef = useRef('');
  const wordMinConfRef = useRef(1);
  const emptyFramesRef = useRef(0);

  const detecting = cameraOn && mode === 'sign-to-text';

  // Attach / release the webcam stream.
  useEffect(() => {
    if (!detecting) {
      setCamError(null);
      return;
    }
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setCamError(err instanceof Error ? err.message : 'Camera access denied');
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [detecting]);

  // Draw the hand bounding box + landmarks onto the overlay canvas. Box color
  // flags whether the current letter guess is confident (emerald) or
  // uncertain (ember) so the caution signal is visible right on the hand.
  const drawOverlay = useCallback((landmarks: Landmark[] | null, confident: boolean) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const w = video.videoWidth || canvas.width;
    const h = video.videoHeight || canvas.height;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    if (!landmarks) return;

    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    for (const p of landmarks) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
    const pad = 0.03;
    ctx.strokeStyle = confident ? '#10b981' : '#EA580C';
    ctx.lineWidth = Math.max(2, w * 0.004);
    ctx.strokeRect((minX - pad) * w, (minY - pad) * h, (maxX - minX + pad * 2) * w, (maxY - minY + pad * 2) * h);

    ctx.fillStyle = '#a78bfa';
    const r = Math.max(2, w * 0.006);
    for (const p of landmarks) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const commitWord = useCallback((word: string, minConf: number) => {
    const clean = word.trim();
    if (!clean) return;
    const confPct = Math.round(minConf * 100);
    setTranscript((prev) => [
      ...prev,
      { id: Date.now(), time: now(), text: clean, conf: confPct || undefined, lowConfidence: minConf < LOW_CONF, direction: 'outbound' },
    ]);
    addHistoryEntry({ text: clean, type: 'sign-to-text', conf: confPct || undefined, languageCode: activeLanguage });
  }, [addHistoryEntry, activeLanguage]);

  const handlePrediction = useCallback((p: SignPrediction) => {
    drawOverlay(p.landmarks, p.confidence >= LOW_CONF);
    setDetected((prev) =>
      prev.letter === p.letter && Math.abs(prev.conf - p.confidence) < 0.04
        ? prev
        : { letter: p.letter, conf: p.confidence },
    );

    if (p.letter && p.confidence >= MIN_CONF) {
      emptyFramesRef.current = 0;
      if (p.letter === candidateRef.current) {
        candidateStableRef.current += 1;
      } else {
        candidateRef.current = p.letter;
        candidateStableRef.current = 1;
      }
      if (candidateStableRef.current === COMMIT_FRAMES && p.letter !== lastCommittedRef.current) {
        lastCommittedRef.current = p.letter;
        wordBufferRef.current += p.letter;
        wordMinConfRef.current = Math.min(wordMinConfRef.current, p.confidence);
        setCurrentWord(wordBufferRef.current);
      }
    } else {
      emptyFramesRef.current += 1;
      if (emptyFramesRef.current > 5) {
        candidateRef.current = '';
        candidateStableRef.current = 0;
        lastCommittedRef.current = '';
      }
      if (emptyFramesRef.current === FLUSH_FRAMES && wordBufferRef.current) {
        const word = wordBufferRef.current;
        const minConf = wordMinConfRef.current;
        wordBufferRef.current = '';
        wordMinConfRef.current = 1;
        setCurrentWord('');
        commitWord(word, minConf);
      }
    }
  }, [drawOverlay, commitWord]);

  const { ready: detectorReady, error: detectorError } = useSignDetector({
    videoRef,
    enabled: detecting && live && !camError,
    onPrediction: handlePrediction,
  });

  useEffect(() => {
    setActiveLanguage(state.user.primaryLanguage);
  }, [state.user.primaryLanguage]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        { id: Date.now() + 1, time: now(), text: 'Text-to-sign tracking output queued…', direction: 'meta' },
      ]);
    }, 600);
  };

  const sendReport = () => {
    incrementReports();
    setReportSent(true);
    setTimeout(() => { setReportOpen(false); setReportSent(false); setReportText(''); }, 1800);
  };

  const resetSession = () => {
    setTranscript(makeSessionStart());
    candidateRef.current = '';
    candidateStableRef.current = 0;
    lastCommittedRef.current = '';
    wordBufferRef.current = '';
    wordMinConfRef.current = 1;
    emptyFramesRef.current = 0;
    setCurrentWord('');
  };

  const currentLanguageLabel = SUPPORTED_SIGN_LANGUAGES.find(l => l.code === activeLanguage)?.label || activeLanguage;

  return (
    <div className="flex flex-col h-[calc(100svh-3.5rem)] gap-6 p-6 max-w-7xl mx-auto text-text-primary antialiased page-enter">

      {/* ── TOP CONTROL NAVIGATION ROW ────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-border/40">
        <div className="flex items-center gap-4">

          {/* Segmented Mode Picker */}
          <div className="flex p-1 rounded-full bg-surface-alt border border-border/60 backdrop-blur-md">
            <button
              onClick={() => setMode('sign-to-text')}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200",
                mode === 'sign-to-text'
                  ? "bg-white text-black dark:bg-white dark:text-black shadow-md font-bold"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <Video size={13} />
              <span>Sign → Text</span>
            </button>
            <button
              onClick={() => setMode('text-to-sign')}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200",
                mode === 'text-to-sign'
                  ? "bg-white text-black dark:bg-white dark:text-black shadow-md font-bold"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <MessageSquare size={13} />
              <span>Text → Sign</span>
            </button>
          </div>

          <div className="h-5 w-px bg-border/60" />

          {/* Custom Premium Language Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="flex items-center gap-2 h-10 rounded-full border border-border/80 bg-surface-alt px-4 text-xs font-semibold text-text-primary transition-all hover:bg-surface-alt/80 hover:border-border"
            >
              <span>{currentLanguageLabel}</span>
              <ChevronDown size={14} className={cn("text-text-secondary transition-transform duration-200", langDropdownOpen && "transform rotate-180")} />
            </button>

            <AnimatePresence>
              {langDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 mt-2 w-56 rounded-2xl border border-border bg-surface shadow-xl z-30 overflow-hidden"
                >
                  <div className="p-1.5 flex flex-col gap-0.5">
                    {SUPPORTED_SIGN_LANGUAGES.map((language) => {
                      const isSelected = language.code === activeLanguage;
                      return (
                        <button
                          key={language.code}
                          onClick={() => {
                            setActiveLanguage(language.code as 'ISL' | 'ASL' | 'BSL');
                            setLangDropdownOpen(false);
                          }}
                          className={cn(
                            "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left",
                            isSelected
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-text-secondary hover:bg-surface-alt hover:text-text-primary"
                          )}
                        >
                          <span>{language.label}</span>
                          {isSelected && <Check size={14} className="text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setReportOpen(true)}
          className="gap-2 text-xs text-text-secondary border-border/80 bg-surface-alt hover:bg-surface hover:text-text-primary rounded-full transition-all"
        >
          <AlertTriangle size={13} /> Report error
        </Button>
      </div>

      {/* ── MAIN WORKSPACE CONTAINER ───────────────────── */}
      <div className="flex flex-1 flex-col lg:flex-row gap-6 min-h-0">

        {/* Left Side: Camera / Avatar Viewport */}
        <div className="flex-1 flex flex-col gap-4 min-h-[320px]">
          <Card padding="none" className="flex-1 relative overflow-hidden bg-surface-alt border-border/40 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-sm">
            <div className="absolute -top-12 -right-12 w-80 h-80 bg-primary/[0.03] dark:bg-teal-500/[0.02] rounded-full blur-[120px] pointer-events-none" />

            {mode === 'sign-to-text' ? (
              cameraOn ? (
                camError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-surface-alt/40">
                    <AvatarPlaceholder variant="profile" className="mb-4 opacity-30 scale-95" />
                    <p className="text-sm font-bold text-text-primary tracking-tight">Camera Unavailable</p>
                    <p className="text-xs text-text-secondary max-w-xs mt-1 mb-5">{camError}. Grant camera permission and try again.</p>
                    <Button variant="primary" size="sm" className="rounded-full font-bold px-6 shadow-md transition-transform hover:scale-[1.02]" onClick={() => { setCameraOn(false); setTimeout(() => setCameraOn(true), 60); }}>
                      Retry Camera
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Mirrored video + landmark overlay (both flipped together to stay aligned) */}
                    <div className="absolute inset-0 w-full h-full [transform:scaleX(-1)]">
                      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                    </div>

                    {/* Live status badge */}
                    {live && (
                      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/70 backdrop-blur-md border border-border/40 z-10 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-mono tracking-wider font-bold text-text-primary uppercase">
                          {detectorError ? 'Model error' : detectorReady ? 'Live Studio' : 'Loading model…'}
                        </span>
                      </div>
                    )}

                    {/* Real-time confidence badge — flags uncertain guesses */}
                    <div className={cn(
                      "absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/70 backdrop-blur-md border z-10 shadow-sm",
                      detected.letter && detected.conf < LOW_CONF ? "border-ember/40" : "border-border/40"
                    )}>
                      {detected.letter && detected.conf < LOW_CONF && (
                        <ShieldAlert size={11} className="text-ember" />
                      )}
                      <span className={cn(
                        "text-[10px] font-mono font-bold tracking-wide",
                        detected.letter
                          ? detected.conf < LOW_CONF ? "text-ember" : "text-emerald-600 dark:text-emerald-400"
                          : "text-text-secondary"
                      )}>
                        {detected.letter ? `${Math.round(detected.conf * 100)}% Confidence` : 'Awaiting hand…'}
                      </span>
                    </div>

                    {/* Big detected letter (like the Python overlay) */}
                    {detected.letter && (
                      <div className={cn(
                        "absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-surface/80 backdrop-blur-md border shadow-lg",
                        detected.conf < LOW_CONF ? "border-ember/50 shadow-ember-glow" : "border-primary/30"
                      )}>
                        <span className={cn("text-5xl font-bold", detected.conf < LOW_CONF ? "text-ember" : "gradient-text-primary")}>
                          {detected.letter}
                        </span>
                        {detected.conf < LOW_CONF && (
                          <span className="text-[8px] font-mono font-bold text-ember/80 tracking-wide uppercase -mt-1">Uncertain</span>
                        )}
                      </div>
                    )}

                    {/* Building word strip */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full bg-surface/80 backdrop-blur-md border border-border/40 shadow-sm min-w-[8rem] text-center">
                      <span className="text-sm font-mono font-bold tracking-[0.2em] text-text-primary">
                        {currentWord || '—'}<span className="typewriter-cursor" />
                      </span>
                    </div>
                  </>
                )
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-surface-alt/40">
                  <AvatarPlaceholder variant="profile" className="mb-4 opacity-30 scale-95" />
                  <p className="text-sm font-bold text-text-primary tracking-tight">Camera Channel Suspended</p>
                  <p className="text-xs text-text-secondary max-w-xs mt-1 mb-5">Activate camera sequence logic to restore sign interpretation layers.</p>
                  <Button variant="primary" size="sm" className="rounded-full font-bold px-6 shadow-md transition-transform hover:scale-[1.02]" onClick={() => setCameraOn(true)}>
                    Enable Camera Pipeline
                  </Button>
                </div>
              )
            ) : (
              <AvatarPlaceholder variant="avatar" className="absolute inset-0 w-full h-full border-none rounded-none opacity-85" />
            )}
          </Card>

          {/* Clean Floating Media Toolbar */}
          <div className="flex items-center justify-center gap-3 p-2 bg-surface border border-border/60 backdrop-blur-md rounded-full max-w-sm mx-auto w-full shadow-lg">
            <Button variant="icon" size="sm" className={cn("w-10 h-10 rounded-full transition-all", micOn ? "bg-primary/10 text-primary border border-primary/20" : "text-text-secondary hover:text-text-primary")} onClick={() => setMicOn(v => !v)} aria-label={micOn ? 'Mute' : 'Unmute'}>
              {micOn ? <Mic size={16} /> : <MicOff size={16} />}
            </Button>
            <Button variant="icon" size="sm" className={cn("w-10 h-10 rounded-full transition-all", cameraOn ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "text-text-secondary hover:text-text-primary")} onClick={() => setCameraOn(v => !v)} aria-label={cameraOn ? 'Disable camera' : 'Enable camera'}>
              {cameraOn ? <Camera size={16} /> : <CameraOff size={16} />}
            </Button>

            <div className="w-px h-5 bg-border mx-1" />

            <Button variant="icon" size="sm" className="w-10 h-10 rounded-full text-text-secondary hover:text-text-primary" onClick={() => setLive(v => !v)} aria-label={live ? 'Pause translation' : 'Resume translation'}>
              {live ? <Pause size={16} /> : <Play size={16} />}
            </Button>
            <Button variant="icon" size="sm" className="w-10 h-10 rounded-full text-text-secondary hover:text-rose-500 transition-colors" onClick={resetSession} aria-label="Clear session">
              <RotateCcw size={16} />
            </Button>
          </div>
        </div>

        {/* Right Side: Translation Feed Card */}
        <Card padding="none" className="w-full lg:w-85 xl:w-96 flex flex-col min-h-[360px] lg:h-auto bg-surface border-border/60 backdrop-blur-xl rounded-2xl shadow-sm">
          <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-xs font-bold tracking-wider uppercase text-text-primary">Translation Stream</h2>
              <p className="text-[10px] font-mono text-text-secondary mt-0.5">{transcript.length} sequence indices logged</p>
            </div>
            <button
              onClick={resetSession}
              className="text-xs font-mono tracking-wide text-text-secondary hover:text-text-primary transition-colors"
            >
              Flush
            </button>
          </div>

          {/* Messages Node viewport list */}
          <div
            ref={transcriptRef}
            className="flex-1 overflow-y-auto scrollbar-thin p-5 flex flex-col gap-3 min-h-0"
          >
            <AnimatePresence initial={false}>
              {transcript.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {entry.direction === 'meta' ? (
                    <p className="text-[10px] font-mono tracking-wide text-text-secondary text-center py-2 border-y border-border/20 my-1">
                      {entry.text}
                    </p>
                  ) : (
                    <div className={cn('flex flex-col', entry.direction === 'inbound' ? 'items-end' : 'items-start')}>
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[9px] font-mono text-text-secondary">{entry.time}</span>
                        {entry.conf && (
                          <span className={cn(
                            "flex items-center gap-1 text-[9px] font-mono font-bold",
                            entry.lowConfidence ? "text-ember" : "text-primary"
                          )}>
                            {entry.lowConfidence && <ShieldAlert size={9} />}
                            [{entry.conf}% accuracy]
                          </span>
                        )}
                      </div>
                      <div
                        className={cn(
                          'max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed tracking-wide shadow-sm border',
                          entry.direction === 'inbound'
                            ? 'bg-primary text-white font-medium border-primary rounded-tr-none'
                            : entry.lowConfidence
                              ? 'bg-ember/[0.06] border-ember/30 text-text-primary rounded-tl-none'
                              : 'bg-surface-alt border-border text-text-primary rounded-tl-none'
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

          {/* Lower Input Action Box */}
          <div className="p-4 border-t border-border/40 flex gap-2 shrink-0 bg-surface-alt/50">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendText()}
              placeholder={mode === 'sign-to-text' ? 'Enter transcription text overrides…' : 'Type tracking communication phrases…'}
              className="flex-1 h-10 text-xs bg-surface border-border focus:border-border/80 rounded-xl text-text-primary placeholder-text-secondary"
              aria-label="Workspace custom overrides text channel input"
            />
            <Button
              size="sm"
              onClick={sendText}
              disabled={!inputText.trim()}
              aria-label="Send frame packet payload"
              className="px-4 h-10 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-border/40 text-white font-bold flex items-center justify-center transition-all"
            >
              <Send size={14} />
            </Button>
          </div>
        </Card>
      </div>

      {/* ── MODAL ERROR RECTIFICATION OVERLAY ────────────────── */}
      <AnimatePresence>
        {reportOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/40 dark:bg-black/70"
            onClick={() => setReportOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-surface rounded-2xl border border-border p-6 shadow-2xl"
            >
              {reportSent ? (
                <div className="text-center py-6 space-y-2">
                  <p className="text-primary font-bold text-xl tracking-tight">Report Logged</p>
                  <p className="text-xs text-text-secondary">System interpretation variance parameters updated successfully.</p>
                </div>
              ) : (
                <>
                  <h3 className="font-sans font-bold text-lg text-text-primary tracking-tight mb-1">
                    Report translation anomaly
                  </h3>
                  <p className="text-xs text-text-secondary mb-4">
                    Flag context evaluation states to train engine tracking layers.
                  </p>
                  <textarea
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    className="w-full h-28 rounded-xl border border-border bg-surface-alt p-3 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-primary/40 resize-none mb-4 transition-all"
                    placeholder="e.g., 'Expected alternative phrase signature mapping variants…'"
                    aria-label="Anomaly logging field input"
                  />
                  <div className="flex justify-end gap-3">
                    <Button variant="ghost" className="text-xs text-text-secondary hover:text-text-primary rounded-full" size="sm" onClick={() => setReportOpen(false)}>Cancel</Button>
                    <Button size="sm" className="rounded-full bg-primary text-white font-bold px-5 transition-transform hover:scale-[1.01] disabled:opacity-40" disabled={!reportText.trim()} onClick={sendReport}>Submit Report</Button>
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