import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { findWorkspaceRoot, loadRootEnv, selectDatabaseUrl } from '../src/common/config/load-env';
import { buildSeedPlan } from './seed/build-seed-plan';
import { loadSeedFiles } from './seed/seed-files';
import { writeSeedPlan } from './seed/write-seed-plan';

/** SEED_ROUTES="37,12" limits the seed to those AYNA busIds (used for the e2e test DB). */
function parseRouteFilter(raw: string | undefined): Set<number> | undefined {
  if (!raw?.trim()) return undefined;
  return new Set(
    raw
      .split(',')
      .map((id) => Number(id.trim()))
      .filter(Number.isInteger),
  );
}

async function main(): Promise<void> {
  loadRootEnv(__dirname);
  selectDatabaseUrl();
  const root = findWorkspaceRoot(__dirname);
  if (!root) throw new Error('Workspace root not found');

  const started = Date.now();
  const files = loadSeedFiles(path.join(root, 'data', 'seed'));
  const plan = buildSeedPlan(files, { routeIds: parseRouteFilter(process.env.SEED_ROUTES) });
  for (const warning of plan.warnings) console.warn(`[seed] warn: ${warning}`);

  const prisma = new PrismaClient();
  try {
    await writeSeedPlan(prisma, plan, (msg) => console.log(`[seed] ${msg}`));
  } finally {
    await prisma.$disconnect();
  }
  console.log(`[seed] done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main().catch((error: unknown) => {
  console.error('[seed] failed:', error);
  process.exitCode = 1;
});
