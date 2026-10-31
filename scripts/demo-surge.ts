/**
 * Demo: floods one route with "crowded" passenger reports so the congestion rule fires and a
 * reserve-bus recommendation appears in the operator panel.
 *
 *   npm run demo:surge -- --route 49 (bus number) [--count 12] [--api http://localhost:4000/api]
 *
 * The API must be running. Operator credentials come from the root .env (OPERATOR_EMAIL/PASSWORD);
 * they are used only to read the recommendation back and are never printed.
 */
import path from 'node:path';

interface Args {
  routeNumber: string;
  count: number;
  api: string;
}

interface RouteDetails {
  directions: { stops: { lat: number; lon: number }[] }[];
}

interface Recommendation {
  id: string;
  routeId: number;
  routeNumber: string;
  reason: string;
  highReports: number;
  totalReports: number;
}

const BAKU_CENTRE = { lat: 40.3796, lon: 49.8486 };
const POLL_ATTEMPTS = 10;
const POLL_DELAY_MS = 500;

function parseArgs(argv: string[]): Args {
  const read = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const routeNumber = read('--route')?.trim();
  if (!routeNumber) {
    throw new Error('Usage: npm run demo:surge -- --route <bus number> [--count 12] [--api <url>]');
  }
  const count = Number(read('--count') ?? 12);
  return {
    routeNumber,
    count: Number.isInteger(count) && count > 0 ? count : 12,
    api: (read('--api') ?? `http://localhost:${process.env.PORT ?? 4000}/api`).replace(/\/$/, ''),
  };
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(
      `${init?.method ?? 'GET'} ${url} -> ${response.status} ${await response.text()}`,
    );
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  try {
    process.loadEnvFile(path.join(__dirname, '..', '.env'));
  } catch {
    // no .env: rely on the real environment
  }
  const { routeNumber, count, api } = parseArgs(process.argv.slice(2));
  const email = process.env.OPERATOR_EMAIL;
  const password = process.env.OPERATOR_PASSWORD;
  if (!email || !password) throw new Error('OPERATOR_EMAIL and OPERATOR_PASSWORD must be set');

  const matches = await call<{ id: number; number: string }[]>(
    `${api}/routes?query=${encodeURIComponent(routeNumber)}&limit=250`,
  );
  const routeId = matches.find((r) => r.number.toLowerCase() === routeNumber.toLowerCase())?.id;
  if (routeId === undefined) throw new Error(`No route with number ${routeNumber}`);

  const route = await call<RouteDetails>(`${api}/routes/${routeId}`);
  const stop = route.directions[0]?.stops[0] ?? BAKU_CENTRE;
  const runId = Date.now().toString(36);

  // Every report comes from its own device, so the 3-per-minute rate limit does not apply.
  for (let i = 0; i < count; i += 1) {
    await call(
      `${api}/reports`,
      json({
        routeId,
        direction: 1,
        level: i % 2 === 0 ? 'FULL' : 'CROWDED',
        lat: stop.lat,
        lon: stop.lon,
        deviceId: `demo-surge-${runId}-${i}`,
      }),
    );
  }
  console.log(`[demo:surge] sent ${count} crowded reports for route ${routeId}`);

  const { accessToken } = await call<{ accessToken: string }>(
    `${api}/auth/login`,
    json({ email, password }),
  );
  const headers = { authorization: `Bearer ${accessToken}` };

  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    const pending = await call<Recommendation[]>(`${api}/operator/recommendations?status=PENDING`, {
      headers,
    });
    const found = pending.find((r) => r.routeId === routeId);
    if (found) {
      console.log(
        `[demo:surge] recommendation ${found.id} is PENDING for route ${found.routeNumber}: ` +
          `${found.highReports}/${found.totalReports} high reports`,
      );
      console.log(`[demo:surge] ${found.reason}`);
      return;
    }
    await sleep(POLL_DELAY_MS);
  }
  throw new Error(`No PENDING recommendation for route ${routeId} appeared`);
}

main().catch((error: unknown) => {
  console.error(`[demo:surge] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
