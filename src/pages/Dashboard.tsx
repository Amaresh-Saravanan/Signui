import { motion } from 'framer-motion';
import { ArrowRight, Flame, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { SignLoader } from '../components/SignStroke';
import { formatHistoryTime, useAppData } from '../context/AppDataContext';

/* ── Card entrance variants ───────────────────────────── */
const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0 },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

/* ── Dashboard ─────────────────────────────────────────── */
export function Dashboard() {
  const { state, stats } = useAppData();
  const recentEntries = state.history.slice(0, 4);
  const savedPhrases = Object.values(state.phrasebook).flat().slice(0, 6);
  const chartMax = Math.max(1, ...stats.weeklyCounts);

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">

      {/* Context line — functional, not decorative */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flame size={18} className="text-ember" />
          <span className="text-sm font-medium text-text-secondary">
            <span className="text-text-primary font-semibold">{stats.currentStreakDays}-day streak</span>
            {' · '}Last session {stats.lastSessionAgoLabel} · {stats.activeMinutesToday} min translated today
          </span>
        </div>
        <Link to="/workspace">
          <Button size="md" className="gap-2">
            <Video size={15} /> New session
          </Button>
        </Link>
      </div>

      {/* ── ASYMMETRIC BENTO ──────────────────────────── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* ─ DOMINANT TILE: Today's session ─ */}
        <motion.div variants={cardVariants} className="md:col-span-2">
          <Card className="relative overflow-hidden h-full min-h-50">
            {/* Subtle bg gradient */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/6 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col h-full">
              <div className="text-[10px] font-mono-sb uppercase tracking-widest text-text-secondary mb-1">
                Today · Session
              </div>
              <div className="flex items-end gap-3 mb-1">
                <span className="text-6xl font-general font-semibold text-text-primary tracking-tight" style={{ fontFamily: 'var(--font-general)' }}>
                  {stats.totalTranslations}
                </span>
                <span className="text-lg text-text-secondary mb-2">phrases</span>
              </div>
              <p className="text-sm text-text-secondary mb-6">
                {stats.avgConfidence ? `${stats.avgConfidence}% accuracy` : 'No confidence data yet'} · {stats.activeMinutesToday} min active today
              </p>

              {/* Mini bar chart */}
              <div className="mt-auto flex items-end gap-1.5 h-14">
                {stats.weeklyCounts.map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end" title={`Day ${i + 1}: ${val}`}>
                    <motion.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.3 + i * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
                      style={{ transformOrigin: 'bottom', height: `${Math.round((val / chartMax) * 100)}%` }}
                      className={`w-full rounded-t ${i === 6 ? 'bg-primary' : 'bg-surface-alt'}`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] font-mono-sb text-text-secondary">Mon</span>
                <span className="text-[10px] font-mono-sb text-text-secondary">Today</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ─ SECONDARY TILES (stacked) ─ */}
        <div className="flex flex-col gap-4">
          <motion.div variants={cardVariants}>
            <Card className="h-full">
              <div className="text-[10px] font-mono-sb uppercase tracking-widest text-text-secondary mb-2">Time saved</div>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-4xl font-general font-semibold" style={{ fontFamily: 'var(--font-general)' }}>
                  {Math.max(0, stats.totalHoursTranslated).toFixed(1)}
                </span>
                <span className="text-lg text-text-secondary mb-1">hrs</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-success font-medium">
                <span>{stats.totalTranslations > 0 ? 'Updates as you translate' : 'Start a session to begin tracking'}</span>
              </div>
            </Card>
          </motion.div>
          <motion.div variants={cardVariants}>
            <Card className="h-full">
              <div className="text-[10px] font-mono-sb uppercase tracking-widest text-text-secondary mb-2">Streak</div>
              <div className="flex items-center gap-2">
                <Flame size={28} className="text-ember" />
                <span className="text-4xl font-general font-semibold" style={{ fontFamily: 'var(--font-general)' }}>{stats.currentStreakDays}</span>
                <span className="text-sm text-text-secondary mt-1">days</span>
              </div>
              <p className="text-xs text-text-secondary mt-2">Best: {stats.bestStreakDays} days</p>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {/* ── LOWER BENTO ROW ───────────────────────────── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* ─ Recent Transcript Feed ─ */}
        <motion.div variants={cardVariants} className="md:col-span-1">
          <Card className="flex flex-col h-full" padding="none">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Recent transcripts</h2>
                <p className="text-[11px] font-mono-sb text-text-secondary mt-0.5">Last 3 sessions</p>
              </div>
              <Link to="/history" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="flex flex-col divide-y divide-border">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="px-5 py-3 hover:bg-surface-alt/50 transition-colors">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[10px] font-mono-sb text-text-secondary">{formatHistoryTime(entry.timestamp)}</span>
                    <span className="text-[10px] font-mono-sb text-primary">You</span>
                  </div>
                  <p
                    className={`text-sm leading-relaxed ${
                      entry.type === 'text-to-sign'
                        ? 'font-mono-sb text-text-secondary italic'
                        : 'text-text-primary'
                    }`}
                    style={entry.type !== 'text-to-sign' ? { fontFamily: 'var(--font-inter)' } : undefined}
                  >
                    {`"${entry.text}"`}
                  </p>
                </div>
              ))}
              {recentEntries.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-text-secondary">
                  No transcript entries yet.
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* ─ Saved Phrases ─ */}
        <motion.div variants={cardVariants}>
          <Card className="flex flex-col h-full" padding="none">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Saved phrases</h2>
                <p className="text-[11px] font-mono-sb text-text-secondary mt-0.5">{stats.savedPhrases} total</p>
              </div>
              <Link to="/phrasebook" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                Edit all <ArrowRight size={12} />
              </Link>
            </div>
            {savedPhrases.length > 0 ? (
              <div className="flex flex-col divide-y divide-border">
                {savedPhrases.map((phrase, i) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-surface-alt/50 transition-colors group">
                    <p className="text-sm text-text-primary truncate">{phrase}</p>
                    <button className="shrink-0 text-xs font-mono-sb text-text-secondary opacity-0 group-hover:opacity-100 hover:text-primary transition-all">
                      Use
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <SignLoader size={40} className="mb-4 opacity-50" />
                <p className="text-sm font-medium text-text-secondary mb-1">No saved phrases yet</p>
                <p className="text-xs text-text-secondary mb-4">Save one from your next translation session.</p>
                <Link to="/workspace">
                  <Button variant="secondary" size="sm">Start translating</Button>
                </Link>
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}