import { hash } from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';

const BCRYPT_ROUNDS = 10;

/** Creates or updates the operator from OPERATOR_EMAIL / OPERATOR_PASSWORD (skipped when unset). */
export async function seedOperator(
  prisma: PrismaClient,
  env: NodeJS.ProcessEnv,
  log: (message: string) => void,
): Promise<void> {
  const email = env.OPERATOR_EMAIL?.trim().toLowerCase();
  const password = env.OPERATOR_PASSWORD;
  if (!email || !password) {
    log('OPERATOR_EMAIL / OPERATOR_PASSWORD not set — operator not seeded');
    return;
  }
  const passwordHash = await hash(password, BCRYPT_ROUNDS);
  await prisma.operator.upsert({
    where: { email },
    create: { email, passwordHash, name: 'Operator' },
    update: { passwordHash },
  });
  log('operator account ready');
}
