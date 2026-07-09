import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { ArrowRight, BookOpen, Users, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAppData } from '../context/AppDataContext';
import { cn } from '../utils/cn';

/* ── Animation Variants ────────────────────────────────── */
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export function Dashboard() {
  const { state, stats } = useAppData();
  const chartMax = Math.max(1, ...stats.weeklyCounts);

  // Derive total saved phrases count directly from real data
  const totalSavedPhrases = Object.values(state.phrasebook).flat().length;

  // Active workspace rooms config (safely cast to bypass missing type definition)
  const activeRoomsCount = (stats as any).activeRooms || 0;

  // Dynamically calculate the highest activity index for target scaling/highlighting 
  const highestActivityIndex = stats.weeklyCounts.indexOf(Math.max(...stats.weeklyCounts));

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8 page-enter text-text-primary antialiased">

      {/* ── HEADER CONTEXT ────────────────── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-extrabold tracking-tight text-text-primary font-sans">
          Welcome back, <span className="bg-gradient-to-r from-primary via-indigo-500 to-teal-400 bg-clip-text text-transparent">Akshaya</span>
        </h1>
        <p className="text-xs font-medium tracking-wide text-text-secondary">
          Here is your translation activity and studio workflow summary.
        </p>
      </div>

      {/* ── TOP SECTION: INSTANT TRANSLATE PANEL ────────── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
        {/* Modern Interactive Hero Tile */}
        <motion.div variants={cardVariants} className="lg:col-span-8">
          <Card className="relative overflow-hidden p-8 bg-white/[0.02] dark:bg-white/[0.01] border-black/[0.06] dark:border-white/[0.05] backdrop-blur-xl min-h-[260px] flex flex-col justify-between group shadow-sm rounded-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#00bfa5]/[0.03] to-transparent rounded-full blur-[90px] pointer-events-none" />

            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold tracking-wider text-[#00bfa5] uppercase bg-[#00bfa5]/[0.08] border border-[#00bfa5]/10 rounded-full">
                <Sparkles size={11} />
                <span>Live Studio Interpreter</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-text-primary">Instant Translate</h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                Begin a real-time sign language session using high-accuracy gesture tracking models. Capture streams dynamically and map sign expressions to fluid text interpretations instantly.
              </p>
            </div>

            <div className="pt-6">
              <Link to="/workspace">
                <Button size="lg" className="bg-white/[0.02] dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.08] hover:bg-[#00bfa5]/[0.08] hover:border-[#00bfa5]/30 text-text-primary hover:text-[#00bfa5] font-bold px-7 py-3 rounded-full transition-all duration-200">
                  Launch Studio
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>

        {/* Dynamic Navigation Cards Column */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <motion.div variants={cardVariants} className="flex-1">
            <Card className="p-5 bg-white/[0.02] dark:bg-white/[0.01] border-black/[0.06] dark:border-white/[0.05] backdrop-blur-md h-full flex items-center justify-between group hover:border-[#00bfa5]/20 transition-all rounded-2xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#00bfa5]/[0.06] border border-[#00bfa5]/10 flex items-center justify-center text-[#00bfa5]">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary transition-colors group-hover:text-[#00bfa5]">Phrasebook</h3>
                  <p className="text-xs text-text-secondary font-mono mt-0.5">{totalSavedPhrases} Saved Phrases</p>
                </div>
              </div>
              <Link to="/phrasebook" className="w-8 h-8 rounded-full border border-black/[0.06] dark:border-white/[0.05] flex items-center justify-center text-text-secondary group-hover:text-[#00bfa5] group-hover:border-[#00bfa5]/30 transition-all bg-black/[0.01] dark:bg-white/[0.01]">
                <ArrowRight size={14} />
              </Link>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants} className="flex-1">
            <Card className="p-5 bg-white/[0.02] dark:bg-white/[0.01] border-black/[0.06] dark:border-white/[0.05] backdrop-blur-md h-full flex items-center justify-between group hover:border-[#00bfa5]/20 transition-all rounded-2xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#00bfa5]/[0.06] border border-[#00bfa5]/10 flex items-center justify-center text-[#00bfa5]">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary transition-colors group-hover:text-[#00bfa5]">Collaboration</h3>
                  <p className="text-xs text-text-secondary font-mono mt-0.5">{activeRoomsCount} Active Rooms</p>
                </div>
              </div>
              <Link to="/workspace" className="w-8 h-8 rounded-full border border-black/[0.06] dark:border-white/[0.05] flex items-center justify-center text-text-secondary group-hover:text-[#00bfa5] group-hover:border-[#00bfa5]/30 transition-all bg-black/[0.01] dark:bg-white/[0.01]">
                <ArrowRight size={14} />
              </Link>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {/* ── LOWER SECTION: FULL-WIDTH ANALYTICS ROW ────────────────── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
        {/* Expanded Premium Usage Analytics Chart */}
        <motion.div variants={cardVariants} className="lg:col-span-12">
          <Card className="p-6 bg-white/[0.02] dark:bg-white/[0.01] border-black/[0.06] dark:border-white/[0.05] backdrop-blur-xl flex flex-col justify-between min-h-[340px] rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold tracking-wide text-text-primary flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-[#00bfa5]" />
                  Usage Analytics
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">Active translation sequence counts over recent cycles</p>
              </div>
            </div>

            {/* Custom High-Fidelity Bar Display */}
            <div className="flex items-end gap-4 h-44 px-2 mt-6">
              {stats.weeklyCounts.map((val, i) => {
                const isPeakColumn = i === highestActivityIndex;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group/bar" title={`Volume: ${val}`}>
                    <motion.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.05 + i * 0.03, type: "spring", stiffness: 180, damping: 18 }}
                      style={{
                        transformOrigin: 'bottom',
                        height: `${Math.max(8, Math.round((val / chartMax) * 100))}%`
                      }}
                      className={cn(
                        "w-full rounded-t-lg transition-all duration-200 border border-transparent",
                        isPeakColumn
                          ? 'bg-[#00bfa5]/20 border-[#00bfa5]/30 shadow-sm shadow-[#00bfa5]/5 scale-x-[1.01]'
                          : 'bg-black/[0.04] dark:bg-white/[0.04] group-hover/bar:bg-[#00bfa5]/10 group-hover/bar:border-[#00bfa5]/10'
                      )}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono tracking-wider text-text-secondary mt-4 px-1 border-t border-black/[0.06] dark:border-white/[0.05] pt-3">
              <span>START PERIOD</span>
              <span>MIDPOINT</span>
              <span>TODAY</span>
            </div>
          </Card>
        </motion.div>
      </motion.div>

    </div>
  );
}