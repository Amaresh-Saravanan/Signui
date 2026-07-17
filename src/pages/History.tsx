import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Trash2, Filter, Pin, Clock, ShieldCheck, Globe, History as HistoryIcon } from 'lucide-react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { cn } from '../utils/cn';
import { formatHistoryDate, formatHistoryTime, useAppData } from '../context/AppDataContext';

interface HistoryEntry {
  id: number;
  time: string;
  date: string;
  text: string;
  type: 'sign-to-text' | 'text-to-sign';
  conf: number;
  saved: boolean;
}

const FILTERS = ['All', 'Today', 'Week', 'Sign → Text', 'Text → Sign', 'Saved'];

export function History() {
  const { state, toggleSaved, removeHistoryEntry } = useAppData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const entries: HistoryEntry[] = state.history.map((entry) => ({
    id: entry.id,
    time: formatHistoryTime(entry.timestamp),
    date: formatHistoryDate(entry.timestamp),
    text: entry.text,
    type: entry.type,
    conf: entry.conf ?? 0,
    saved: entry.saved,
  }));

  const filtered = entries.filter(e => {
    const matchSearch = e.text.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      activeFilter === 'All' ? true :
        activeFilter === 'Saved' ? e.saved :
          activeFilter === 'Sign → Text' ? e.type === 'sign-to-text' :
            activeFilter === 'Text → Sign' ? e.type === 'text-to-sign' : true;
    return matchSearch && matchFilter;
  });

  // Extract pinned items (saved phrases) for the premium top grid row
  const pinnedEntries = entries.filter(e => e.saved).slice(0, 2);

  // Group normal entries by date
  const grouped = filtered.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, HistoryEntry[]>);

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8 pb-16 page-enter text-text-primary antialiased">

      {/* ── HEADER SECTION ────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.05] pb-5">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary font-sans">
            Translation <span className="text-primary">History</span>
          </h1>
          <p className="text-xs font-medium tracking-wide text-text-secondary mt-1">
            Review and manage your past AI-assisted sign language sessions.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Input
              icon="search"
              placeholder="Search sessions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 bg-white/[0.02] dark:bg-white/[0.01] border-black/[0.06] dark:border-white/[0.05] backdrop-blur-md rounded-xl pl-9"
            />
          </div>
          <Button variant="secondary" className="h-10 rounded-xl gap-2 border-black/[0.08] dark:border-white/[0.08] bg-white/[0.02] dark:bg-white/[0.01] text-text-secondary hover:text-text-primary">
            <Filter size={14} />
          </Button>
        </div>
      </div>

      {/* ── FILTER CHIPS ────────────────── */}
      <div className="flex gap-2 flex-wrap items-center">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={cn(
              'h-8 px-4 rounded-full text-xs font-semibold tracking-wide transition-all border duration-200',
              activeFilter === f
                ? 'bg-primary/10 text-primary border-primary/30 shadow-sm shadow-primary/5'
                : 'border-black/[0.06] dark:border-white/[0.05] bg-white/[0.02] dark:bg-white/[0.01] text-text-secondary hover:border-primary/20 hover:text-text-primary'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── PINNED SESSIONS ────────────────── */}
      {pinnedEntries.length > 0 && !search && (
        <div className="space-y-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Pin size={11} className="rotate-45" />
            <span>Pinned Sessions</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pinnedEntries.map((entry) => (
              <Card key={`pinned-${entry.id}`} className="p-5 bg-white/[0.02] dark:bg-white/[0.01] border-black/[0.06] dark:border-white/[0.05] relative overflow-hidden group rounded-2xl shadow-sm backdrop-blur-xl">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/[0.02] rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary truncate max-w-[180px]">
                      {entry.type === 'sign-to-text' ? 'Sign Studio Stream' : 'Text Synthesis Log'}
                    </h3>
                    <p className="text-[10px] font-mono text-text-secondary mt-0.5">{entry.time} • {entry.conf}% Acc</p>
                  </div>
                  <button
                    onClick={() => toggleSaved(entry.id)}
                    className="text-primary hover:scale-105 transition-transform"
                    aria-label="Unpin entry"
                  >
                    <Bookmark size={14} fill="currentColor" />
                  </button>
                </div>
                <p className="text-xs text-text-secondary line-clamp-2 italic bg-black/[0.01] dark:bg-white/[0.01] p-2.5 rounded-xl border border-black/[0.04] dark:border-white/[0.04]">
                  "{entry.text}"
                </p>
                <div className="text-[9px] font-mono text-text-secondary/60 mt-3 tracking-wider">
                  {entry.date}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── RECENT SESSIONS MAIN LIST ────────────────── */}
      <div className="space-y-6">
        <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
          Recent Sessions
        </div>

        {entries.length === 0 ? (
          <EmptyState
            icon={HistoryIcon}
            title="Your conversations will live here"
            body="Every session you translate in the Workspace is saved on this device, searchable by date and content."
            cta={<Button onClick={() => navigate('/workspace')}>Start translating</Button>}
          />
        ) : Object.keys(grouped).length === 0 ? (
          // Lighter inline state: history exists, the current search/filter just has no hits.
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-sm text-text-secondary">
              {search ? `No matches for "${search}"` : `No sessions match the "${activeFilter}" filter`}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setActiveFilter('All'); }}
            >
              Clear search
            </Button>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="relative pl-5 border-l border-black/[0.08] dark:border-white/[0.06] space-y-3.5">

              {/* Subtle Timeline indicator dot */}
              <div className="absolute w-2 h-2 rounded-full bg-black/[0.15] dark:bg-white/[0.15] -left-[4px] top-1.5 ring-4 ring-background" />

              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-secondary/70 mb-1">
                {date}
              </div>

              <div className="flex flex-col gap-3.5">
                <AnimatePresence>
                  {items.map((entry, i) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      transition={{ delay: i * 0.02, ease: "easeOut" }}
                    >
                      <Card padding="none" className="group overflow-hidden bg-white/[0.02] dark:bg-white/[0.01] border-black/[0.06] dark:border-white/[0.05] hover:border-primary/20 backdrop-blur-xl transition-all duration-200 rounded-2xl shadow-sm">
                        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                          {/* Meta Details & Output Stream */}
                          <div className="flex-1 space-y-2 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                                {entry.type === 'sign-to-text' ? (
                                  <>
                                    <Globe size={13} className="text-primary" /> Sign Interpretation
                                  </>
                                ) : (
                                  <>
                                    <Clock size={13} className="text-indigo-400" /> Speech Generation
                                  </>
                                )}
                              </span>
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-black/[0.02] dark:bg-white/[0.02] text-text-secondary border border-black/[0.04] dark:border-white/[0.04]">
                                {entry.time}
                              </span>
                              {entry.conf > 0 && (
                                <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/[0.06] text-emerald-500 dark:text-emerald-400 border border-emerald-500/10 flex items-center gap-1">
                                  <ShieldCheck size={11} /> {entry.conf}% accuracy
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-text-secondary leading-relaxed pl-0.5 max-w-2xl truncate group-hover:text-text-primary transition-colors duration-150">
                              "{entry.text}"
                            </p>
                          </div>

                          {/* Quick Workspace Interaction Actions */}
                          <div className="flex items-center gap-1.5 self-end sm:self-auto opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={() => toggleSaved(entry.id)}
                              aria-label="Toggle pin status"
                              className={cn(
                                'w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-150',
                                entry.saved
                                  ? 'text-primary bg-primary/[0.08] border-primary/20'
                                  : 'text-text-secondary border-black/[0.06] dark:border-white/[0.05] hover:text-primary hover:bg-white/[0.04]'
                              )}
                            >
                              <Bookmark size={13} fill={entry.saved ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              onClick={() => removeHistoryEntry(entry.id)}
                              aria-label="Delete permanent session index record"
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-text-secondary border border-black/[0.06] dark:border-white/[0.05] hover:text-error hover:bg-error/[0.08] hover:border-error/20 transition-all duration-150"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}