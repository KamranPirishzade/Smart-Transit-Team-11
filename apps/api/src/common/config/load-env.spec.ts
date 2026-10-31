import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assertSeparateTestDatabase,
  findWorkspaceRoot,
  loadRootEnv,
  selectDatabaseUrl,
} from './load-env';

describe('load-env', () => {
  let root: string;
  const saved = { ...process.env };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'st-env-'));
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ workspaces: ['apps/*'] }));
    fs.mkdirSync(path.join(root, 'apps', 'api'), { recursive: true });
    fs.writeFileSync(path.join(root, '.env'), 'ST_FROM_FILE="file"\nST_PRESET=file\n');
  });

  afterEach(() => {
    process.env = { ...saved };
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('finds the workspaces root from a nested app directory', () => {
    expect(findWorkspaceRoot(path.join(root, 'apps', 'api'))).toBe(root);
  });

  it('loads root .env without overriding already-set variables', () => {
    process.env.ST_PRESET = 'shell';
    loadRootEnv(path.join(root, 'apps', 'api'));
    expect(process.env.ST_FROM_FILE).toBe('file');
    expect(process.env.ST_PRESET).toBe('shell');
  });

  it('switches DATABASE_URL to the test database for PRISMA_TARGET=test', () => {
    process.env.DATABASE_URL = 'postgres://main';
    process.env.DATABASE_URL_TEST = 'postgres://test';
    selectDatabaseUrl('test');
    expect(process.env.DATABASE_URL).toBe('postgres://test');
  });

  it('fails loudly when the test URL is missing', () => {
    delete process.env.DATABASE_URL_TEST;
    delete process.env.SMART_TRANSIT_DB_TARGET;
    expect(() => selectDatabaseUrl('test')).toThrow(/DATABASE_URL_TEST/);
  });

  it('refuses a test URL that points at the main database (other params ignored)', () => {
    delete process.env.SMART_TRANSIT_DB_TARGET;
    process.env.DATABASE_URL = 'postgresql://a:b@host.neon.tech/neondb?sslmode=require';
    process.env.DATABASE_URL_TEST = 'postgresql://c:d@HOST.neon.tech/neondb?connect_timeout=10';
    expect(() => selectDatabaseUrl('test')).toThrow(/same database/);
    expect(process.env.DATABASE_URL).toContain('a:b@');
  });

  it('is idempotent across parent/child processes once switched', () => {
    delete process.env.SMART_TRANSIT_DB_TARGET;
    process.env.DATABASE_URL = 'postgresql://h/main';
    process.env.DATABASE_URL_TEST = 'postgresql://h/main_test';
    selectDatabaseUrl('test');
    expect(() => selectDatabaseUrl('test')).not.toThrow();
    expect(process.env.DATABASE_URL).toBe('postgresql://h/main_test');
  });

  it('does nothing without a test target', () => {
    process.env.DATABASE_URL = 'postgresql://h/main';
    selectDatabaseUrl(undefined);
    expect(process.env.DATABASE_URL).toBe('postgresql://h/main');
  });
});

describe('assertSeparateTestDatabase', () => {
  it('accepts distinct databases on the same host', () => {
    expect(() =>
      assertSeparateTestDatabase('postgresql://h/neondb', 'postgresql://h/smart_transit_test'),
    ).not.toThrow();
  });
});
