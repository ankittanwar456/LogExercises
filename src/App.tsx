import { useState, useEffect } from "react";
import { format, isFuture, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, ClipboardList, TrendingUp } from "lucide-react";
import { AppState, ExerciseTemplate, WorkoutDay } from "./types";
import { loadState, saveState } from "./lib/storage";
import { defaultExerciseTemplates, mergeExerciseTemplates } from "./lib/exerciseTemplates";
import Calendar from "./components/Calendar";
import WorkoutLog from "./components/WorkoutLog";
import { cn } from "./lib/utils";
import { motion, AnimatePresence } from "motion/react";

type Tab = "history" | "today" | "stats";

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const currentWorkout = state.workouts[dateStr] || null;
  const isSelectedToday = isSameDay(selectedDate, new Date());
  const exerciseTemplates = mergeExerciseTemplates(defaultExerciseTemplates, state.customExercises);

  const updateWorkout = (workout: WorkoutDay) => {
    if (workout.date !== format(new Date(), "yyyy-MM-dd")) return;

    setState((prev) => ({
      ...prev,
      workouts: {
        ...prev.workouts,
        [workout.date]: workout,
      },
    }));
  };

  const handleSelectDate = (date: Date) => {
    if (isFuture(date) && !isSameDay(date, new Date())) return;

    setSelectedDate(date);
    setActiveTab("today");
  };

  const saveExerciseTemplate = (template: ExerciseTemplate) => {
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
  };

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
              
              <div className="p-8 bg-lime-500 text-black rounded-3xl space-y-4 shadow-[0_20px_50px_rgba(132,204,22,0.2)]">
                <h3 className="text-4xl font-black italic tracking-tighter leading-tight">LEVEL UP ⚡️</h3>
                <p className="text-black/70 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                  You have logged <span className="text-black font-black underline underline-offset-4">{Object.keys(state.workouts).length}</span> workouts. Keep pushing.
                </p>
                <div className="flex gap-2">
                  <div className="px-4 py-2 bg-black text-white rounded-lg text-[10px] font-black uppercase tracking-widest">
                    Alpha Member
                  </div>
                </div>
              </div>
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
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-2xl border-t border-zinc-800 flex items-center justify-around px-4 pb-safe z-30 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]">
        <NavItem id="history" icon={CalendarIcon} label="History" />
        <NavItem id="today" icon={ClipboardList} label="Workout" />
        <NavItem id="stats" icon={TrendingUp} label="Progress" />
      </nav>
    </div>
  );
}
