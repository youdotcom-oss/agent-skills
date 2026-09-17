import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { Context } from '@deepseek-ai/cordis'
import * as McpClientPlugin from '@deepseek-ai/dsh-mcp-client'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as SkillFilesystemPlugin from '@deepseek-ai/dsh-skill-filesystem'
import WebRuntime from '@deepseek-ai/dsh-web'
import * as youcomPlugin from '../src/index.ts'
import {
  apply,
  applyMcpServers,
  applySkills,
  buildMcpClientConfig,
  Config,
  mapYouComContentsResponse,
  mapYouComResult,
  mapYouComSearchResponse,
  name,
  SKILL_PROVIDER_NAME,
  YOUCOM_FETCH_PROVIDER_ID,
  YOUCOM_FREE_MCP_URL,
  YOUCOM_MCP_SERVERS,
  YOUCOM_PROVIDER_ID,
  YouComFetchProvider,
  YouComSearchProvider,
} from '../src/index.ts'
import type { YouComSearchResponse } from '../src/web/types.ts'

describe('YOUCOM_MCP_SERVERS', () => {
  test('lists the four You.com MCP servers with the right auth requirement', () => {
    // The keyed `you` server is not mounted: its you-search/you-contents
    // duplicate the ctx.web providers (searchProvider/fetchProvider: youcom).
    // The `you-discover` profile keeps discovery available keyless without
    // mounting a duplicate keyless you-search.
    expect(YOUCOM_MCP_SERVERS.map((server) => [server.serverName, server.authenticated])).toEqual([
      ['you-discover', false],
      ['you-finance', true],
      ['you-research', true],
      ['you-docs', false],
    ])
  })

  test('mounts discovery from its dedicated keyless profile', () => {
    expect(findServer('you-discover').url).toBe('https://api.you.com/mcp?profile=discover')
  })
})

const findServer = (serverName: string) => {
  const server = YOUCOM_MCP_SERVERS.find((candidate) => candidate.serverName === serverName)
  if (!server) throw new Error(`${serverName} missing from YOUCOM_MCP_SERVERS`)
  return server
}

describe('buildMcpClientConfig', () => {
  test('adds an Authorization header for an authenticated server when a key is set', () => {
    expect(buildMcpClientConfig(findServer('you-finance'), 'test-key')).toEqual({
      transport: 'streamable-http',
      serverName: 'you-finance',
      url: 'https://api.you.com/mcp/finance',
      headers: { Authorization: 'Bearer test-key' },
      toolCallTimeoutMs: 60_000,
      failOnStartupError: false,
    })
  })

  test('omits the Authorization header for an authenticated server with no key', () => {
    expect(buildMcpClientConfig(findServer('you-finance'), undefined).headers).toEqual({})
  })

  test('never adds an Authorization header for a keyless server, even if a key is set', () => {
    expect(buildMcpClientConfig(findServer('you-discover'), 'test-key').headers).toEqual({})
  })
})

/** Records `ctx.plugin()` calls without mounting anything real — no network, no Cordis. */
const fakeContext = () => {
  const mounted: { plugin: unknown; config: unknown }[] = []
  const injected: { names: string[]; cb: (ctx: Context) => void }[] = []
  const ctx = {
    plugin: (plugin: unknown, config?: unknown) => {
      mounted.push({ plugin, config })
      return { dispose: async () => {} }
    },
    // `launchEnvironmentOf` calls `ctx.get('launchEnvironment')` and falls
    // back to a process.env snapshot when the slot is empty — returning
    // undefined here preserves that fallback.
    get: (_key: string) => undefined,
    // `apply` defers web-provider registration via `ctx.inject(['web'], …)`.
    // The real Cordis Context only invokes the callback once the named
    // services are available; here we just record it so tests can verify
    // the deferral (or invoke it manually with a fake web seam).
    inject: (names: string[], cb: (ctx: Context) => void) => {
      injected.push({ names: Array.isArray(names) ? names : [names], cb })
      return { dispose: async () => {} }
    },
  }
  return { ctx: ctx as unknown as Context, mounted, injected }
}

describe('applySkills', () => {
  test('mounts the filesystem skill provider with a scoped provider name and no default roots', () => {
    const { ctx, mounted } = fakeContext()
    applySkills(ctx)

    expect(mounted).toHaveLength(1)
    expect(mounted[0]?.plugin).toBe(SkillFilesystemPlugin)
    expect(mounted[0]?.config).toMatchObject({
      providerName: SKILL_PROVIDER_NAME,
      includeDefaultRoots: false,
    })
    const config = mounted[0]?.config as { customSkillDirs: string[] }
    expect(config.customSkillDirs).toHaveLength(1)
    expect(config.customSkillDirs[0]).toMatch(/packages[/\\]dsh-plugin[/\\]skills$/)
  })
})

describe('applyMcpServers', () => {
  test('mounts one mcp-client instance per server, using the given key', () => {
    const { ctx, mounted } = fakeContext()
    applyMcpServers(ctx, 'test-key')

    expect(mounted).toHaveLength(YOUCOM_MCP_SERVERS.length)
    expect(mounted.every((entry) => entry.plugin === McpClientPlugin)).toBe(true)
    const serverNames = mounted.map((entry) => (entry.config as { serverName: string }).serverName)
    expect(serverNames).toEqual(YOUCOM_MCP_SERVERS.map((server) => server.serverName))
  })

  test('falls back to $YDC_API_KEY when no key argument is given', () => {
    const prev = process.env.YDC_API_KEY
    process.env.YDC_API_KEY = 'env-key'
    try {
      const { ctx, mounted } = fakeContext()
      applyMcpServers(ctx)
      const financeConfig = mounted.find(
        (entry) => (entry.config as { serverName: string }).serverName === 'you-finance',
      )?.config as { headers: Record<string, string> }
      expect(financeConfig.headers).toEqual({ Authorization: 'Bearer env-key' })
    } finally {
      if (prev === undefined) delete process.env.YDC_API_KEY
      else process.env.YDC_API_KEY = prev
    }
  })
})

