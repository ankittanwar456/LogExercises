import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { format, isFuture, isSameDay, startOfMonth } from "date-fns";
import { Calendar as CalendarIcon, ClipboardList, Settings as SettingsIcon, TrendingUp } from "lucide-react";
import { AppState, ExerciseTemplate, UserProfile, WorkoutDay } from "./types";
import { loadState, saveState } from "./lib/storage";
import { defaultExerciseTemplates, mergeExerciseTemplates } from "./lib/exerciseTemplates";
import { initExerciseDb, isExerciseDbReady } from "./lib/exerciseDb";
import Calendar from "./components/Calendar";
import WorkoutLog from "./components/WorkoutLog";
import Settings from "./components/Settings";
import Insights from "./components/Insights";
import { cn } from "./lib/utils";
import { motion, AnimatePresence } from "motion/react";

type Tab = "history" | "today" | "stats" | "settings";

const SAVE_DEBOUNCE_MS = 750;
const BACK_EXIT_WINDOW_MS = 2_000;

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
  const [historyDate, setHistoryDate] = useState<Date | null>(null);
  const [historyCalendarMonth, setHistoryCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [settingsPage, setSettingsPage] = useState<"main" | "profile" | "exercises">("main");
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const didHydrateRef = useRef(false);
  const lastBackPressRef = useRef(0);
  const exitPromptTimeoutRef = useRef<number | null>(null);
  const [dbReady, setDbReady] = useState(isExerciseDbReady);

  useEffect(() => {
    initExerciseDb()
      .then(() => setDbReady(true))
      .catch((err) => console.error("Failed to load exercise DB", err));
  }, []);

  useEffect(() => {
    const clickTopCancelAction = () => {
      const cancelButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-back-cancel]"))
        .filter((button) => !button.disabled && button.offsetParent !== null);
      const cancelButton = cancelButtons.at(-1);

      if (!cancelButton) return false;

      cancelButton.click();
      return true;
    };

    const showPressAgainPrompt = () => {
      setShowExitPrompt(true);

      if (exitPromptTimeoutRef.current !== null) {
        window.clearTimeout(exitPromptTimeoutRef.current);
      }

      exitPromptTimeoutRef.current = window.setTimeout(() => {
        setShowExitPrompt(false);
        exitPromptTimeoutRef.current = null;
      }, BACK_EXIT_WINDOW_MS);
    };

    const handleBackButton = async () => {
      if (clickTopCancelAction()) return;

      if (activeTab === "history" && historyDate) {
        setHistoryDate(null);
        return;
      }

      if (activeTab === "settings" && settingsPage !== "main") {
        setSettingsPage("main");
        return;
      }

      if (activeTab !== "today") {
        setActiveTab("today");
        return;
      }

      const now = Date.now();

      if (now - lastBackPressRef.current <= BACK_EXIT_WINDOW_MS) {
        await CapacitorApp.exitApp();
        return;
      }

      lastBackPressRef.current = now;
      showPressAgainPrompt();
    };

    const listenerPromise = CapacitorApp.addListener("backButton", handleBackButton);

    return () => {
      listenerPromise.then((listener) => listener.remove());

      if (exitPromptTimeoutRef.current !== null) {
        window.clearTimeout(exitPromptTimeoutRef.current);
      }
    };
  }, [activeTab, historyDate, settingsPage]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const initialHeight = viewport?.height ?? window.innerHeight;

    const updateKeyboardState = () => {
      const activeElement = document.activeElement;
      const isEditing = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
      const currentHeight = viewport?.height ?? window.innerHeight;
      const keyboardLikelyOpen = initialHeight - currentHeight > 120;

      setIsKeyboardActive(isEditing && keyboardLikelyOpen);
    };

    window.addEventListener("focusin", updateKeyboardState);
    window.addEventListener("focusout", updateKeyboardState);
    viewport?.addEventListener("resize", updateKeyboardState);

    return () => {
      window.removeEventListener("focusin", updateKeyboardState);
      window.removeEventListener("focusout", updateKeyboardState);
      viewport?.removeEventListener("resize", updateKeyboardState);
    };
  }, []);

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

  const today = new Date();
  const dateStr = format(today, "yyyy-MM-dd");
  const currentWorkout = state.workouts[dateStr] || null;
  const historyDateStr = historyDate ? format(historyDate, "yyyy-MM-dd") : null;
  const historyWorkout = historyDateStr ? state.workouts[historyDateStr] || null : null;
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

    setHistoryDate(date);
    setActiveTab("history");
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

  const updateProfile = useCallback((profile: UserProfile) => {
    setState((prev) => ({
      ...prev,
      profile,
    }));
  }, []);

  const NavItem = ({ id, icon: Icon, label }: { id: Tab; icon: any; label: string }) => (
    <button
      onClick={() => {
        setActiveTab(id);
      }}
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
      <main className={cn("flex-1 overflow-hidden transition-[padding] duration-200", isKeyboardActive ? "pb-4" : "pb-24")}>
        {/* History tab is always mounted so scroll position and state survive tab switches */}
        <div
          className={cn(
            "h-full overflow-y-auto",
            activeTab !== "history" && "hidden"
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={historyDate ? "history-detail" : "history"}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className={historyDate ? "h-full" : "p-6 pt-12 space-y-12"}
            >
              {historyDate ? (
                <WorkoutLog
                  date={historyDate}
                  workout={historyWorkout}
                  canEdit={false}
                  exerciseTemplates={exerciseTemplates}
                  dbReady={dbReady}
                  onUpdate={updateWorkout}
                  onSaveExerciseTemplate={saveExerciseTemplate}
                  onBack={() => setHistoryDate(null)}
                />
              ) : (
                <>
                  <div className="px-2">
                    <h1 className="text-7xl font-black tracking-tighter leading-none mb-2 text-white italic">HISTORY</h1>
                    <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-[10px] italic">Your Training Evolution</p>
                  </div>
                  <Calendar
                    workouts={state.workouts}
                    selectedDate={today}
                    viewMonth={historyCalendarMonth}
                    onViewMonthChange={setHistoryCalendarMonth}
                    onSelectDate={handleSelectDate}
                  />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className={cn("h-full overflow-y-auto", activeTab === "history" && "hidden")}>
        <AnimatePresence mode="wait">
          {activeTab === "today" && (
            <motion.div
              key="today"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <WorkoutLog
                date={today}
                workout={currentWorkout}
                canEdit={true}
                exerciseTemplates={exerciseTemplates}
                dbReady={dbReady}
                onUpdate={updateWorkout}
                onSaveExerciseTemplate={saveExerciseTemplate}
                onBack={() => {
                  setActiveTab("history");
                }}
              />
            </motion.div>
          )}

          {activeTab === "stats" && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Insights state={state} dbReady={dbReady} />
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
                activePage={settingsPage}
                onActivePageChange={setSettingsPage}
                onUpdateProfile={updateProfile}
                onUpdateExercise={updateCustomExercise}
                onDeleteExercise={deleteCustomExercise}
              />
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </main>

      {!isKeyboardActive && (
        <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-2xl border-t border-zinc-800 flex items-center justify-around px-4 pb-safe z-30 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]">
          <NavItem id="history" icon={CalendarIcon} label="History" />
          <NavItem id="today" icon={ClipboardList} label="Workout" />
          <NavItem id="stats" icon={TrendingUp} label="Progress" />
          <NavItem id="settings" icon={SettingsIcon} label="Settings" />
        </nav>
      )}

      <AnimatePresence>
        {showExitPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-lime-500/30 bg-zinc-900 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-lime-500 shadow-2xl shadow-lime-500/10"
          >
            Press again to close app
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
