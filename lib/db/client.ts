import { createAppDatabase, AppDatabase } from "./adapter";
import { SCHEMA } from "./schema";

let db: AppDatabase | null = null;

export async function getDatabase(): Promise<AppDatabase> {
  if (!db) {
    const dbPath = process.env.SQLITE_DB_PATH ?? "./data/football-ranker.sqlite";
    db = createAppDatabase(dbPath);
    await db.exec(SCHEMA);
  }
  return db;
}

export function resetDatabase(): void {
  db = null;
}