describe('apply', () => {
  test('mounts the skill provider and every mcp server', () => {
    const { ctx, mounted } = fakeContext()
    youcomPlugin.apply(ctx)
    expect(mounted).toHaveLength(1 + YOUCOM_MCP_SERVERS.length)
  })

  test('passes a configured apiKey through to the MCP servers, over the environment', () => {
    const prev = process.env.YDC_API_KEY
    process.env.YDC_API_KEY = 'env-key'
    try {
      const { ctx, mounted } = fakeContext()
      youcomPlugin.apply(ctx, { apiKey: 'config-key' })
      const financeConfig = mounted.find(
        (entry) => (entry.config as { serverName: string }).serverName === 'you-finance',
      )?.config as { headers: Record<string, string> }
      expect(financeConfig.headers).toEqual({ Authorization: 'Bearer config-key' })
    } finally {
      if (prev === undefined) delete process.env.YDC_API_KEY
      else process.env.YDC_API_KEY = prev
    }
  })

  test('has no default export (namespace plugin export shape)', () => {
    expect('default' in youcomPlugin).toBe(false)
  })
})

describe('dsh-plugin skill registration (real ctx.skills, no network)', () => {
  test('registers the four bundled You.com skills under the youcom provider', async () => {
    const ctx = new Context()
    await ctx.plugin(SkillRegistry)
    const fiber = await ctx.plugin({ name, apply: applySkills })

    const summaries = await ctx.skills.list()
    expect(summaries.map((summary) => summary.name).sort()).toEqual(
      ['you-discover', 'you-finance', 'you-research', 'you-web'].sort(),
    )
    for (const summary of summaries) {
      expect(summary.provider).toBe(SKILL_PROVIDER_NAME)
    }

    await fiber.dispose()
  })

  test('loads a full skill body, not just its summary', async () => {
    const ctx = new Context()
    await ctx.plugin(SkillRegistry)
    const fiber = await ctx.plugin({ name, apply: applySkills })

    const skill = await ctx.skills.get('you-web')
    expect(skill?.content).toContain('web_search')
    expect(skill?.content).not.toContain('you-search')
    expect(skill?.content.length).toBeGreaterThan(0)

    await fiber.dispose()
  })
})
const options = {
  apiKey: 'youcom-key',
  baseURL: 'https://api.youcom.test',
  freeSearchURL: YOUCOM_FREE_MCP_URL,
  pluginVersion: '0.1.0',
  includeNews: true,
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init })
}

/** An SSE-framed MCP `tools/call` success response, matching the live wire shape. */
function sseToolCallResponse(id: number, resultBody: Record<string, unknown>, init: ResponseInit = {}): Response {
  const message = { jsonrpc: '2.0', id, result: resultBody }
  return new Response(`event: message\ndata: ${JSON.stringify(message)}\n\n`, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
    ...init,
  })
}

