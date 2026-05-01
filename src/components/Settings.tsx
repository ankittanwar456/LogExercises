import { Camera, ChevronLeft, Dumbbell, Download, Plus, Ruler, Save, Scale, Settings as SettingsIcon, Trash2, Upload, UserRound, X } from "lucide-react";
import { motion } from "motion/react";
import React, { useLayoutEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { AppState, BodyWeightEntry, ExerciseTemplate, UserProfile } from "../types";
import { cn } from "../lib/utils";

const MAX_PHOTO_SIZE = 320;
const PHOTO_QUALITY = 0.72;
const EXERCISE_NAME_MAX_FONT_SIZE = 28;
const EXERCISE_NAME_MIN_FONT_SIZE = 12;
const EXERCISE_NAME_LINE_HEIGHT = 1.05;

const getSafeFileName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "exercise";

const getImageExtension = (photo: string) => {
  const match = photo.match(/^data:image\/([^;]+);base64,/);
  if (!match) return "jpg";
  return match[1] === "jpeg" ? "jpg" : match[1];
};

const getBase64Data = (photo: string) => photo.replace(/^data:image\/[^;]+;base64,/, "");

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
  onUpdateProfile: (profile: UserProfile) => void;
  onUpdateExercise: (previousName: string, exercise: ExerciseTemplate) => void;
  onDeleteExercise: (name: string) => void;
}

export default function Settings({ data, customExercises, onUpdateProfile, onUpdateExercise, onDeleteExercise }: SettingsProps) {
  const [activePage, setActivePage] = useState<"main" | "profile" | "exercises">("main");

  const exportData = async () => {
    const zip = new JSZip();
    const exportedCustomExercises = data.customExercises.map((exercise) => {
      if (!exercise.photo) return exercise;

      const extension = getImageExtension(exercise.photo);
      const imagePath = `custom-exercise-images/${getSafeFileName(exercise.name)}.${extension}`;
      zip.file(imagePath, getBase64Data(exercise.photo), { base64: true });

      return {
        ...exercise,
        photo: imagePath,
      };
    });
    const exportData: AppState = {
      ...data,
      customExercises: exportedCustomExercises,
    };

    zip.file("reptrack-data.json", JSON.stringify(exportData, null, 2));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reptrack-export-${new Date().toISOString().slice(0, 10)}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (activePage === "exercises") {
    return (
      <ExercisesSettingsPage
        customExercises={customExercises}
        onBack={() => setActivePage("main")}
        onUpdateExercise={onUpdateExercise}
        onDeleteExercise={onDeleteExercise}
      />
    );
  }

  if (activePage === "profile") {
    return (
      <ProfileSettingsPage
        profile={data.profile}
        onBack={() => setActivePage("main")}
        onUpdateProfile={onUpdateProfile}
      />
    );
  }

  return (
    <div className="min-h-screen p-6 pt-12 pb-32 flex flex-col gap-8 max-w-xl mx-auto w-full">
      <div className="px-2 space-y-2">
        <h1 className="text-6xl font-black tracking-tighter leading-none text-white italic uppercase">Settings</h1>
        <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-[10px] italic">App Controls</p>
      </div>

      <button
        type="button"
        onClick={() => setActivePage("profile")}
        className="w-full rounded-3xl bg-zinc-900 border border-zinc-800 p-5 flex items-center gap-4 text-left active:scale-[0.99] transition-transform"
      >
        <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
          <UserRound className="w-6 h-6 text-lime-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Profile</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
            {data.profile.weight ? `${data.profile.weight} kg current body weight` : "Add body details and weight history"}
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => setActivePage("exercises")}
        className="w-full rounded-3xl bg-zinc-900 border border-zinc-800 p-5 flex items-center gap-4 text-left active:scale-[0.99] transition-transform"
      >
        <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
          <Dumbbell className="w-6 h-6 text-lime-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Exercises</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
            Manage {customExercises.length} saved {customExercises.length === 1 ? "exercise" : "exercises"}
          </p>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-3 mt-auto">
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
    </div>
  );
}

