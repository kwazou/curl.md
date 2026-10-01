import { expect, test, vi } from 'vitest'
import { createApp } from '#local/app.ts'

const html =
  '<html><head><title>Hello</title></head><body><main><h1>Hello</h1><p>World paragraph with enough text to be considered content.</p><h2>Install</h2><p>npm i foo</p><h2>Other</h2><p>unrelated</p></main></body></html>'

test('transcribes url to markdown', async () => {
  const fetch = createFetch()
  const app = createApp({ fetch })

  const res = await app.request('/example.com')
  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toBe('text/markdown; charset=utf-8')
  expect(res.headers.get('x-cache')).toBe('MISS')
  expect(await res.text()).toMatchInlineSnapshot(`
    "---
    title: Hello
    url: https://example.com/
    site: example.com
    ---

    # Hello

    World paragraph with enough text to be considered content.

    ## Install

    npm i foo

    ## Other

    unrelated"
  `)
  expect(fetch.mock.calls[0]?.[0].toString()).toBe('https://example.com/')
})

test('supports /api prefix, protocol-prefixed urls, and json', async () => {
  const app = createApp({ fetch: createFetch() })

  const res = await app.request('/api/https://example.com', {
    headers: { accept: 'application/json' },
  })
  expect(res.status).toBe(200)
  expect(await res.json()).toMatchObject({ content: expect.stringContaining('# Hello') })
})

test('caches pages unless fresh', async () => {
  const fetch = createFetch()
  const app = createApp({ fetch })

  await app.request('/example.com')
  expect((await app.request('/example.com')).headers.get('x-cache')).toBe('HIT')
  expect((await app.request('/example.com?fresh')).headers.get('x-cache')).toBe('MISS')
  expect(fetch).toHaveBeenCalledTimes(2)
})

test('filters by keywords', async () => {
  const app = createApp({ fetch: createFetch() })

  const res = await app.request('/example.com?keywords=install')
  const text = await res.text()
  expect(text).toContain('## Install')
  expect(text).not.toContain('unrelated')
})

test('extracts objective with openai-compatible llm', async () => {
  const fetch = createFetch()
  const app = createApp({
    env: { AI_API_KEY: 'key', AI_BASE_URL: 'http://llm.test/v1/', AI_MODEL: 'smart-model' },
    fetch,
  })

  const res = await app.request('/example.com?objective=how%20to%20install')
  expect(res.status).toBe(200)
  const text = await res.text()
  expect(text).toContain('## Install\n\nnpm i foo')
  expect(text).not.toContain('unrelated')

  const call = fetch.mock.calls.find(([input]) => isLlm(input))
  expect(call?.[0]).toBe('http://llm.test/v1/chat/completions')
  const init = call?.[1] as RequestInit & { headers: Record<string, string> }
  expect(init.headers.authorization).toBe('Bearer key')
  const body = JSON.parse(init.body as string)
  expect(body.model).toBe('smart-model')
  expect(body.messages[1].content).toContain('Objective: how to install')
})

test('uses rush model when mode=rush', async () => {
  const fetch = createFetch()
  const app = createApp({
    env: { AI_BASE_URL: 'http://llm.test/v1', AI_MODEL: 'smart-model', AI_MODEL_RUSH: 'rush' },
    fetch,
  })

  await app.request('/example.com?o=install&m=rush')
  const call = fetch.mock.calls.find(([input]) => isLlm(input))
  expect(JSON.parse(call?.[1]?.body as string).model).toBe('rush')
})

test('falls back to filtered content when llm finds nothing relevant', async () => {
  const app = createApp({
    env: { AI_BASE_URL: 'http://llm.test/v1' },
    fetch: createFetch({ llmContent: 'NONE' }),
  })

  const res = await app.request('/example.com?objective=unrelated&keywords=install')
  const text = await res.text()
  expect(text).toContain('## Install')
  expect(text).not.toContain('unrelated')
})

test('returns ai_failed when llm errors', async () => {
  const app = createApp({
    env: { AI_BASE_URL: 'http://llm.test/v1' },
    fetch: createFetch({ llmStatus: 500 }),
  })

  const res = await app.request('/example.com?objective=install')
  expect(res.status).toBe(502)
  expect(await res.json()).toEqual({
    code: 'ai_failed',
    message: 'AI upstream returned 500',
  })
})

test('returns fetch_failed when upstream errors', async () => {
  const app = createApp({ fetch: createFetch({ upstreamStatus: 404 }) })

  const res = await app.request('/example.com')
  expect(res.status).toBe(502)
  expect(await res.json()).toEqual({ code: 'fetch_failed', message: 'Upstream returned 404' })
})

test('rejects non-domain urls', async () => {
  const fetch = createFetch()
  const app = createApp({ fetch })

  expect((await app.request('/localhost:8080')).status).toBe(400)
  expect((await app.request('/127.0.0.1')).status).toBe(400)
  expect((await app.request('/favicon.ico')).status).toBe(400)
  expect(fetch).not.toHaveBeenCalled()
})

function createFetch(
  options: { llmContent?: string; llmStatus?: number; upstreamStatus?: number } = {},
) {
  return vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    if (isLlm(input)) {
      if (options.llmStatus) return new Response(null, { status: options.llmStatus })
      return Response.json({
        choices: [{ message: { content: options.llmContent ?? '## Install\n\nnpm i foo' } }],
      })
    }
    if (options.upstreamStatus) return new Response(null, { status: options.upstreamStatus })
    return new Response(html, { headers: { 'content-type': 'text/html' } })
  })
}

function isLlm(input: RequestInfo | URL) {
  return new URL(input instanceof Request ? input.url : input).hostname === 'llm.test'
}
