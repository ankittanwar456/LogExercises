import { AppState, UserProfile, WorkoutDay } from "../types";

const STORAGE_KEY = "reptrack_data";
const MAX_PERSISTED_PHOTO_LENGTH = 300_000;

const createDefaultProfile = (): UserProfile => ({
  bodyWeightHistory: [],
});

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
  customExercises: state.customExercises.map((exercise) =>
    exercise.photo?.startsWith("data:") && exercise.photo.length > MAX_PERSISTED_PHOTO_LENGTH
      ? { ...exercise, photo: undefined }
      : exercise
  ),
  profile: {
    ...createDefaultProfile(),
    ...state.profile,
    bodyWeightHistory: state.profile?.bodyWeightHistory ?? [],
  },
});

export const loadState = (): AppState => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return sanitizeState({
        workouts: parsed.workouts ?? {},
        customExercises: parsed.customExercises ?? [],
        profile: parsed.profile ?? createDefaultProfile(),
      });
    } catch (e) {
      console.error("Failed to parse stored state", e);
    }
  }
  return {
    workouts: {},
    customExercises: [],
    profile: createDefaultProfile(),
  };
};

export const saveState = (state: AppState): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeState(state)));
    return true;
  } catch (e) {
    console.error("Failed to save state", e);
    return false;
  }
};

export const getWorkoutForDate = (state: AppState, dateStr: string): WorkoutDay | null => {
  return state.workouts[dateStr] || null;
};
