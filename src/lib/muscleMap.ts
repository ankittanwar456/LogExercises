import { AppState } from "../types";
import { getExerciseByName } from "./exerciseDb";

// ─── Canonical muscles shown on the body map ─────────────────────────────────

export type MuscleId =
  | "neck"
  | "traps"
  | "shoulders"
  | "chest"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "lats"
  | "upperBack"
  | "lowerBack"
  | "glutes"
  | "quads"
  | "adductors"
  | "hamstrings"
  | "calves";

export const muscleLabel: Record<MuscleId, string> = {
  neck: "Neck",
  traps: "Trapezius",
  shoulders: "Shoulders",
  chest: "Chest",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  abs: "Abs",
  obliques: "Obliques",
  lats: "Lats",
  upperBack: "Upper Back",
  lowerBack: "Lower Back",
  glutes: "Glutes",
  quads: "Quads",
  adductors: "Adductors",
  hamstrings: "Hamstrings",
  calves: "Calves",
};

export const ALL_MUSCLE_IDS = Object.keys(muscleLabel) as MuscleId[];

export const MUSCLE_GROUPS: { label: string; muscles: MuscleId[] }[] = [
  { label: "Upper Body", muscles: ["neck", "traps", "shoulders", "chest", "biceps", "triceps", "forearms"] },
  { label: "Core", muscles: ["abs", "obliques"] },
  { label: "Back", muscles: ["lats", "upperBack", "lowerBack"] },
  { label: "Lower Body", muscles: ["glutes", "quads", "adductors", "hamstrings", "calves"] },
];

// ─── Map raw DB muscle strings → canonical muscle id ─────────────────────────
// Covers every distinct `target`, `muscle_group`, and `secondary_muscles`
// value present in public/exercises.db.

const muscleAliases: Record<string, MuscleId> = {
  // Neck
  "sternocleidomastoid": "neck",
  "levator scapulae": "neck",
  "neck": "neck",
  // Traps
  "traps": "traps",
  "trapezius": "traps",
  // Shoulders / delts / rotator cuff
  "delts": "shoulders",
  "deltoids": "shoulders",
  "shoulders": "shoulders",
  "rear deltoids": "shoulders",
  "rotator cuff": "shoulders",
  // Chest
  "pectorals": "chest",
  "chest": "chest",
  "upper chest": "chest",
  "serratus anterior": "chest",
  // Biceps
  "biceps": "biceps",
  "brachialis": "biceps",
  // Triceps
  "triceps": "triceps",
  // Forearms / grip / wrists / hands
  "forearms": "forearms",
  "wrist extensors": "forearms",
  "wrist flexors": "forearms",
  "grip muscles": "forearms",
  "hands": "forearms",
  "wrists": "forearms",
  // Abs / core
  "abs": "abs",
  "abdominals": "abs",
  "core": "abs",
  "lower abs": "abs",
  // Obliques
  "obliques": "obliques",
  // Lats
  "lats": "lats",
  "latissimus dorsi": "lats",
  "back": "lats",
  // Upper back
  "upper back": "upperBack",
  "rhomboids": "upperBack",
  // Lower back
  "lower back": "lowerBack",
  "spine": "lowerBack",
  // Glutes / hip abductors
  "glutes": "glutes",
  "abductors": "glutes",
  "hip flexors": "quads",
  // Quads
  "quads": "quads",
  "quadriceps": "quads",
  // Adductors / inner thigh
  "adductors": "adductors",
  "inner thighs": "adductors",
  "groin": "adductors",
  // Hamstrings
  "hamstrings": "hamstrings",
  // Calves / lower leg / ankles / feet
  "calves": "calves",
  "soleus": "calves",
  "shins": "calves",
  "ankle stabilizers": "calves",
  "ankles": "calves",
  "feet": "calves",
};

export function normalizeMuscle(raw: string | null | undefined): MuscleId | null {
  if (!raw) return null;
  return muscleAliases[raw.trim().toLowerCase()] ?? (ALL_MUSCLE_IDS.includes(raw as MuscleId) ? (raw as MuscleId) : null);
}

// ─── Activation computation ──────────────────────────────────────────────────

const PRIMARY_WEIGHT = 1;
const SECONDARY_WEIGHT = 0.4;

export interface MuscleActivation {
  score: number;
  sets: number;
  exercises: Record<string, number>; // exercise name → total sets contributing
}

export interface MuscleActivationResult {
  byMuscle: Partial<Record<MuscleId, MuscleActivation>>;
  maxScore: number;
}

