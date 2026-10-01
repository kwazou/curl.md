import { Hono } from 'hono'
import { accepts } from 'hono/accepts'
import { estimateTokenCount } from 'tokenx'
import { stringify as yamlStringify } from 'yaml'
import { z } from 'zod'
import * as Constants from '#lib/constants.ts'
import * as Fetch from '#lib/fetch.ts'
import * as hono from '#lib/hono.ts'
import * as Md from '#md/index.ts'

/**
 * Standalone URL → markdown HTTP app for local use (Node).
 * No Postgres, KV, Queues, Stripe, GitHub OAuth, or Sentry required.
 */
export function createApp(options: createApp.Options = {}) {
  const env = Env.parse(
    Object.fromEntries(Object.entries(options.env ?? {}).filter(([, value]) => value)),
  )
  const fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
  const cache = new Map<string, { expiresAt: number; value: unknown }>()
  const cacheTtlMs = 15 * 60 * 1000 // 15 minutes
  const cacheMaxEntries = 500

  const md = Md.create({
    fetch,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; curl.md-local/1.0)',
    },
    profiles: Md.profiles,
    rules: {
      ...Md.rules,
      ...Md.sites.github({ token: env.GH_TOKEN }),
    },
    transport: Md.transports.fallback([
      Md.transports.fetch(),
      ...(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_BROWSER_API_TOKEN
        ? [
            Md.transports.cfBrowserRendering({
              accountId: env.CLOUDFLARE_ACCOUNT_ID,
              apiToken: env.CLOUDFLARE_BROWSER_API_TOKEN,
            }),
          ]
        : []),
    ]),
  })

  const transcribe = new Hono().get(
    '/:url{.+}',
    hono.validator('param', Fetch.param),
    hono.validator('query', Fetch.query),
    async (c) => {
      if (hono.narrowValidation) return hono.validationError(c)
      const query = c.req.valid('query')
      const url = new URL(c.req.valid('param').url)
      url.hash = ''

      const accept = accepts(c, {
        default: 'text/markdown',
        header: 'Accept',
        match(accepts) {
          const accept = accepts.find((accept) => {
            if (accept.q <= 0) return false
            const type = accept.type.toLowerCase()
            return type === '*/*' || type === 'application/json' || type === 'text/markdown'
          })
          if (!accept) return 'not_acceptable'
          if (accept.type === '*/*') return 'text/markdown'
          return accept.type.toLowerCase()
        },
        supports: ['application/json', 'text/markdown'],
      })
      if (accept === 'not_acceptable')
        return c.json({ code: 'not_acceptable' as const, message: 'Not Acceptable' }, 406, {
          vary: 'Accept',
        })

      let cached = false
      const response = await (async () => {
        const pageCacheKey = `page:${url.href}`
        const pageCached = getCached<{
          content: string
          extras: { source_tokens: number | undefined }
          meta: Md.Meta
        }>(pageCacheKey)
        if (!query.fresh && pageCached) {
          cached = true
          return { ...pageCached, ok: true as const, status: 200 }
        }
        const result = await md.fetch(url)
        if (!result.ok) return result
        setCached(pageCacheKey, {
          content: result.content,
          extras: result.extras,
          meta: result.meta,
        })
        return result
      })()

      if (!response.ok)
        return c.json(
          {
            code: 'fetch_failed' as const,
            message: response.error || `Upstream returned ${response.status}`,
          },
          502,
        )

      const filteredContent = (() => {
        if (query.keywords && query.keywords.length > 0)
          return Md.filterSectionsByKeywords(response.content, query.keywords)
        return response.content
      })()

      let excerpt = filteredContent
      if (query.objective) {
        const objective = query.objective
        try {
          const queryCacheKey = `query:${url.href}:${objective}:${query.keywords?.join(',') ?? ''}:${query.mode}`
          const queryCached = getCached<string>(queryCacheKey)
          if (!query.fresh && queryCached !== undefined) {
            cached = true
            excerpt = queryCached || filteredContent
          } else {
            const model = query.mode === 'rush' ? (env.AI_MODEL_RUSH ?? env.AI_MODEL) : env.AI_MODEL
            const chunks = Md.chunk(filteredContent)
            const results: string[] = []
            let chunkIndex = 0
            // Bound LLM fan-out so one large objective request can't saturate the inference server.
            await Promise.all(
              Array.from({ length: Math.min(2, chunks.length) }, async () => {
                while (chunkIndex < chunks.length) {
                  const currentIndex = chunkIndex
                  chunkIndex += 1
                  results[currentIndex] = await extract(chunks[currentIndex]!, objective, model)
                }
              }),
            )
            const filtered = results
              .filter((r) => r && r.trim() !== Constants.sentinelValue)
              .join('\n\n')
            setCached(queryCacheKey, filtered)
            excerpt = filtered || filteredContent
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown AI error'
          return c.json({ code: 'ai_failed' as const, message }, 502)
        }
      }

      const frontmatter = (() => {
        const yaml = yamlStringify(response.meta, { lineWidth: 0 }).trimEnd()
        return yaml ? `---\n${yaml}\n---` : undefined
      })()
      const content = (frontmatter ? `${frontmatter}\n\n${excerpt}` : excerpt).trimEnd()

      const finalTokens = estimateTokenCount(content)
      const sourceTokens = response.extras.source_tokens ?? finalTokens
      const headers = {
        vary: 'Accept',
        'x-cache': cached ? 'HIT' : 'MISS',
        'x-tokens-count': String(finalTokens),
        'x-tokens-saved': String(Math.max(0, sourceTokens - finalTokens)),
      }

      if (accept === 'application/json')
        // casting to string so hono/client can infer c.json response
        return c.json({ content: content as string }, 200, headers)

      return c.text(content, 200, {
        ...headers,
        'content-type': 'text/markdown; charset=utf-8',
      })
    },
  )

  return new Hono()
    .get('/', (c) =>
      c.text(
        [
          'curl.md local server',
          '',
          'GET /<url>?objective=...&keywords=...&mode=rush|smart&fresh',
          'GET /api/<url>?objective=...&keywords=...&mode=rush|smart&fresh',
          '',
        ].join('\n'),
        200,
      ),
    )
    .get('/api/health', (c) => c.json({ ok: true }, 200))
    .route('/api', transcribe)
    .route('/', transcribe)

  async function extract(chunk: string, objective: string, model: string) {
    const response = await fetch(`${env.AI_BASE_URL.replace(/\/+$/, '')}/chat/completions`, {
      body: JSON.stringify({
        max_tokens: 4096,
        messages: [
          { content: Constants.systemPrompt, role: 'system' },
          {
            content: `<page_content>\n${chunk}\n</page_content>\n\nObjective: ${objective}`,
            role: 'user',
          },
        ],
        model,
      }),
      headers: {
        'content-type': 'application/json',
        ...(env.AI_API_KEY && { authorization: `Bearer ${env.AI_API_KEY}` }),
      },
      method: 'POST',
      signal: AbortSignal.timeout(120_000), // 2 minutes
    })
    if (!response.ok) throw new Error(`AI upstream returned ${response.status}`)
    const json = z.parse(
      z.object({
        choices: z.array(z.object({ message: z.object({ content: z.string().nullish() }) })),
      }),
      await response.json(),
    )
    return json.choices[0]?.message.content ?? ''
  }

  function getCached<value>(key: string) {
    const entry = cache.get(key)
    if (!entry) return undefined
    if (entry.expiresAt > Date.now()) return entry.value as value
    cache.delete(key)
    return undefined
  }

  function setCached(key: string, value: unknown) {
    cache.delete(key)
    cache.set(key, { expiresAt: Date.now() + cacheTtlMs, value })
    if (cache.size > cacheMaxEntries) cache.delete(cache.keys().next().value!)
  }
}

export declare namespace createApp {
  type Options = {
    env?: Record<string, string | undefined> | undefined
    fetch?: typeof globalThis.fetch | undefined
  }
}

const Env = z.object({
  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().default('http://localhost:11434/v1'),
  AI_MODEL: z.string().default('llama3.1:8b'),
  AI_MODEL_RUSH: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_BROWSER_API_TOKEN: z.string().optional(),
  GH_TOKEN: z.string().optional(),
})
