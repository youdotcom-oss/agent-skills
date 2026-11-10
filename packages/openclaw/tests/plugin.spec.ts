import { describe, expect, mock, test } from 'bun:test'
import * as searchSdk from 'openclaw/plugin-sdk/provider-web-search'
import type { YouComSearchResult } from '../plugin.ts'

/** Requests the plugin's tool made through the guarded endpoint wrapper. */
const endpointCalls: Array<Record<string, unknown>> = []

/** Switch the stubbed response for the next endpoint call. */
let endpointResponder: (init: RequestInit | undefined) => Response = () => Response.json({ results: { web: [] } })

// Stub only the network boundary: the host's guarded endpoint wrapper performs
// real DNS/network work, and every other export stays the SDK's own.
mock.module('openclaw/plugin-sdk/provider-web-search', () => ({
  ...searchSdk,
  withTrustedWebSearchEndpoint: async (
    params: Record<string, unknown>,
    run: (response: Response) => Promise<unknown>,
  ) => {
    endpointCalls.push(params)
    return await run(endpointResponder(params.init as RequestInit | undefined))
  },
}))

const pluginModule = await import('../plugin.ts')
const plugin = pluginModule.default
const {
  YOUCOM_WEB_SEARCH_PROVIDER_ID,
  buildYouComSearchRequest,
  createYouComSearchTool,
  createYouComWebSearchProvider,
  mapYouComSearchResults,
} = pluginModule

const manifestPath = new URL('../openclaw.plugin.json', import.meta.url)

const resetEndpoint = () => {
  endpointCalls.length = 0
  endpointResponder = () => Response.json({ results: { web: [] } })
}

describe('plugin entry', () => {
  test('has the you id and You.com name', () => {
    expect(plugin.id).toBe('you')
    expect(plugin.name).toBe('You.com')
  })

  test('registers the You.com web search provider', () => {
    const registered: unknown[] = []
    plugin.register({ registerWebSearchProvider: (provider: unknown) => registered.push(provider) } as never)

    expect(registered).toHaveLength(1)
    expect((registered[0] as { id: string }).id).toBe(YOUCOM_WEB_SEARCH_PROVIDER_ID)
  })
})

