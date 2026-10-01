import { serve } from '@hono/node-server'
import { createApp } from '#local/app.ts'

const app = createApp({ env: process.env })
const hostname = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 3000)

serve({ fetch: app.fetch, hostname, port }, (info) => {
  console.log(`curl.md local server listening on http://${hostname}:${info.port}`)
})