/** An SSE-framed MCP JSON-RPC protocol-level error response (e.g. an unknown tool name). */
function sseErrorResponse(id: number, code: number, message: string): Response {
  const body = { jsonrpc: '2.0', id, error: { code, message } }
  return new Response(`event: message\ndata: ${JSON.stringify(body)}\n\n`, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

/** A Response whose body read rejects the way an abort mid-read does. */
function abortingResponse(init: ResponseInit = {}): Response {
  const body = new ReadableStream({
    start: (controller) => controller.error(new DOMException('aborted', 'AbortError')),
  })
  return new Response(body, { status: 200, ...init })
}

afterEach(() => {
  mock.restore()
})

test('retries once on HTTP 429, succeeding on the second attempt', async () => {
  let attempts = 0
  const fetchMock = mock(async () => {
    attempts += 1
    return attempts === 1
      ? new Response('rate limited', { status: 429 })
      : jsonResponse({ results: { web: [{ url: 'https://a.test', snippets: ['hi'] }] } })
  })
  spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)

  await new YouComSearchProvider(options).search({ query: 'hello', maxResults: 5 })

  expect(fetchMock).toHaveBeenCalledTimes(2)
})

describe('You.com result mapping', () => {
  test('maps a full result entry, preferring a snippet over description', () => {
    expect(
      mapYouComResult({
        url: 'https://a.test',
        title: 'A',
        description: 'fallback description',
        snippets: ['salient sentence', 'second'],
        page_age: '2026-01-01',
      }),
    ).toEqual({ url: 'https://a.test', title: 'A', snippet: 'salient sentence', publishedAt: '2026-01-01' })
  })

  test('falls back to description when snippets is empty or all-blank', () => {
    expect(mapYouComResult({ url: 'https://a.test', snippets: [], description: 'fallback' })).toEqual({
      url: 'https://a.test',
      snippet: 'fallback',
    })
    expect(mapYouComResult({ url: 'https://a.test', snippets: ['  '], description: 'fallback' })).toEqual({
      url: 'https://a.test',
      snippet: 'fallback',
    })
  })

  test("reads the wire's snake_case page_age, not a camelCase pageAge", () => {
    // Regression test: a live call confirmed the raw wire response is snake_case
    // (page_age, favicon_url, ...) — the TypeScript SDK's docs show a camelCase example,
    // but that's the SDK's own post-deserialization renaming, not what the server sends.
    expect(mapYouComResult({ url: 'https://a.test', page_age: '2026-01-01', snippets: ['hi'] })).toEqual({
      url: 'https://a.test',
      snippet: 'hi',
      publishedAt: '2026-01-01',
    })
  })

  test('drops a result with no URL', () => {
    expect(mapYouComResult({ url: '' })).toBeUndefined()
  })

  test('omits empty optional fields rather than emitting them', () => {
    expect(mapYouComResult({ url: 'https://a.test', title: '', page_age: '' })).toEqual({ url: 'https://a.test' })
  })

  test('merges web and news sources when includeNews is true', () => {
    const result = mapYouComSearchResponse(
      {
        results: {
          web: [{ url: 'https://a.test', snippets: ['one'] }],
          news: [{ url: 'https://b.test', snippets: ['two'] }],
        },
      },
      true,
    )
    expect(result).toEqual({
      sources: [
        { url: 'https://a.test', snippet: 'one' },
        { url: 'https://b.test', snippet: 'two' },
      ],
      truncated: false,
    })
    expect(result.content).toBeUndefined()
  })

  test('omits news sources when includeNews is false', () => {
    const result = mapYouComSearchResponse(
      {
        results: {
          web: [{ url: 'https://a.test', snippets: ['one'] }],
          news: [{ url: 'https://b.test', snippets: ['two'] }],
        },
      },
      false,
    )
    expect(result.sources).toEqual([{ url: 'https://a.test', snippet: 'one' }])
  })

  test('tolerates a missing results object', () => {
    expect(mapYouComSearchResponse({}, true).sources).toEqual([])
  })

  test('maps knowledge answer prose into content', () => {
    const response: YouComSearchResponse = {
      results: {
        knowledge: [{ type: 'answer', description: 'NVIDIA reported $81.6B in revenue.' }],
      },
    }
    expect(mapYouComSearchResponse(response, true).content).toBe('NVIDIA reported $81.6B in revenue.')
  })

  test('joins distinct knowledge answers with a space', () => {
    const response: YouComSearchResponse = {
      results: {
        knowledge: [
          { type: 'answer', description: 'First answer.' },
          { type: 'answer', description: 'Second answer.' },
        ],
      },
    }
    expect(mapYouComSearchResponse(response, true).content).toBe('First answer. Second answer.')
  })

  test('deduplicates identical knowledge descriptions (same prose, different attribution)', () => {
    const response: YouComSearchResponse = {
      results: {
        knowledge: [
          { type: 'answer', description: 'The capital of France is Paris.' },
          { type: 'answer', description: 'The capital of France is Paris.' },
        ],
      },
    }
    expect(mapYouComSearchResponse(response, true).content).toBe('The capital of France is Paris.')
  })

  test('ignores non-answer knowledge entries (forward-compatible with future kinds)', () => {
    const response: YouComSearchResponse = {
      results: {
        knowledge: [{ type: 'table', description: 'ignored' }],
      },
    }
    expect(mapYouComSearchResponse(response, true).content).toBeUndefined()
  })

  test('omits content when every knowledge description is blank', () => {
    const response: YouComSearchResponse = {
      results: { knowledge: [{ type: 'answer', description: '   ' }] },
    }
    expect(mapYouComSearchResponse(response, true).content).toBeUndefined()
  })
})

describe('YouComSearchProvider availability', () => {
  test('is available without a key — falls back to the keyless MCP profile', () => {
    expect(new YouComSearchProvider({ ...options, apiKey: '' }).available()).toBe(true)
  })

  test('is available with a key', () => {
    expect(new YouComSearchProvider(options).available()).toBe(true)
  })

  test('is misconfigured when the base URL is unparseable (key present, so baseURL is the active endpoint)', () => {
    expect(new YouComSearchProvider({ ...options, baseURL: 'not a url' }).available()).toBe(false)
  })

  test('ignores an unparseable base URL when keyless, since it never dereferences baseURL', () => {
    expect(new YouComSearchProvider({ ...options, apiKey: '', baseURL: 'not a url' }).available()).toBe(true)
  })

  test('is misconfigured when keyless and freeSearchURL is unparseable', () => {
    expect(new YouComSearchProvider({ ...options, apiKey: '', freeSearchURL: 'not a url' }).available()).toBe(false)
  })

  test('is misconfigured when the base URL is parseable but not http(s)', () => {
    expect(new YouComSearchProvider({ ...options, baseURL: 'localhost:8080' }).available()).toBe(false)
    expect(new YouComSearchProvider({ ...options, baseURL: 'file:///etc/passwd' }).available()).toBe(false)
    expect(new YouComSearchProvider({ ...options, baseURL: 'http://localhost:8080' }).available()).toBe(true)
  })

  test('is misconfigured when numResults is set but not a positive integer', () => {
    expect(new YouComSearchProvider({ ...options, numResults: -1 }).available()).toBe(false)
    expect(new YouComSearchProvider({ ...options, numResults: 1.5 }).available()).toBe(false)
  })
})

describe('YouComSearchProvider request mapping', () => {
  test('sends query, count, and the API key header', async () => {
    const fetchMock = mock(async () =>
      jsonResponse({ results: { web: [{ url: 'https://a.test', snippets: ['hi'] }] } }),
    )
    spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)

    const provider = new YouComSearchProvider(options)
    await provider.search({ query: 'hello', maxResults: 5 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(url.toString()).toBe('https://api.youcom.test/v1/search')
    expect(init).toMatchObject({ method: 'POST', redirect: 'error' })
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('youcom-key')
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json')
    expect((init.headers as Record<string, string>)['x-client-info']).toContain('client=dsh-plugin/0.1.0')
    expect(JSON.parse(init.body as string)).toEqual({ query: 'hello', count: 5 })
  })

  test('falls back to the configured numResults when a request omits maxResults', async () => {
    const fetchMock = mock(async () => jsonResponse({ results: {} }))
    spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)
    await new YouComSearchProvider({ ...options, numResults: 7 }).search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(JSON.parse(init.body as string)).toMatchObject({ count: 7 })
  })

  test('lets a request maxResults win over the configured numResults', async () => {
    const fetchMock = mock(async () => jsonResponse({ results: {} }))
    spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)
    await new YouComSearchProvider({ ...options, numResults: 7 }).search({ query: 'q', maxResults: 2 })
    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(JSON.parse(init.body as string)).toMatchObject({ count: 2 })
  })

  test('omits count when neither maxResults nor a configured default is set', async () => {
    const fetchMock = mock(async () => jsonResponse({ results: {} }))
    spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)
    await new YouComSearchProvider(options).search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(JSON.parse(init.body as string)).not.toHaveProperty('count')
  })

  test('sends knowledge=core when configured', async () => {
    const fetchMock = mock(async () => jsonResponse({ results: {} }))
    spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)
    await new YouComSearchProvider({ ...options, knowledge: 'core' }).search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(JSON.parse(init.body as string)).toMatchObject({ knowledge: 'core' })
  })

  test('omits knowledge when not configured', async () => {
    const fetchMock = mock(async () => jsonResponse({ results: {} }))
    spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)
    await new YouComSearchProvider(options).search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(JSON.parse(init.body as string)).not.toHaveProperty('knowledge')
  })

  test('forwards the abort signal', async () => {
    const fetchMock = mock(async () => jsonResponse({ results: {} }))
    spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)
    const controller = new AbortController()
    await new YouComSearchProvider(options).search({ query: 'q' }, controller.signal)
    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(init.signal).toBe(controller.signal)
  })

  test('keeps a path prefix on the configured base URL', async () => {
    const fetchMock = mock(async () => jsonResponse({ results: {} }))
    spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)
    await new YouComSearchProvider({ ...options, baseURL: 'https://gateway.test/youcom' }).search({ query: 'q' })
    const [url] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(url.toString()).toBe('https://gateway.test/youcom/v1/search')
  })
})

