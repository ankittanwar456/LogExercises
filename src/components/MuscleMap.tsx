import React, { useMemo, useState } from "react";
import Model, { IExerciseData, IMuscleStats, Muscle } from "react-body-highlighter";
import {
  MuscleId,
  muscleLabel,
  intensityBucket,
  muscleIdToSlugs,
  slugToMuscleIds,
  muscleHeatLegend,
  type MuscleActivationResult,
} from "../lib/muscleMap";
import { cn } from "../lib/utils";

interface MuscleMapProps {
  activation: MuscleActivationResult;
}

type View = "anterior" | "posterior";

// Untrained body fill — light enough to stay visible on the dark card.
const BODY_NEUTRAL = "#3f3f46"; // zinc-700

interface SlugDetail {
  label: string;
  sets: number;
  exercises: [string, number][];
}

export default function MuscleMap({ activation }: MuscleMapProps) {
  const [view, setView] = useState<View>("anterior");
  const [selectedSlug, setSelectedSlug] = useState<Muscle | null>(null);

  // Build react-body-highlighter data: one entry per slug carrying the
  // intensity bucket (1–4) as its frequency, so highlightedColors[freq-1]
  // reproduces our heat scale.
  const data = useMemo<IExerciseData[]>(() => {
    const slugBucket: Record<string, number> = {};
    for (const [id, info] of Object.entries(activation.byMuscle) as [MuscleId, MuscleActivationResult["byMuscle"][MuscleId]][]) {
      if (!info) continue;
      const bucket = intensityBucket(info.score, activation.maxScore);
      if (bucket === 0) continue;
      for (const slug of muscleIdToSlugs[id]) {
        slugBucket[slug] = Math.max(slugBucket[slug] ?? 0, bucket);
      }
    }
    return Object.entries(slugBucket).map(([slug, bucket]) => ({
      name: slug,
      muscles: [slug as Muscle],
      frequency: bucket,
    }));
  }, [activation]);

  // Resolve a clicked slug back to our own activation data for the detail panel.
  const detail = useMemo<SlugDetail | null>(() => {
    if (!selectedSlug) return null;
    const ids = slugToMuscleIds[selectedSlug] ?? [];
    const merged: Record<string, number> = {};
    const labels: string[] = [];
    for (const id of ids) {
      labels.push(muscleLabel[id]);
      const info = activation.byMuscle[id];
      if (!info) continue;
      for (const [name, sets] of Object.entries(info.exercises)) {
        merged[name] = Math.max(merged[name] ?? 0, sets); // avoid double-count across mapped muscles
      }
    }
    const exercises = (Object.entries(merged) as [string, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return {
      label: labels.join(" / ") || selectedSlug,
      sets: exercises.reduce((acc, [, s]) => acc + s, 0),
      exercises,
    };
  }, [selectedSlug, activation]);

  const handleClick = ({ muscle }: IMuscleStats) =>
    setSelectedSlug((s) => (s === muscle ? null : muscle));

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4">
      {/* Front / Back toggle */}
      <div className="flex gap-1 bg-zinc-950 rounded-xl p-1">
        {([
          ["anterior", "Front"],
          ["posterior", "Back"],
        ] as [View, string][]).map(([v, label]) => (
          <button
            key={v}
            onClick={() => {
              setView(v);
              setSelectedSlug(null);
            }}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest italic transition-colors",
              view === v ? "bg-zinc-700 text-white" : "text-zinc-600 hover:text-zinc-400"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex justify-center [&_svg]:max-w-[260px] [&_svg]:w-full [&_svg]:h-auto [&_polygon]:cursor-pointer">
        <Model
          type={view}
          data={data}
          bodyColor={BODY_NEUTRAL}
          highlightedColors={muscleHeatLegend}
          onClick={handleClick}
          style={{ width: "100%", maxWidth: "260px" }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 justify-end">
        <span className="text-[9px] font-black uppercase italic text-zinc-600">Less</span>
        <span className="w-3 h-3 rounded-sm block" style={{ backgroundColor: BODY_NEUTRAL }} />
        {muscleHeatLegend.map((c) => (
          <span key={c} className="w-3 h-3 rounded-sm block" style={{ backgroundColor: c }} />
        ))}
        <span className="text-[9px] font-black uppercase italic text-zinc-600">More</span>
      </div>

      {/* Selected muscle detail */}
      {detail ? (
        <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-black italic uppercase tracking-wider text-lime-400">
              {detail.label}
            </span>
            <span className="text-[9px] font-black uppercase italic tracking-widest text-zinc-500">
              {detail.exercises.length > 0 ? `${detail.sets} sets` : "Not trained"}
            </span>
          </div>
          {detail.exercises.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {detail.exercises.map(([name, sets]) => (
                <span
                  key={name}
                  className="px-2 py-1 rounded-lg bg-zinc-800 text-[9px] font-black uppercase tracking-widest italic text-zinc-300"
                >
                  {name} · {sets}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] font-bold italic text-zinc-600">
              No logged exercises hit this muscle in this range.
            </p>
          )}
        </div>
      ) : (
        <p className="text-center text-[10px] font-bold italic text-zinc-600">
          Tap a muscle to see which exercises trained it.
        </p>
      )}
    </div>
  );
}