function ProfileSettingsPage({
  profile,
  onBack,
  onUpdateProfile,
}: {
  profile: UserProfile;
  onBack: () => void;
  onUpdateProfile: (profile: UserProfile) => void;
}) {
  const [age, setAge] = useState(profile.age?.toString() ?? "");
  const [height, setHeight] = useState(profile.height?.toString() ?? "");
  const [historyWeight, setHistoryWeight] = useState("");
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().slice(0, 10));
  const sortedHistory = [...profile.bodyWeightHistory].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  const parseNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  };

  const saveProfile = () => {
    onUpdateProfile({
      ...profile,
      age: parseNumber(age),
      height: parseNumber(height),
    });
  };

  const addBodyWeight = () => {
    const nextWeight = parseNumber(historyWeight);
    if (!nextWeight || !historyDate) return;

    const entry: BodyWeightEntry = {
      id: Math.random().toString(36).substr(2, 9),
      weight: nextWeight,
      recordedAt: new Date(`${historyDate}T12:00:00`).toISOString(),
    };

    onUpdateProfile({
      ...profile,
      weight: nextWeight,
      bodyWeightHistory: [...profile.bodyWeightHistory, entry],
    });
    setHistoryWeight("");
  };

  const deleteBodyWeight = (id: string) => {
    onUpdateProfile({
      ...profile,
      bodyWeightHistory: profile.bodyWeightHistory.filter((entry) => entry.id !== id),
    });
  };

  return (
    <div className="p-6 pt-12 pb-32 space-y-8 max-w-xl mx-auto w-full">
      <div className="space-y-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest"
        >
          <ChevronLeft className="w-4 h-4" />
          Settings
        </button>
        <div className="px-2 space-y-2">
          <h1 className="text-6xl font-black tracking-tighter leading-none text-white italic uppercase">Profile</h1>
          <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-[10px] italic">Body Metrics</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <MetricInput label="Age" value={age} onChange={setAge} unit="yrs" />
          <MetricInput label="Height" value={height} onChange={setHeight} unit="cm" icon={<Ruler className="w-4 h-4" />} />
        </div>
        <button
          type="button"
          onClick={saveProfile}
          className="w-full py-4 rounded-xl bg-lime-500 text-black font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Save className="w-4 h-4" />
          Save Profile
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-5">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Body Weight History</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Track growth over time</p>
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
          <input
            type="number"
            value={historyWeight}
            onChange={(event) => setHistoryWeight(event.target.value)}
            placeholder="KG"
            className="min-w-0 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white font-black italic outline-none focus:border-lime-500"
          />
          <input
            type="date"
            value={historyDate}
            onChange={(event) => setHistoryDate(event.target.value)}
            className="min-w-0 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white font-black text-xs outline-none focus:border-lime-500"
          />
          <button
            type="button"
            onClick={addBodyWeight}
            disabled={!historyWeight || !historyDate}
            className="px-4 rounded-xl bg-lime-500 text-black disabled:opacity-10 flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {sortedHistory.length === 0 ? (
          <p className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-600 py-6">
            No body weight entries yet.
          </p>
        ) : (
          <div className="space-y-2">
            {sortedHistory.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-3">
                <div>
                  <p className="text-xl font-black text-white italic">{entry.weight} kg</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                    {new Date(entry.recordedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteBodyWeight(entry.id)}
                  className="p-2 text-zinc-700 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricInput({
  label,
  value,
  onChange,
  unit,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="min-w-0 rounded-2xl bg-zinc-950 border border-zinc-800 p-3 space-y-2">
      <span className="flex items-center gap-1.5 text-[9px] font-black text-zinc-600 uppercase italic tracking-widest">
        {icon}
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0"
        className="w-full min-w-0 bg-transparent text-2xl font-black text-white italic outline-none placeholder:text-zinc-900"
      />
      <span className="block text-[9px] font-black uppercase tracking-widest text-zinc-700">{unit}</span>
    </label>
  );
}

function ExercisesSettingsPage({
  customExercises,
  onBack,
  onUpdateExercise,
  onDeleteExercise,
}: {
  customExercises: ExerciseTemplate[];
  onBack: () => void;
  onUpdateExercise: (previousName: string, exercise: ExerciseTemplate) => void;
  onDeleteExercise: (name: string) => void;
}) {
  return (
    <div className="p-6 pt-12 pb-32 space-y-8 max-w-xl mx-auto w-full">
      <div className="space-y-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest"
        >
          <ChevronLeft className="w-4 h-4" />
          Settings
        </button>
        <div className="px-2 space-y-2">
          <h1 className="text-6xl font-black tracking-tighter leading-none text-white italic uppercase">Exercises</h1>
          <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-[10px] italic">Manage Custom Exercises</p>
        </div>
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
  const nameInputRef = useRef<HTMLTextAreaElement>(null);
  const [nameFontSize, setNameFontSize] = useState(EXERCISE_NAME_MAX_FONT_SIZE);
  const hasChanges = name.trim() !== exercise.name || photo !== exercise.photo;

  useLayoutEffect(() => {
    const input = nameInputRef.current;
    if (!input) return;

    for (let fontSize = EXERCISE_NAME_MAX_FONT_SIZE; fontSize >= EXERCISE_NAME_MIN_FONT_SIZE; fontSize -= 1) {
      input.style.fontSize = `${fontSize}px`;
      input.style.lineHeight = `${fontSize * EXERCISE_NAME_LINE_HEIGHT}px`;

      if (input.scrollHeight <= input.clientHeight && input.scrollWidth <= input.clientWidth) {
        setNameFontSize(fontSize);
        return;
      }
    }

    setNameFontSize(EXERCISE_NAME_MIN_FONT_SIZE);
  }, [name]);

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
          <textarea
            ref={nameInputRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            rows={2}
            style={{
              fontSize: nameFontSize,
              lineHeight: `${nameFontSize * EXERCISE_NAME_LINE_HEIGHT}px`,
            }}
            className="h-16 w-full min-w-0 resize-none overflow-hidden bg-transparent border-b-4 border-zinc-800 focus:border-lime-500 outline-none font-black text-white italic uppercase tracking-tighter pb-2"
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
