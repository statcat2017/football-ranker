import type { AppDatabase } from "./adapter";
import { SCHEMA } from "./schema";

export async function applyMigrations(db: AppDatabase): Promise<void> {
  await db.exec(SCHEMA);
}
