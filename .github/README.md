<p>
  <a href="https://curl.md">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="../public/dark.svg">
      <source media="(prefers-color-scheme: light)" srcset="../public/light.svg">
      <img src="../public/light.svg" alt="curl.md" height="30" style="width: auto;">
    </picture>
  </a>
  <br>
</p>

### URL to markdown for agents.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../public/sheep/static/thunder.png">
  <source media="(prefers-color-scheme: light)" srcset="../public/sheep/static/cloud.png">
  <img align="right" src="../public/sheep/static/cloud.png" alt="curl.md sheep" width="80" height="80">
</picture>

Turn websites into **optimized, low token output** to **supercharge your context**. Save money on tokens. Works with **every agent**.

---

## Quick Start

```sh
# Just use `curl`
curl curl.md/example.com

# Install CLI
curl -fsSL https://curl.md/install.sh | bash
npm i -g curl.md
bun i -g curl.md

# Use CLI via `curl.md` or short `md` alias
curl.md example.com
md example.com

# Add to your agent
claude plugin marketplace add wevm/curl.md
claude plugin install curl-md@curl-md
opencode plugin -g @curl.md/opencode
pi install npm:@curl.md/pi
npx @curl.md/amp install

# Add skills
npx skills add https://curl.md --yes

# Try it in your browser
open https://curl.md/example.com

# Use the SDK in your apps
import { createClient } from "curl.md"
const client = createClient()
const res = await client.fetch("example.com")
```

## Run Locally (HTTP server)

Standalone URL → markdown server for local use. Runs on Node only — no Docker, Postgres, KV, Queues, Stripe, GitHub OAuth, Sentry, or Cloudflare account needed. Auth, billing, rate limits, dashboard, and request history are not included.

```sh
pnpm install --ignore-scripts # skips Cloudflare/plugin codegen, not needed for the local server
pnpm exec playwright install chromium # once, for JS-only pages (SPAs)
pnpm serve # http://127.0.0.1:3000 (set HOST/PORT to change)

# Transcribe a URL to markdown
curl 127.0.0.1:3000/example.com
curl 127.0.0.1:3000/api/https://example.com > example.md

# Options
curl "127.0.0.1:3000/example.com?keywords=install,setup"           # keep sections matching keywords (k)
curl "127.0.0.1:3000/example.com?objective=how+to+install&mode=rush" # LLM extraction (o/q, m)
curl "127.0.0.1:3000/example.com?fresh"                             # bypass 15m in-memory cache (f)
curl -H "accept: application/json" 127.0.0.1:3000/example.com       # { "content": "..." }

# CLI against the local server
CURLMD_BASE_URL=http://127.0.0.1:3000 curl.md example.com --objective "how to install"
```

```ts
// SDK against the local server
import { createClient } from 'curl.md'
const client = createClient('http://127.0.0.1:3000')
const res = await client.fetch('example.com', { objective: 'how to install' })
```

Configuration (env vars, or a `.env` file — keep `HOST`/`PORT` out of `.env` if you also run the Cloudflare app, since wrangler reads it too):

| Variable            | Required        | Description                                                                                              |
| ------------------- | --------------- | -------------------------------------------------------------------------------------------------------- |
| `HOST` / `PORT`     | No              | Listen address (default `127.0.0.1:3000`)                                                                |
| `AI_BASE_URL`       | For `objective` | OpenAI-compatible API base URL (default `http://localhost:11434/v1`, [Ollama](https://ollama.com))       |
| `AI_MODEL`          | For `objective` | Model for `mode=smart` (default `llama3.1:8b`)                                                           |
| `AI_MODEL_RUSH`     | No              | Model for `mode=rush` (default `AI_MODEL`)                                                               |
| `AI_API_KEY`        | No              | API key for the AI API (sent as `Authorization` header)                                                  |
| `GH_TOKEN`          | No              | GitHub token for higher GitHub API rate limits / private repos                                           |
| `BROWSER_RENDERING` | No              | Set to `false` to disable the local Chromium fallback for JS-only pages (SPAs) and 403s (default `true`) |

Remaining external dependencies:

- Target websites (and site-specific sources some rules use, e.g. GitHub API, raw.githubusercontent.com)
- An OpenAI-compatible LLM endpoint, only when using `objective` (local Ollama works)

JS-only pages (SPAs) and pages answering 403 are re-rendered in a local headless Chromium (Playwright), launched on first use and reused. Requests from the rendered page to `localhost`, IP addresses, and non-http(s) URLs are blocked. If Chromium isn't installed, the server falls back to the plain HTML result.

The server fetches arbitrary public URLs on behalf of callers (domains resolving to private IPs are not blocked). It binds to `127.0.0.1` by default; don't expose it publicly.

## Documentation

For full documentation, visit [curl.md/docs](https://curl.md/docs).

## Community

For help, discussion about best practices, or feature ideas:

[Discuss curl.md on GitHub](https://github.com/wevm/curl.md/discussions)

## Contributing

If you're interested in contributing to curl.md, please read our [contributing docs](https://curl.md/docs/dev/develop) **before submitting a pull request**.

## License

[MIT](../LICENSE)
