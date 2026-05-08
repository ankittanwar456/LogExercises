/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SetEntry {
  id: string;
  weight: number | null;
  reps: number | null;
  completedAt: string;
}

export type ExerciseTrackingType = "weighted" | "reps-only";

export interface ExerciseEntry {
  id: string;
  name: string;
  photo?: string;
  trackingType?: ExerciseTrackingType;
  sets: SetEntry[];
  isCompleted: boolean;
  notes?: string;
}

export interface WorkoutDay {
  date: string; // ISO string (YYYY-MM-DD)
  title: string;
  exercises: ExerciseEntry[];
  isCompleted: boolean;
  startTime: string;
  endTime?: string;
  totalDurationMs?: number;
}

export interface BodyWeightEntry {
  id: string;
  weight: number;
  recordedAt: string;
}

export interface UserProfile {
  age?: number;
  weight?: number;
  height?: number;
  bodyWeightHistory: BodyWeightEntry[];
}

export interface AppState {
  workouts: Record<string, WorkoutDay>;
  customExercises: ExerciseTemplate[];
  profile: UserProfile;
}

export interface ExerciseTemplate {
  name: string;
  photo?: string;
  trackingType?: ExerciseTrackingType;
}
