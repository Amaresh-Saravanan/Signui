import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, Play, Pause, RotateCcw, Send, AlertTriangle, MessageSquare, Video, ChevronDown, Check, ShieldAlert, ShieldCheck, Info, LogOut, Users } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { AvatarPlaceholder } from '../components/AvatarPlaceholder';
import { UndoButton } from '../components/workspace/UndoButton';
import { cn } from '../utils/cn';
import { wordVariants, overlayVariants } from '../lib/motion';
import { cameraErrorCopy } from '../lib/cameraErrors';
import { SUPPORTED_SIGN_LANGUAGES, isLanguageAvailable, DEFAULT_AVAILABLE_LANGUAGE } from '../constants/languages';
import { useAppData } from '../context/AppDataContext';
import { useSignDetector, type SignPrediction } from '../hooks/useSignDetector';
import type { Landmark } from '../lib/aslClassifier';
import { predict } from '../lib/wordPredict';
import { QUICK_PHRASES } from '../constants/phrases';
import { buildTranscriptText, downloadTranscript } from '../lib/sessionExport';
import { drawHeatmap } from '../lib/heatmap';
import { applyLowLightBoost } from '../lib/lowLight';
import { PredictionChips } from '../components/workspace/PredictionChips';
import { QuickPhraseBar } from '../components/workspace/QuickPhraseBar';
import { CounterMode } from '../components/workspace/CounterMode';
import { ExportButton } from '../components/workspace/ExportButton';

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

function makeSessionStart(): TranscriptEntry[] {
  return [
    { id: Date.now(), time: now(), text: `Session started · Local translation engine responsive`, direction: 'meta' },
  ];
}

/** Detected-letter readout with a conic confidence ring. Renders nothing when no letter. */
function ConfidenceBadge({ letter, conf }: { letter: string; conf: number }) {
  if (!letter) return null;
  const confident = conf >= LOW_CONF;
  const tone = confident ? 'var(--color-conf-high)' : 'var(--color-conf-mid)';
  const pct = Math.round(conf * 100);
  return (
    <div
      role="status"
      aria-label={`Detected letter ${letter}, ${pct} percent confidence`}
      className="glass flex items-center gap-3 rounded-2xl px-4 py-3"
    >
      <div
        className="grid h-12 w-12 place-items-center rounded-full"
        style={{ background: `conic-gradient(${tone} ${conf * 360}deg, var(--color-surface-alt) 0deg)` }}
      >
        <div className="grid h-10 w-10 place-items-center rounded-full bg-surface font-general text-xl font-bold text-text-primary">
          {letter}
        </div>
      </div>
      <div className="flex flex-col leading-tight">
        <span className={cn('font-mono text-sm font-bold tabular-nums', confident ? 'text-conf-high' : 'text-conf-mid')}>
          {pct}%
        </span>
        <span className="text-xs text-text-secondary">{confident ? 'Confident' : 'Uncertain'}</span>
      </div>
    </div>
  );
}

