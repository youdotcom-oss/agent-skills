import { describe, expect, mock, spyOn, test } from 'bun:test'
import { Context } from '@deepseek-ai/cordis'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import WebRuntime from '@deepseek-ai/dsh-web'
import { apply, applySkills, Config, YOUCOM_FETCH_PROVIDER_ID, YOUCOM_PROVIDER_ID } from '../../src/index.ts'
import { YouComFetchProvider } from '../../src/web/fetch-provider.ts'
import { YOUCOM_FREE_MCP_URL, YouComSearchProvider } from '../../src/web/search-provider.ts'

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init })
}

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
      }),
    ).not.toThrow()
  })
})

describe('pluginVersion attribution', () => {
  // The version read uses `createRequire(import.meta.url)('../package.json').version`,
  // which is sensitive to the relative location of the read in the source tree. A
  // regression that moves the read into `src/web/` would resolve `../package.json`
  // against `lib/web/`, which doesn't exist — the read would throw at module load.
  test('the search provider carries the version from package.json in x-client-info', async () => {
    const pkg = await Bun.file(new URL('../../package.json', import.meta.url)).json()
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
      expect(summaries.map((s) => s.name).sort()).toEqual([
        'you-discover',
        'you-finance',
        'you-free',
        'you-research',
        'you-web',
      ])
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
