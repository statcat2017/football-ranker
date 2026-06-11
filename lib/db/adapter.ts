import type Database from "better-sqlite3";
import SqliteDatabase from "better-sqlite3";

export type QueryParam = string | number | null;

export interface AppDatabase {
  all<T>(sql: string, params?: QueryParam[]): Promise<T[]>;
  get<T>(sql: string, params?: QueryParam[]): Promise<T | undefined>;
  run(sql: string, params?: QueryParam[]): Promise<{ changes: number; lastInsertRowid: number | bigint }>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (db: AppDatabase) => Promise<T>): Promise<T>;
}

export function createAppDatabase(sqlitePath: string): AppDatabase {
  const rawDb: Database.Database = new SqliteDatabase(sqlitePath);

  rawDb.pragma("foreign_keys = ON");
  rawDb.pragma("journal_mode = WAL");
  rawDb.pragma("busy_timeout = 5000");

  let transactionDepth = 0;

  const appDb: AppDatabase = {
    async all<T>(sql: string, params: QueryParam[] = []) {
      return rawDb.prepare(sql).all(...params) as T[];
    },
    async get<T>(sql: string, params: QueryParam[] = []) {
      return rawDb.prepare(sql).get(...params) as T | undefined;
    },
    async run(sql: string, params: QueryParam[] = []) {
      return rawDb.prepare(sql).run(...params);
    },
    async exec(sql: string) {
      rawDb.exec(sql);
    },
    async transaction<T>(fn: (txDb: AppDatabase) => Promise<T>): Promise<T> {
      const nested = transactionDepth > 0;
      if (!nested) {
        rawDb.exec("BEGIN");
      }
      transactionDepth++;
      try {
        const result = await fn(appDb);
        transactionDepth--;
        if (!nested) {
          rawDb.exec("COMMIT");
        }
        return result;
      } catch (error) {
        transactionDepth--;
        if (!nested) {
          rawDb.exec("ROLLBACK");
        }
        throw error;
      }
    },
  };

  return appDb;
}