describe('web search provider', () => {
  test('declares the You.com identity, env var, and credential path', () => {
    const provider = createYouComWebSearchProvider()

    expect(provider.id).toBe('youcom')
    expect(provider.label).toBe('You.com')
    expect(provider.envVars).toEqual(['YDC_API_KEY'])
    expect(provider.requiresCredential).toBe(true)
    expect(provider.credentialPath).toBe('plugins.entries.you.config.webSearch.apiKey')
  })

  test('round-trips the credential through the contract fields', () => {
    const provider = createYouComWebSearchProvider()
    const searchConfig: Record<string, unknown> = {}

    provider.setCredentialValue(searchConfig, 'ydc-test')

    expect(provider.getCredentialValue(searchConfig)).toBe('ydc-test')
  })

  test('builds a tool whose parameters require only the query', () => {
    const tool = createYouComSearchTool({ apiKey: 'ydc-test', searchConfig: undefined })

    expect(tool.parameters.required).toEqual(['query'])
    expect(tool.parameters.properties.count.maximum).toBe(10)
    expect(Object.keys(tool.parameters.properties).sort()).toEqual(['count', 'freshness', 'query'])
  })

  test('returns an actionable payload when no key is configured', async () => {
    resetEndpoint()
    const tool = createYouComSearchTool({ apiKey: undefined, searchConfig: undefined })

    const payload = await tool.execute({ query: 'bun runtime' })

    expect(payload.error).toBe('missing_api_key')
    expect(payload.docs).toBe('https://docs.you.com/api-reference/authentication')
    expect(endpointCalls).toHaveLength(0)
  })

  test('rejects a freshness value You.com does not accept before calling the API', async () => {
    resetEndpoint()
    const tool = createYouComSearchTool({ apiKey: 'ydc-test', searchConfig: undefined })

    const payload = await tool.execute({ query: 'bun runtime', freshness: 'pd' })

    expect(payload.error).toBe('invalid_freshness')
    expect(endpointCalls).toHaveLength(0)
  })

  test('sends the query with the X-API-Key header and maps the response', async () => {
    resetEndpoint()
    endpointResponder = () =>
      Response.json({
        results: {
          web: [
            {
              title: 'Bun runtime',
              url: 'https://bun.com/docs/runtime',
              snippets: ['Bun runs JavaScript', 'and TypeScript.'],
              page_age: '2026-01-02T00:00:00Z',
            },
            { url: 'https://bun.com/docs/cli' },
            { title: 'No URL' },
          ],
          news: [{ title: 'Bun 2', url: 'https://news.example/bun', description: 'Release notes' }],
          knowledge: [{ type: 'fact', title: 'Licensed fact' }],
        },
      })

    const tool = createYouComSearchTool({ apiKey: 'ydc-test', searchConfig: undefined })
    const payload = await tool.execute({ query: 'bun runtime', count: 3, freshness: 'month' })

    expect(endpointCalls).toHaveLength(1)
    const call = endpointCalls[0] as { url: string; init: RequestInit }
    expect(call.url).toBe('https://ydc-index.io/v1/search')
    expect((call.init.headers as Record<string, string>)['X-API-Key']).toBe('ydc-test')
    expect(JSON.parse(String(call.init.body))).toEqual({ query: 'bun runtime', count: 3, freshness: 'month' })

    expect(payload.provider).toBe(YOUCOM_WEB_SEARCH_PROVIDER_ID)
    expect(payload.count).toBe(3)
    expect(payload.externalContent).toEqual({
      untrusted: true,
      source: 'web_search',
      provider: YOUCOM_WEB_SEARCH_PROVIDER_ID,
      wrapped: true,
    })
    const results = payload.results as YouComSearchResult[]
    expect(results).toHaveLength(3)
    expect(results[0]?.url).toBe('https://bun.com/docs/runtime')
    expect(results[0]?.title).toContain('Bun runtime')
    expect(results[0]?.description).toContain('Bun runs JavaScript and TypeScript.')
    expect(results[0]?.siteName).toBe('bun.com')
    expect(results[0]?.published).toBe('2026-01-02T00:00:00Z')
    // The snippets array is joined into the description, and news uses top-level description.
    expect(results[2]?.description).toContain('Release notes')
  })

  test('wraps the URL used as a title fallback', async () => {
    resetEndpoint()
    endpointResponder = () => Response.json({ results: { web: [{ url: 'https://bun.com/docs/cli' }] } })

    const tool = createYouComSearchTool({ apiKey: 'ydc-test', searchConfig: undefined })
    const payload = await tool.execute({ query: 'bun cli' })

    const [result] = payload.results as YouComSearchResult[]
    expect(result?.title).toContain('EXTERNAL_UNTRUSTED_CONTENT')
    expect(result?.title).toContain('https://bun.com/docs/cli')
  })

  test('drops results whose URL is not an http(s) web page', async () => {
    resetEndpoint()
    endpointResponder = () =>
      Response.json({
        results: {
          web: [
            { title: 'Script', url: 'javascript:alert(1)' },
            { title: 'Local file', url: 'file:///etc/passwd' },
            { title: 'Real page', url: 'https://bun.com/docs' },
          ],
        },
      })

    const tool = createYouComSearchTool({ apiKey: 'ydc-test', searchConfig: undefined })
    const payload = await tool.execute({ query: 'bun' })

    const results = payload.results as YouComSearchResult[]
    expect(results).toHaveLength(1)
    expect(results[0]?.url).toBe('https://bun.com/docs')
  })

  test('surfaces an API error with the status and body', async () => {
    resetEndpoint()
    endpointResponder = () => new Response('invalid api key', { status: 401 })

    const tool = createYouComSearchTool({ apiKey: 'bad-key', searchConfig: undefined })

    await expect(tool.execute({ query: 'bun runtime' })).rejects.toThrow('You.com API error (401): invalid api key')
  })
})

describe('request and response mapping', () => {
  test('omits freshness when it is not set', () => {
    expect(buildYouComSearchRequest({ query: 'q', count: 5 })).toEqual({ query: 'q', count: 5 })
  })

  test('reads the documented snippets-mode fields, not a highlights shape', () => {
    const results = mapYouComSearchResults({
      results: {
        web: [
          { url: 'https://a.example', snippets: ['first', '', 'second'] },
          { url: 'https://b.example', description: 'from description' },
        ],
      },
    })

    expect(results[0]?.description).toContain('first second')
    expect(results[1]?.description).toContain('from description')
  })

  test('returns no results for an empty or malformed body', () => {
    expect(mapYouComSearchResults({})).toEqual([])
    expect(mapYouComSearchResults(null)).toEqual([])
    expect(mapYouComSearchResults({ results: { web: 'nope' } })).toEqual([])
  })

  test('does not invent URL citations for licensed knowledge entries', () => {
    const results = mapYouComSearchResults({ results: { knowledge: [{ type: 'fact', title: 'Fact', url: 'x' }] } })

    expect(results).toEqual([])
  })
})

describe('plugin manifest', () => {
  test('declares skills and YDC_API_KEY setup metadata for You.com auth', async () => {
    const manifest = JSON.parse(await Bun.file(manifestPath).text())
    expect(manifest.skills).toEqual(['./skills'])
    expect(manifest.setup).toEqual({
      providers: [
        {
          id: 'you',
          envVars: ['YDC_API_KEY'],
        },
      ],
      requiresRuntime: false,
    })
    expect(manifest.configSchema).toEqual({
      type: 'object',
      additionalProperties: false,
      properties: {},
    })
    expect(manifest.mcpServers).toEqual({
      you: { transport: 'streamable-http', url: 'https://api.you.com/mcp' },
      'you-finance': { transport: 'streamable-http', url: 'https://api.you.com/mcp/finance' },
      'you-research': { transport: 'streamable-http', url: 'https://api.you.com/mcp/research' },
      'you-discover': { transport: 'streamable-http', url: 'https://api.you.com/mcp?profile=discover' },
    })
  })
})
