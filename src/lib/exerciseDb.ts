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

export const getExerciseSearchTerms = (query: string): string[] =>
  query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

export const exerciseNameMatchesSearch = (name: string, searchTerms: string[]): boolean => {
  const normalizedName = name.toLowerCase();
  return searchTerms.every((term) => normalizedName.includes(term));
};

export const getExerciseNameSearchRank = (name: string, query: string): number => {
  const normalizedName = name.trim().toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  const searchTerms = getExerciseSearchTerms(query);

  if (!normalizedQuery) return 0;
  if (normalizedName === normalizedQuery) return 0;
  if (normalizedName.startsWith(normalizedQuery)) return 1;
  if (normalizedName.includes(normalizedQuery)) return 2;
  if (searchTerms.every((term) => normalizedName.startsWith(term) || normalizedName.includes(` ${term}`))) return 3;
  if (searchTerms.every((term) => normalizedName.includes(term))) return 4;
  return 5;
};

export function searchExercisesByName(query: string, limit = 20): DbExercise[] {
  const trimmed = query.trim();
  if (!trimmed) return queryAll("SELECT * FROM exercises ORDER BY name LIMIT $limit", { $limit: limit });
  const searchTerms = getExerciseSearchTerms(trimmed);
  const whereClause = searchTerms.map((_, index) => `name LIKE $term${index}`).join(" AND ");
  const params = Object.fromEntries(searchTerms.map((term, index) => [`$term${index}`, `%${term}%`]));

  return queryAll(
    `SELECT * FROM exercises
     WHERE ${whereClause}
     ORDER BY
       CASE
         WHEN lower(name) = $normalizedPhrase THEN 0
         WHEN lower(name) LIKE $phraseStart THEN 1
         WHEN lower(name) LIKE $phrase THEN 2
         WHEN ${searchTerms.map((_, index) => `(lower(name) LIKE $termStart${index} OR lower(name) LIKE $wordStart${index})`).join(" AND ")} THEN 3
         ELSE 4
       END,
       name
     LIMIT $limit`,
    {
      ...params,
      ...Object.fromEntries(searchTerms.map((term, index) => [`$termStart${index}`, `${term}%`])),
      ...Object.fromEntries(searchTerms.map((term, index) => [`$wordStart${index}`, `% ${term}%`])),
      $normalizedPhrase: trimmed.toLowerCase(),
      $phraseStart: `${trimmed.toLowerCase()}%`,
      $phrase: `%${trimmed.toLowerCase()}%`,
      $limit: limit,
    }
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
