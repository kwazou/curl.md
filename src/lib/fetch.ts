import { z } from 'zod'

export const param = z.object({
  url: z
    .string()
    .transform((arg) => (arg.includes('://') ? arg : `https://${arg}`))
    .pipe(
      z.url({
        hostname: z.regexes.domain,
        normalize: true,
        protocol: /^https?$/,
      }),
    )
    .refine(
      (url) =>
        // Extra protection from common bot probe requests (keep in sync with scripts/deployWaf.ts)
        !/\.(action|aspx?|cgi|css|eot|gif|ico|jpe?g|json|jsx?|map|php|png|svg|tsx?|ttf|webp|woff2?|xml|ya?ml)$/i.test(
          new URL(url).hostname,
        ),
    ),
})

export const query = (() => {
  const fresh = z
    .union([z.literal('').transform(() => true), z.coerce.boolean()])
    .optional()
    .default(false)
  const keywords = z
    .string()
    .transform((v) => v.split(/[\s,]+/).filter(Boolean))
    .optional()
  const mode = z.enum(['rush', 'smart']).default('smart')
  const objective = z.string().optional()
  return z
    .object({
      anchor: z.string().optional(),
      f: fresh,
      fresh,
      k: keywords,
      keywords,
      m: mode,
      mode,
      o: objective,
      objective,
      q: objective,
    })
    .transform((v) => ({
      anchor: (() => {
        if (!v.anchor) return undefined
        try {
          const decoded = decodeURIComponent(v.anchor).trim().replace(/^#+/, '')
          return decoded || undefined
        } catch {
          const trimmed = v.anchor.trim().replace(/^#+/, '')
          return trimmed || undefined
        }
      })(),
      fresh: v.fresh || v.f,
      keywords: v.keywords ?? v.k,
      mode: v.mode === 'smart' && v.m !== 'smart' ? v.m : v.mode,
      objective: v.objective ?? v.q ?? v.o,
    }))
})()
