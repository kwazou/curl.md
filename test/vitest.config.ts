import path from 'node:path'
import { isAgent } from 'std-env'
import { defineConfig } from 'vitest/config'

const root = path.resolve(import.meta.dirname, '..')

const reporters = [isAgent ? 'agent' : 'default']
if (process.env.GITHUB_ACTIONS === 'true') reporters.push('github-actions')

export default defineConfig({
  test: {
    reporters,
    projects: [
      {
        test: {
          name: 'app',
          include: ['src/**/*.test.ts'],
          exclude: ['src/md/**'],
          root,
        },
      },
      {
        test: {
          name: 'md',
          include: ['src/md/**/*.test.ts'],
          exclude: ['**/*.smoke.test.ts'],
          root,
        },
      },
      {
        test: {
          name: 'md:smoke',
          include: ['src/md/**/*.smoke.test.ts'],
          root,
          testTimeout: 30_000,
        },
      },
    ],
  },
})
