import { motion } from "motion/react";
import { Plus, Trash2, Camera, X } from "lucide-react";
import { ExerciseEntry, ExerciseTrackingType, SetEntry } from "../types";
import { cn } from "../lib/utils";
import React, { useState, useRef } from "react";

const MAX_PHOTO_SIZE = 320;
const PHOTO_QUALITY = 0.72;

const readCompressedPhoto = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, MAX_PHOTO_SIZE / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Unable to prepare exercise photo"));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", PHOTO_QUALITY));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read exercise photo"));
    };

    image.src = objectUrl;
  });

interface ExerciseCardProps {
  key?: string;
  exercise: ExerciseEntry;
  onUpdate: (exercise: ExerciseEntry) => void;
  onDelete: () => void;
  isLocked: boolean;
}

export default function ExerciseCard({ exercise, onUpdate, onDelete, isLocked }: ExerciseCardProps) {
  const [isAddingSet, setIsAddingSet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trackingType = exercise.trackingType ?? "weighted";

  const addSet = (weight: number | null, reps: number, nextTrackingType: ExerciseTrackingType) => {
    const newSet: SetEntry = {
      id: Math.random().toString(36).substr(2, 9),
      weight,
      reps,
      completedAt: new Date().toISOString(),
    };
    onUpdate({
      ...exercise,
      trackingType: nextTrackingType,
      sets: [...exercise.sets, newSet],
    });
    setIsAddingSet(false);
  };

  const removeSet = (id: string) => {
    onUpdate({
      ...exercise,
      sets: exercise.sets.filter((s) => s.id !== id),
    });
  };

  const setPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const photo = await readCompressedPhoto(file);
      onUpdate({ ...exercise, photo });
    } catch (error) {
      console.error(error);
    } finally {
      e.target.value = "";
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-sm space-y-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          <div 
            onClick={() => !isLocked && fileInputRef.current?.click()}
            className={cn(
              "w-16 h-16 rounded-2xl bg-zinc-950 flex items-center justify-center overflow-hidden cursor-pointer border border-dashed border-zinc-800",
              exercise.photo && "border-none"
            )}
          >
            {exercise.photo ? (
              <img src={exercise.photo} className="w-full h-full object-cover" alt={exercise.name} />
            ) : (
              <Camera className="w-6 h-6 text-zinc-700" />
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={setPhoto} 
              accept="image/*" 
              className="hidden" 
              disabled={isLocked}
            />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{exercise.name}</h3>
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest italic">
              {exercise.sets.length} Completed Sets
            </p>
          </div>
        </div>
        {!isLocked && (
          <button onClick={onDelete} className="p-2 text-zinc-700 hover:text-red-500 transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {exercise.sets.map((set, idx) => (
          <div key={set.id} className="flex items-center justify-between py-1 border-b border-zinc-800/50 last:border-0 group">
            <div className="flex items-center gap-4">
              <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-zinc-950 text-[10px] font-black text-zinc-600 tracking-tighter">
                {idx + 1}
              </span>
              <div className="flex items-baseline gap-2">
                {set.weight !== null && (
                  <>
                    <span className="text-xl font-mono font-black text-white">{set.weight}</span>
                    <span className="text-[10px] text-zinc-500 font-black uppercase italic tracking-widest">kg</span>
                    <span className="text-zinc-700 mx-1 font-black">x</span>
                  </>
                )}
                <span className="text-xl font-mono font-black text-white">{set.reps || 0}</span>
                <span className="text-[10px] text-zinc-500 font-black uppercase italic tracking-widest">reps</span>
              </div>
            </div>
            {!isLocked && (
              <button 
                onClick={() => removeSet(set.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-600 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {isAddingSet && (
        <SetForm trackingType={trackingType} onAdd={addSet} onCancel={() => setIsAddingSet(false)} />
      )}

      {!isLocked && !isAddingSet && (
        <button
          onClick={() => setIsAddingSet(true)}
          className="w-full py-4 rounded-xl bg-zinc-950 text-zinc-500 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-800 hover:text-white transition-all italic"
        >
          <Plus className="w-4 h-4" />
          Log Performance Set
        </button>
      )}
    </motion.div>
  );
}

function SetForm({
  trackingType,
  onAdd,
  onCancel,
}: {
  trackingType: ExerciseTrackingType;
  onAdd: (w: number | null, r: number, trackingType: ExerciseTrackingType) => void;
  onCancel: () => void;
}) {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const isWeighted = trackingType === "weighted";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!isWeighted || weight) && reps) {
      onAdd(isWeighted ? parseFloat(weight) : null, parseInt(reps), trackingType);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-zinc-950 rounded-2xl space-y-6 border border-zinc-800">
      <div className={cn("grid gap-4", isWeighted ? "grid-cols-2" : "grid-cols-1")}>
        {isWeighted && (
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-600 uppercase italic tracking-widest ml-1">Weight (kg)</label>
            <input
              autoFocus
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0"
              className="w-full bg-zinc-950 border-b-4 border-lime-500 text-4xl font-black p-2 outline-none text-white italic placeholder:text-zinc-900 focus:border-white transition-colors"
            />
          </div>
        )}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-600 uppercase italic tracking-widest ml-1">Reps</label>
          <input
            autoFocus={!isWeighted}
            type="number"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="0"
            className="w-full bg-zinc-950 border-b-4 border-zinc-700 text-4xl font-black p-2 outline-none text-white italic placeholder:text-zinc-900 focus:border-lime-500 transition-colors"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-800 rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-[2] py-4 text-[10px] font-black uppercase tracking-widest bg-white text-black rounded-xl shadow-xl active:scale-95 transition-transform"
        >
          Confirm Set
        </button>
      </div>
    </form>
  );
}
