import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, isFuture, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, ClipboardList, Settings as SettingsIcon, TrendingUp } from "lucide-react";
import { AppState, ExerciseTemplate, WorkoutDay } from "./types";
import { loadState, saveState } from "./lib/storage";
import { defaultExerciseTemplates, mergeExerciseTemplates } from "./lib/exerciseTemplates";
import Calendar from "./components/Calendar";
import WorkoutLog from "./components/WorkoutLog";
import Settings from "./components/Settings";
import { cn } from "./lib/utils";
import { motion, AnimatePresence } from "motion/react";

type Tab = "history" | "today" | "stats" | "settings";

const SAVE_DEBOUNCE_MS = 750;

const finishStaleWorkouts = (state: AppState, today = format(new Date(), "yyyy-MM-dd")): AppState => {
  let didChange = false;

  const workouts = Object.fromEntries(
    (Object.entries(state.workouts) as [string, WorkoutDay][]).map(([date, workout]) => {
      if (date >= today || workout.isCompleted) {
        return [date, workout];
      }

      didChange = true;
      return [
        date,
        {
          ...workout,
          isCompleted: true,
          endTime: workout.endTime ?? new Date(`${date}T23:59:59`).toISOString(),
        },
      ];
    })
  );

  return didChange ? { ...state, workouts } : state;
};

const loadInitialState = (): AppState => {
  const state = loadState();
  const nextState = finishStaleWorkouts(state);

  if (nextState !== state) {
    saveState(nextState);
  }

  return nextState;
};

