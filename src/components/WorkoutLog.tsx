import { motion, AnimatePresence } from "motion/react";
import { Plus, CheckCircle2, Play, Circle, Calendar as CalendarIcon, ArrowLeft, RotateCcw } from "lucide-react";
import { WorkoutDay, ExerciseEntry, ExerciseTemplate, ExerciseTrackingType } from "../types";
import { format } from "date-fns";
import ExerciseCard from "./ExerciseCard";
import { useState } from "react";
import { cn } from "../lib/utils";

interface WorkoutLogProps {
  date: Date;
  workout: WorkoutDay | null;
  canEdit: boolean;
  exerciseTemplates: ExerciseTemplate[];
  onUpdate: (workout: WorkoutDay) => void;
  onSaveExerciseTemplate: (template: ExerciseTemplate) => void;
  onBack: () => void;
}

export default function WorkoutLog({ date, workout, canEdit, exerciseTemplates, onUpdate, onSaveExerciseTemplate, onBack }: WorkoutLogProps) {
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseTrackingType, setNewExerciseTrackingType] = useState<ExerciseTrackingType>("weighted");
  const matchingExerciseTemplates = exerciseTemplates
    .filter((template) => template.name.toLowerCase().includes(newExerciseName.trim().toLowerCase()))
    .slice(0, 6);

  const getExerciseTemplate = (exerciseName: string) =>
    exerciseTemplates.find((template) => template.name.toLowerCase() === exerciseName.toLowerCase());

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
    onUpdate({
      ...workout,
      isCompleted: true,
      endTime: new Date().toISOString()
    });
  };

  const resumeWorkout = () => {
    if (!workout) return;
    onUpdate({
      ...workout,
      isCompleted: false
    });
  };

  if (!workout) {
    return (
      <div className="flex flex-col items-center justify-center p-8 py-20 text-center space-y-6">
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
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-md px-4 py-8 border-b border-zinc-900 mb-6">
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
        <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px] italic">{format(date, "MMMM do, yyyy")}</p>
      </div>

      <div className="flex-1 px-6 pb-32 space-y-6 max-w-xl mx-auto w-full">
        <AnimatePresence initial={false}>
          {workout.exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={{
                ...exercise,
                photo: getExerciseTemplate(exercise.name)?.photo ?? exercise.photo,
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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-900 p-8 rounded-3xl border-2 border-lime-500 shadow-[0_20px_50px_rgba(132,204,22,0.15)]"
              >
                <label className="text-[10px] font-black text-zinc-500 uppercase mb-3 block tracking-widest italic">Exercise Name</label>
                <input
                  autoFocus
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
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
                          className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-left hover:border-lime-500 active:scale-[0.98] transition-all"
                        >
                          <div className="w-12 h-12 rounded-xl bg-zinc-900 overflow-hidden border border-zinc-800 flex items-center justify-center">
                            {template.photo ? (
                              <img src={template.photo} alt={template.name} className="w-full h-full object-cover" />
                            ) : (
                              <Plus className="w-4 h-4 text-zinc-700" />
                            )}
                          </div>
                          <span className="flex-1 text-sm font-black uppercase tracking-wider text-white italic">{template.name}</span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">
                            {template.trackingType === "reps-only" ? "Reps" : "Kg"}
                          </span>
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
