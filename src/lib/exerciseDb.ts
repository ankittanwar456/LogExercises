import initSqlJs, { Database } from "sql.js";

export interface DbExercise {
  name: string;
  body_part: string;
  muscle_group: string;
  secondary_muscles: string[];
  target: string;
  image: string;
  gif_url: string;
}

let db: Database | null = null;
let initPromise: Promise<void> | null = null;

export async function initExerciseDb(): Promise<void> {
  if (db) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const SQL = await initSqlJs({
      locateFile: () => `/sql-wasm.wasm`,
    });

    const response = await fetch("/exercises.db");
    const buffer = await response.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buffer));
  })();

  return initPromise;
}

export function isExerciseDbReady(): boolean {
  return db !== null;
}

const rowToExercise = (row: Record<string, unknown>): DbExercise => ({
  name: row.name as string,
  body_part: row.body_part as string,
  muscle_group: row.muscle_group as string,
  secondary_muscles: JSON.parse((row.secondary_muscles as string) || "[]"),
  target: row.target as string,
  image: row.image as string,
  gif_url: row.gif_url as string,
});

const queryAll = (sql: string, params?: Record<string, unknown>): DbExercise[] => {
  if (!db) return [];
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);

  const results: DbExercise[] = [];
  while (stmt.step()) {
    results.push(rowToExercise(stmt.getAsObject()));
  }
  stmt.free();
  return results;
};

export function searchExercisesByName(query: string, limit = 20): DbExercise[] {
  const trimmed = query.trim();
  if (!trimmed) return queryAll("SELECT * FROM exercises ORDER BY name LIMIT $limit", { $limit: limit });
  return queryAll(
    "SELECT * FROM exercises WHERE name LIKE $query ORDER BY name LIMIT $limit",
    { $query: `%${trimmed}%`, $limit: limit }
  );
}

export function getExerciseByName(name: string): DbExercise | null {
  const results = queryAll(
    "SELECT * FROM exercises WHERE name = $name LIMIT 1",
    { $name: name }
  );
  return results[0] ?? null;
}

export function getExercisesByBodyPart(bodyPart: string, limit = 50): DbExercise[] {
  return queryAll(
    "SELECT * FROM exercises WHERE body_part = $bodyPart ORDER BY name LIMIT $limit",
    { $bodyPart: bodyPart, $limit: limit }
  );
}

export function getExercisesByTarget(target: string, limit = 50): DbExercise[] {
  return queryAll(
    "SELECT * FROM exercises WHERE target = $target ORDER BY name LIMIT $limit",
    { $target: target, $limit: limit }
  );
}

export function getAllBodyParts(): string[] {
  if (!db) return [];
  const results = db.exec("SELECT DISTINCT body_part FROM exercises ORDER BY body_part");
  if (!results.length) return [];
  return results[0].values.map((row) => row[0] as string);
}

export function getAllTargets(): string[] {
  if (!db) return [];
  const results = db.exec("SELECT DISTINCT target FROM exercises ORDER BY target");
  if (!results.length) return [];
  return results[0].values.map((row) => row[0] as string);
}
