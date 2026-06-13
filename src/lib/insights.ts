import { differenceInCalendarDays, format, getDay, parseISO } from "date-fns";
import { AppState } from "../types";
import { getExerciseByName } from "./exerciseDb";

// ─── Headline stats ──────────────────────────────────────────────────────────

export interface HeadlineStats {
  totalWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  workoutsThisWeek: number;
  workoutsThisMonth: number;
  totalVolumeKg: number;
  avgDurationMs: number;
}

export function getHeadlineStats(state: AppState): HeadlineStats {
  const allDates = Object.keys(state.workouts).sort();
  const completedWorkouts = allDates.filter((d) => state.workouts[d].isCompleted);

  const today = format(new Date(), "yyyy-MM-dd");
  const nowDate = new Date();

  // Streak
  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 0;
  let prevDate: string | null = null;

  for (const d of completedWorkouts) {
    if (!prevDate) {
      streak = 1;
    } else {
      const gap = differenceInCalendarDays(parseISO(d), parseISO(prevDate));
      streak = gap === 1 ? streak + 1 : 1;
    }
    longestStreak = Math.max(longestStreak, streak);
    prevDate = d;
  }

  // Current streak: ends on today or yesterday
  streak = 0;
  for (let i = completedWorkouts.length - 1; i >= 0; i--) {
    const d = completedWorkouts[i];
    if (i === completedWorkouts.length - 1) {
      const gap = differenceInCalendarDays(nowDate, parseISO(d));
      if (gap > 1) break;
      streak = 1;
    } else {
      const gap = differenceInCalendarDays(parseISO(completedWorkouts[i + 1]), parseISO(d));
      if (gap !== 1) break;
      streak++;
    }
  }
  currentStreak = streak;

  // This week (Mon–Sun)
  const dayOfWeek = nowDate.getDay(); // 0=Sun
  const startOfWeek = new Date(nowDate);
  startOfWeek.setDate(nowDate.getDate() - ((dayOfWeek + 6) % 7));
  const weekStart = format(startOfWeek, "yyyy-MM-dd");
  const workoutsThisWeek = completedWorkouts.filter((d) => d >= weekStart && d <= today).length;

  // This month
  const monthStart = format(new Date(nowDate.getFullYear(), nowDate.getMonth(), 1), "yyyy-MM-dd");
  const workoutsThisMonth = completedWorkouts.filter((d) => d >= monthStart && d <= today).length;

  // Total volume
  let totalVolumeKg = 0;
  for (const workout of Object.values(state.workouts)) {
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        if (set.weight != null && set.reps != null) {
          totalVolumeKg += set.weight * set.reps;
        }
      }
    }
  }

  // Avg duration (completed with totalDurationMs)
  const durationsMs = completedWorkouts
    .map((d) => state.workouts[d].totalDurationMs)
    .filter((ms): ms is number => typeof ms === "number" && ms > 0);
  const avgDurationMs = durationsMs.length > 0 ? durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length : 0;

  return {
    totalWorkouts: completedWorkouts.length,
    currentStreak,
    longestStreak,
    workoutsThisWeek,
    workoutsThisMonth,
    totalVolumeKg,
    avgDurationMs,
  };
}

// ─── Exercise list ────────────────────────────────────────────────────────────

