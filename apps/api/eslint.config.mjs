import { base } from '@smart-transit/config/eslint.base.mjs';

// Architecture rules (see CLAUDE.md). ESLint replaces — not merges — a rule configured twice for
// the same file, so every layer gets the full list it needs.

/** Another module may be imported only through its public-api.ts. */
const crossModule = {
  group: [
    '../../*/domain/**',
    '../../*/application/**',
    '../../*/infrastructure/**',
    '../../*/presentation/**',
    '../../*/*.module',
    '../*/domain/**',
    '../*/application/**',
    '../*/infrastructure/**',
    '../*/presentation/**',
  ],
  message: "Import other modules only through their 'public-api'.",
};

const framework = {
  group: ['@nestjs/*', '@prisma/*', 'rxjs', 'rxjs/*'],
  message: 'Domain code must stay framework-free.',
};
const outerFromDomain = {
  group: ['**/application/**', '**/infrastructure/**', '**/presentation/**'],
  message: 'Domain must not depend on outer layers.',
};
const prismaFromApplication = {
  group: ['@prisma/*'],
  message: 'Application layer talks to the DB only through ports.',
};
const outerFromApplication = {
  group: ['**/infrastructure/**', '**/presentation/**'],
  message: 'Application must not depend on outer layers.',
};

const restrict = (...patterns) => ({ 'no-restricted-imports': ['error', { patterns }] });

export default [
  ...base,
  { ignores: ['jest.config.js'] },
  {
    // Nest DI reads constructor types via emitDecoratorMetadata; tell type-import rules not to strip them.
    languageOptions: {
      parserOptions: { emitDecoratorMetadata: true, experimentalDecorators: true },
    },
  },
  { files: ['src/modules/**/*.ts'], rules: restrict(crossModule) },
  { files: ['src/common/geo/**/*.ts', 'src/common/domain/**/*.ts'], rules: restrict(framework) },
  {
    files: ['src/modules/*/domain/**/*.ts'],
    rules: restrict(framework, outerFromDomain, crossModule),
  },
  {
    files: ['src/modules/*/application/**/*.ts'],
    rules: restrict(prismaFromApplication, outerFromApplication, crossModule),
  },
];