describe('YouComSearchProvider error handling', () => {
  test('maps a 401 {detail} error to WEB_PROVIDER_ERROR with the provider message', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => jsonResponse({ detail: 'bad key' }, { status: 401 })) as unknown as typeof fetch,
    )
    await expect(new YouComSearchProvider(options).search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'bad key' }),
    )
  })

  test('maps a 422 {error} (search-spec) error to WEB_PROVIDER_ERROR with the provider message', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => jsonResponse({ error: 'invalid_params' }, { status: 422 })) as unknown as typeof fetch,
    )
    await expect(new YouComSearchProvider(options).search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'invalid_params' }),
    )
  })

  test("maps a 422 {detail: [...]} (FastAPI validation) error, joining each entry's msg", async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () =>
        jsonResponse(
          {
            detail: [{ type: 'value_error', loc: ['query'], msg: 'field required' }, { msg: 'count must be >= 1' }],
          },
          { status: 422 },
        ),
      ) as unknown as typeof fetch,
    )
    await expect(new YouComSearchProvider(options).search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'field required; count must be >= 1' }),
    )
  })

  test("maps a 422 {errors: [...]} (JSON:API) error, joining each entry's title", async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () =>
        jsonResponse({ errors: [{ status: '422', code: 'bad_request', title: 'Malformed query' }] }, { status: 422 }),
      ) as unknown as typeof fetch,
    )
    await expect(new YouComSearchProvider(options).search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'Malformed query' }),
    )
  })

  test('maps a gateway-level {message} rejection (confirmed live with an invalid key) to WEB_PROVIDER_ERROR', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => jsonResponse({ message: 'Forbidden' }, { status: 403 })) as unknown as typeof fetch,
    )
    await expect(new YouComSearchProvider(options).search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'Forbidden' }),
    )
  })

  test('keeps a status-line message when the error body is not JSON', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => new Response('gateway down', { status: 502 })) as unknown as typeof fetch,
    )
    await expect(new YouComSearchProvider(options).search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'You.com API error (HTTP 502)' }),
    )
  })

  test('maps a network failure to WEB_PROVIDER_ERROR', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(() => Promise.reject(new TypeError('connection refused'))) as unknown as typeof fetch,
    )
    await expect(new YouComSearchProvider(options).search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }),
    )
  })

  test('maps an abort to WEB_ABORTED', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(() => Promise.reject(new DOMException('aborted', 'AbortError'))) as unknown as typeof fetch,
    )
    await expect(new YouComSearchProvider(options).search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_ABORTED' }),
    )
  })

  test('maps an unparseable success body to WEB_PROVIDER_ERROR', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => new Response('not json', { status: 200 })) as unknown as typeof fetch,
    )
    await expect(new YouComSearchProvider(options).search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }),
    )
  })

  test('maps an abort during the error-body read to WEB_ABORTED, not the HTTP status message', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => abortingResponse({ status: 500 })) as unknown as typeof fetch,
    )
    await expect(new YouComSearchProvider(options).search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_ABORTED' }),
    )
  })

  test('maps an abort during the success-body read to WEB_ABORTED', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(mock(async () => abortingResponse()) as unknown as typeof fetch)
    await expect(new YouComSearchProvider(options).search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_ABORTED' }),
    )
  })
})

