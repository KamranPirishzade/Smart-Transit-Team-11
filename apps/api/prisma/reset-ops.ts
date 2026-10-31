import { PrismaClient } from '@prisma/client';
import { loadRootEnv, selectDatabaseUrl } from '../src/common/config/load-env';

/** Clears operational data (reports, recommendations, reserve buses); the network stays. */
async function main(): Promise<void> {
  loadRootEnv(__dirname);
  selectDatabaseUrl();
  const prisma = new PrismaClient();
  try {
    const reserves = await prisma.reserveDispatch.deleteMany();
    const recommendations = await prisma.recommendation.deleteMany();
    const reports = await prisma.crowdReport.deleteMany();
    console.log(
      `[reset-ops] removed ${reserves.count} reserves, ${recommendations.count} recommendations, ${reports.count} reports`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('[reset-ops] failed:', error);
  process.exit(1);
});
