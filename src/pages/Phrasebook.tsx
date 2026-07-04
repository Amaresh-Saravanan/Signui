import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Edit3, Trash2, Plus } from 'lucide-react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { SignStroke } from '../components/SignStroke';
import { useAppData } from '../context/AppDataContext';

export function Phrasebook() {
  const { state, addPhrase: addPhraseToStore, removePhrase: removePhraseFromStore } = useAppData();
  const [search, setSearch] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newPhrase, setNewPhrase] = useState('');

  const data = state.phrasebook;

  const remove = (cat: string, phrase: string) => {
    removePhraseFromStore(cat, phrase);
  };

  const addPhrase = (cat: string) => {
    if (!newPhrase.trim()) return;
    addPhraseToStore(cat, newPhrase.trim());
    setNewPhrase('');
    setAddingTo(null);
  };

  const totalCount = Object.values(data).reduce((s, arr) => s + arr.length, 0);

  const filteredData = Object.entries(data).reduce((acc, [cat, phrases]) => {
    const matched = phrases.filter(p => p.toLowerCase().includes(search.toLowerCase()));
    if (matched.length > 0) acc[cat] = matched;
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-general font-semibold mb-0.5" style={{ fontFamily: 'var(--font-general)' }}>
            Phrasebook
          </h1>
          <p className="text-[11px] font-mono-sb text-text-secondary">{totalCount} phrases across {Object.keys(data).length} categories</p>
        </div>
        <Input icon="search" placeholder="Search phrases…" value={search} onChange={e => setSearch(e.target.value)} className="h-9 sm:w-56" />
      </div>

      {Object.keys(filteredData).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <SignStroke variant="empty-state" color="var(--color-border)" width={100} height={90} className="mb-5 opacity-60" />
          <p className="font-semibold text-text-secondary mb-1">No saved phrases yet</p>
          <p className="text-sm text-text-secondary mb-5">
            Save phrases from your next translation — they'll appear here for quick access.
          </p>
          <Button variant="secondary" size="sm">
            <Plus size={14} className="mr-1" /> Add your first phrase
          </Button>
        </div>
      ) : (
        Object.entries(filteredData).map(([category, phrases]) => (
          <div key={category}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-mono-sb uppercase tracking-widest text-text-secondary">{category}</span>
                <span className="text-[10px] font-mono-sb text-primary/60">{phrases.length}</span>
              </div>
              <button
                onClick={() => setAddingTo(addingTo === category ? null : category)}
                className="flex items-center gap-1 text-[11px] font-medium text-text-secondary hover:text-primary transition-colors"
              >
                <Plus size={13} /> Add
              </button>
            </div>

            <AnimatePresence>
              {addingTo === category && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-2 overflow-hidden"
                >
                  <div className="flex gap-2 p-3 rounded-xl border border-primary/30 bg-primary-soft">
                    <Input
                      placeholder="Type a new phrase…"
                      value={newPhrase}
                      onChange={e => setNewPhrase(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addPhrase(category)}
                      className="flex-1 h-8 text-sm"
                      autoFocus
                    />
                    <Button size="sm" onClick={() => addPhrase(category)} disabled={!newPhrase.trim()} className="shrink-0">Save</Button>
                    <Button variant="ghost" size="sm" onClick={() => setAddingTo(null)} className="shrink-0">Cancel</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-1.5">
              <AnimatePresence>
                {phrases.map((phrase, i) => (
                  <motion.div
                    key={phrase}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card padding="none" className="group hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-3 px-4 py-2.5">
                        <p className="flex-1 text-sm text-text-primary">{phrase}</p>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            aria-label={`Play ${phrase}`}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-success hover:bg-success/10 transition-colors"
                          >
                            <Play size={14} />
                          </button>
                          <button
                            aria-label={`Edit ${phrase}`}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => remove(category, phrase)}
                            aria-label={`Delete ${phrase}`}
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