// Calls the real You.com free MCP profile. Skipped unless YOU_LIVE=1.
// Run with: bun run test:live
import { describe, expect, test } from 'vitest'
import { fetchSearch } from './youApi.js'

const live = process.env.YOU_LIVE === '1'

describe.skipIf(!live)('live keyless search', () => {
  test('returns web results in the expected shape', async () => {
    const res = await fetchSearch({ query: 'convex components', count: 3 })
    console.log(JSON.stringify(res, null, 2).slice(0, 2000))
    expect(res.source).toBe('keyless')
    expect(res.results.length).toBeGreaterThan(0)
    for (const r of res.results) {
      expect(r.url).toMatch(/^https?:\/\//)
      expect(typeof r.title).toBe('string')
    }
    expect(res.searchUuid).toBeTruthy()
  }, 20000)

  test('freshness and include_domains are accepted', async () => {
    const res = await fetchSearch({
      query: 'convex components',
      count: 3,
      freshness: 'year',
      includeDomains: ['docs.convex.dev'],
    })
    expect(res.results.length).toBeGreaterThan(0)
    for (const r of res.results) expect(r.url).toContain('docs.convex.dev')
  }, 20000)
})
