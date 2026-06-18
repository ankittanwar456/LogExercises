import { MUSCLE_GROUPS, MuscleId, formatMuscleSummary, muscleLabel } from "../lib/muscleMap";
import { cn } from "../lib/utils";

interface MusclePickerProps {
  value: MuscleId[];
  onChange: (muscles: MuscleId[]) => void;
  hideHeader?: boolean;
}

export default function MusclePicker({ value, onChange, hideHeader = false }: MusclePickerProps) {
  const toggle = (muscle: MuscleId) => {
    if (value.includes(muscle)) {
      onChange(value.filter((id) => id !== muscle));
      return;
    }

    onChange([...value, muscle]);
  };

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div className="space-y-1">
          <p className="text-[10px] font-black text-zinc-600 uppercase italic tracking-widest">Target Muscles</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-700">
            Optional · tap to add · first is the main target
          </p>
        </div>
      )}

      {MUSCLE_GROUPS.map((group) => (
        <div key={group.label} className="space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-700">{group.label}</p>
          <div className="flex flex-wrap gap-2">
            {group.muscles.map((muscle) => {
              const index = value.indexOf(muscle);
              const isPrimary = index === 0;
              const isSecondary = index > 0;

              return (
                <button
                  key={muscle}
                  type="button"
                  onClick={() => toggle(muscle)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest italic transition-colors active:scale-95",
                    isPrimary
                      ? "bg-lime-500 text-black"
                      : isSecondary
                        ? "bg-zinc-800 border border-lime-500/40 text-lime-300"
                        : "bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                  )}
                >
                  {isPrimary ? `1 · ${muscleLabel[muscle]}` : isSecondary ? `${index + 1} · ${muscleLabel[muscle]}` : muscleLabel[muscle]}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-[9px] font-bold italic text-zinc-700">
        {value.length > 0
          ? `Selected: ${formatMuscleSummary(value)}`
          : "No muscles selected — exercise won't appear on the body map."}
      </p>
    </div>
  );
}
