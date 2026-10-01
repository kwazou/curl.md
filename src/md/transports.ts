import type { Transport } from './mod.ts'
import { defineTransport } from './mod.ts'

export const fetch = defineTransport<
  | {
      headers?: HeadersInit
    }
  | undefined
>(async (url, init, context) => {
  if (context.render) return null
  return context.fetch(url, {
    ...init,
    ...(context.options && {
      headers: { ...init?.headers, ...context.options.headers },
    }),
    redirect: init?.redirect ?? 'follow',
  })
})

export function fallback(transports: Transport[]): Transport {
  return async (url, init, context) => {
    let previous: Response | undefined = context.previous
    for (const transport of transports) {
      const result = await transport(url, init, { ...context, previous })
      if (result) {
        if (result.ok) return result
        previous = result
      }
    }
    return previous ?? null
  }
}
