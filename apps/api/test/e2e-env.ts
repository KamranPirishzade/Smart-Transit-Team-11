import { assertSeparateTestDatabase, loadRootEnv } from '../src/common/config/load-env';

// Runs before any test module is loaded: e2e tests may only ever touch DATABASE_URL_TEST.
loadRootEnv(__dirname);
assertSeparateTestDatabase(process.env.DATABASE_URL, process.env.DATABASE_URL_TEST);
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
