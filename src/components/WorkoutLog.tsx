import { motion, AnimatePresence } from "motion/react";
import { Plus, CheckCircle2, Play, Circle, Calendar as CalendarIcon, ArrowLeft, RotateCcw, Database } from "lucide-react";
import { WorkoutDay, ExerciseEntry, ExerciseTemplate, ExerciseTrackingType } from "../types";
import { format } from "date-fns";
import ExerciseCard from "./ExerciseCard";
import { useEffect, useMemo, useState } from "react";
import { cn, scrollFocusedFieldIntoView } from "../lib/utils";
import { searchExercisesByName, DbExercise, exerciseNameMatchesSearch, getExerciseSearchTerms } from "../lib/exerciseDb";
import { fetchAndCacheImage, getCachedImage } from "../lib/imageCache";

interface WorkoutLogProps {
  date: Date;
  workout: WorkoutDay | null;
  canEdit: boolean;
  exerciseTemplates: ExerciseTemplate[];
  dbReady: boolean;
  onUpdate: (workout: WorkoutDay) => void;
  onSaveExerciseTemplate: (template: ExerciseTemplate) => void;
  onBack: () => void;
}

export default function WorkoutLog({ date, workout, canEdit, exerciseTemplates, dbReady, onUpdate, onSaveExerciseTemplate, onBack }: WorkoutLogProps) {
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseTrackingType, setNewExerciseTrackingType] = useState<ExerciseTrackingType>("weighted");
  const [now, setNow] = useState(Date.now());
  const exerciseTemplatesByName = useMemo(
    () => new Map(exerciseTemplates.map((template) => [template.name.trim().toLowerCase(), template])),
    [exerciseTemplates]
  );
  const matchingExerciseTemplates = useMemo(() => {
    const search = newExerciseName.trim();
    if (!search) return exerciseTemplates.slice(0, 6);
    const searchTerms = getExerciseSearchTerms(search);

    return exerciseTemplates
      .filter((template) => exerciseNameMatchesSearch(template.name, searchTerms))
      .sort((a, b) => {
        const normalizedSearch = search.toLowerCase();
        const aHasPhrase = a.name.toLowerCase().includes(normalizedSearch);
        const bHasPhrase = b.name.toLowerCase().includes(normalizedSearch);
        if (aHasPhrase === bHasPhrase) return a.name.localeCompare(b.name);
        return aHasPhrase ? -1 : 1;
      })
      .slice(0, 6);
  }, [exerciseTemplates, newExerciseName]);

  const matchingDbExercises = useMemo(() => {
    if (!dbReady) return [];
    const search = newExerciseName.trim();
    if (!search) return [];

    const localNames = new Set(matchingExerciseTemplates.map((t) => t.name.trim().toLowerCase()));
    return searchExercisesByName(search, 10)
      .filter((ex) => !localNames.has(ex.name.trim().toLowerCase()))
      .slice(0, 6);
  }, [dbReady, newExerciseName, matchingExerciseTemplates]);

  useEffect(() => {
    if (!workout || workout.isCompleted) return;

    const intervalId = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(intervalId);
  }, [workout]);

  const formatWorkoutDuration = (durationMs: number) => {
    const totalMinutes = Math.max(0, Math.floor(durationMs / 60_000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) return `${minutes} min`;
    return `${hours} ${hours === 1 ? "hour" : "hours"} ${minutes.toString().padStart(2, "0")} min`;
  };

  const getWorkoutDurationText = (currentWorkout: WorkoutDay) => {
    if (currentWorkout.isCompleted && currentWorkout.totalDurationMs === undefined) return null;

    const accumulatedDurationMs = currentWorkout.totalDurationMs ?? 0;
    const durationMs = currentWorkout.isCompleted
      ? accumulatedDurationMs
      : accumulatedDurationMs + Math.max(0, now - new Date(currentWorkout.startTime).getTime());

    return formatWorkoutDuration(durationMs);
  };

  const workoutDurationText = workout ? getWorkoutDurationText(workout) : null;

  const withoutWorkoutPhoto = (exercise: ExerciseEntry): ExerciseEntry => {
    const { photo, ...exerciseWithoutPhoto } = exercise;
    return exerciseWithoutPhoto;
  };

  const startWorkout = () => {
    onUpdate({
      date: format(date, "yyyy-MM-dd"),
      title: format(date, "EEEE, MMMM do"),
      exercises: [],
      isCompleted: false,
      startTime: new Date().toISOString(),
      totalDurationMs: 0,
    });
  };

  const addExercise = (template?: ExerciseTemplate) => {
    const exerciseName = (template?.name ?? newExerciseName).trim();
    if (!exerciseName || !workout) return;

    const newExercise: ExerciseEntry = {
      id: Math.random().toString(36).substr(2, 9),
      name: exerciseName,
      trackingType: template?.trackingType ?? newExerciseTrackingType,
      sets: [],
      isCompleted: false,
    };

    onUpdate({
      ...workout,
      exercises: [...workout.exercises, newExercise],
    });
    if (!template) {
      onSaveExerciseTemplate({ name: exerciseName, trackingType: newExercise.trackingType });
    }
    setNewExerciseName("");
    setNewExerciseTrackingType("weighted");
    setIsAddingExercise(false);
  };

  const addDbExercise = (dbExercise: DbExercise) => {
    if (!workout) return;

    const cachedPhoto = getCachedImage(dbExercise.image);

    const newExercise: ExerciseEntry = {
      id: Math.random().toString(36).substr(2, 9),
      name: dbExercise.name,
      trackingType: "weighted",
      sets: [],
      isCompleted: false,
    };

    onUpdate({
      ...workout,
      exercises: [...workout.exercises, newExercise],
    });

    onSaveExerciseTemplate({
      name: dbExercise.name,
      photo: cachedPhoto ?? undefined,
      trackingType: "weighted",
    });

    if (!cachedPhoto && dbExercise.image) {
      fetchAndCacheImage(dbExercise.image).then((dataUrl) => {
        if (dataUrl) {
          onSaveExerciseTemplate({
            name: dbExercise.name,
            photo: dataUrl,
            trackingType: "weighted",
          });
        }
      });
    }

    setNewExerciseName("");
    setNewExerciseTrackingType("weighted");
    setIsAddingExercise(false);
  };

  const updateExercise = (updated: ExerciseEntry) => {
    if (!workout) return;
    if (updated.photo || updated.trackingType) {
      onSaveExerciseTemplate({ name: updated.name, photo: updated.photo, trackingType: updated.trackingType });
    }

    onUpdate({
      ...workout,
      exercises: workout.exercises.map(ex => ex.id === updated.id ? withoutWorkoutPhoto(updated) : withoutWorkoutPhoto(ex))
    });
  };

  const deleteExercise = (id: string) => {
    if (!workout) return;
    onUpdate({
      ...workout,
      exercises: workout.exercises.filter(ex => ex.id !== id)
    });
  };

  const completeWorkout = () => {
    if (!workout) return;
    const endTime = new Date();
    onUpdate({
      ...workout,
      isCompleted: true,
      endTime: endTime.toISOString(),
      totalDurationMs: (workout.totalDurationMs ?? 0) + Math.max(0, endTime.getTime() - new Date(workout.startTime).getTime())
    });
  };

  const resumeWorkout = () => {
    if (!workout) return;
    onUpdate({
      ...workout,
      isCompleted: false,
      startTime: new Date().toISOString(),
      endTime: undefined
    });
  };

  if (!workout) {
    return (
      <div className="relative flex flex-col items-center justify-center p-8 py-20 text-center space-y-6">
        {!canEdit && (
          <button onClick={onBack} className="absolute left-4 top-8 p-2 text-zinc-600 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
        <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-full">
          <CalendarIcon className="w-10 h-10 text-zinc-700" />
        </div>
        <div>
          <h2 className="text-5xl font-black italic tracking-tighter text-white uppercase">{format(date, "EEEE")}</h2>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] italic mt-2">{format(date, "MMMM do, yyyy")}</p>
        </div>
        {canEdit ? (
          <button
            onClick={startWorkout}
            className="px-8 py-5 bg-lime-500 text-black rounded-xl font-black uppercase text-sm tracking-widest flex items-center gap-2 hover:bg-white active:scale-95 transition-all shadow-xl shadow-lime-500/20"
          >
            <Play className="w-5 h-5 fill-current" />
            Start Workout
          </button>
        ) : (
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-3">
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">No Workout Logged</h3>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
              Past days are read-only. Start or edit workouts from today.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-zinc-950">
      <div className="bg-zinc-950 px-4 py-8 border-b border-zinc-900 mb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="p-2 -ml-2 text-zinc-600 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-900 text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">
            <Circle className={cn("w-2 h-2 fill-current", workout.isCompleted ? "text-green-400" : "text-orange-400")} />
            {!canEdit ? "History" : workout.isCompleted ? "Finished" : "In Progress"}
          </div>
        </div>
        <h1 className="text-5xl font-black text-white italic tracking-tighter leading-none mb-1 uppercase">
          {format(date, "EEEE")}
        </h1>
        <div className="space-y-1 text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px] italic">
          <p>{format(date, "MMMM do, yyyy")}</p>
          <div className="flex items-center gap-3">
            <span>{workout.exercises.length} {workout.exercises.length === 1 ? "Exercise" : "Exercises"}</span>
            {workoutDurationText && (
              <>
                <span className="text-zinc-700">/</span>
                <span>{workoutDurationText}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 pb-32 space-y-6 max-w-xl mx-auto w-full">
        <AnimatePresence initial={false}>
          {workout.exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={{
                ...exercise,
                photo: exerciseTemplatesByName.get(exercise.name.trim().toLowerCase())?.photo ?? exercise.photo,
              }}
              isLocked={!canEdit || workout.isCompleted}
              onUpdate={updateExercise}
              onDelete={() => deleteExercise(exercise.id)}
            />
          ))}
        </AnimatePresence>

        {canEdit && !workout.isCompleted && (
          <div className="space-y-4 pt-4">
            {isAddingExercise ? (
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                data-keyboard-focus-target
                className="w-full min-w-0 overflow-hidden bg-zinc-900 p-5 sm:p-8 rounded-3xl border-2 border-lime-500 shadow-[0_20px_50px_rgba(132,204,22,0.15)]"
              >
                <label className="text-[10px] font-black text-zinc-500 uppercase mb-3 block tracking-widest italic">Exercise Name</label>
                <input
                  autoFocus
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  onFocus={(e) => scrollFocusedFieldIntoView(e.currentTarget.closest("[data-keyboard-focus-target]") ?? e.currentTarget)}
                  placeholder="BENCH PRESS"
                  className="w-full text-3xl font-black p-0 border-none focus:ring-0 placeholder:text-zinc-800 text-white italic uppercase tracking-tighter bg-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && addExercise()}
                />
                <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-zinc-950 p-1 border border-zinc-800">
                  {(["weighted", "reps-only"] as ExerciseTrackingType[]).map((trackingType) => (
                    <button
                      key={trackingType}
                      type="button"
                      onClick={() => setNewExerciseTrackingType(trackingType)}
                      className={cn(
                        "rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                        newExerciseTrackingType === trackingType ? "bg-lime-500 text-black" : "text-zinc-600 hover:text-white"
                      )}
                    >
                      {trackingType === "weighted" ? "Weighted" : "Reps Only"}
                    </button>
                  ))}
                </div>
                {matchingExerciseTemplates.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 italic">Tap a match</p>
                    <div className="grid gap-2">
                      {matchingExerciseTemplates.map((template) => (
                        <button
                          key={template.name}
                          onClick={() => addExercise(template)}
                          className="flex min-w-0 items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-left hover:border-lime-500 active:scale-[0.98] transition-all"
                        >
                          <div className="w-12 h-12 shrink-0 rounded-xl bg-zinc-900 overflow-hidden border border-zinc-800 flex items-center justify-center">
                            {template.photo ? (
                              <img src={template.photo} alt={template.name} className="w-full h-full object-cover" />
                            ) : (
                              <Plus className="w-4 h-4 text-zinc-700" />
                            )}
                          </div>
                          <span className="flex-1 min-w-0 break-words text-xs sm:text-sm font-black uppercase tracking-wide sm:tracking-wider text-white italic leading-tight">
                            {template.name}
                          </span>
                          <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-zinc-600">
                            {template.trackingType === "reps-only" ? "Reps" : "Kg"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {matchingDbExercises.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 italic flex items-center gap-1.5">
                      <Database className="w-3 h-3" />
                      From exercise database
                    </p>
                    <div className="grid gap-2">
                      {matchingDbExercises.map((dbEx) => (
                        <button
                          key={`db-${dbEx.name}`}
                          onClick={() => addDbExercise(dbEx)}
                          className="flex min-w-0 items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-left hover:border-cyan-500 active:scale-[0.98] transition-all"
                        >
                          <div className="w-12 h-12 shrink-0 rounded-xl bg-zinc-900 overflow-hidden border border-zinc-800 flex items-center justify-center">
                            <Database className="w-4 h-4 text-cyan-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="block break-words text-xs sm:text-sm font-black uppercase tracking-wide sm:tracking-wider text-white italic leading-tight">{dbEx.name}</span>
                            <span className="block truncate text-[9px] font-black uppercase tracking-widest text-zinc-600">{dbEx.target} · {dbEx.body_part}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-3 mt-8">
                  <button onClick={() => setIsAddingExercise(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-800 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button 
                    onClick={addExercise}
                    disabled={!newExerciseName.trim()}
                    className="flex-[2] py-4 text-[10px] font-black uppercase tracking-widest bg-lime-500 text-black rounded-xl disabled:opacity-10 active:scale-95 transition-transform"
                  >
                    Add Exercise
                  </button>
                </div>
              </motion.div>
            ) : (
              <button
                onClick={() => setIsAddingExercise(true)}
                className="w-full py-8 rounded-3xl border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center gap-2 group hover:border-lime-500 transition-all bg-zinc-900/30"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:bg-lime-500 group-hover:text-black transition-all">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-white italic">Add New Exercise</span>
              </button>
            )}

            <button
              onClick={completeWorkout}
              className="w-full py-6 rounded-3xl bg-white text-black font-black uppercase text-sm tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              Finish Workout
            </button>
          </div>
        )}

        {workout.isCompleted && (
          <div className="pt-8 flex flex-col items-center gap-4">
             <div className="bg-zinc-900 border border-zinc-800 text-lime-500 px-8 py-5 rounded-2xl text-center font-black uppercase tracking-widest text-[10px] flex items-center gap-3 italic">
                <CheckCircle2 className="w-5 h-5" />
                Session Finished
             </div>
             {canEdit && (
               <button 
                  onClick={resumeWorkout}
                  className="text-[10px] font-black uppercase tracking-widest text-zinc-600 flex items-center gap-2 hover:text-white transition-colors"
               >
                  <RotateCcw className="w-4 h-4" />
                  Resume Session
               </button>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
