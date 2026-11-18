import type { Plugin } from 'vite'

export function siteOrigin(env: Record<string, string | undefined>): string | undefined {
  const value = env.SITE_URL || env.VERCEL_PROJECT_PRODUCTION_URL || env.VITE_VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL || env.VITE_VERCEL_URL
  if (!value) return undefined
  const url = new URL(value.includes('://') ? value : `https://${value}`)
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Site URL must use HTTP or HTTPS')
  return url.origin
}

export function seo(env: Record<string, string | undefined>): Plugin {
  const origin = siteOrigin(env)
  const preview = (env.VERCEL_ENV || env.VITE_VERCEL_ENV) === 'preview'
  const robots = preview ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'
  const image = origin ? `${origin}/social-preview-v2.png` : '/social-preview-v2.png'
  const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
  return {
    name: 'turaco-seo',
    transformIndexHtml(html) {
      const structured = {
        '@context': 'https://schema.org', '@type': 'WebApplication', name: 'turaco-nano-tts-wes',
        description: 'Generate Cameroon Pidgin English speech on your own device with turaco-nano-tts-wes, a lightweight research model by Clevaway.',
        applicationCategory: 'MultimediaApplication', operatingSystem: 'Web browser',
        isAccessibleForFree: true, inLanguage: ['en', 'wes'],
        publisher: { '@type': 'Organization', name: 'Clevaway', url: 'https://clevaway.com' },
        ...(origin ? { url: `${origin}/`, image } : {}),
      }
      return html.replace('<!-- deployment-seo -->', `
    <meta name="robots" content="${robots}" />
    <meta property="og:image" content="${escape(image)}" />
    <meta name="twitter:image" content="${escape(image)}" />
    ${origin ? `<link rel="canonical" href="${escape(origin)}/" />\n    <meta property="og:url" content="${escape(origin)}/" />` : ''}
    <script type="application/ld+json">${JSON.stringify(structured).replaceAll('<', '\\u003c')}</script>`)
    },
    generateBundle() {
      const sitemap = origin && !preview ? `${origin}/sitemap.xml` : undefined
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\n${preview ? 'Disallow: /' : 'Allow: /'}\n${sitemap ? `Sitemap: ${sitemap}\n` : ''}` })
      if (sitemap) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(origin!)}/</loc></url></urlset>\n` })
    },
  }
}
