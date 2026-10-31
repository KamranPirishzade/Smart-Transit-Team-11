import { base } from '@smart-transit/config/eslint.base.mjs';

const frameworkImports = {
  patterns: [
    {
      group: ['@nestjs/*', '@prisma/*', 'rxjs', 'rxjs/*'],
      message: 'Domain code must stay framework-free.',
    },
    {
      group: ['**/application/**', '**/infrastructure/**', '**/presentation/**'],
      message: 'Domain must not depend on outer layers.',
    },
  ],
};

export default [
  ...base,
  { ignores: ['jest.config.js'] },
  {
    // Nest DI reads constructor types via emitDecoratorMetadata; tell type-import rules not to strip them.
    languageOptions: {
      parserOptions: { emitDecoratorMetadata: true, experimentalDecorators: true },
    },
  },
  {
    files: ['src/modules/*/domain/**/*.ts', 'src/common/geo/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', frameworkImports] },
  },
  {
    files: ['src/modules/*/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@prisma/*'],
              message: 'Application layer talks to the DB only through ports.',
            },
            {
              group: ['**/infrastructure/**', '**/presentation/**'],
              message: 'Application must not depend on outer layers.',
            },
          ],
        },
      ],
    },
  },
];
