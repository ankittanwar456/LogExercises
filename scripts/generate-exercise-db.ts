/**
 * Generate a pre-baked SQLite database from exercises.json
 *
 * Usage: npx tsx scripts/generate-exercise-db.ts
 *
 * Reads exercises.json from the project root and writes a SQLite database
 * to public/exercises.db containing only the fields needed by the app.
 */

import Database from "better-sqlite3";
import { readFileSync, mkdirSync, existsSync, statSync, copyFileSync } from "fs";
import { resolve, dirname } from "path";

const PROJECT_ROOT = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")));
const EXERCISES_JSON = resolve(PROJECT_ROOT, "..", "exercises.json");
const OUTPUT_DIR = resolve(PROJECT_ROOT, "..", "public");
const OUTPUT_DB = resolve(OUTPUT_DIR, "exercises.db");

interface RawExercise {
  name: string;
  body_part: string;
  muscle_group: string;
  secondary_muscles: string[];
  target: string;
  image: string;
  gif_url: string;
  [key: string]: unknown;
}

function main() {
  // Read source JSON
  console.log(`Reading ${EXERCISES_JSON}...`);
  const raw: RawExercise[] = JSON.parse(readFileSync(EXERCISES_JSON, "utf-8"));
  console.log(`Found ${raw.length} exercises.`);

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Create (or overwrite) the database
  const db = new Database(OUTPUT_DB);

  // Enable WAL mode for faster writes, then switch back to normal for portability
  db.pragma("journal_mode = WAL");

  db.exec(`
    DROP TABLE IF EXISTS exercises;

    CREATE TABLE exercises (
      name              TEXT PRIMARY KEY,
      body_part         TEXT NOT NULL,
      muscle_group      TEXT NOT NULL,
      secondary_muscles TEXT NOT NULL,
      target            TEXT NOT NULL,
      image             TEXT NOT NULL,
      gif_url           TEXT NOT NULL
    );
  `);

  // Prepare insert statement
  const insert = db.prepare(`
    INSERT OR IGNORE INTO exercises (name, body_part, muscle_group, secondary_muscles, target, image, gif_url)
    VALUES (@name, @body_part, @muscle_group, @secondary_muscles, @target, @image, @gif_url)
  `);

  // Batch insert inside a transaction for speed
  const insertAll = db.transaction((exercises: RawExercise[]) => {
    for (const ex of exercises) {
      insert.run({
        name: ex.name,
        body_part: ex.body_part,
        muscle_group: ex.muscle_group,
        secondary_muscles: JSON.stringify(ex.secondary_muscles ?? []),
        target: ex.target,
        image: ex.image ?? "",
        gif_url: ex.gif_url ?? "",
      });
    }
  });

  insertAll(raw);

  // Create indexes for fast lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_exercises_body_part ON exercises(body_part);
    CREATE INDEX IF NOT EXISTS idx_exercises_target ON exercises(target);
    CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(muscle_group);
  `);

  // Switch back to DELETE journal mode for maximum portability
  db.pragma("journal_mode = DELETE");

  // Compact the database
  db.exec("VACUUM");

  // Print stats
  const count = db.prepare("SELECT COUNT(*) as count FROM exercises").get() as { count: number };
  console.log(`\nDatabase created: ${OUTPUT_DB}`);
  console.log(`Total exercises: ${count.count}`);

  // Print sample queries
  const sample = db.prepare("SELECT * FROM exercises LIMIT 3").all();
  console.log("\nSample rows:");
  console.table(sample);

  // Print unique body parts and targets
  const bodyParts = db.prepare("SELECT DISTINCT body_part FROM exercises ORDER BY body_part").all();
  const targets = db.prepare("SELECT DISTINCT target FROM exercises ORDER BY target").all();
  console.log(`\nUnique body_parts (${bodyParts.length}):`, bodyParts.map((r: any) => r.body_part).join(", "));
  console.log(`Unique targets (${targets.length}):`, targets.map((r: any) => r.target).join(", "));

  db.close();

  // File size
  const stats = statSync(OUTPUT_DB);
  console.log(`\nDatabase file size: ${(stats.size / 1024).toFixed(1)} KB`);

  // Copy sql.js WASM binary to public/
  const wasmSrc = resolve(PROJECT_ROOT, "..", "node_modules", "sql.js", "dist", "sql-wasm.wasm");
  const wasmDest = resolve(OUTPUT_DIR, "sql-wasm.wasm");
  if (existsSync(wasmSrc)) {
    copyFileSync(wasmSrc, wasmDest);
    console.log(`Copied sql-wasm.wasm to ${wasmDest}`);
  } else {
    console.warn(`Warning: sql-wasm.wasm not found at ${wasmSrc}`);
  }
}

main();
