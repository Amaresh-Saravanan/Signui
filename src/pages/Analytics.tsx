import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Card } from '../components/Card';
import { useAppData } from '../context/AppDataContext';
import { getAverageLatencyMs } from '../lib/latencyMetrics';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const LANG_COLORS = {
  ISL: 'bg-success',
  ASL: 'bg-primary',
  BSL: 'bg-[#F2994A]',
} as const;

export function Analytics() {
  const { stats } = useAppData();
  const totalLanguageHits = Object.values(stats.languageDistribution).reduce((sum, n) => sum + n, 0);
  const avgLatencyMs = getAverageLatencyMs();

  const BAR_DAYS = DAY_LABELS.map((label, idx) => ({ label, val: stats.weeklyCounts[idx] ?? 0 }));
  const maxBar = Math.max(1, ...BAR_DAYS.map((day) => day.val));

  const LANGS = (Object.keys(stats.languageDistribution) as Array<'ISL' | 'ASL' | 'BSL'>).map((code) => {
    const count = stats.languageDistribution[code];
    const pct = totalLanguageHits === 0 ? 0 : Math.round((count / totalLanguageHits) * 100);
    return { label: code, pct, color: LANG_COLORS[code] };
  });

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-10 page-enter">
      <div>
        <h1 className="text-2xl font-general font-semibold mb-0.5" style={{ fontFamily: 'var(--font-general)' }}>
          Analytics
        </h1>
        <p className="text-[11px] font-mono-sb text-text-secondary">Last 7 days</p>
      </div>

      {/* KPI row — dominant + supporting, not equal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2" padding="lg">
          <div className="text-[10px] font-mono-sb uppercase tracking-widest text-text-secondary mb-2">Total translations</div>
          <div className="flex items-end gap-3 mb-1">
            <span className="text-5xl font-general font-semibold" style={{ fontFamily: 'var(--font-general)' }}>{stats.totalTranslations}</span>
          </div>
          <div className="flex items-center gap-1.5 text-success text-sm font-medium mb-6">
            <ArrowUpRight size={16} /> {stats.totalTranslations > 0 ? 'Live updates from your usage' : 'Start translating to generate analytics'}
          </div>
          {/* Bar chart */}
          <div className="flex items-end gap-2 h-20">
            {BAR_DAYS.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end" style={{ height: 64 }}>
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 0.1 + i * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
                    style={{ transformOrigin: 'bottom', height: `${Math.round((d.val / maxBar) * 100)}%` }}
                    className={`w-full rounded-t ${i === 6 ? 'bg-primary' : 'bg-surface-alt'}`}
                  />
                </div>
                <span className="text-[10px] font-mono-sb text-text-secondary">{d.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <div className="text-[10px] font-mono-sb uppercase tracking-widest text-text-secondary mb-2">Avg. latency</div>
            <div className="text-4xl font-general font-semibold mb-1" style={{ fontFamily: 'var(--font-general)' }}>
              {avgLatencyMs !== null ? `${avgLatencyMs}ms` : '—'}
            </div>
            <p className="text-xs text-text-secondary">
              {avgLatencyMs !== null ? 'Rolling average of on-device inference' : 'No detections recorded this session yet'}
            </p>
          </Card>
          <Card>
            <div className="text-[10px] font-mono-sb uppercase tracking-widest text-text-secondary mb-2">Avg. confidence</div>
            <div className="text-4xl font-general font-semibold mb-1" style={{ fontFamily: 'var(--font-general)' }}>
              {stats.avgConfidence ? `${stats.avgConfidence}%` : '--'}
            </div>
            <p className="text-xs text-success">Based on detected sign confidence values</p>
          </Card>
        </div>
      </div>

      {/* Language distribution */}
      <Card padding="lg">
        <h3 className="text-sm font-semibold mb-5">Language distribution</h3>
        <div className="flex flex-col gap-4">
          {LANGS.map((l) => (
            <div key={l.label} className="flex items-center gap-4">
              <span className="w-10 text-sm font-mono-sb text-text-secondary">{l.label}</span>
              <div className="flex-1 h-2 bg-surface-alt rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${l.pct}%` }}
                  transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                  className={`h-full rounded-full ${l.color}`}
                />
              </div>
              <span className="w-8 text-right text-sm font-mono-sb text-text-secondary">{l.pct}%</span>
            </div>
          ))}
          {totalLanguageHits === 0 && (
            <p className="text-xs font-mono-sb text-text-secondary">No language usage yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}