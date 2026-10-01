import { isIP } from 'node:net'
import type { Browser } from 'playwright'
import * as Md from '#md/index.ts'

/**
 * Local headless Chromium (Playwright) transport. Only runs on SPA shells
 * (`context.render`) or upstream 403s, like the Cloudflare Browser Rendering transport.
 */
export const transport = Md.defineTransport<{ render: typeof render } | undefined>(
  async (url, _init, context) => {
    if (!context.render && context.previous?.status !== 403) return null
    const html = await (context.options?.render ?? render)(url)
    if (html === null) return null
    return new Response(html, { headers: { 'content-type': 'text/html' } })
  },
)

export async function render(url: URL): Promise<string | null> {
  try {
    const browser = await launch()
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (compatible; curl.md-local/1.0)',
    })
    try {
      await page.route('**/*', (route) => {
        const request = route.request()
        if (['font', 'image', 'media'].includes(request.resourceType())) return route.abort()
        if (isBlockedUrl(request.url())) return route.abort()
        return route.continue()
      })
      const response = await page.goto(url.href, {
        timeout: 20_000, // 20 seconds
        waitUntil: 'networkidle',
      })
      if (response && !response.ok()) return null
      return await page.content()
    } finally {
      await page.close()
    }
  } catch {
    return null
  }
}

export async function close() {
  const current = browserPromise
  browserPromise = undefined
  if (current) await (await current.catch(() => undefined))?.close()
}

/** Blocks non-http(s) URLs, `localhost`, and IP literals so pages can't reach the local network. */
export function isBlockedUrl(input: string) {
  try {
    const url = new URL(input)
    if (url.protocol === 'data:' || url.protocol === 'blob:') return false
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return true
    const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true
    return isIP(hostname) !== 0
  } catch {
    return true
  }
}

let browserPromise: Promise<Browser> | undefined

function launch() {
  browserPromise ??= import('playwright').then((playwright) => playwright.chromium.launch())
  browserPromise.catch(() => {
    browserPromise = undefined
  })
  return browserPromise
}