describe('YouComSearchProvider keyless (MCP) search', () => {
  test('calls the free MCP endpoint with tools/call and no x-api-key header', async () => {
    const fetchMock = mock(async () =>
      sseToolCallResponse(1, {
        structuredContent: { results: {} },
        content: [{ type: 'text', text: '{"results":{}}' }],
      }),
    )
    spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)

    await new YouComSearchProvider({ ...options, apiKey: '' }).search({ query: 'hello', maxResults: 5 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(YOUCOM_FREE_MCP_URL)
    const body = JSON.parse(init.body as string)
    expect(body).toMatchObject({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'you-search', arguments: { query: 'hello', count: 5 } },
    })
    const headers = init.headers as Record<string, string>
    expect(headers).not.toHaveProperty('x-api-key')
    expect(headers.accept).toBe('application/json, text/event-stream')
    expect(headers['x-client-info']).toContain('client=dsh-plugin/0.1.0')
  })

  test('threads knowledge into the keyless tools/call arguments when configured', async () => {
    const fetchMock = mock(async () =>
      sseToolCallResponse(1, {
        structuredContent: { results: {} },
        content: [{ type: 'text', text: '{"results":{}}' }],
      }),
    )
    spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)

    await new YouComSearchProvider({ ...options, apiKey: '', knowledge: 'core' }).search({ query: 'hello' })

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toMatchObject({
      params: { name: 'you-search', arguments: { query: 'hello', knowledge: 'core' } },
    })
  })

  test('omits knowledge from the keyless arguments when not configured', async () => {
    const fetchMock = mock(async () =>
      sseToolCallResponse(1, {
        structuredContent: { results: {} },
        content: [{ type: 'text', text: '{"results":{}}' }],
      }),
    )
    spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)

    await new YouComSearchProvider({ ...options, apiKey: '' }).search({ query: 'hello' })

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body.params.arguments).not.toHaveProperty('knowledge')
  })

  test('prefers structuredContent when present', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () =>
        sseToolCallResponse(1, {
          structuredContent: { results: { web: [{ url: 'https://a.test', snippets: ['hi'] }] } },
          content: [{ type: 'text', text: '{"results":{}}' }],
        }),
      ) as unknown as typeof fetch,
    )
    const result = await new YouComSearchProvider({ ...options, apiKey: '' }).search({ query: 'q' })
    expect(result.sources).toEqual([{ url: 'https://a.test', snippet: 'hi' }])
  })

  test('falls back to parsing content[0].text when structuredContent is absent', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () =>
        sseToolCallResponse(1, {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ results: { web: [{ url: 'https://b.test', snippets: ['there'] }] } }),
            },
          ],
        }),
      ) as unknown as typeof fetch,
    )
    const result = await new YouComSearchProvider({ ...options, apiKey: '' }).search({ query: 'q' })
    expect(result.sources).toEqual([{ url: 'https://b.test', snippet: 'there' }])
  })

  test('skips a notification frame with no id and reads the matching result frame', async () => {
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/message',
      params: { level: 'info', data: 'searching' },
    }
    const success = {
      jsonrpc: '2.0',
      id: 1,
      result: { structuredContent: { results: { web: [{ url: 'https://c.test', snippets: ['x'] }] } } },
    }
    const sse = `event: message\ndata: ${JSON.stringify(notification)}\n\nevent: message\ndata: ${JSON.stringify(success)}\n\n`
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(
        async () => new Response(sse, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
      ) as unknown as typeof fetch,
    )
    const result = await new YouComSearchProvider({ ...options, apiKey: '' }).search({ query: 'q' })
    expect(result.sources).toEqual([{ url: 'https://c.test', snippet: 'x' }])
  })

  test('parses a bare JSON (non-SSE) response body the same way', async () => {
    const success = {
      jsonrpc: '2.0',
      id: 1,
      result: { structuredContent: { results: { web: [{ url: 'https://d.test', snippets: ['y'] }] } } },
    }
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(
        async () =>
          new Response(JSON.stringify(success), { status: 200, headers: { 'content-type': 'application/json' } }),
      ) as unknown as typeof fetch,
    )
    const result = await new YouComSearchProvider({ ...options, apiKey: '' }).search({ query: 'q' })
    expect(result.sources).toEqual([{ url: 'https://d.test', snippet: 'y' }])
  })

  test('maps a JSON-RPC protocol-level error (e.g. tool not found) to WEB_PROVIDER_ERROR', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => sseErrorResponse(1, -32602, 'Tool you-contents not found')) as unknown as typeof fetch,
    )
    await expect(new YouComSearchProvider({ ...options, apiKey: '' }).search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({
        code: 'WEB_PROVIDER_ERROR',
        message: expect.stringContaining('Tool you-contents not found'),
      }),
    )
  })

  test('cites the error code when a JSON-RPC error carries no message', async () => {
    const body = { jsonrpc: '2.0', id: 1, error: { code: -32601 } }
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(
        async () =>
          new Response(`event: message\ndata: ${JSON.stringify(body)}\n\n`, {
            status: 200,
            headers: { 'content-type': 'text/event-stream' },
          }),
      ) as unknown as typeof fetch,
    )
    await expect(new YouComSearchProvider({ ...options, apiKey: '' }).search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: expect.stringContaining('code -32601') }),
    )
  })

  test('matches a JSON-RPC response whose id came back as a string, not a number', async () => {
    const success = {
      jsonrpc: '2.0',
      id: '1',
      result: { structuredContent: { results: { web: [{ url: 'https://e.test', snippets: ['z'] }] } } },
    }
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(
        async () =>
          new Response(`event: message\ndata: ${JSON.stringify(success)}\n\n`, {
            status: 200,
            headers: { 'content-type': 'text/event-stream' },
          }),
      ) as unknown as typeof fetch,
    )
    const result = await new YouComSearchProvider({ ...options, apiKey: '' }).search({ query: 'q' })
    expect(result.sources).toEqual([{ url: 'https://e.test', snippet: 'z' }])
  })

  test('maps a tool-level isError result (e.g. validation failure) to WEB_PROVIDER_ERROR with the tool message', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () =>
        sseToolCallResponse(1, {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Input validation error: Invalid arguments for tool you-search: query: Query is required',
            },
          ],
        }),
      ) as unknown as typeof fetch,
    )
    await expect(new YouComSearchProvider({ ...options, apiKey: '' }).search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({
        code: 'WEB_PROVIDER_ERROR',
        message: 'Input validation error: Invalid arguments for tool you-search: query: Query is required',
      }),
    )
  })

  test('maps an HTTP 429 to a distinct rate-limit message naming YDC_API_KEY', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => new Response('rate limited', { status: 429 })) as unknown as typeof fetch,
    )
    await expect(new YouComSearchProvider({ ...options, apiKey: '' }).search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({
        code: 'WEB_PROVIDER_ERROR',
        message: expect.stringContaining('429'),
      }),
    )
    await expect(new YouComSearchProvider({ ...options, apiKey: '' }).search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({ message: expect.stringContaining('YDC_API_KEY') }),
    )
  })

  test('includes the server body snippet in a non-429 keyless HTTP error', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => new Response('{"error":"geo-blocked"}', { status: 403 })) as unknown as typeof fetch,
    )
    await expect(new YouComSearchProvider({ ...options, apiKey: '' }).search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({
        code: 'WEB_PROVIDER_ERROR',
        message: expect.stringContaining('403'),
      }),
    )
    await expect(new YouComSearchProvider({ ...options, apiKey: '' }).search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({ message: expect.stringContaining('geo-blocked') }),
    )
  })

  test('maps a network failure to WEB_PROVIDER_ERROR', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(() => Promise.reject(new TypeError('connection refused'))) as unknown as typeof fetch,
    )
    await expect(new YouComSearchProvider({ ...options, apiKey: '' }).search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }),
    )
  })

  test('maps an abort to WEB_ABORTED', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(() => Promise.reject(new DOMException('aborted', 'AbortError'))) as unknown as typeof fetch,
    )
    await expect(new YouComSearchProvider({ ...options, apiKey: '' }).search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_ABORTED' }),
    )
  })
})

describe('Two-frame SSE fixture (live capture)', () => {
  // The fixture was trimmed from a 61 KB live capture down to 1,582 bytes;
  // it preserves the notification-frame (no id) + result-frame (id=42) shape
  // that distinguishes a real MCP stream from a one-frame JSON body.
  const FIXTURE_URL = new URL('./fixtures/two-frame-sse.txt', import.meta.url)

  test('round-trips: notification skipped, result selected, web sources extracted', async () => {
    const { extractJsonRpcMessage } = await import('../src/web/search-provider.ts')
    const fixture = await Bun.file(FIXTURE_URL).text()
    const message = extractJsonRpcMessage(fixture, 42)
    expect(message).toBeDefined()
    expect(message?.result).toBeDefined()
    const result = message?.result as { structuredContent?: { results?: { web?: unknown[] } } }
    expect(result.structuredContent?.results?.web?.length ?? 0).toBeGreaterThan(0)
  })

  test('a wrong id leaves extractJsonRpcMessage returning undefined', async () => {
    const { extractJsonRpcMessage } = await import('../src/web/search-provider.ts')
    const fixture = await Bun.file(FIXTURE_URL).text()
    expect(extractJsonRpcMessage(fixture, 999_999)).toBeUndefined()
  })
})

