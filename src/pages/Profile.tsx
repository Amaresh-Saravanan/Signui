import { Award, Clock, BookOpen, LogOut, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAppData } from '../context/AppDataContext';
import { cn } from '../utils/cn';

export function Profile() {
  const navigate = useNavigate();
  const { state, stats, signOut } = useAppData();

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  const firstName = state.user.firstName || '';
  const lastName = state.user.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const initial = firstName.charAt(0).toUpperCase() || 'U';

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
    <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-16 px-4 md:px-0 page-enter">
      <div>
        <h1 className="text-2xl font-general font-bold tracking-tight text-text-primary mb-1" style={{ fontFamily: 'var(--font-general)' }}>
          Profile
        </h1>
        <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-text-secondary font-semibold">User identity and translation metrics</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* ── LEFT CELL: IDENTITY ────────────────────────────────── */}
        <Card className="md:w-60 shrink-0 flex flex-col items-center text-center bg-white/[0.02] dark:bg-white/[0.01] border-black/[0.06] dark:border-white/[0.05] backdrop-blur-md rounded-2xl p-6" padding="none">

          {/* Custom Sleek Glass Monogram Avatar */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-black/[0.02] to-black/[0.08] dark:from-white/[0.02] dark:to-white/[0.08] border border-black/[0.08] dark:border-white/[0.08] shadow-inner mb-4 relative overflow-hidden group">
            <span className="text-xl font-general font-bold text-text-primary tracking-tight">
              {initial}
            </span>
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/[0.03] to-transparent pointer-events-none" />
          </div>

          <h2 className="text-base font-bold text-text-primary mb-0.5">{fullName || 'New User'}</h2>
          <p className="text-[11px] font-mono text-text-secondary mb-8 break-all max-w-full px-2">{state.user.email || 'No email set'}</p>

          <Button
            variant="secondary"
            size="sm"
            fullWidth
            className="gap-2 h-9 text-xs font-bold rounded-xl border border-red-500/20 bg-red-500/[0.04] hover:bg-red-500/[0.12] text-red-500 transition-all duration-200 mt-auto"
            onClick={handleSignOut}
          >
            <LogOut size={13} /> Sign out
          </Button>
        </Card>

        {/* ── RIGHT CELL: ANALYTICS MATRIX ──────────────────────── */}
        <div className="flex-1 flex flex-col gap-6">

          {/* Usage Metrics */}
          <Card padding="lg" className="bg-white/[0.02] dark:bg-white/[0.01] border-black/[0.06] dark:border-white/[0.05] backdrop-blur-md rounded-2xl">
            <h3 className="text-sm font-bold text-text-primary mb-4">Usage Analytics</h3>
            <div className="grid grid-cols-2 gap-4">
              {usageStats.map(s => (
                <div key={s.label} className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.01] border border-black/[0.04] dark:border-white/[0.04]">
                  <s.icon size={16} className="text-primary mb-2" />
                  <p className="text-[10px] font-mono uppercase tracking-wider text-text-secondary mb-1">{s.label}</p>
                  <p className="text-2xl font-general font-bold text-text-primary" style={{ fontFamily: 'var(--font-general)' }}>{s.value}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Consistency Matrix */}
          <Card padding="lg" className="bg-white/[0.02] dark:bg-white/[0.01] border-black/[0.06] dark:border-white/[0.05] backdrop-blur-md rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-text-primary">Consistency Matrix</h3>
              <p className="text-[11px] font-mono text-primary font-bold">{stats.currentStreakDays || 0} Day Streak Active</p>
            </div>
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-black/[0.01] dark:bg-white/[0.01] border border-black/[0.02] dark:border-white/[0.02]">
              {Array.from({ length: 5 }, (_, idx) => {
                const isActive = idx < (stats.currentStreakDays || 1);
                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 flex-1">
                    <div className={cn(
                      "w-full h-2 rounded-sm transition-all duration-300",
                      isActive ? "bg-primary/30 dark:bg-primary/40" : "bg-black/[0.05] dark:bg-white/[0.05]"
                    )} />
                    <span className="text-[9px] font-mono uppercase tracking-wider text-text-secondary">P-{5 - idx}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Achievements Grid */}
          <Card padding="lg" className="bg-white/[0.02] dark:bg-white/[0.01] border-black/[0.06] dark:border-white/[0.05] backdrop-blur-md rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-text-primary">System Milestone Badges</h3>
              <p className="text-[11px] font-mono text-text-secondary font-semibold">{achievedCount} / 12 unlocked</p>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {Array.from({ length: 12 }, (_, i) => {
                const isEarned = i < achievedCount;
                return (
                  <div
                    key={i}
                    className={cn(
                      "aspect-square rounded-xl flex flex-col items-center justify-center border transition-all duration-300 relative group",
                      isEarned
                        ? "bg-primary/[0.06] border-primary/30 text-primary"
                        : "bg-black/[0.01] dark:bg-white/[0.01] border-black/[0.05] dark:border-white/[0.05] text-text-secondary/40 opacity-40"
                    )}
                  >
                    <Award size={18} className={cn("transition-transform duration-200", isEarned && "group-hover:scale-110")} />
                    {isEarned && (
                      <CheckCircle2 size={10} className="absolute top-1 right-1 text-primary/80 dynamic-icon" />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}