import Database from "better-sqlite3";
import { dirname } from "path";
import { mkdirSync } from "fs";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "./schema.js";
import { expandPath, loadConfig } from "../lib/config.js";

const config = loadConfig();

const DB_PATH =
    expandPath(config.dbLocation);

const MIGRATION_DIR = expandPath(config.migrationDir);

mkdirSync(dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);

export const db = drizzle(sqlite, { schema });

export function ensureDbMigrated() {
    migrate(db, {
        migrationsFolder: MIGRATION_DIR,
    });
}

export default db;