import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "./db";

export function migrateDatabase() {
  migrate(db, { migrationsFolder: "./drizzle" });
}