export function getMuscleActivation(
  state: AppState,
  cutoff: string | null = null
): MuscleActivationResult {
  const byMuscle: Partial<Record<MuscleId, MuscleActivation>> = {};
  const customByName = new Map(
    state.customExercises.map((template) => [template.name.trim().toLowerCase(), template])
  );

  const bump = (id: MuscleId, score: number, sets: number, name: string) => {
    const entry = (byMuscle[id] ??= { score: 0, sets: 0, exercises: {} });
    entry.score += score;
    entry.sets += sets;
    entry.exercises[name] = (entry.exercises[name] ?? 0) + sets;
  };

  for (const [date, workout] of Object.entries(state.workouts)) {
    if (cutoff !== null && date < cutoff) continue;
    for (const exercise of workout.exercises) {
      const setCount = exercise.sets.length;
      if (setCount === 0) continue;

      const db = getExerciseByName(exercise.name);
      const custom = customByName.get(exercise.name.trim().toLowerCase());
      const counted = new Set<MuscleId>();

      if (db) {
        const primary = normalizeMuscle(db.target) ?? normalizeMuscle(db.muscle_group);
        if (primary) {
          bump(primary, setCount * PRIMARY_WEIGHT, setCount, exercise.name);
          counted.add(primary);
        }

        for (const sec of db.secondary_muscles ?? []) {
          const id = normalizeMuscle(sec);
          if (!id || counted.has(id)) continue;
          bump(id, setCount * SECONDARY_WEIGHT, setCount, exercise.name);
          counted.add(id);
        }
        continue;
      }

      const primary = normalizeMuscle(custom?.primaryMuscle);
      if (primary) {
        bump(primary, setCount * PRIMARY_WEIGHT, setCount, exercise.name);
        counted.add(primary);
      }

      for (const sec of custom?.secondaryMuscles ?? []) {
        const id = normalizeMuscle(sec);
        if (!id || counted.has(id)) continue;
        bump(id, setCount * SECONDARY_WEIGHT, setCount, exercise.name);
        counted.add(id);
      }
    }
  }

  const maxScore = Object.values(byMuscle).reduce(
    (acc, a) => (a && a.score > acc ? a.score : acc),
    0
  );

  return { byMuscle, maxScore };
}

export function splitExerciseMuscles(muscles: MuscleId[]): {
  primaryMuscle?: MuscleId;
  secondaryMuscles?: MuscleId[];
} {
  if (muscles.length === 0) return {};
  return {
    primaryMuscle: muscles[0],
    secondaryMuscles: muscles.length > 1 ? muscles.slice(1) : undefined,
  };
}

export function getExerciseMuscles(template: {
  primaryMuscle?: string;
  secondaryMuscles?: string[];
}): MuscleId[] {
  const primary = normalizeMuscle(template.primaryMuscle);
  const secondary = (template.secondaryMuscles ?? [])
    .map(normalizeMuscle)
    .filter((id): id is MuscleId => id !== null && id !== primary);

  return primary ? [primary, ...secondary] : secondary;
}

export function formatMuscleSummary(muscles: MuscleId[]): string {
  if (muscles.length === 0) return "Not set · optional";
  if (muscles.length <= 2) {
    return muscles.map((muscle) => muscleLabel[muscle]).join(" · ");
  }

  return `${muscleLabel[muscles[0]]} · ${muscleLabel[muscles[1]]} +${muscles.length - 2}`;
}

// ─── Intensity → colour scale (matches the consistency heatmap palette) ──────

const HEAT_STOPS = ["#365314", "#4d7c0f", "#65a30d", "#84cc16"];
const NEUTRAL = "#27272a"; // zinc-800, untrained muscle

export function muscleColor(score: number, maxScore: number): string {
  if (score <= 0 || maxScore <= 0) return NEUTRAL;
  return HEAT_STOPS[intensityBucket(score, maxScore) - 1];
}

export const muscleHeatLegend = HEAT_STOPS;
export const muscleNeutralColor = NEUTRAL;

/** Maps a muscle score to an intensity bucket 1–4 (0 = untrained). */
export function intensityBucket(score: number, maxScore: number): number {
  if (score <= 0 || maxScore <= 0) return 0;
  const ratio = score / maxScore;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

// ─── Mapping to react-body-highlighter muscle slugs ──────────────────────────
// Slugs supported by the library: trapezius, upper-back, lower-back, chest,
// biceps, triceps, forearm, back-deltoids, front-deltoids, abs, obliques,
// adductor, abductors, hamstring, quadriceps, calves, gluteal, head, neck, knees.

export const muscleIdToSlugs: Record<MuscleId, string[]> = {
  neck: ["neck"],
  traps: ["trapezius"],
  shoulders: ["front-deltoids", "back-deltoids"],
  chest: ["chest"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  forearms: ["forearm"],
  abs: ["abs"],
  obliques: ["obliques"],
  lats: ["upper-back"],
  upperBack: ["upper-back"],
  lowerBack: ["lower-back"],
  glutes: ["gluteal"],
  quads: ["quadriceps"],
  adductors: ["adductor"],
  hamstrings: ["hamstring"],
  calves: ["calves"],
};

/** Reverse lookup: which canonical muscles feed a given library slug. */
export const slugToMuscleIds: Record<string, MuscleId[]> = (() => {
  const out: Record<string, MuscleId[]> = {};
  for (const [id, slugs] of Object.entries(muscleIdToSlugs) as [MuscleId, string[]][]) {
    for (const slug of slugs) (out[slug] ??= []).push(id);
  }
  return out;
})();