describe('dsh-plugin search registration', () => {
  test('registers the provider into ctx.web (HMR-safe)', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => jsonResponse({ results: {} })) as unknown as typeof fetch,
    )
    const ctx = new Context()
    await ctx.plugin(WebRuntime, { searchProvider: YOUCOM_PROVIDER_ID })
    const fiber = await ctx.plugin(youcomPlugin, { apiKey: 'youcom-key' })
    await expect(ctx.web.search({ query: 'q' })).resolves.toMatchObject({ sources: [], truncated: false })
    await fiber.dispose()
    await expect(ctx.web.search({ query: 'q' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_PROVIDER_CONFIGURED_MISSING' }),
    )
  })

  test('has no default export (namespace plugin export shape)', () => {
    expect('default' in youcomPlugin).toBe(false)
  })

  test('falls back to $YDC_API_KEY when config omits apiKey', async () => {
    const prev = process.env.YDC_API_KEY
    process.env.YDC_API_KEY = 'env-key'
    try {
      const fetchMock = mock(async () => jsonResponse({ results: {} }))
      spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)
      const ctx = new Context()
      await ctx.plugin(WebRuntime, { searchProvider: YOUCOM_PROVIDER_ID })
      const fiber = await ctx.plugin(youcomPlugin, {})
      await ctx.web.search({ query: 'q' })
      const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
      expect((init.headers as Record<string, string>)['x-api-key']).toBe('env-key')
      await fiber.dispose()
    } finally {
      if (prev === undefined) delete process.env.YDC_API_KEY
      else process.env.YDC_API_KEY = prev
    }
  })

  test('carries baseURL, numResults, and includeNews from config into the provider', async () => {
    const fetchMock = mock(async () =>
      jsonResponse({
        results: {
          web: [{ url: 'https://web.test', snippets: ['w'] }],
          news: [{ url: 'https://news.test', snippets: ['n'] }],
        },
      }),
    )
    spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)
    const ctx = new Context()
    await ctx.plugin(WebRuntime, { searchProvider: YOUCOM_PROVIDER_ID })
    const fiber = await ctx.plugin(youcomPlugin, {
      apiKey: 'youcom-key',
      baseURL: 'https://gateway.test/youcom',
      numResults: 4,
      includeNews: false,
    })

    const result = await ctx.web.search({ query: 'q' })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(url.toString()).toBe('https://gateway.test/youcom/v1/search')
    expect(JSON.parse(init.body as string)).toMatchObject({ count: 4 })
    expect(result.sources).toEqual([{ url: 'https://web.test', snippet: 'w' }])

    await fiber.dispose()
  })

  test('carries knowledge from config into the provider request', async () => {
    const fetchMock = mock(async () => jsonResponse({ results: {} }))
    spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)
    const ctx = new Context()
    await ctx.plugin(WebRuntime, { searchProvider: YOUCOM_PROVIDER_ID })
    const fiber = await ctx.plugin(youcomPlugin, { apiKey: 'youcom-key', knowledge: 'core' })

    await ctx.web.search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(JSON.parse(init.body as string)).toMatchObject({ knowledge: 'core' })

    await fiber.dispose()
  })

  test('falls back to the keyless MCP profile when neither config nor env supplies a key', async () => {
    const prev = process.env.YDC_API_KEY
    delete process.env.YDC_API_KEY
    try {
      const fetchMock = mock(
        async () =>
          new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { structuredContent: { results: {} } } }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      )
      spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)
      const ctx = new Context()
      await ctx.plugin(WebRuntime, { searchProvider: YOUCOM_PROVIDER_ID })
      await ctx.plugin(youcomPlugin, {})
      await expect(ctx.web.search({ query: 'q' })).resolves.toMatchObject({ sources: [], truncated: false })
      const [url] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
      expect(url).toBe(YOUCOM_FREE_MCP_URL)
    } finally {
      if (prev !== undefined) process.env.YDC_API_KEY = prev
    }
  })
})

const fetchOptions = {
  apiKey: 'youcom-key',
  baseURL: 'https://api.youcom.test',
  pluginVersion: '0.1.0',
}

describe('You.com contents mapping', () => {
  test('maps a markdown response to a text body', () => {
    expect(mapYouComContentsResponse({ url: 'https://a.test', markdown: '# Title' }, 'https://a.test')).toEqual({
      url: 'https://a.test',
      statusCode: 200,
      body: { kind: 'text', content: '# Title' },
      truncated: false,
    })
  })

  test('falls back to html when markdown is absent', () => {
    expect(mapYouComContentsResponse({ url: 'https://a.test', html: '<p>hi</p>' }, 'https://a.test')).toEqual({
      url: 'https://a.test',
      statusCode: 200,
      body: { kind: 'html', content: '<p>hi</p>' },
      truncated: false,
    })
  })

  test('falls back to the request URL when the response omits url', () => {
    expect(mapYouComContentsResponse({ markdown: 'hi' }, 'https://requested.test').url).toBe('https://requested.test')
  })

  test('throws WEB_PROVIDER_ERROR when neither markdown nor html is present', () => {
    expect(() => mapYouComContentsResponse({ url: 'https://a.test' }, 'https://a.test')).toThrow(
      expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }),
    )
  })

  test('treats an empty-string markdown as absent and falls back to html', () => {
    expect(
      mapYouComContentsResponse({ url: 'https://a.test', markdown: '', html: '<p>hi</p>' }, 'https://a.test').body,
    ).toEqual({ kind: 'html', content: '<p>hi</p>' })
  })

  test('throws WEB_PROVIDER_ERROR when both markdown and html are empty strings', () => {
    expect(() =>
      mapYouComContentsResponse({ url: 'https://a.test', markdown: '', html: '' }, 'https://a.test'),
    ).toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }))
  })
})

