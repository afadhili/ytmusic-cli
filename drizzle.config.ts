import { defineConfig } from 'drizzle-kit';
import { expandPath, loadConfig } from './src/lib/config.js';

export default defineConfig({
  out: expandPath(loadConfig().migrationDir),
  schema: './src/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: expandPath(loadConfig().dbLocation),
  },
});
