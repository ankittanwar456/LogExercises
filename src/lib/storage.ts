import { AppState, WorkoutDay } from "../types";

const STORAGE_KEY = "reptrack_data";

const removeWorkoutExercisePhotos = (workouts: AppState["workouts"]): AppState["workouts"] =>
  Object.fromEntries(
    Object.entries(workouts).map(([date, workout]) => [
      date,
      {
        ...workout,
        exercises: workout.exercises.map((exercise) => {
          const { photo, ...exerciseWithoutPhoto } = exercise;
          return exerciseWithoutPhoto;
        }),
      },
    ])
  );

const sanitizeState = (state: AppState): AppState => ({
  workouts: removeWorkoutExercisePhotos(state.workouts),
  customExercises: state.customExercises,
});

export const loadState = (): AppState => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return sanitizeState({
        workouts: parsed.workouts ?? {},
        customExercises: parsed.customExercises ?? [],
      });
    } catch (e) {
      console.error("Failed to parse stored state", e);
    }
  }
  return {
    workouts: {},
    customExercises: [],
  };
};

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeState(state)));
};

export const getWorkoutForDate = (state: AppState, dateStr: string): WorkoutDay | null => {
  return state.workouts[dateStr] || null;
};
