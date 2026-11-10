import { describe, expect, test } from 'vitest'
import {
  buildRequest,
  canonicalize,
  fetchSearch,
  hashKey,
  normalizeParams,
  parseResponse,
  YouSearchError,
} from './youApi.js'

describe('normalizeParams', () => {
  test('trims, collapses whitespace and clamps count', () => {
    expect(normalizeParams({ query: '  a   b ', count: 500 }, 'keyless')).toEqual({
      query: 'a b',
      count: 50,
    })
    expect(normalizeParams({ query: 'a', count: 500 }, 'keyed').count).toBe(100)
    expect(normalizeParams({ query: 'a', count: 0 }, 'keyless').count).toBe(1)
    expect(normalizeParams({ query: 'a' }, 'keyless').count).toBe(10)
  })
  test('dedupes and sorts domains so cache keys are stable', () => {
    expect(
      normalizeParams({ query: 'a', includeDomains: ['B.com', 'a.com', 'b.com'] }, 'keyless').includeDomains,
    ).toEqual(['a.com', 'b.com'])
  })
  test('rejects queries over 400 characters or 50 words, as the API does', () => {
    expect(normalizeParams({ query: 'a'.repeat(400) }, 'keyed').query).toHaveLength(400)
    expect(() => normalizeParams({ query: 'a'.repeat(401) }, 'keyed')).toThrow(/400 characters/)
    const words = (n: number) => Array.from({ length: n }, () => 'w').join('  ')
    expect(normalizeParams({ query: words(50) }, 'keyless').query.split(' ')).toHaveLength(50)
    expect(() => normalizeParams({ query: words(51) }, 'keyless')).toThrow(/50 words/)
  })
  test('caps highlights requests at 50 results on the keyed API', () => {
    expect(normalizeParams({ query: 'a', count: 100, highlights: true }, 'keyed').count).toBe(50)
    expect(normalizeParams({ query: 'a', count: 100 }, 'keyed').count).toBe(100)
  })
  test('treats non-finite count and offset as unset', () => {
    expect(normalizeParams({ query: 'a', count: Number.NaN }, 'keyed').count).toBe(10)
    expect(normalizeParams({ query: 'a', count: Number.POSITIVE_INFINITY }, 'keyed').count).toBe(10)
    expect(normalizeParams({ query: 'a', offset: Number.NaN }, 'keyed')).not.toHaveProperty('offset')
  })
  test('floors fractional counts and rejects an empty query', () => {
    expect(normalizeParams({ query: 'a', count: 2.9 }, 'keyed').count).toBe(2)
    expect(() => normalizeParams({ query: ' \n ' }, 'keyless')).toThrow(/empty/)
  })
  test('normalizes offset, country, language and freshness', () => {
    expect(
      normalizeParams({ query: 'a', offset: 42.7, country: 'us', language: 'en', freshness: ' week ' }, 'keyed'),
    ).toEqual({ query: 'a', count: 10, offset: 9, country: 'US', language: 'EN', freshness: 'week' })
    expect(normalizeParams({ query: 'a', offset: 0 }, 'keyed')).not.toHaveProperty('offset')
  })
  test('drops empty domain lists so they do not split the cache', () => {
    const p = normalizeParams({ query: 'a', includeDomains: [], excludeDomains: [' '] }, 'keyed')
    expect(p).not.toHaveProperty('includeDomains')
    expect(p).not.toHaveProperty('excludeDomains')
  })
  test('rejects include plus exclude', () => {
    expect(() =>
      normalizeParams({ query: 'a', includeDomains: ['a.com'], excludeDomains: ['b.com'] }, 'keyed'),
    ).toThrow()
  })
})

