import { ExerciseTemplate } from "../types";

const repsOnlyExercises = new Set([
  "Ab Wheel Rollout",
  "Bicycle Crunch",
  "Chest Dip",
  "Chin Up",
  "Crunch",
  "Deep Push Up",
  "Hanging Leg Raise",
  "Jump Rope",
  "Mountain Climber",
  "Plank",
  "Pull Up",
  "Push Up",
  "Russian Twist",
  "Side Plank",
]);

const exercisePhoto = (name: string) => `/exercise-photos/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.jpg`;

const template = (name: string, _label: string, _accent: string): ExerciseTemplate => ({
  name,
  photo: exercisePhoto(name),
  trackingType: repsOnlyExercises.has(name) ? "reps-only" : "weighted",
});

export const defaultExerciseTemplates: ExerciseTemplate[] = [
  template("Ab Wheel Rollout", "AW", "#facc15"),
  template("Arnold Press", "AP", "#38bdf8"),
  template("Back Extension", "BE", "#34d399"),
  template("Barbell Curl", "BC", "#fb7185"),
  template("Barbell Row", "BR", "#a78bfa"),
  template("Bench Press", "BP", "#84cc16"),
  template("Bent Over Row", "BO", "#a78bfa"),
  template("Bicycle Crunch", "BI", "#f59e0b"),
  template("Bulgarian Split Squat", "BS", "#22c55e"),
  template("Cable Crossover", "CC", "#84cc16"),
  template("Cable Row", "CR", "#2dd4bf"),
  template("Calf Raise", "CA", "#60a5fa"),
  template("Chest Dip", "CD", "#84cc16"),
  template("Chest Fly", "CF", "#84cc16"),
  template("Chin Up", "CU", "#facc15"),
  template("Crunch", "CN", "#f59e0b"),
  template("Deadlift", "DL", "#f97316"),
  template("Decline Bench Press", "DB", "#84cc16"),
  template("Deep Push Up", "DU", "#84cc16"),
  template("Dumbbell Bench Press", "DP", "#84cc16"),
  template("Dumbbell Curl", "DC", "#fb7185"),
  template("Dumbbell Fly", "DF", "#84cc16"),
  template("Dumbbell Row", "DR", "#a78bfa"),
  template("Face Pull", "FP", "#38bdf8"),
  template("Farmer Carry", "FC", "#c084fc"),
  template("Front Raise", "FR", "#38bdf8"),
  template("Front Squat", "FS", "#22c55e"),
  template("Glute Bridge", "GB", "#34d399"),
  template("Goblet Squat", "GS", "#22c55e"),
  template("Hack Squat", "HS", "#22c55e"),
  template("Hammer Curl", "HC", "#fb7185"),
  template("Hanging Leg Raise", "HL", "#f59e0b"),
  template("Hip Abduction", "HA", "#34d399"),
  template("Hip Thrust", "HT", "#34d399"),
  template("Incline Bench Press", "IB", "#84cc16"),
  template("Incline Dumbbell Press", "IP", "#84cc16"),
  template("Jump Rope", "JR", "#f59e0b"),
  template("Kettlebell Swing", "KS", "#f97316"),
  template("Lateral Raise", "LR", "#38bdf8"),
  template("Lat Pulldown", "LP", "#2dd4bf"),
  template("Leg Curl", "LC", "#60a5fa"),
  template("Leg Extension", "LX", "#60a5fa"),
  template("Leg Press", "LE", "#60a5fa"),
  template("Lunge", "LU", "#34d399"),
  template("Mountain Climber", "MC", "#f59e0b"),
  template("Overhead Press", "OP", "#38bdf8"),
  template("Pec Deck", "PD", "#84cc16"),
  template("Plank", "PL", "#f59e0b"),
  template("Preacher Curl", "PC", "#fb7185"),
  template("Pull Up", "PU", "#facc15"),
  template("Push Up", "UP", "#84cc16"),
  template("Rear Delt Fly", "RD", "#38bdf8"),
  template("Reverse Curl", "RC", "#fb7185"),
  template("Romanian Deadlift", "RD", "#f97316"),
  template("Russian Twist", "RT", "#f59e0b"),
  template("Seated Cable Row", "SR", "#2dd4bf"),
  template("Shoulder Press", "SP", "#38bdf8"),
  template("Shrug", "SH", "#a78bfa"),
  template("Side Plank", "SL", "#f59e0b"),
  template("Skull Crusher", "SC", "#c084fc"),
  template("Squat", "SQ", "#22c55e"),
  template("Step Up", "SU", "#34d399"),
  template("Sumo Deadlift", "SD", "#f97316"),
  template("Tricep Extension", "TE", "#c084fc"),
  template("Tricep Pushdown", "TP", "#c084fc"),
  template("Upright Row", "UR", "#38bdf8"),
  template("Walking Lunge", "WL", "#34d399"),
];

export const mergeExerciseTemplates = (...templateGroups: ExerciseTemplate[][]) => {
  const templatesByName = new Map<string, ExerciseTemplate>();

  templateGroups.flat().forEach((template) => {
    const key = template.name.trim().toLowerCase();
    if (!key) return;

    const existing = templatesByName.get(key);
    const isLegacyGeneratedPhoto = template.photo?.startsWith("data:image/svg+xml");
    templatesByName.set(key, {
      ...template,
      photo: isLegacyGeneratedPhoto ? existing?.photo : template.photo ?? existing?.photo,
      trackingType: template.trackingType ?? existing?.trackingType ?? "weighted",
      primaryMuscle: template.primaryMuscle ?? existing?.primaryMuscle,
      secondaryMuscles: template.secondaryMuscles ?? existing?.secondaryMuscles,
    });
  });

  return Array.from(templatesByName.values()).sort((a, b) => a.name.localeCompare(b.name));
};