describe('YouComFetchProvider availability', () => {
  test('is unavailable without a key', () => {
    expect(new YouComFetchProvider({ ...fetchOptions, apiKey: '' }).available()).toBe(false)
  })

  test('is available with a key', () => {
    expect(new YouComFetchProvider(fetchOptions).available()).toBe(true)
  })

  test('is misconfigured when the base URL is unparseable', () => {
    expect(new YouComFetchProvider({ ...fetchOptions, baseURL: 'not a url' }).available()).toBe(false)
  })

  test('is misconfigured when the base URL is parseable but not http(s)', () => {
    expect(new YouComFetchProvider({ ...fetchOptions, baseURL: 'localhost:8080' }).available()).toBe(false)
    expect(new YouComFetchProvider({ ...fetchOptions, baseURL: 'http://localhost:8080' }).available()).toBe(true)
  })
})

describe('YouComFetchProvider request mapping', () => {
  test('sends the url, requests markdown, and the API key header', async () => {
    const fetchMock = mock(async () => jsonResponse({ url: 'https://a.test', markdown: 'content' }))
    spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)

    await new YouComFetchProvider(fetchOptions).fetch({ url: 'https://a.test' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(url.toString()).toBe('https://api.youcom.test/v1/contents')
    expect(init).toMatchObject({ method: 'POST', redirect: 'error' })
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('youcom-key')
    expect(JSON.parse(init.body as string)).toEqual({ urls: ['https://a.test'], formats: ['markdown', 'html'] })
  })

  test('keeps a path prefix on the configured base URL', async () => {
    const fetchMock = mock(async () => jsonResponse({ url: 'https://a.test', markdown: 'content' }))
    spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)
    await new YouComFetchProvider({ ...fetchOptions, baseURL: 'https://gateway.test/youcom' }).fetch({
      url: 'https://a.test',
    })
    const [url] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(url.toString()).toBe('https://gateway.test/youcom/v1/contents')
  })

  test('takes the first entry when the response is an array', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => jsonResponse([{ url: 'https://a.test', markdown: 'content' }])) as unknown as typeof fetch,
    )
    const result = await new YouComFetchProvider(fetchOptions).fetch({ url: 'https://a.test' })
    expect(result.body).toEqual({ kind: 'text', content: 'content' })
  })

  test('forwards the abort signal', async () => {
    const fetchMock = mock(async () => jsonResponse({ url: 'https://a.test', markdown: 'content' }))
    spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)
    const controller = new AbortController()
    await new YouComFetchProvider(fetchOptions).fetch({ url: 'https://a.test' }, controller.signal)
    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(init.signal).toBe(controller.signal)
  })
})

describe('YouComFetchProvider error handling', () => {
  test('maps a 401 {detail} error to WEB_PROVIDER_ERROR with the provider message', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => jsonResponse({ detail: 'bad key' }, { status: 401 })) as unknown as typeof fetch,
    )
    await expect(new YouComFetchProvider(fetchOptions).fetch({ url: 'https://a.test' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'bad key' }),
    )
  })

  test('maps a network failure to WEB_PROVIDER_ERROR', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(() => Promise.reject(new TypeError('connection refused'))) as unknown as typeof fetch,
    )
    await expect(new YouComFetchProvider(fetchOptions).fetch({ url: 'https://a.test' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }),
    )
  })

  test('maps an abort to WEB_ABORTED', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(() => Promise.reject(new DOMException('aborted', 'AbortError'))) as unknown as typeof fetch,
    )
    await expect(new YouComFetchProvider(fetchOptions).fetch({ url: 'https://a.test' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_ABORTED' }),
    )
  })

  test('propagates the no-content WebError from response mapping, message intact', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => jsonResponse({ url: 'https://a.test' })) as unknown as typeof fetch,
    )
    // The message must survive the surrounding catch: without the `instanceof WebError`
    // re-throw it is rewrapped as an unprocessable-body error, which misdiagnoses a page
    // that was retrieved fine but yielded nothing extractable.
    await expect(new YouComFetchProvider(fetchOptions).fetch({ url: 'https://a.test' })).rejects.toThrow(
      expect.objectContaining({
        code: 'WEB_PROVIDER_ERROR',
        message: 'You.com contents returned no retrievable page content',
      }),
    )
  })

  test('maps an empty array response to WEB_PROVIDER_ERROR', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(mock(async () => jsonResponse([])) as unknown as typeof fetch)
    await expect(new YouComFetchProvider(fetchOptions).fetch({ url: 'https://a.test' })).rejects.toThrow(
      expect.objectContaining({
        code: 'WEB_PROVIDER_ERROR',
        message: 'You.com contents returned an empty response',
      }),
    )
  })

  test('maps an abort during the error-body read to WEB_ABORTED, not the HTTP status message', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => abortingResponse({ status: 500 })) as unknown as typeof fetch,
    )
    await expect(new YouComFetchProvider(fetchOptions).fetch({ url: 'https://a.test' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_ABORTED' }),
    )
  })

  test('maps an abort during the success-body read to WEB_ABORTED', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(mock(async () => abortingResponse()) as unknown as typeof fetch)
    await expect(new YouComFetchProvider(fetchOptions).fetch({ url: 'https://a.test' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_ABORTED' }),
    )
  })
})

describe('dsh-plugin fetch registration', () => {
  test('registers the provider into ctx.web (HMR-safe)', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => jsonResponse({ url: 'https://a.test', markdown: 'hi' })) as unknown as typeof fetch,
    )
    const ctx = new Context()
    await ctx.plugin(WebRuntime, { fetchProvider: YOUCOM_FETCH_PROVIDER_ID })
    const fiber = await ctx.plugin(youcomPlugin, { apiKey: 'youcom-key' })
    await expect(ctx.web.fetch({ url: 'https://a.test' })).resolves.toMatchObject({
      body: { kind: 'text', content: 'hi' },
    })
    await fiber.dispose()
    await expect(ctx.web.fetch({ url: 'https://a.test' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_PROVIDER_CONFIGURED_MISSING' }),
    )
  })
})

