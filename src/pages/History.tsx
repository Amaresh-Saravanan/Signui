import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Trash2, Filter } from 'lucide-react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { SignStroke } from '../components/SignStroke';
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

const FILTERS = ['All', 'Sign → Text', 'Text → Sign', 'Saved'];

export function History() {
  const { state, toggleSaved, removeHistoryEntry } = useAppData();
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
      e.type === 'text-to-sign';
    return matchSearch && matchFilter;
  });

  // Group by date
  const grouped = filtered.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, HistoryEntry[]>);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-general font-semibold mb-0.5" style={{ fontFamily: 'var(--font-general)' }}>
          Translation History
        </h1>
        <p className="text-[11px] font-mono-sb text-text-secondary">{entries.length} total entries</p>
      </div>

      {/* Controls */}
      <div className="flex gap-3 items-center">
        <Input icon="search" placeholder="Search history…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 h-9" />
        <Button variant="secondary" size="sm" className="gap-1.5 shrink-0">
          <Filter size={14} /> Filter
        </Button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={cn(
              'h-7 px-3.5 rounded-full text-xs font-medium border transition-colors',
              activeFilter === f
                ? 'bg-primary text-white border-primary'
                : 'border-border text-text-secondary hover:border-primary/40 hover:text-text-primary'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grouped list */}
      {Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <SignStroke variant="empty-state" color="var(--color-border)" width={100} height={90} className="mb-5 opacity-60" />
          <p className="font-semibold text-text-secondary mb-1">No entries found</p>
          <p className="text-sm text-text-secondary">
            {search ? `No results for "${search}"` : 'Your translations will appear here after your first session.'}
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <div className="text-[10px] font-mono-sb uppercase tracking-widest text-text-secondary mb-3">{date}</div>
            <div className="flex flex-col gap-2">
              <AnimatePresence>
                {items.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card padding="none" className="group overflow-hidden hover:border-primary/30 transition-colors">
                      <div className="px-4 py-3.5 flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Meta row */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-mono-sb text-text-secondary">{entry.time}</span>
                            <span className="text-[10px] font-mono-sb text-primary/70">
                              {entry.type === 'sign-to-text' ? 'sign → text' : 'text → sign'}
                            </span>
                            {entry.conf > 0 && <span className="text-[10px] font-mono-sb text-success">{entry.conf}%</span>}
                          </div>
                          {/* Main text */}
                          <p className="text-sm text-text-primary leading-snug">
                            "{entry.text}"
                          </p>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => toggleSaved(entry.id)}
                            aria-label={entry.saved ? 'Remove from phrasebook' : 'Save to phrasebook'}
                            className={cn(
                              'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
                              entry.saved ? 'text-primary bg-primary-soft' : 'text-text-secondary hover:text-primary hover:bg-surface-alt'
                            )}
                          >
                            <Bookmark size={14} fill={entry.saved ? 'currentColor' : 'none'} />
                          </button>
                          <button
                            onClick={() => removeHistoryEntry(entry.id)}
                            aria-label="Delete entry"
                            className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-error hover:bg-error/10 transition-colors"
                          >
                            <Trash2 size={14} />
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
  );
}