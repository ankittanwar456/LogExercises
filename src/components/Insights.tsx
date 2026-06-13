import React, { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Flame, Dumbbell, Clock, TrendingUp } from "lucide-react";
import { AppState } from "../types";
import {
  getHeadlineStats,
  getLoggedExerciseNames,
  getExerciseProgression,
  getPersonalRecords,
  getMuscleGroupVolume,
  getConsistencyByWeekday,
  getWorkoutHeatmapData,
  getBodyWeightSeries,
  getBmi,
} from "../lib/insights";
import LineChart from "./charts/LineChart";
import BarChart from "./charts/BarChart";
import Heatmap from "./charts/Heatmap";
import { cn } from "../lib/utils";

interface InsightsProps {
  state: AppState;
  dbReady: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function formatVolume(kg: number): string {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)}M kg`;
  if (kg >= 1_000) return `${(kg / 1_000).toFixed(1)}k kg`;
  return `${Math.round(kg)} kg`;
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}

function StatCard({ icon, label, value, sub, highlight }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4 border space-y-2",
        highlight
          ? "bg-lime-500/10 border-lime-500/30"
          : "bg-zinc-900 border-zinc-800"
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("opacity-60", highlight ? "text-lime-400" : "text-zinc-500")}>{icon}</span>
        <span className="text-[9px] font-black uppercase tracking-widest italic text-zinc-500">{label}</span>
      </div>
      <p className={cn("text-2xl font-black italic tracking-tighter leading-none", highlight ? "text-lime-400" : "text-white")}>
        {value}
      </p>
      {sub && <p className="text-[9px] font-black uppercase italic tracking-widest text-zinc-600">{sub}</p>}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-[10px] font-black uppercase tracking-[0.25em] italic text-zinc-500 px-1">{title}</h2>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type ProgressionMode = "1rm" | "volume";

export default function Insights({ state, dbReady }: InsightsProps) {
  const stats = useMemo(() => getHeadlineStats(state), [state]);
  const exerciseNames = useMemo(() => getLoggedExerciseNames(state), [state]);
  const [selectedExercise, setSelectedExercise] = useState<string>(() => exerciseNames[0] ?? "");
  const [progressionMode, setProgressionMode] = useState<ProgressionMode>("1rm");

  const progression = useMemo(
    () => (selectedExercise ? getExerciseProgression(state, selectedExercise) : []),
    [state, selectedExercise]
  );
  const prs = useMemo(
    () => (selectedExercise ? getPersonalRecords(state, selectedExercise) : null),
    [state, selectedExercise]
  );

  const muscleVolume = useMemo(() => (dbReady ? getMuscleGroupVolume(state) : []), [state, dbReady]);
  const weekdayConsistency = useMemo(() => getConsistencyByWeekday(state), [state]);
  const heatmapData = useMemo(() => getWorkoutHeatmapData(state), [state]);
  const bodyWeightSeries = useMemo(() => getBodyWeightSeries(state), [state]);
  const bmi = useMemo(() => getBmi(state), [state]);

  const hasWorkouts = stats.totalWorkouts > 0;

  const progressionChartData = useMemo(
    () =>
      progression.map((p) => ({
        x: p.date,
        y: progressionMode === "1rm" ? p.est1RM : p.volumeKg,
      })),
    [progression, progressionMode]
  );

  const bodyWeightChartData = useMemo(
    () => bodyWeightSeries.map((p) => ({ x: p.date, y: p.weightKg })),
    [bodyWeightSeries]
  );

  const formatDate = (d: string) => {
    try {
      return format(parseISO(d), "d MMM");
    } catch {
      return d;
    }
  };

  return (
    <div className="p-6 pt-12 space-y-12">
      {/* Header */}
      <div className="px-2">
        <h1 className="text-7xl font-black tracking-tighter leading-none mb-2 text-white italic">INSIGHTS</h1>
        <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-[10px] italic">Your Performance Data</p>
      </div>

      {/* ── Headline stats ── */}
      <Section title="Overview">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Dumbbell className="w-4 h-4" />}
            label="Total Workouts"
            value={String(stats.totalWorkouts)}
            sub={`${stats.workoutsThisMonth} this month`}
          />
          <StatCard
            icon={<Flame className="w-4 h-4" />}
            label="Current Streak"
            value={`${stats.currentStreak}d`}
            sub={`Best: ${stats.longestStreak}d`}
            highlight={stats.currentStreak > 0}
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Total Volume"
            value={formatVolume(stats.totalVolumeKg)}
            sub="weight × reps"
          />
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            label="Avg Duration"
            value={stats.avgDurationMs > 0 ? formatDuration(stats.avgDurationMs) : "—"}
            sub={`${stats.workoutsThisWeek} this week`}
          />
        </div>
      </Section>

      {/* ── Training heatmap ── */}
      <Section title="Consistency — Last 6 Months">
        {hasWorkouts ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <Heatmap counts={heatmapData} weeks={26} />
            <div className="flex items-center gap-2 mt-3 justify-end">
              <span className="text-[9px] font-black uppercase italic text-zinc-600">Less</span>
              {["#18181b", "#365314", "#4d7c0f", "#84cc16"].map((c) => (
                <span key={c} className="w-3 h-3 rounded-sm block" style={{ backgroundColor: c }} />
              ))}
              <span className="text-[9px] font-black uppercase italic text-zinc-600">More</span>
            </div>
          </div>
        ) : (
          <EmptyCard message="Start logging workouts to see your consistency heatmap." />
        )}
      </Section>

      {/* ── Weekday frequency ── */}
      <Section title="Training Days">
        {hasWorkouts ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <BarChart
              data={weekdayConsistency.map((w) => ({ label: w.weekday, value: w.count }))}
              formatValue={(v) => `${v}×`}
            />
          </div>
        ) : (
          <EmptyCard message="No workouts logged yet." />
        )}
      </Section>

      {/* ── Exercise progression ── */}
      <Section title="Exercise Progression">
        {exerciseNames.length > 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4">
            {/* Exercise picker */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
              {exerciseNames.map((name) => (
                <button
                  key={name}
                  onClick={() => setSelectedExercise(name)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest italic transition-colors",
                    selectedExercise === name
                      ? "bg-lime-500 text-black"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  )}
                >
                  {name}
                </button>
              ))}
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2">
              {(["1rm", "volume"] as ProgressionMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setProgressionMode(mode)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest italic transition-colors",
                    progressionMode === mode ? "bg-zinc-700 text-white" : "text-zinc-600 hover:text-zinc-400"
                  )}
                >
                  {mode === "1rm" ? "Est. 1RM" : "Volume"}
                </button>
              ))}
            </div>

            {/* Chart */}
            <LineChart
              data={progressionChartData}
              height={180}
              yLabel={progressionMode === "1rm" ? "kg" : "kg"}
              formatY={(v) => `${v}`}
              formatX={formatDate}
            />

            {/* PRs */}
            {prs && (prs.bestEst1RM > 0 || prs.maxReps > 0) && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                {prs.maxWeightKg != null && (
                  <PRBadge label="Best Weight" value={`${prs.maxWeightKg} kg`} />
                )}
                <PRBadge label="Best Est. 1RM" value={`${prs.bestEst1RM} kg`} />
                <PRBadge label="Most Reps" value={`${prs.maxReps} reps`} />
                <PRBadge label="Best Session Vol." value={formatVolume(prs.maxVolumeKg)} />
              </div>
            )}
          </div>
        ) : (
          <EmptyCard message="Log your first workout to track progression." />
        )}
      </Section>

      {/* ── Muscle group balance ── */}
      <Section title="Volume by Muscle Group">
        {dbReady && muscleVolume.length > 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <BarChart
              data={muscleVolume.map((m) => ({ label: m.group, value: m.volumeKg }))}
              formatValue={(v) => formatVolume(v)}
              maxBars={8}
            />
          </div>
        ) : !dbReady ? (
          <EmptyCard message="Exercise database loading…" />
        ) : (
          <EmptyCard message="No weighted exercises logged yet." />
        )}
      </Section>

      {/* ── Body weight ── */}
      <Section title="Body Weight">
        {bodyWeightSeries.length > 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
            {bmi != null && (
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-widest italic text-zinc-500">BMI</span>
                <span className="text-lg font-black italic text-white">{bmi}</span>
                <span className="text-[9px] font-black italic text-zinc-600">{bmiCategory(bmi)}</span>
              </div>
            )}
            <LineChart
              data={bodyWeightChartData}
              height={160}
              yLabel="kg"
              formatY={(v) => `${v}`}
              formatX={formatDate}
              color="#a78bfa"
            />
          </div>
        ) : (
          <EmptyCard message="Log your body weight in Settings → Profile to see trends here." />
        )}
      </Section>

      {/* bottom spacer for nav bar */}
      <div className="h-4" />
    </div>
  );
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function PRBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-950 rounded-xl p-3 space-y-1">
      <p className="text-[9px] font-black uppercase italic tracking-widest text-zinc-600">{label}</p>
      <p className="text-base font-black italic text-lime-400 tracking-tighter">{value}</p>
    </div>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-2xl p-6 text-center">
      <p className="text-[10px] font-black uppercase italic tracking-widest text-zinc-600">{message}</p>
    </div>
  );
}

function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}
