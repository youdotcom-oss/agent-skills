import { afterEach, describe, expect, test, vi } from 'vitest'
import { api } from './_generated/api'
import { initConvexTest } from './setup.test'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('example', () => {
  test('search, then read the cached result reactively', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        jsonrpc: '2.0',
        id: 1,
        result: {
          structuredContent: {
            results: {
              web: [{ url: 'https://www.convex.dev', title: 'Convex', snippets: ['s'] }],
            },
            metadata: { search_uuid: 'u' },
          },
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('YDC_API_KEY', '')
    const t = initConvexTest()
    const res = await t.action(api.example.search, { query: 'convex' })
    expect(res.results[0].url).toBe('https://www.convex.dev')
    const cached = await t.query(api.example.cached, { query: 'convex' })
    expect(cached?.cached).toBe(true)
    expect(await t.query(api.example.recent, {})).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
