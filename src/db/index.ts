import Database from "better-sqlite3";
import { dirname } from "path";
import { existsSync, mkdirSync } from "fs";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "./schema.js";
import { expandPath, loadConfig } from "../lib/config.js";

const config = loadConfig();

const dbPath = expandPath(config.dbLocation);
const dbDir = dirname(dbPath);

const MIGRATION_DIR = expandPath(config.migrationDir);

if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
}

mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });

export function ensureDbMigrated() {
    migrate(db, {
        migrationsFolder: MIGRATION_DIR,
    });
}

export default db;