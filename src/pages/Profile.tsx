import { Award, Clock, BookOpen, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAppData } from '../context/AppDataContext';

export function Profile() {
  const navigate = useNavigate();
  const { state, stats } = useAppData();
  const fullName = `${state.user.firstName} ${state.user.lastName}`.trim();

  const usageStats = [
    { label: 'Hours translated', value: String(stats.totalHoursTranslated), icon: Clock },
    { label: 'Phrases saved', value: String(stats.savedPhrases), icon: BookOpen },
  ];

  const achievedCount = Math.min(12, [
    stats.totalTranslations >= 1,
    stats.totalTranslations >= 10,
    stats.totalTranslations >= 25,
    stats.savedPhrases >= 1,
    stats.savedPhrases >= 10,
    stats.currentStreakDays >= 2,
    stats.currentStreakDays >= 7,
    stats.totalHoursTranslated >= 1,
    stats.totalHoursTranslated >= 5,
    stats.avgConfidence >= 95,
    stats.avgConfidence >= 98,
    state.reportsCount >= 1,
  ].filter(Boolean).length);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-10">
      <h1 className="text-2xl font-general font-semibold" style={{ fontFamily: 'var(--font-general)' }}>
        Profile
      </h1>

      <div className="flex flex-col md:flex-row gap-5">
        {/* Left card */}
        <Card className="md:w-56 shrink-0 flex flex-col items-center text-center" padding="lg">
          <div className="w-24 h-24 rounded-2xl bg-surface-alt border border-border mb-4" aria-hidden="true" />
          <h2 className="text-base font-semibold mb-0.5">{fullName || 'New User'}</h2>
          <p className="text-[11px] font-mono-sb text-text-secondary mb-1">{state.user.email || 'No email set'}</p>
          <span className="inline-block text-[10px] font-mono-sb uppercase tracking-widest px-2 py-0.5 rounded bg-primary-soft text-primary mb-6">
            {state.user.plan}
          </span>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            className="gap-2 text-error border-error/30 hover:bg-error/10"
            onClick={() => navigate('/')}
          >
            <LogOut size={14} /> Sign out
          </Button>
        </Card>

        {/* Right content */}
        <div className="flex-1 flex flex-col gap-5">
          <Card padding="lg">
            <h3 className="text-sm font-semibold mb-4">Usage stats</h3>
            <div className="grid grid-cols-2 gap-4">
              {usageStats.map(s => (
                <div key={s.label} className="p-4 rounded-xl bg-surface-alt">
                  <s.icon size={18} className="text-primary mb-3" />
                  <p className="text-[10px] font-mono-sb text-text-secondary uppercase tracking-widest mb-1">{s.label}</p>
                  <p className="text-3xl font-general font-semibold" style={{ fontFamily: 'var(--font-general)' }}>{s.value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Achievements</h3>
              <p className="text-[11px] font-mono-sb text-text-secondary">{achievedCount} of 12 earned</p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center border transition-colors ${
                    i < achievedCount
                      ? 'bg-primary-soft border-primary/30 text-primary'
                      : 'bg-surface-alt border-border text-border opacity-50 grayscale'
                  }`}
                >
                  <Award size={20} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}