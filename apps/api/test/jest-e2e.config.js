/** E2E tests: real Nest app + the TEST database (guarded in e2e-env.ts). */
module.exports = {
  testEnvironment: 'node',
  rootDir: '..',
  roots: ['<rootDir>/test'],
  testRegex: '\\.e2e-spec\\.ts$',
  setupFiles: ['<rootDir>/test/e2e-env.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  testTimeout: 30000,
};
