import { serve } from '@hono/node-server'
import { createApp } from '#local/app.ts'
import * as Browser from '#local/browser.ts'

const app = createApp({ env: process.env })
const hostname = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 3000)

const server = serve({ fetch: app.fetch, hostname, port }, (info) => {
  console.log(`curl.md local server listening on http://${hostname}:${info.port}`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, async () => {
    server.close()
    await Browser.close()
    process.exit(0)
  })
