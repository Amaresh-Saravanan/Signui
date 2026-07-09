import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Camera, CameraOff, Play, Pause, RotateCcw, Send, AlertTriangle, MessageSquare, Video, ChevronDown, Check } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { AvatarPlaceholder } from '../components/AvatarPlaceholder';
import { cn } from '../utils/cn';
import { SUPPORTED_SIGN_LANGUAGES } from '../constants/languages';
import { useAppData } from '../context/AppDataContext';

type Mode = 'sign-to-text' | 'text-to-sign';

interface TranscriptEntry {
  id: number;
  time: string;
  text: string;
  conf?: number;
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
                <>
                  <AvatarPlaceholder variant="camera" className="absolute inset-0 w-full h-full border-none rounded-none object-cover opacity-90" />

                  {/* Badges with background blurs that dynamically read across themes */}
                  {live && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/70 backdrop-blur-md border border-border/40 z-10 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-mono tracking-wider font-bold text-text-primary uppercase">Live Studio</span>
                    </div>
                  )}

                  <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-surface/70 backdrop-blur-md border border-border/40 z-10 shadow-sm">
                    <span className="text-[10px] font-mono font-bold tracking-wide text-emerald-600 dark:text-emerald-400">99.1% Confidence</span>
                  </div>
                </>
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
                          <span className="text-[9px] font-mono font-bold text-primary">[{entry.conf}% accuracy]</span>
                        )}
                      </div>
                      <div
                        className={cn(
                          'max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed tracking-wide shadow-sm border',
                          entry.direction === 'inbound'
                            ? 'bg-primary text-white font-medium border-primary rounded-tr-none'
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