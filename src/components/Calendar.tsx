import { motion, AnimatePresence } from "motion/react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isAfter,
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek
} from "date-fns";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Activity, Check } from "lucide-react";
import { cn } from "../lib/utils";
import { WorkoutDay } from "../types";

interface CalendarProps {
  workouts: Record<string, WorkoutDay>;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
}

export default function Calendar({ workouts, onSelectDate, selectedDate }: CalendarProps) {
  const [viewMonth, setViewMonth] = useState(startOfMonth(selectedDate));

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const today = new Date();
  const canGoNextMonth = isAfter(startOfMonth(today), monthStart);
  const monthlyWorkoutDays = Object.keys(workouts).filter((date) => date.startsWith(format(monthStart, "yyyy-MM"))).length;

  const nextMonth = () => {
    if (canGoNextMonth) setViewMonth(addMonths(viewMonth, 1));
  };
  const prevMonth = () => setViewMonth(subMonths(viewMonth, 1));

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm border border-black/5">
      <div className="flex items-start justify-between mb-6 px-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {format(viewMonth, "MMMM yyyy")}
          </h2>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-lime-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-lime-700">
            <Activity className="h-3.5 w-3.5" />
            {monthlyWorkoutDays} workout {monthlyWorkoutDays === 1 ? "day" : "days"}
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button 
            onClick={nextMonth}
            disabled={!canGoNextMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[10px] uppercase font-bold text-gray-400 tracking-wider py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const workout = workouts[dateStr];
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const hasWorkout = !!workout;
          const isCompleted = workout?.isCompleted;
          const isFutureDate = isAfter(day, today) && !isSameDay(day, today);

          return (
            <button
              key={day.toString()}
              disabled={isFutureDate}
              onClick={() => {
                onSelectDate(day);
                if (!isCurrentMonth) setViewMonth(startOfMonth(day));
              }}
              className={cn(
                "relative h-12 flex flex-col items-center justify-center rounded-xl border transition-all overflow-hidden",
                hasWorkout ? "border-lime-500 bg-lime-500 text-black shadow-[0_8px_22px_rgba(132,204,22,0.24)]" : "border-transparent",
                !isCurrentMonth && "opacity-20",
                isFutureDate && "opacity-20 cursor-not-allowed hover:bg-transparent",
                isSelected && hasWorkout ? "bg-lime-500 border-lime-500 shadow-[0_8px_22px_rgba(132,204,22,0.24)] scale-105" : "",
                isSelected && !hasWorkout ? "bg-black text-white border-black shadow-none" : "hover:bg-gray-50"
              )}
            >
              <span className={cn(
                "text-sm font-medium z-10",
                hasWorkout ? "font-black text-black" : "",
                isSelected && !hasWorkout ? "text-white" : "text-gray-700"
              )}>
                {format(day, "d")}
              </span>
              {hasWorkout && (
                <div className={cn(
                  "absolute right-1 top-1 flex h-3 w-3 items-center justify-center rounded-full border border-zinc-950",
                  isCompleted ? "bg-lime-400 text-black" : "bg-orange-400 text-black"
                )}>
                  <Check className="h-[7.5px] w-[7.5px] stroke-[4]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
