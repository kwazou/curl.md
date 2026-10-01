# curl.md (local)

URL to markdown HTTP server for local use. Fork of [wevm/curl.md](https://github.com/wevm/curl.md) reduced to the transcription engine (`src/md`) and a standalone Node server (`src/local`). No database or cloud account required. Runs with Node or Docker.

## Quick Start

```sh
# pnpm v11.0.9 requires npx to run with Node 24+
npx pnpm@latest install --ignore-scripts
npx pnpm@latest exec playwright install chromium # once, for JS-only pages (SPAs)
npx pnpm@latest serve # http://127.0.0.1:3000 (set HOST/PORT to change)
```

### Docker

The image bundles Node, production dependencies, and headless Chromium.

```sh
docker compose up -d --build # http://127.0.0.1:3000 (set PORT in .env to change host port)
```

`.env` is loaded if present. `AI_BASE_URL` defaults to `http://host.docker.internal:11434/v1` (Ollama running on the host). To run Ollama in a container instead:

```sh
docker compose --profile ollama up -d
docker compose exec ollama ollama pull llama3.1:8b
# then set AI_BASE_URL=http://ollama:11434/v1 in .env and `docker compose up -d`
```

Without Compose: `docker build -t curl.md . && docker run --init -p 127.0.0.1:3000:3000 curl.md`.

## Usage

```sh
# Transcribe a URL to markdown
curl 127.0.0.1:3000/example.com
curl 127.0.0.1:3000/api/https://example.com > example.md

# Options
curl "127.0.0.1:3000/example.com?keywords=install,setup"             # keep sections matching keywords (k)
curl "127.0.0.1:3000/example.com?objective=how+to+install&mode=rush" # LLM extraction (o/q, m)
curl "127.0.0.1:3000/example.com?fresh"                             # bypass 15m in-memory cache (f)
curl -H "accept: application/json" 127.0.0.1:3000/example.com       # { "content": "..." }
```

To start the server: `npx pnpm@latest serve`

| Query param           | Description                                                                             |
| --------------------- | --------------------------------------------------------------------------------------- |
| `objective` / `o`/`q` | Keep only the parts of the page relevant to this objective (verbatim excerpts, via LLM) |
| `keywords` / `k`      | Comma/space separated; keep sections containing any keyword (no LLM)                    |
| `mode` / `m`          | `smart` (default, `AI_MODEL`) or `rush` (`AI_MODEL_RUSH`); only used with `objective`   |
| `fresh` / `f`         | Bypass the in-memory cache                                                              |

Responses are `text/markdown` with YAML frontmatter (title, url, …), or JSON with `Accept: application/json`. Headers: `x-cache`, `x-tokens-count`, `x-tokens-saved`. Errors: `400 validation_error`, `502 fetch_failed`, `502 ai_failed`.

## Configuration

Env vars or a `.env` file (see `.env.example`). All optional.

| Variable            | Description                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `HOST` / `PORT`     | Listen address (default `127.0.0.1:3000`)                                                          |
| `AI_BASE_URL`       | OpenAI-compatible API base URL (default `http://localhost:11434/v1`, [Ollama](https://ollama.com)) |
| `AI_MODEL`          | Model for `mode=smart` (default `llama3.1:8b`)                                                     |
| `AI_MODEL_RUSH`     | Model for `mode=rush` (default `AI_MODEL`)                                                         |
| `AI_API_KEY`        | API key for the AI API (sent as `Authorization` header)                                            |
| `GH_TOKEN`          | GitHub token for higher GitHub API rate limits / private repos                                     |
| `BROWSER_RENDERING` | Set to `false` to disable the local Chromium fallback (default `true`)                             |

## External dependencies

- Target websites (and site-specific sources some rules use, e.g. GitHub API, raw.githubusercontent.com)
- An OpenAI-compatible LLM endpoint, only when using `objective` (local Ollama works)

To start the server: `npx pnpm@latest serve`

JS-only pages (SPAs) and pages answering 403 are re-rendered in a local headless Chromium (Playwright), launched on first use and reused. Requests from the rendered page to `localhost`, IP addresses, and non-http(s) URLs are blocked. If Chromium isn't installed, the server falls back to the plain HTML result.

The server fetches arbitrary public URLs on behalf of callers (domains resolving to private IPs are not blocked). It binds to `127.0.0.1` by default; don't expose it publicly.

## Development

```sh
# pnpm v11.0.9 requires npx to run with Node 24+
npx pnpm@latest check                         # lint + format
npx pnpm@latest check:types                   # type check
npx pnpm@latest test --project app --project md --run
npx pnpm@latest test --project md:smoke --run # live network checks for site rules
```

## License

[MIT](../LICENSE)
