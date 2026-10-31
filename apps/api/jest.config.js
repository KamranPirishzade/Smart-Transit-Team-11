/** Unit tests (no DB). Coverage threshold applies to domain code only and runs only with `test:cov`. */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/prisma'],
  testRegex: '\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  collectCoverageFrom: ['src/modules/*/domain/**/*.ts', 'src/common/geo/**/*.ts', '!**/*.spec.ts'],
  coverageReporters: ['text-summary', 'text', 'lcov'],
  coverageThreshold: {
    global: { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
};
