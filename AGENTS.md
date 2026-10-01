# AGENTS.md

Agent guidance for this repository.

> **Communication Style**: Be brief, concise. Maximize information density, minimize tokens. Incomplete sentences acceptable when clear. Remove filler words. Prioritize clarity over grammar.

## Commands

Prefer running these scripts instead of using `npx`. Use `pnpm` over `npx` for running binaries.

- `pnpm check` - Lint and format with oxlint + oxfmt
- `pnpm check:types` - Type check with tsgo
- `pnpm gen:fixtures:md:rules` - Re-fetch live sources for `src/md/rules` fixture tests
  - Run `pnpm test --project md --run src/md/ --update` after to update snapshots
- `pnpm test` - Run tests with Vitest (includes all projects)
- `pnpm test --project name` - Always try to scope tests to specific projects when possible
- `pnpm serve` - Run local HTTP server (`src/local/serve.ts`)

## API (Hono RPC)

- Always specify explicit status codes in `c.json()` responses (e.g., `c.json({ error: 'not_found' }, 404)`, `c.json({ data }, 200)`)
- Use `res.status` to narrow response types on the client instead of `'error' in data` checks
- Prefer route-level error responses over global middleware errors — keeps RPC types precise per-endpoint
- Use string literal error codes in API responses (e.g., `'organization_access_denied'`, `'expired_token'`) for type-safe client matching
- Use `validator()` from `#lib/hono.ts` (not `@hono/zod-validator` directly) — it formats validation errors as `{ error: 'validation_error', issues: [{ path, message }] }`
- Add `if (false as boolean) return validationError(c)` as the first line in validated handlers to include the 400 response in RPC types (validator middleware handles it at runtime, but Hono doesn't type middleware responses)

## Naming

- Avoid hyphens in command names, route paths, and identifiers — they break double-click-to-select

## Code Style

- Use IIFE when appropriate
- Avoid arrow functions unless necessary (e.g. inline anonymous callbacks, callbacks requiring lexical `this`, or established API patterns)
- No braces for single-branch statements (`if (true) return ...`)
- No emoji
- Alphabetize imports, keys, props, etc.
- Inline code; extract only when reused across files
- Use `#` package.json import prefix (e.g., `#lib/fetch.ts`, `#md/index.ts`)
- Use `.ts`/`.tsx` extensions in imports (`allowImportingTsExtensions`)
- Place internal non-exported functions at the bottom of the file
- Prefer "account" over "user" in naming (variables, types, functions, etc.)
- Don't destructure unless necessary (e.g. prefer `const json = c.req.valid('json')` over `const { name, slug } = c.req.valid('json')`)
- Avoid creating variables for basic things unless necessary (e.g. prefer using `c.var.db` over `const db = c.var.db`)
- whenever you add a time duration/amount, make sure it has comment next to it with the human-readable time (e.g. `const accessTokenTtlMs = 15 * 60 * 1000 // 15 minutes`)

## Tests

- Don't use `describe` blocks unless required

## Layout

- `src/md` - URL to markdown engine (rules, profiles, transports)
- `src/local` - Node HTTP server (Hono) + Playwright Chromium rendering
- `src/lib` - shared query/param schemas, validator, LLM prompt

## Misc

- Repo/project-level README is located at `.github/README.md`
- Use `pnpm-workspace.yaml>overrides` instead of `package.json#pnpm.overrides`
- Make sure comments don't get dropped from `pnpm-workspace.yaml` when making edits or fixing `pnpm audit`
