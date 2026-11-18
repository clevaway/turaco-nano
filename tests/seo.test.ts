import { test } from 'node:test'
import assert from 'node:assert/strict'
import { siteOrigin } from '../scripts/seo.ts'

test('uses the stable Vercel production domain instead of a per-deployment URL', () => {
  assert.equal(siteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: 'turaco.vercel.app', VERCEL_URL: 'turaco-a1b2.vercel.app' }), 'https://turaco.vercel.app')
  assert.equal(siteOrigin({ VITE_VERCEL_PROJECT_PRODUCTION_URL: 'turaco.vercel.app' }), 'https://turaco.vercel.app')
})
test('supports a custom host override and does not invent a local canonical URL', () => {
  assert.equal(siteOrigin({ SITE_URL: 'https://speech.example.org/' }), 'https://speech.example.org')
  assert.equal(siteOrigin({}), undefined)
  assert.throws(() => siteOrigin({ SITE_URL: 'javascript://invalid' }))
})
