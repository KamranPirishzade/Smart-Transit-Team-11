import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { AppModule } from '../src/app.module';

/** Route id 37 (bus number 49) is the only route in the test DB. */
const ROUTE_ID = 37;
const OPERATOR = { email: 'e2e-operator@example.com', password: 'e2e-password-123' };

let app: INestApplication;
let prisma: PrismaClient;
let base: string;

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const report = (deviceId: string, level = 'CROWDED') =>
  fetch(
    `${base}/reports`,
    json({ routeId: ROUTE_ID, direction: 1, level, lat: 40.38, lon: 49.85, deviceId }),
  );

async function login(): Promise<string> {
  const response = await fetch(`${base}/auth/login`, json(OPERATOR));
  return ((await response.json()) as { accessToken: string }).accessToken;
}

beforeAll(async () => {
  prisma = new PrismaClient();
  // Safe: DATABASE_URL points at the test database (see test/e2e-env.ts).
  await prisma.reserveDispatch.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.crowdReport.deleteMany();
  await prisma.operator.upsert({
    where: { email: OPERATOR.email },
    create: {
      email: OPERATOR.email,
      passwordHash: await hash(OPERATOR.password, 4),
      name: 'E2E',
    },
    update: { passwordHash: await hash(OPERATOR.password, 4) },
  });

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.listen(0);
  base = `${await app.getUrl()}/api`.replace('[::1]', 'localhost');
});

afterAll(async () => {
  await app?.close();
  await prisma?.$disconnect();
});

describe('API (e2e, test database)', () => {
  it('10 CROWDED reports from different devices create a PENDING recommendation', async () => {
    for (let i = 0; i < 10; i += 1) {
      expect((await report(`e2e-device-${i}`)).status).toBe(201);
    }
    const token = await login();

    let pending: { routeId: number; status: string }[] = [];
    for (let attempt = 0; attempt < 20 && pending.length === 0; attempt += 1) {
      const response = await fetch(`${base}/operator/recommendations?status=PENDING`, {
        headers: { authorization: `Bearer ${token}` },
      });
      pending = (await response.json()) as typeof pending;
      if (pending.length === 0) await new Promise((r) => setTimeout(r, 250));
    }

    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ routeId: ROUTE_ID, status: 'PENDING' });
  });

  it('rejects operator endpoints without a token (401)', async () => {
    expect((await fetch(`${base}/operator/overview`)).status).toBe(401);
  });

  it('returns stop arrivals sorted by ETA', async () => {
    const route = (await (await fetch(`${base}/routes/${ROUTE_ID}`)).json()) as {
      directions: { stops: { stopId: number }[] }[];
    };
    const stopId = route.directions[0]!.stops[2]!.stopId;
    const body = (await (await fetch(`${base}/stops/${stopId}/arrivals?limit=10`)).json()) as {
      arrivals: { etaS: number }[];
    };

    expect(body.arrivals.length).toBeGreaterThan(1);
    const etas = body.arrivals.map((a) => a.etaS);
    expect(etas).toEqual([...etas].sort((a, b) => a - b));
  });

  it('rejects an invalid crowd level (400)', async () => {
    const response = await report('e2e-device-bad', 'PACKED');
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ statusCode: 400, path: '/api/reports' });
  });
});
