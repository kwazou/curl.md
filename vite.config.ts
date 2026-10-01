import { defineConfig } from 'vite-plus'

export default defineConfig({
  fmt: {
    ignorePatterns: ['src/md/rules/__fixtures__/**', 'src/md/rules/__snapshots__/**'],
    semi: false,
    singleQuote: true,
    sortImports: {
      internalPattern: ['#*'],
      newlinesBetween: false,
    },
    sortPackageJson: false,
  },
  lint: {
    categories: {
      correctness: 'error',
    },
    ignorePatterns: ['**/__fixtures__', '**/__snapshots__'],
    overrides: [
      {
        files: ['**/*.test.ts'],
        rules: {
          'no-lone-blocks': 'off',
          'typescript/no-non-null-assertion': 'off',
        },
      },
    ],
    rules: {
      'typescript/no-floating-promises': 'error',
    },
  },
  staged: {
    '*': 'vp check --fix --no-error-on-unmatched-pattern',
    '*.ts': "bash -c 'pnpm check:types'",
  },
})