export function Workspace() {
  const { state, addHistoryEntry, removeHistoryEntry, incrementReports, signOut } = useAppData();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('sign-to-text');
  // ML-5: never start on a language that has no shipped model.
  const [activeLanguage, setActiveLanguage] = useState<'ISL' | 'ASL' | 'BSL'>(
    isLanguageAvailable(state.user.primaryLanguage) ? state.user.primaryLanguage : DEFAULT_AVAILABLE_LANGUAGE,
  );
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [live, setLive] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(() => makeSessionStart());
  const [inputText, setInputText] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportSent, setReportSent] = useState(false);
  // Announced via aria-live only when a full word/sentence lands in the transcript.
  const [announcement, setAnnouncement] = useState('');

  const transcriptRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // ── Live sign-detection wiring ──────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Raw getUserMedia error object; cameraErrorCopy maps it to friendly copy at render.
  const [camError, setCamError] = useState<unknown>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [detected, setDetected] = useState<{ letter: string; conf: number }>({ letter: '', conf: 0 });

  const firstName = state.user.firstName || '';
  const lastName = state.user.lastName || '';
  const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'U';

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };
  const [currentWord, setCurrentWord] = useState('');

  // Accumulation state kept in refs so the per-frame callback stays stable.
  const candidateRef = useRef('');
  const candidateStableRef = useRef(0);
  const lastCommittedRef = useRef('');
  const wordBufferRef = useRef('');
  const wordMinConfRef = useRef(1);
  const emptyFramesRef = useRef(0);
  // Stack of committed words (transcript id + matching history id) so Undo
  // can pop the most recent one from both places at once.
  const wordStackRef = useRef<{ transcriptId: number; historyId: number | null }[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  // F-42: full-screen "Show to Staff" counter display.
  const [counterOpen, setCounterOpen] = useState(false);
  // F-45: mirror the heatmap preference into a ref so the stable drawOverlay
  // callback can read it without re-subscribing.
  const heatmapRef = useRef(state.preferences.heatmap);
  useEffect(() => { heatmapRef.current = state.preferences.heatmap; }, [state.preferences.heatmap]);
  // F-47: offscreen canvas that holds the brightened frame for low-light mode.
  const lowLightCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const detecting = cameraOn && mode === 'sign-to-text';

  // Attach / release the webcam stream. retryTick re-triggers after an error.
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
        setCamError(null);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setCamError(err ?? new Error('Camera access denied'));
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [detecting, retryTick]);

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

    // F-45: optional per-joint confidence heatmap (edge-risk colored) instead
    // of the default landmark dots, when enabled in Settings.
    if (heatmapRef.current) {
      drawHeatmap(ctx, landmarks, w, h, {
        highContrast: document.documentElement.classList.contains('high-contrast'),
      });
    } else {
      ctx.fillStyle = 'rgba(167, 139, 250, 0.7)';
      const r = Math.max(2, w * 0.006);
      for (const p of landmarks) {
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  const commitWord = useCallback((word: string, minConf: number) => {
    const clean = word.trim();
    if (!clean) return;
    const confPct = Math.round(minConf * 100);
    const transcriptId = Date.now();
    setTranscript((prev) => [
      ...prev,
      { id: transcriptId, time: now(), text: clean, conf: confPct || undefined, lowConfidence: minConf < LOW_CONF, direction: 'outbound' },
    ]);
    setAnnouncement(clean);
    const historyId = addHistoryEntry({ text: clean, type: 'sign-to-text', conf: confPct || undefined, languageCode: activeLanguage });
    wordStackRef.current.push({ transcriptId, historyId });
    setCanUndo(true);
  }, [addHistoryEntry, activeLanguage]);

  const undoLastWord = useCallback(() => {
    const last = wordStackRef.current.pop();
    if (!last) return;
    setTranscript((prev) => prev.filter((entry) => entry.id !== last.transcriptId));
    if (last.historyId !== null) removeHistoryEntry(last.historyId);
    setCanUndo(wordStackRef.current.length > 0);
  }, [removeHistoryEntry]);

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

  // F-47: when low-light boost is on, feed the model a brightened canvas frame
  // instead of the raw <video> (timing still driven by the video element).
  const frameSource = useMemo(() => {
    if (!state.preferences.lowLight) return undefined;
    return (video: HTMLVideoElement) => {
      let c = lowLightCanvasRef.current;
      if (!c) {
        c = document.createElement('canvas');
        lowLightCanvasRef.current = c;
      }
      return applyLowLightBoost(video, c) ?? video;
    };
  }, [state.preferences.lowLight]);

  const { ready: detectorReady, error: detectorError, modelMode, modelVersion } = useSignDetector({
    videoRef,
    enabled: detecting && live && !camError,
    onPrediction: handlePrediction,
    frameSource,
  });

  useEffect(() => {
    setActiveLanguage(
      isLanguageAvailable(state.user.primaryLanguage) ? state.user.primaryLanguage : DEFAULT_AVAILABLE_LANGUAGE,
    );
  }, [state.user.primaryLanguage]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  // Close dropdown / info popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setLangDropdownOpen(false);
      }
      if (infoRef.current && !infoRef.current.contains(target)) {
        setInfoOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Manual transcript override for sign-to-text. Text-to-sign is not yet
  // implemented (FR-6), so this is a no-op in that mode.
  const sendText = () => {
    if (mode !== 'sign-to-text') return;
    if (!inputText.trim()) return;
    const clean = inputText.trim();
    const transcriptId = Date.now();

    setTranscript(prev => [
      ...prev,
      { id: transcriptId, time: now(), text: clean, direction: 'inbound' },
    ]);
    const historyId = addHistoryEntry({
      text: clean,
      type: 'sign-to-text',
      languageCode: activeLanguage,
    });
    wordStackRef.current.push({ transcriptId, historyId });
    setCanUndo(true);

    setInputText('');
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
    wordStackRef.current = [];
    setCanUndo(false);
  };

  // ── M2.5 conversation-UX helpers ────────────────────────────
  // F-41: word predictions for the in-progress fingerspelled word.
  const suggestions = useMemo(
    () => predict(currentWord, state.phrasebook, 3),
    [currentWord, state.phrasebook],
  );

  // F-43: one-tap phrases = saved phrasebook first, then defaults.
  const quickPhrases = useMemo(() => {
    const saved = state.phrasebook.Saved ?? [];
    return [...saved, ...QUICK_PHRASES.filter((p) => !saved.includes(p))];
  }, [state.phrasebook]);

  // F-42: lines shown in the counter display (translated content only).
  const counterLines = useMemo(
    () => transcript.filter((e) => e.direction !== 'meta').map((e) => e.text),
    [transcript],
  );
  const hasTranscript = counterLines.length > 0;

  // F-43: insert a canned phrase into the transcript + history, and register it
  // on the undo stack so Undo removes it too.
  const insertPhrase = (phrase: string) => {
    const clean = phrase.trim();
    if (!clean) return;
    const transcriptId = Date.now();
    setTranscript((prev) => [...prev, { id: transcriptId, time: now(), text: clean, direction: 'outbound' }]);
    setAnnouncement(clean);
    const historyId = addHistoryEntry({ text: clean, type: 'sign-to-text', languageCode: activeLanguage });
    wordStackRef.current.push({ transcriptId, historyId });
    setCanUndo(true);
  };

  // F-41: accept a predicted word — drop the in-progress spelling and insert it.
  const pickWord = (word: string) => {
    candidateRef.current = '';
    candidateStableRef.current = 0;
    lastCommittedRef.current = '';
    wordBufferRef.current = '';
    wordMinConfRef.current = 1;
    emptyFramesRef.current = 0;
    setCurrentWord('');
    insertPhrase(word);
  };

  // F-46: export the current session transcript as a .txt file.
  const handleExportTranscript = () => {
    downloadTranscript(buildTranscriptText(transcript));
  };

  const isLive = detecting && live && !camError;
  const errCopy = camError ? cameraErrorCopy(camError) : null;
  const liveText = detectorError
    ? 'Model error'
    : isLive && !detectorReady
      ? 'Loading model…'
      : `${isLive ? 'Live' : 'Paused'} · ${activeLanguage}`;

  return (
    <div className="grid h-[calc(100dvh-3.5rem)] grid-cols-1 grid-rows-[auto_minmax(0,1fr)] text-text-primary antialiased lg:grid-cols-[1fr_380px] lg:grid-rows-[minmax(0,1fr)]">

      {/* Announce only flushed words — never per-letter churn. */}
      <div aria-live="polite" className="sr-only">{announcement}</div>

      {/* ── CAMERA STAGE ─────────────────────────────────────── */}
      <section aria-label="Camera" className="relative min-h-[50vh] overflow-hidden bg-black lg:min-h-0">
        {mode === 'sign-to-text' ? (
          <>
            {detecting && (
              /* Mirrored video + landmark overlay (both flipped together to stay aligned) */
              <div className="absolute inset-0 [transform:scaleX(-1)]">
                <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />
                <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
              </div>
            )}

            {/* Inline camera error — the instrument reports its own status */}
            {detecting && errCopy && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black p-6 text-center">
                <CameraOff className="h-8 w-8 text-white/50" aria-hidden />
                <p className="font-semibold text-white">{errCopy.title}</p>
                <p className="max-w-[40ch] text-sm text-white/70">{errCopy.body}</p>
                <Button size="sm" className="mt-2" onClick={() => { setCamError(null); setRetryTick((t) => t + 1); }}>
                  Retry
                </Button>
              </div>
            )}

            {!cameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <CameraOff className="h-8 w-8 text-white/50" aria-hidden />
                <p className="font-semibold text-white">Camera is off</p>
                <p className="max-w-[40ch] text-sm text-white/70">Turn the camera back on to translate fingerspelling live.</p>
                <Button size="sm" className="mt-2" onClick={() => setCameraOn(true)}>Turn on camera</Button>
              </div>
            )}

            {/* Detected letter + composing word, above the control bar */}
            {detecting && !errCopy && (
              <div className="absolute bottom-20 left-4 z-10 flex flex-col items-start gap-2">
                {currentWord && (
                  <span className="glass rounded-full px-3 py-1.5 font-mono text-sm font-bold tracking-[0.2em] text-text-primary">
                    {currentWord}<span className="typewriter-cursor" />
                  </span>
                )}
                {currentWord && <PredictionChips suggestions={suggestions} onPick={pickWord} />}
                <ConfidenceBadge letter={detected.letter} conf={detected.conf} />
              </div>
            )}
          </>
        ) : (
          <AvatarPlaceholder variant="avatar" className="absolute inset-0 h-full w-full rounded-none border-none opacity-85" />
        )}

        {/* Status pills */}
        <div className="absolute inset-x-4 top-4 z-10 flex items-start justify-between gap-2">
          <span className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-text-primary">
            <span className={cn('h-2 w-2 rounded-full', isLive ? 'bg-error ember-pulse' : 'bg-text-secondary')} aria-hidden />
            {liveText}
          </span>
          <span
            className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-text-primary"
            title="Video is processed locally. Frames never leave this device."
          >
            <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden />
            On-device
          </span>
        </div>

        {/* ── FLOATING CONTROL BAR ─────────────────────────── */}
        <motion.div
          variants={overlayVariants}
          initial="initial"
          animate="enter"
          className="glass absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-2xl p-2"
        >
          <Button
            variant="icon"
            size="sm"
            className="h-9 w-9 rounded-xl p-0"
            onClick={() => setLive(v => !v)}
            aria-label={live ? 'Pause translation' : 'Resume translation'}
          >
            {live ? <Pause size={15} /> : <Play size={15} />}
          </Button>
          <Button
            variant="icon"
            size="sm"
            className={cn('h-9 w-9 rounded-xl p-0', cameraOn && 'border-success/30 text-success')}
            onClick={() => setCameraOn(v => !v)}
            aria-label={cameraOn ? 'Disable camera' : 'Enable camera'}
          >
            {cameraOn ? <Camera size={15} /> : <CameraOff size={15} />}
          </Button>

          <div className="mx-0.5 h-5 w-px bg-border" aria-hidden />

          {/* Language dropdown — opens upward, the bar sits at the bottom */}
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="icon"
              size="sm"
              className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold"
              onClick={() => setLangDropdownOpen(v => !v)}
              aria-expanded={langDropdownOpen}
              aria-label={`Sign language: ${SUPPORTED_SIGN_LANGUAGES.find(l => l.code === activeLanguage)?.label || activeLanguage}`}
            >
              {activeLanguage}
              <ChevronDown size={13} className={cn('transition-transform duration-200', langDropdownOpen && 'rotate-180')} />
            </Button>
            <AnimatePresence>
              {langDropdownOpen && (
                <motion.div
                  variants={overlayVariants}
                  initial="initial"
                  animate="enter"
                  exit="exit"
                  className="absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
                >
                  <div className="flex flex-col gap-0.5 p-1.5">
                    {SUPPORTED_SIGN_LANGUAGES.map((language) => {
                      const isSelected = language.code === activeLanguage;
                      const disabled = !language.available;
                      return (
                        <button
                          key={language.code}
                          disabled={disabled}
                          onClick={() => {
                            if (disabled) return;
                            setActiveLanguage(language.code as 'ISL' | 'ASL' | 'BSL');
                            setLangDropdownOpen(false);
                          }}
                          className={cn(
                            'flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-colors',
                            disabled
                              ? 'cursor-not-allowed text-text-secondary/50'
                              : isSelected
                                ? 'bg-primary/10 font-bold text-primary'
                                : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary',
                          )}
                        >
                          <span>{language.label}</span>
                          {isSelected && !disabled && <Check size={14} className="text-primary" />}
                          {disabled && <span className="font-mono text-[9px] uppercase tracking-wide text-ember">Soon</span>}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* DOC-2: user-facing model-limitation disclosure */}
          <div className="relative" ref={infoRef}>
            <Button
              variant="icon"
              size="sm"
              className="h-9 w-9 rounded-xl p-0"
              onClick={() => setInfoOpen(v => !v)}
              aria-label="Detection accuracy information"
              aria-expanded={infoOpen}
            >
              <Info size={15} />
            </Button>
            <AnimatePresence>
              {infoOpen && (
                <motion.div
                  variants={overlayVariants}
                  initial="initial"
                  animate="enter"
                  exit="exit"
                  className="absolute bottom-full right-0 z-30 mb-2 w-72 rounded-2xl border border-border bg-surface p-4 text-left shadow-xl"
                >
                  <h3 className="mb-2 text-xs font-bold text-text-primary">About detection accuracy</h3>
                  <p className="mb-2 text-[11px] leading-relaxed text-text-secondary">
                    Fingerspelling runs entirely on your device. It works best for clearly distinct hand shapes.
                  </p>
                  <p className="mb-2 text-[11px] leading-relaxed text-text-secondary">
                    {modelMode === 'trained' ? (
                      <>Model: <span className="font-mono font-bold text-text-primary">{modelVersion}</span> (trained)</>
                    ) : (
                      <>Model: <span className="font-mono font-bold text-text-primary">geometric fallback</span> — the trained model hasn't shipped yet.</>
                    )}
                  </p>
                  <ul className="space-y-1.5 text-[11px] leading-relaxed text-text-secondary">
                    <li className="flex gap-2">
                      <ShieldAlert size={12} className="mt-0.5 shrink-0 text-conf-mid" />
                      <span>Lower accuracy on: <span className="font-mono font-bold text-text-primary">E, H, M, R, U, X</span> (under 95%). These are flagged as "Uncertain" live.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="shrink-0 font-bold text-conf-mid">✕</span>
                      <span><span className="font-mono font-bold text-text-primary">J</span> and <span className="font-mono font-bold text-text-primary">Z</span> are motion letters and are not yet supported.</span>
                    </li>
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <UndoButton onUndo={undoLastWord} disabled={!canUndo} />

          <Button
            variant="icon"
            size="sm"
            className="h-9 w-9 rounded-xl p-0"
            onClick={() => setReportOpen(true)}
            aria-label="Report a translation issue"
          >
            <AlertTriangle size={15} />
          </Button>
        </motion.div>
      </section>

      {/* ── LIVE TRANSCRIPT ──────────────────────────────────── */}
      <aside aria-label="Live transcript" className="flex min-h-0 flex-col border-t border-border bg-surface lg:border-l lg:border-t-0">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          {/* Mode picker */}
          <div className="flex rounded-full bg-surface-alt p-0.5" role="group" aria-label="Translation mode">
            <button
              onClick={() => setMode('sign-to-text')}
              aria-pressed={mode === 'sign-to-text'}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                mode === 'sign-to-text' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary',
              )}
            >
              <Video size={12} /> Sign → Text
            </button>
            <button
              onClick={() => setMode('text-to-sign')}
              aria-pressed={mode === 'text-to-sign'}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                mode === 'text-to-sign' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary',
              )}
            >
              <MessageSquare size={12} /> Text → Sign
              <span className="rounded-full bg-ember/15 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wide text-ember">Soon</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* F-46: export transcript · F-42: counter display */}
            <ExportButton onExport={handleExportTranscript} disabled={!hasTranscript} />
            <button
              onClick={() => setCounterOpen(true)}
              disabled={!hasTranscript}
              aria-label="Show transcript in counter mode"
              title="Show to staff"
              className="flex items-center gap-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary disabled:opacity-40"
            >
              <Users size={12} /> Staff
            </button>
            <button
              onClick={resetSession}
              aria-label="Clear session transcript"
              className="flex items-center gap-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
            >
              <RotateCcw size={12} /> Clear
            </button>

            {/* Profile dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(v => !v)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-[11px] font-bold text-primary transition-colors hover:border-primary/60 hover:bg-primary/20"
                aria-label="User menu"
                aria-expanded={profileOpen}
              >
                {initials}
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
                  >
                    <div className="px-3.5 py-3">
                      <p className="text-xs font-bold text-text-primary">{`${firstName} ${lastName}`.trim() || 'User'}</p>
                      <p className="mt-0.5 truncate text-[10px] text-text-secondary">{state.user.email || ''}</p>
                    </div>
                    <div className="h-px bg-border" />
                    <button
                      onClick={() => { setProfileOpen(false); navigate('/dashboard'); }}
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs font-medium text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs font-medium text-error transition-colors hover:bg-error/10"
                    >
                      <LogOut size={12} /> Log Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Transcript list */}
        <div ref={transcriptRef} className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-4">
          <AnimatePresence initial={false} mode="popLayout">
            {transcript.map((entry) => (
              <motion.div key={entry.id} layout variants={wordVariants} initial="initial" animate="enter">
                {entry.direction === 'meta' ? (
                  <p className="py-2 text-center font-mono text-[10px] tracking-wide text-text-secondary">
                    {entry.text}
                  </p>
                ) : (
                  <div className="flex items-baseline gap-3 py-1.5">
                    <span className="shrink-0 font-mono text-xs text-text-secondary tabular-nums">{entry.time}</span>
                    <span
                      className={cn(
                        'min-w-0 break-words font-mono text-sm text-text-primary',
                        entry.lowConfidence && 'underline decoration-conf-mid decoration-dotted underline-offset-4',
                      )}
                    >
                      {entry.text}
                      {entry.lowConfidence && (
                        <AlertTriangle className="mb-0.5 ml-1.5 inline h-3.5 w-3.5 text-conf-mid" aria-label="Low confidence guess" />
                      )}
                    </span>
                    {entry.conf !== undefined && (
                      <span className="ml-auto shrink-0 font-mono text-[10px] text-text-secondary tabular-nums">{entry.conf}%</span>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* F-43: one-tap quick phrases */}
        {mode === 'sign-to-text' && (
          <div className="shrink-0 border-t border-border px-3 py-2">
            <QuickPhraseBar phrases={quickPhrases} onPick={insertPhrase} />
          </div>
        )}

        {/* Composer */}
        <div className="flex shrink-0 gap-2 border-t border-border p-3">
          <Input
            value={mode === 'sign-to-text' ? inputText : ''}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendText()}
            disabled={mode !== 'sign-to-text'}
            placeholder={mode === 'sign-to-text' ? 'Type to add to the transcript…' : 'Text → Sign is coming soon'}
            className="h-10 flex-1 text-sm"
            aria-label="Add text to the transcript"
          />
          <Button
            size="sm"
            onClick={sendText}
            disabled={mode !== 'sign-to-text' || !inputText.trim()}
            aria-label="Add manual transcript entry"
            className="h-10 rounded-xl px-4"
          >
            <Send size={14} />
          </Button>
        </div>
      </aside>

      {/* ── REPORT ISSUE MODAL (existing flow, preserved) ────── */}
      <AnimatePresence>
        {reportOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md dark:bg-black/70"
            onClick={() => setReportOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
            >
              {reportSent ? (
                <div className="space-y-2 py-6 text-center">
                  <p className="text-xl font-bold tracking-tight text-primary">Report logged</p>
                  <p className="text-xs text-text-secondary">Thanks — this helps improve detection.</p>
                </div>
              ) : (
                <>
                  <h3 className="mb-1 font-general text-lg font-bold tracking-tight text-text-primary">
                    Report a translation issue
                  </h3>
                  <p className="mb-4 text-xs text-text-secondary">
                    Tell us what was signed and what the app showed instead.
                  </p>
                  <textarea
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    className="mb-4 h-28 w-full resize-none rounded-xl border border-border bg-surface-alt p-3 text-sm text-text-primary outline-none transition-all placeholder:text-text-secondary focus:border-primary/40"
                    placeholder="e.g., 'I signed HELLO but it showed HELO…'"
                    aria-label="Describe the translation issue"
                  />
                  <div className="flex justify-end gap-3">
                    <Button variant="ghost" size="sm" onClick={() => setReportOpen(false)}>Cancel</Button>
                    <Button size="sm" disabled={!reportText.trim()} onClick={sendReport}>Submit report</Button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── COUNTER MODE (F-42) ─────────────────────────────── */}
      {counterOpen && <CounterMode lines={counterLines} onClose={() => setCounterOpen(false)} />}
    </div>
  );
}
