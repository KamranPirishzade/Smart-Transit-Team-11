import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { loadRootEnv, selectDatabaseUrl } from './src/common/config/load-env';

// With a config file Prisma CLI no longer auto-loads .env, and ours lives at the repo root anyway.
loadRootEnv(__dirname);
selectDatabaseUrl();

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join(__dirname, 'prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
});
