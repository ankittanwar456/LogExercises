import { Camera, Download, Save, Settings as SettingsIcon, Trash2, Upload, X } from "lucide-react";
import { motion } from "motion/react";
import React, { useRef, useState } from "react";
import { AppState, ExerciseTemplate } from "../types";
import { cn } from "../lib/utils";

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

interface SettingsProps {
  data: AppState;
  customExercises: ExerciseTemplate[];
  onUpdateExercise: (previousName: string, exercise: ExerciseTemplate) => void;
  onDeleteExercise: (name: string) => void;
}

export default function Settings({ data, customExercises, onUpdateExercise, onDeleteExercise }: SettingsProps) {
  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reptrack-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 pt-12 pb-32 space-y-8 max-w-xl mx-auto w-full">
      <div className="px-2 space-y-2">
        <h1 className="text-6xl font-black tracking-tighter leading-none text-white italic uppercase">Settings</h1>
        <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-[10px] italic">Manage Custom Exercises</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={exportData}
          className="py-4 rounded-2xl bg-lime-500 text-black font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Download className="w-4 h-4" />
          Export JSON
        </button>
        <button
          type="button"
          disabled
          className="py-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-600 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 opacity-60"
        >
          <Upload className="w-4 h-4" />
          Import Soon
        </button>
      </div>

      {customExercises.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center mx-auto">
            <SettingsIcon className="w-8 h-8 text-zinc-700" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">No Custom Exercises</h2>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
              Exercises you add from workouts will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {customExercises.map((exercise) => (
            <React.Fragment key={exercise.name.toLowerCase()}>
              <CustomExerciseEditor
                exercise={exercise}
                onSave={(updated) => onUpdateExercise(exercise.name, updated)}
                onDelete={() => onDeleteExercise(exercise.name)}
              />
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomExerciseEditor({
  exercise,
  onSave,
  onDelete,
}: {
  exercise: ExerciseTemplate;
  onSave: (exercise: ExerciseTemplate) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(exercise.name);
  const [photo, setPhoto] = useState(exercise.photo);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasChanges = name.trim() !== exercise.name || photo !== exercise.photo;

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setPhoto(await readCompressedPhoto(file));
    } catch (error) {
      console.error(error);
    } finally {
      event.target.value = "";
    }
  };

  const handleSave = () => {
    const nextName = name.trim();
    if (!nextName) return;
    onSave({ ...exercise, name: nextName, photo });
  };

  return (
    <motion.div layout className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800 shadow-sm space-y-5">
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "w-20 h-20 shrink-0 rounded-2xl bg-zinc-950 flex items-center justify-center overflow-hidden border border-dashed border-zinc-800",
            photo && "border-none"
          )}
        >
          {photo ? <img src={photo} className="w-full h-full object-cover" alt={exercise.name} /> : <Camera className="w-7 h-7 text-zinc-700" />}
        </button>
        <input ref={fileInputRef} type="file" onChange={handlePhotoChange} accept="image/*" className="hidden" />

        <div className="flex-1 min-w-0 space-y-3">
          <label className="text-[10px] font-black text-zinc-600 uppercase italic tracking-widest">Exercise Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full bg-transparent border-b-4 border-zinc-800 focus:border-lime-500 outline-none text-2xl font-black text-white italic uppercase tracking-tighter pb-2"
          />
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">
            {exercise.trackingType === "reps-only" ? "Reps Only" : "Weighted"}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        {photo && (
          <button
            type="button"
            onClick={() => setPhoto(undefined)}
            className="px-4 py-4 rounded-xl bg-zinc-950 text-zinc-500 hover:text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Photo
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="px-4 py-4 rounded-xl bg-zinc-950 text-zinc-500 hover:text-red-500 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || !name.trim()}
          className="flex-1 py-4 rounded-xl bg-lime-500 text-black disabled:opacity-10 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Save className="w-4 h-4" />
          Save
        </button>
      </div>
    </motion.div>
  );
}
