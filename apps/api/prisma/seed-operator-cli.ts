import { PrismaClient } from '@prisma/client';
import { loadRootEnv, selectDatabaseUrl } from '../src/common/config/load-env';
import { seedOperator } from './seed-operator';

/** Seeds only the operator account (the full seed takes about a minute). */
async function main(): Promise<void> {
  loadRootEnv(__dirname);
  selectDatabaseUrl();
  const prisma = new PrismaClient();
  try {
    await seedOperator(prisma, process.env, (msg) => console.log(`[seed] ${msg}`));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('[seed] failed:', error);
  process.exit(1);
});
