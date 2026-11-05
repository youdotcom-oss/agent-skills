/**
 * Contract tests for the You.com OpenCode web search provider.
 *
 * Driven through the plugin's default export with a recording OpenCode 2
 * context and a stubbed `fetch`, so requests and results are checked at the
 * same boundary OpenCode uses.
 *
 * @public
 */

import { afterEach, beforeAll, describe, expect, mock, spyOn, test } from 'bun:test'
import { join } from 'node:path'
import plugin from '../plugin.ts'
import { buildSkills } from '../scripts/build.ts'

const twoFrameSse = await Bun.file(join(import.meta.dir, 'fixtures', 'two-frame-sse.txt')).text()

type Definition = {
  id: string
  name: string
  execute: (input: { query: string }, context: { signal: AbortSignal }) => Promise<readonly unknown[]>
}
type MethodRegistration = { integrationID: string; method: Record<string, unknown> }

/** A minimal OpenCode 2 plugin context that records websearch and integration registrations. */
const setupPlugin = async ({ connected }: { connected?: string } = {}) => {
  const providers: Definition[] = []
  const integrations = new Map<string, { id: string; name: string }>()
  const methods: MethodRegistration[] = []
  const defaults: unknown[] = []
  const ctx = {
    mcp: { transform: async (callback: (editor: { set: () => void }) => void) => callback({ set: () => {} }) },
    skill: { transform: async (callback: (editor: { add: () => void }) => void) => callback({ add: () => {} }) },
    integration: {
      transform: async (callback: (editor: Record<string, unknown>) => void) =>
        callback({
          update: (id: string, update: (integration: { id: string; name: string }) => void) => {
            const integration = integrations.get(id) ?? { id, name: id }
            update(integration)
            integrations.set(id, integration)
          },
          method: { update: (registration: MethodRegistration) => methods.push(registration) },
        }),
      connection: {
        active: async (id: string) => (id === 'youcom' && connected ? { id: 'connection' } : undefined),
        resolve: async () => (connected ? { type: 'key', key: connected } : undefined),
      },
    },
    websearch: {
      transform: async (callback: (editor: Record<string, unknown>) => void) =>
        callback({
          add: (definition: Definition) => providers.push(definition),
          default: { get: () => undefined, set: (selection: unknown) => defaults.push(selection) },
        }),
    },
  }
  await plugin.setup(ctx as never)
  const provider = providers.find((definition) => definition.id === 'youcom')
  if (!provider) throw new Error('youcom web search provider was not registered')
  return { provider, providers, integrations, methods, defaults }
}

const stubFetch = (response: () => Response) => {
  const fetchMock = mock(async (_input: string | URL | Request, _init?: RequestInit) => response())
  spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)
  return fetchMock
}

const sse = (...messages: unknown[]) =>
  new Response(messages.map((message) => `event: message\ndata: ${JSON.stringify(message)}\n\n`).join(''), {
    headers: { 'content-type': 'text/event-stream' },
  })

const search = (provider: Definition) =>
  provider.execute({ query: 'opencode' }, { signal: new AbortController().signal })

// `plugin.setup` reads the packaged skills, a gitignored build artifact.
beforeAll(async () => {
  await buildSkills()
})

afterEach(() => {
  mock.restore()
})