export function getLoggedExerciseNames(state: AppState): string[] {
  const names = new Set<string>();
  for (const workout of Object.values(state.workouts)) {
    for (const exercise of workout.exercises) {
      if (exercise.sets.length > 0) names.add(exercise.name);
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

// ─── Per-exercise progression ────────────────────────────────────────────────

export interface ExerciseSessionPoint {
  date: string; // YYYY-MM-DD
  est1RM: number;
  volumeKg: number;
  bestWeightKg: number | null;
  bestReps: number;
}

export interface PersonalRecords {
  maxWeightKg: number | null;
  maxReps: number;
  bestEst1RM: number;
  maxVolumeKg: number;
}

function epley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function getExerciseProgression(state: AppState, name: string): ExerciseSessionPoint[] {
  const sorted = Object.keys(state.workouts).sort();
  const points: ExerciseSessionPoint[] = [];

  for (const date of sorted) {
    const workout = state.workouts[date];
    const exercise = workout.exercises.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (!exercise || exercise.sets.length === 0) continue;

    let best1RM = 0;
    let volumeKg = 0;
    let bestWeightKg: number | null = null;
    let bestReps = 0;

    for (const set of exercise.sets) {
      const w = set.weight ?? 0;
      const r = set.reps ?? 0;
      if (r === 0) continue;

      volumeKg += w * r;
      if (set.weight != null) {
        best1RM = Math.max(best1RM, epley1RM(w, r));
        bestWeightKg = Math.max(bestWeightKg ?? 0, set.weight);
        bestReps = Math.max(bestReps, r);
      } else {
        bestReps = Math.max(bestReps, r);
      }
    }

    if (volumeKg > 0 || bestReps > 0) {
      points.push({ date, est1RM: Math.round(best1RM * 10) / 10, volumeKg: Math.round(volumeKg * 10) / 10, bestWeightKg, bestReps });
    }
  }

  return points;
}

export function getPersonalRecords(state: AppState, name: string): PersonalRecords {
  const progression = getExerciseProgression(state, name);
  if (progression.length === 0) return { maxWeightKg: null, maxReps: 0, bestEst1RM: 0, maxVolumeKg: 0 };

  return {
    maxWeightKg: progression.reduce((acc, p) => (p.bestWeightKg != null ? Math.max(acc ?? 0, p.bestWeightKg) : acc), null as number | null),
    maxReps: Math.max(...progression.map((p) => p.bestReps)),
    bestEst1RM: Math.max(...progression.map((p) => p.est1RM)),
    maxVolumeKg: Math.max(...progression.map((p) => p.volumeKg)),
  };
}

// ─── Muscle group volume ─────────────────────────────────────────────────────

const muscleGroupLabelMap: Record<string, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  upper_arms: "Arms",
  lower_arms: "Arms",
  upper_legs: "Legs",
  lower_legs: "Legs",
  waist: "Core",
  cardio: "Cardio",
  neck: "Neck",
};

export function getMuscleGroupVolume(state: AppState): { group: string; volumeKg: number }[] {
  const totals: Record<string, number> = {};

  for (const workout of Object.values(state.workouts)) {
    for (const exercise of workout.exercises) {
      const dbEntry = getExerciseByName(exercise.name);
      const rawGroup = dbEntry?.muscle_group ?? null;
      const group = rawGroup ? (muscleGroupLabelMap[rawGroup] ?? rawGroup) : "Other";

      let vol = 0;
      for (const set of exercise.sets) {
        const w = set.weight ?? 0;
        const r = set.reps ?? 0;
        vol += w * r;
      }

      totals[group] = (totals[group] ?? 0) + vol;
    }
  }

  return Object.entries(totals)
    .map(([group, volumeKg]) => ({ group, volumeKg: Math.round(volumeKg) }))
    .sort((a, b) => b.volumeKg - a.volumeKg);
}

// ─── Consistency ─────────────────────────────────────────────────────────────

export interface WeekdayCount {
  weekday: string; // "Mon", "Tue", ...
  count: number;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getConsistencyByWeekday(state: AppState): WeekdayCount[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const date of Object.keys(state.workouts)) {
    const workout = state.workouts[date];
    if (!workout.isCompleted) continue;
    const dayIndex = getDay(parseISO(date));
    counts[dayIndex]++;
  }
  // Re-order Mon–Sun
  return [1, 2, 3, 4, 5, 6, 0].map((i) => ({ weekday: WEEKDAY_LABELS[i], count: counts[i] }));
}

export function getWorkoutHeatmapData(state: AppState): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [date, workout] of Object.entries(state.workouts)) {
    if (workout.isCompleted) {
      result[date] = workout.exercises.length;
    }
  }
  return result;
}

// ─── Body weight ─────────────────────────────────────────────────────────────

export interface BodyWeightPoint {
  date: string;
  weightKg: number;
}

export function getBodyWeightSeries(state: AppState): BodyWeightPoint[] {
  return [...state.profile.bodyWeightHistory]
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .map((entry) => ({
      date: entry.recordedAt.slice(0, 10),
      weightKg: entry.weight,
    }));
}

export function getBmi(state: AppState): number | null {
  const h = state.profile.height;
  const latestWeight = state.profile.bodyWeightHistory.length > 0
    ? [...state.profile.bodyWeightHistory].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0].weight
    : state.profile.weight;

  if (!h || !latestWeight) return null;
  const heightM = h / 100;
  return Math.round((latestWeight / (heightM * heightM)) * 10) / 10;
}