describe('cache key', () => {
  test('same params in any key order give the same key', () => {
    const a = canonicalize(normalizeParams({ query: 'q', freshness: 'day', count: 5 }, 'keyless'), 'keyless')
    const b = canonicalize(normalizeParams({ count: 5, freshness: 'day', query: 'q' }, 'keyless'), 'keyless')
    expect(a).toBe(b)
    expect(hashKey(a)).toBe(hashKey(b))
    expect(hashKey(a)).toMatch(/^[0-9a-f]{16}$/)
  })
  test('source is part of the key', () => {
    const p = normalizeParams({ query: 'q' }, 'keyless')
    expect(canonicalize(p, 'keyless')).not.toBe(canonicalize(p, 'keyed'))
  })
})

describe('cache key separation', () => {
  test('every search option changes the key', () => {
    const base = { query: 'q', count: 5 }
    const variants = [
      { ...base, freshness: 'day' },
      { ...base, offset: 1 },
      { ...base, country: 'US' },
      { ...base, language: 'EN' },
      { ...base, safesearch: 'strict' as const },
      { ...base, includeDomains: ['a.com'] },
      { ...base, excludeDomains: ['a.com'] },
      { ...base, highlights: true },
    ]
    const keys = [base, ...variants].map((p) => canonicalize(normalizeParams(p, 'keyed'), 'keyed'))
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('buildRequest', () => {
  test('keyless calls you-search on the public free MCP profile', () => {
    const r = buildRequest({
      query: 'a b',
      count: 3,
      freshness: 'week',
      country: 'US',
      language: 'EN',
      includeDomains: ['x.com', 'y.com'],
    })
    expect(r.source).toBe('keyless')
    expect(r.url).toBe('https://api.you.com/mcp?profile=free')
    expect(r.init.method).toBe('POST')
    const headers = r.init.headers as Record<string, string>
    expect(headers.Accept).toBe('application/json, text/event-stream')
    expect(headers['X-Client-Info']).toMatch(/^plugin; client=convex-search\/\d+\.\d+\.\d+$/)
    expect(JSON.parse(String(r.init.body))).toEqual({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'you-search',
        arguments: { query: 'a b', count: 3, freshness: 'week', extraction: 'none' },
        _meta: {
          'com.you.com/search': {
            country: 'US',
            language: 'EN',
            include_domains: ['x.com', 'y.com'],
          },
        },
      },
    })
  })
  test('keyless sends exclude_domains, offset and safesearch as tool arguments', () => {
    const r = buildRequest({
      query: 'a',
      offset: 2,
      safesearch: 'off',
      excludeDomains: ['x.com'],
    })
    const body = JSON.parse(String(r.init.body))
    expect(body.params.arguments).toEqual({
      query: 'a',
      extraction: 'none',
      offset: 2,
      safesearch: 'off',
      exclude_domains: ['x.com'],
    })
    expect(body.params).not.toHaveProperty('_meta')
  })
  test('keyless never sends an API key', () => {
    const r = buildRequest({ query: 'a' })
    expect(JSON.stringify(r.init.headers).toLowerCase()).not.toContain('api-key')
  })
  test('keyless forwards highlights as the free profile extraction mode', () => {
    const r = buildRequest({ query: 'a', highlights: true })
    const args = JSON.parse(String(r.init.body)).params.arguments
    expect(args.extraction).toBe('highlights')
  })
  test('keyed maps every option to the v1/search body', () => {
    const r = buildRequest(
      {
        query: 'a',
        count: 5,
        freshness: 'month',
        offset: 3,
        country: 'GB',
        language: 'EN',
        safesearch: 'moderate',
        excludeDomains: ['x.com'],
        highlights: true,
      },
      'k',
    )
    expect(JSON.parse(String(r.init.body))).toEqual({
      query: 'a',
      count: 5,
      freshness: 'month',
      offset: 3,
      country: 'GB',
      language: 'EN',
      safesearch: 'moderate',
      exclude_domains: ['x.com'],
      extraction: { extraction_mode: 'highlights' },
    })
    expect(JSON.parse(String(buildRequest({ query: 'a', includeDomains: ['y.com'] }, 'k').init.body))).toMatchObject({
      include_domains: ['y.com'],
    })
  })
  test('keyed uses POST with JSON body and X-API-Key', () => {
    const r = buildRequest({ query: 'a', count: 2, safesearch: 'strict' }, 'k')
    expect(r.source).toBe('keyed')
    expect(r.url).toBe('https://ydc-index.io/v1/search')
    expect(JSON.parse(String(r.init.body))).toEqual({
      query: 'a',
      count: 2,
      safesearch: 'strict',
    })
    expect((r.init.headers as Record<string, string>)['X-Client-Info']).toMatch(
      /^plugin; client=convex-search\/\d+\.\d+\.\d+$/,
    )
  })
})

describe('parseResponse', () => {
  test('maps fields, dedupes URLs, merges news and keeps highlights', () => {
    const out = parseResponse({
      results: {
        web: [
          {
            url: 'https://a.com',
            title: 'A',
            snippets: ['s1', 3],
            page_age: '2026-01-01',
          },
          { url: 'https://a.com', title: 'dup' },
          { url: 'https://b.com', contents: { highlights: ['h1'] } },
          { title: 'no url' },
        ],
        news: [{ url: 'https://n.com', title: 'N', thumbnail_url: 'https://t' }],
      },
      metadata: { search_uuid: 'u', latency: 0.2 },
    })
    expect(out.results.map((r) => r.url)).toEqual(['https://a.com', 'https://b.com', 'https://n.com'])
    expect(out.results[0].snippets).toEqual(['s1'])
    expect(out.results[1].title).toBe('https://b.com')
    expect(out.results[1].highlights).toEqual(['h1'])
    expect(out.searchUuid).toBe('u')
    expect(out.latency).toBe(0.2)
  })
  test('tolerates empty or odd payloads', () => {
    expect(parseResponse(null).results).toEqual([])
    expect(parseResponse({ results: {} }).results).toEqual([])
  })
})

describe('fetchSearch keyless MCP responses', () => {
  test('reads the matching JSON-RPC frame from SSE', async () => {
    const result = {
      results: { web: [{ url: 'https://a.com', title: 'A', snippets: ['s'] }] },
      metadata: { search_uuid: 'u' },
    }
    const body = [
      'event: message',
      `data: ${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/message', params: { data: 'working' } })}`,
      '',
      'event: message',
      `data: ${JSON.stringify({ jsonrpc: '2.0', id: '1', result: { structuredContent: result } })}`,
      '',
    ].join('\n')
    const f = (async () => new Response(body, { status: 200 })) as unknown as typeof fetch
    const res = await fetchSearch({ query: 'a' }, { fetch: f })
    expect(res.source).toBe('keyless')
    expect(res.results).toEqual([{ url: 'https://a.com', title: 'A', snippets: ['s'] }])
    expect(res.searchUuid).toBe('u')
  })

  test('reads a bare JSON body even when a snippet contains the text "data:"', async () => {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      result: {
        structuredContent: { results: { web: [{ url: 'https://a.com', title: 'A', snippets: ['see data: here'] }] } },
      },
    })
    const f = (async () => new Response(body, { status: 200 })) as unknown as typeof fetch
    const res = await fetchSearch({ query: 'a' }, { fetch: f })
    expect(res.results).toEqual([{ url: 'https://a.com', title: 'A', snippets: ['see data: here'] }])
  })

  test('turns a JSON-RPC protocol error into YouSearchError', async () => {
    const body = `data: ${JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32602, message: 'Tool not found' } })}\n\n`
    const f = (async () => new Response(body, { status: 200 })) as unknown as typeof fetch
    const err = await fetchSearch({ query: 'a' }, { fetch: f }).catch((e) => e)
    expect(err).toBeInstanceOf(YouSearchError)
    expect(err.message).toMatch(/Tool not found/)
  })

  test('turns an MCP tool error into YouSearchError', async () => {
    const body = `data: ${JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      result: {
        isError: true,
        content: [{ type: 'text', text: 'Error: Free tier limit exceeded. Upgrade at: https://you.com/platform' }],
      },
    })}\n\n`
    const f = (async () => new Response(body, { status: 402 })) as unknown as typeof fetch
    const err = await fetchSearch({ query: 'a' }, { fetch: f }).catch((e) => e)
    expect(err).toBeInstanceOf(YouSearchError)
    expect(err.status).toBe(402)
    expect(err.message).toMatch(/Free tier limit exceeded/)
    expect(err.message).toMatch(/YDC_API_KEY/)
  })
})

describe('fetchSearch keyless fallbacks', () => {
  const respond = (body: string, status = 200) =>
    (async () => new Response(body, { status })) as unknown as typeof fetch

  test('falls back to JSON text content when structuredContent is absent', async () => {
    const text = JSON.stringify({ results: { web: [{ url: 'https://a.com', title: 'A' }] } })
    const body = `data: ${JSON.stringify({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text }] } })}\n\n`
    const res = await fetchSearch({ query: 'a' }, { fetch: respond(body) })
    expect(res.results.map((r) => r.url)).toEqual(['https://a.com'])
  })
  test('fails when no frame matches the request id', async () => {
    const body = `data: ${JSON.stringify({ jsonrpc: '2.0', id: 99, result: { structuredContent: {} } })}\n\n`
    await expect(fetchSearch({ query: 'a' }, { fetch: respond(body) })).rejects.toThrow(/no matching JSON-RPC response/)
  })
  test('fails on a result with no content instead of returning empty results', async () => {
    const body = `data: ${JSON.stringify({ jsonrpc: '2.0', id: 1, result: {} })}\n\n`
    await expect(fetchSearch({ query: 'a' }, { fetch: respond(body) })).rejects.toThrow(/no search results/)
  })
  test('surfaces a non-MCP body on an HTTP error', async () => {
    const err = await fetchSearch({ query: 'a' }, { fetch: respond('upstream down', 503) }).catch((e) => e)
    expect(err).toBeInstanceOf(YouSearchError)
    expect(err.status).toBe(503)
    expect(err.source).toBe('keyless')
    expect(err.message).toMatch(/upstream down/)
  })
})

describe('fetchSearch errors', () => {
  test('keyed 429 and 5xx errors carry status and source', async () => {
    const limited = await fetchSearch(
      { query: 'a' },
      { apiKey: 'k', fetch: (async () => new Response('slow down', { status: 429 })) as typeof fetch },
    ).catch((e) => e)
    expect(limited).toMatchObject({ name: 'YouSearchError', status: 429, source: 'keyed' })
    expect(limited.message).toMatch(/rate limited/)
    const down = await fetchSearch(
      { query: 'a' },
      { apiKey: 'k', fetch: (async () => new Response('boom', { status: 500 })) as typeof fetch },
    ).catch((e) => e)
    expect(down).toMatchObject({ status: 500, source: 'keyed' })
    expect(down.message).toMatch(/HTTP 500/)
  })
  test('keyed 402 does not blame the free profile', async () => {
    const err = await fetchSearch(
      { query: 'a' },
      { apiKey: 'k', fetch: (async () => new Response('{}', { status: 402 })) as typeof fetch },
    ).catch((e) => e)
    expect(err.message).not.toMatch(/free MCP/)
  })
  test('keyless 402 explains the usage limit', async () => {
    const f = (async () => new Response('{}', { status: 402 })) as typeof fetch
    const err = await fetchSearch({ query: 'a' }, { fetch: f }).catch((e) => e)
    expect(err).toBeInstanceOf(YouSearchError)
    expect(err.status).toBe(402)
    expect(err.message).toMatch(/YDC_API_KEY/)
  })
  test('401 mentions the API key', async () => {
    const f = (async () => new Response('{}', { status: 401 })) as typeof fetch
    await expect(fetchSearch({ query: 'a' }, { apiKey: 'bad', fetch: f })).rejects.toThrow(/API key/)
  })
})