describe('websearch provider', () => {
  test('registers a You.com integration with key and YDC_API_KEY methods', async () => {
    const { providers, integrations, methods, defaults } = await setupPlugin()

    expect(providers.map(({ id, name }) => ({ id, name }))).toEqual([{ id: 'youcom', name: 'You.com' }])
    expect(integrations.get('youcom')).toEqual({ id: 'youcom', name: 'You.com' })
    expect(methods).toEqual([
      { integrationID: 'youcom', method: { type: 'key' } },
      { integrationID: 'youcom', method: { type: 'env', names: ['YDC_API_KEY'] } },
    ])
    expect(defaults).toEqual([])
  })

  test('searches the free MCP profile without a key and skips the logging notification', async () => {
    const fetchMock = stubFetch(() => new Response(twoFrameSse, { headers: { 'content-type': 'text/event-stream' } }))
    const { provider } = await setupPlugin()

    const results = await search(provider)

    expect(results).toEqual([
      {
        url: 'https://opencode.ai/',
        title: 'OpenCode',
        content: expect.stringContaining('OpenCode - The open source coding agent.'),
        time: { published: Date.parse('2026-10-31T03:43:03') },
      },
      {
        url: 'https://opencode.ai/docs/cli/',
        title: expect.any(String),
        content: expect.any(String),
        time: { published: Date.parse('2026-11-02T22:19:25') },
      },
    ])
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('https://api.you.com/mcp?profile=free')
    const headers = new Headers(init?.headers)
    expect(headers.get('authorization')).toBeNull()
    expect(headers.get('accept')).toBe('application/json, text/event-stream')
    expect(headers.get('user-agent')).toMatch(/^youdotcom-opencode\/\d+\.\d+\.\d+ /)
    expect(JSON.parse(String(init?.body))).toEqual({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'you-search',
        arguments: { query: 'opencode', count: 8 },
        _meta: {
          'io.modelcontextprotocol/clientInfo': { name: 'youdotcom-opencode', version: expect.any(String) },
        },
      },
    })
  })

  // OpenCode resolves both a `/connect` key and a `YDC_API_KEY` env connection to `{ type: 'key', key }`.
  test('uses the authenticated MCP endpoint when a key is connected', async () => {
    const fetchMock = stubFetch(() => new Response(twoFrameSse))
    const { provider } = await setupPlugin({ connected: 'ydc-secret' })

    await search(provider)

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('https://api.you.com/mcp')
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer ydc-secret')
  })

  test('accepts a plain JSON response and falls back to description without highlights', async () => {
    stubFetch(() =>
      Response.json({
        jsonrpc: '2.0',
        id: 1,
        result: {
          structuredContent: {
            results: { web: [{ url: 'https://a.test', title: 'A', description: 'About A' }, { title: 'no url' }] },
          },
        },
      }),
    )
    const { provider } = await setupPlugin()

    expect(await search(provider)).toEqual([{ url: 'https://a.test', title: 'A', content: 'About A', time: {} }])
  })

  test('joins SSE data fields split across lines and matches a string response id', async () => {
    stubFetch(
      () =>
        new Response(
          'event: message\ndata: {"jsonrpc":"2.0","id":"1",\ndata: "result":{"structuredContent":{"results":{"web":[{"url":"https://a.test"}]}}}}\n\n',
        ),
    )
    const { provider } = await setupPlugin()

    expect(await search(provider)).toEqual([{ url: 'https://a.test', time: {} }])
  })

  test('fails with the tool error message when the search reports isError', async () => {
    stubFetch(() =>
      sse({
        jsonrpc: '2.0',
        id: 1,
        result: { isError: true, content: [{ type: 'text', text: 'Error: Free tier limit exceeded.' }] },
      }),
    )
    const { provider } = await setupPlugin()

    await expect(search(provider)).rejects.toThrow('Free tier limit exceeded.')
  })

  test('fails with the JSON-RPC error message', async () => {
    stubFetch(() => sse({ jsonrpc: '2.0', id: 1, error: { code: -32602, message: 'Invalid params' } }))
    const { provider } = await setupPlugin()

    await expect(search(provider)).rejects.toThrow('Invalid params')
  })

  test('fails with the HTTP status when the request is rejected', async () => {
    stubFetch(() => new Response('rate limited', { status: 429 }))
    const { provider } = await setupPlugin()

    await expect(search(provider)).rejects.toThrow('HTTP 429')
  })

  test('fails when the response carries no search result', async () => {
    stubFetch(() => sse({ jsonrpc: '2.0', method: 'notifications/message', params: { level: 'info', data: 'hi' } }))
    const { provider } = await setupPlugin()

    await expect(search(provider)).rejects.toThrow('no search result')
  })
})