export default function App() {
  const [state, setState] = useState<AppState>(loadInitialState);
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const didHydrateRef = useRef(false);

  useEffect(() => {
    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }

    let idleCallbackId: number | null = null;
    const timeoutId = window.setTimeout(() => {
      const persist = () => saveState(state);

      if ("requestIdleCallback" in window) {
        idleCallbackId = window.requestIdleCallback(persist, { timeout: 2_000 });
      } else {
        persist();
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      if (idleCallbackId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleCallbackId);
      }
    };
  }, [state]);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const currentWorkout = state.workouts[dateStr] || null;
  const isSelectedToday = isSameDay(selectedDate, new Date());
  const exerciseTemplates = useMemo(
    () => mergeExerciseTemplates(defaultExerciseTemplates, state.customExercises),
    [state.customExercises]
  );

  const updateWorkout = useCallback((workout: WorkoutDay) => {
    if (workout.date !== format(new Date(), "yyyy-MM-dd")) return;

    setState((prev) => ({
      ...prev,
      workouts: {
        ...prev.workouts,
        [workout.date]: workout,
      },
    }));
  }, []);

  const handleSelectDate = useCallback((date: Date) => {
    if (isFuture(date) && !isSameDay(date, new Date())) return;

    setSelectedDate(date);
    setActiveTab("today");
  }, []);

  const saveExerciseTemplate = useCallback((template: ExerciseTemplate) => {
    const exerciseName = template.name.trim();
    if (!exerciseName) return;

    setState((prev) => {
      const existingIndex = prev.customExercises.findIndex(
        (exercise) => exercise.name.toLowerCase() === exerciseName.toLowerCase()
      );
      const nextTemplate: ExerciseTemplate = {
        name: exerciseName,
        photo: template.photo,
        trackingType: template.trackingType ?? "weighted",
      };

      if (existingIndex === -1) {
        return {
          ...prev,
          customExercises: [...prev.customExercises, nextTemplate],
        };
      }

      const existingTemplate = prev.customExercises[existingIndex];
      const nextCustomExercises = [...prev.customExercises];
      nextCustomExercises[existingIndex] = {
        ...existingTemplate,
        name: exerciseName,
        photo: template.photo ?? existingTemplate.photo,
        trackingType: template.trackingType ?? existingTemplate.trackingType ?? "weighted",
      };

      return {
        ...prev,
        customExercises: nextCustomExercises,
      };
    });
  }, []);

  const updateCustomExercise = useCallback((previousName: string, template: ExerciseTemplate) => {
    const exerciseName = template.name.trim();
    if (!exerciseName) return;

    setState((prev) => ({
      ...prev,
      customExercises: prev.customExercises.map((exercise) =>
        exercise.name.toLowerCase() === previousName.toLowerCase()
          ? {
              ...exercise,
              name: exerciseName,
              photo: template.photo,
              trackingType: template.trackingType ?? exercise.trackingType ?? "weighted",
            }
          : exercise
      ),
      workouts: Object.fromEntries(
        (Object.entries(prev.workouts) as [string, WorkoutDay][]).map(([date, workout]) => [
          date,
          {
            ...workout,
            exercises: workout.exercises.map((exercise) =>
              exercise.name.toLowerCase() === previousName.toLowerCase()
                ? { ...exercise, name: exerciseName, photo: undefined }
                : exercise
            ),
          },
        ])
      ),
    }));
  }, []);

  const deleteCustomExercise = useCallback((name: string) => {
    const confirmed = window.confirm(
      `Delete "${name}" from custom exercises and remove it from all old workout entries?`
    );
    if (!confirmed) return;

    setState((prev) => ({
      ...prev,
      customExercises: prev.customExercises.filter(
        (exercise) => exercise.name.toLowerCase() !== name.toLowerCase()
      ),
      workouts: Object.fromEntries(
        (Object.entries(prev.workouts) as [string, WorkoutDay][]).map(([date, workout]) => [
          date,
          {
            ...workout,
            exercises: workout.exercises.filter(
              (exercise) => exercise.name.toLowerCase() !== name.toLowerCase()
            ),
          },
        ])
      ),
    }));
  }, []);

  const NavItem = ({ id, icon: Icon, label }: { id: Tab; icon: any; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "flex flex-col items-center justify-center gap-1 flex-1 py-4 transition-all duration-300",
        activeTab === id ? "text-lime-500 scale-110" : "text-zinc-600 hover:text-zinc-400"
      )}
    >
      <Icon className={cn("w-6 h-6", activeTab === id ? "fill-current" : "")} />
      <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-lime-500 selection:text-black">
      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="p-6 pt-12 space-y-12"
            >
              <div className="px-2">
                <h1 className="text-7xl font-black tracking-tighter leading-none mb-2 text-white italic">HISTORY</h1>
                <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-[10px] italic">Your Training Evolution</p>
              </div>
              <Calendar
                workouts={state.workouts}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
              />
            </motion.div>
          )}

          {activeTab === "today" && (
            <motion.div
              key="today"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <WorkoutLog
                date={selectedDate}
                workout={currentWorkout}
                canEdit={isSelectedToday}
                exerciseTemplates={exerciseTemplates}
                onUpdate={updateWorkout}
                onSaveExerciseTemplate={saveExerciseTemplate}
                onBack={() => setActiveTab("history")}
              />
            </motion.div>
          )}

          {activeTab === "stats" && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-8 pt-20 flex flex-col items-center justify-center text-center space-y-8"
            >
              <div className="w-32 h-32 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-full shadow-[0_0_50px_rgba(132,204,22,0.1)]">
                <TrendingUp className="w-12 h-12 text-lime-500" />
              </div>
              <div className="space-y-4">
                <h2 className="text-5xl font-black italic tracking-tighter text-white">INSIGHTS</h2>
                <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-[10px] italic max-w-xs mx-auto">
                  Advanced biometric tracking and analytical visualizations are currently in synchronization. 
                </p>
              </div>
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xs">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2 italic">
                  <span>System Status</span>
                  <span className="text-lime-500">Preparing...</span>
                </div>
                <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="w-1/3 h-full bg-lime-500"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Settings
                data={state}
                customExercises={state.customExercises}
                onUpdateExercise={updateCustomExercise}
                onDeleteExercise={deleteCustomExercise}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-2xl border-t border-zinc-800 flex items-center justify-around px-4 pb-safe z-30 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]">
        <NavItem id="history" icon={CalendarIcon} label="History" />
        <NavItem id="today" icon={ClipboardList} label="Workout" />
        <NavItem id="stats" icon={TrendingUp} label="Progress" />
        <NavItem id="settings" icon={SettingsIcon} label="Settings" />
      </nav>
    </div>
  );
}