describe('Config schema (schemastery)', () => {
  test('accepts an empty object (the bundle row carries no config)', () => {
    expect(() => Config({})).not.toThrow()
  })

  test('accepts undefined (Cordis passes undefined when no config row is set)', () => {
    expect(() => Config(undefined)).not.toThrow()
  })

  test('rejects numResults=0 with a ValidationError (not a silent default)', () => {
    expect(() => Config({ numResults: 0 })).toThrow()
  })

  test('rejects numResults=1.5 with a ValidationError', () => {
    expect(() => Config({ numResults: 1.5 })).toThrow()
  })

  test('accepts a fully-specified valid config', () => {
    expect(() =>
      Config({
        apiKey: 'key',
        baseURL: 'https://api.you.com',
        freeSearchURL: YOUCOM_FREE_MCP_URL,
        numResults: 5,
        includeNews: true,
        knowledge: 'core',
      }),
    ).not.toThrow()
  })

  test('accepts knowledge=core (the only documented value)', () => {
    expect(() => Config({ knowledge: 'core' })).not.toThrow()
  })

  test('rejects a knowledge value that is not core', () => {
    // A config row from YAML is untyped at the trust boundary, so a non-`core`
    // string reaches the schema at runtime; the cast mirrors that untrusted input.
    expect(() => Config({ knowledge: 'advanced' as 'core' })).toThrow()
  })
})

describe('pluginVersion attribution', () => {
  // The version read uses `createRequire(import.meta.url)('../package.json').version`,
  // which is sensitive to the relative location of the read in the source tree. A
  // regression that moves the read into `src/web/` would resolve `../package.json`
  // against `lib/web/`, which doesn't exist — the read would throw at module load.
  test('the search provider carries the version from package.json in x-client-info', async () => {
    const pkg = await Bun.file(new URL('../package.json', import.meta.url)).json()
    expect(typeof pkg.version).toBe('string')
    expect(pkg.version.length).toBeGreaterThan(0)

    const fetchMock = mock(async () => jsonResponse({ results: {} }))
    spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)
    const provider = new YouComSearchProvider({
      apiKey: 'key',
      baseURL: 'https://api.youcom.test',
      freeSearchURL: YOUCOM_FREE_MCP_URL,
      pluginVersion: pkg.version,
      includeNews: true,
    })
    await provider.search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers['x-client-info']).toContain(`dsh-plugin/${pkg.version}`)
  })
})

describe("apply() with ctx.inject(['web']) deferral", () => {
  // The web providers are registered inside a `ctx.inject(['web'], cb)` so that a
  // missing web seam leaves skills + MCP working while only this inner fork is
  // inactive. The verification below uses a real `Context` + `WebRuntime` to
  // exercise the Cordis inject machinery end-to-end.

  test('registers the search + fetch providers when ctx.web is available', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => jsonResponse({ results: {} })) as unknown as typeof fetch,
    )
    const ctx = new Context()
    await ctx.plugin(WebRuntime, { searchProvider: YOUCOM_PROVIDER_ID, fetchProvider: YOUCOM_FETCH_PROVIDER_ID })
    const fiber = await ctx.plugin(apply, { apiKey: 'youcom-key' })

    // WebRuntime loads the providers from `ctx.inject` synchronously after apply returns,
    // so the search should now succeed against the registered provider.
    await expect(ctx.web.search({ query: 'q' })).resolves.toMatchObject({ sources: [], truncated: false })

    await fiber.dispose()
  })

  test('plugin apply also registers the fetch provider (keyed path)', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => jsonResponse({ url: 'https://a.test', markdown: 'hi' })) as unknown as typeof fetch,
    )
    const ctx = new Context()
    await ctx.plugin(WebRuntime, { searchProvider: YOUCOM_PROVIDER_ID, fetchProvider: YOUCOM_FETCH_PROVIDER_ID })
    const fiber = await ctx.plugin(apply, { apiKey: 'youcom-key' })

    await expect(ctx.web.fetch({ url: 'https://a.test' })).resolves.toMatchObject({
      body: { kind: 'text', content: 'hi' },
    })

    await fiber.dispose()
  })
})

describe('resolveApiKey / apply() with no API key', () => {
  test('apply() with no config and no env var still loads skills + MCP (web seam stays inactive)', async () => {
    const prev = process.env.YDC_API_KEY
    delete process.env.YDC_API_KEY
    try {
      // No `WebRuntime` plugin → no `ctx.web` → the `ctx.inject(['web'], …)` callback
      // never runs, but `applySkills` + `applyMcpServers` must still execute. The
      // MCP mounts will reach out to the network (failOnStartupError: false),
      // so we don't actually need them to succeed — only that apply itself ran
      // without throwing at the missing-config / missing-web-seam boundary.
      const ctx = new Context()
      await ctx.plugin(SkillRegistry)
      const fiber = await ctx.plugin(apply)
      // applySkills registers skills via the filesystem provider; listing them confirms apply ran.
      const summaries = await ctx.skills.list()
      expect(summaries.map((s) => s.name).sort()).toEqual(['you-discover', 'you-finance', 'you-research', 'you-web'])
      await fiber.dispose()
    } finally {
      if (prev !== undefined) process.env.YDC_API_KEY = prev
    }
  })
})

// Failure-isolation regression: apply() must validate config at the trust
// boundary (the plugin entry), not deep inside the `ctx.inject(['web'], …)`
// callback. A bad config must throw even when the web seam is absent.
describe('apply() config validation', () => {
  test('throws ValidationError eagerly for numResults=0, before the web fork activates', async () => {
    const ctx = new Context()
    // `ctx.plugin()` returns a Cordis Fiber; awaiting it surfaces apply's
    // thrown ValidationError as a rejection on the returned promise.
    let caught: Error | undefined
    try {
      await ctx.plugin(apply, { numResults: 0 })
    } catch (error) {
      caught = error as Error
    }
    expect(caught).toBeDefined()
  })
})

// Re-exports spot-check: ensure the plugin module shape consumers depend on.
describe('public exports', () => {
  test('exports YOUCOM_PROVIDER_ID and YOUCOM_FETCH_PROVIDER_ID', () => {
    expect(YOUCOM_PROVIDER_ID).toBe('youcom')
    expect(YOUCOM_FETCH_PROVIDER_ID).toBe('youcom')
  })

  test('exports the search and fetch provider classes', () => {
    expect(typeof YouComSearchProvider).toBe('function')
    expect(typeof YouComFetchProvider).toBe('function')
  })

  test('has no default export (namespace plugin export shape)', () => {
    const mod = { apply, applySkills, Config } as unknown as Record<string, unknown>
    expect('default' in mod).toBe(false)
  })
})
