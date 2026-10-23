import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  type AnyModel,
  type ModelsPublication,
  normalizeContext,
  type RefreshModelsContext,
} from '@earendil-works/pi-ai/compat'
import { fetchYoucomModels, loadYoucomProvider, SNAPSHOT_MODELS, toYoucomModel, youcomProvider } from '../provider.ts'

const BASE_URL = 'https://api.you.com/v1'
const signal = () => new AbortController().signal

const stubFetch = (response: Response) => spyOn(globalThis, 'fetch').mockResolvedValue(response)

const modelsResponse = (ids: string[]) => Response.json({ data: ids.map((id) => ({ id })) })
const denied = (status: number) => Response.json({ error: { message: 'denied', code: String(status) } }, { status })

type Refresh = {
  context: RefreshModelsContext
  publications: ModelsPublication[]
}

const refreshContext = (options: {
  allowNetwork: boolean
  key?: string
  stored?: AnyModel[]
  baseUrl?: string
}): Refresh => {
  const publications: ModelsPublication[] = []
  return {
    publications,
    context: {
      credential: options.key ? { type: 'api_key', key: options.key } : undefined,
      stored: options.stored ? { models: options.stored, checkedAt: 0 } : undefined,
      publish: async (publication) => {
        publications.push(publication)
        publication.update?.()
        return true
      },
      allowNetwork: options.allowNetwork,
      signal: signal(),
      baseUrl: options.baseUrl,
    },
  }
}

const savedEnv = { key: process.env.YDC_API_KEY, offline: process.env.PI_OFFLINE }

beforeEach(() => {
  delete process.env.YDC_API_KEY
  delete process.env.PI_OFFLINE
})

afterEach(() => {
  ;(globalThis.fetch as unknown as { mockRestore?: () => void }).mockRestore?.()
  if (savedEnv.key === undefined) delete process.env.YDC_API_KEY
  else process.env.YDC_API_KEY = savedEnv.key
  if (savedEnv.offline === undefined) delete process.env.PI_OFFLINE
  else process.env.PI_OFFLINE = savedEnv.offline
})

describe('toYoucomModel', () => {
  test('takes name, limits, image input, and prices from the API', () => {
    const base = SNAPSHOT_MODELS.find((model) => model.id === 'kimi-k3')
    const model = toYoucomModel(
      {
        id: 'kimi-k3',
        display_name: 'Kimi K3',
        max_input_tokens: 900_000,
        max_tokens: 64_000,
        capabilities: { input: ['text', 'video'] },
        pricing: {
          input_per_mtok: '2.85',
          output_per_mtok: '14.25',
          cached_input_per_mtok: '0.285',
          cache_write_per_mtok: '2.85',
        },
      },
      base,
    )
    expect(model).toMatchObject({
      name: 'Kimi K3',
      contextWindow: 900_000,
      maxTokens: 64_000,
      input: ['text'],
      cost: { input: 2.85, output: 14.25, cacheRead: 0.285, cacheWrite: 2.85 },
      reasoning: base?.reasoning,
    })
  })

  test('keeps existing values when the API omits a field', () => {
    const base = SNAPSHOT_MODELS[0]
    if (!base) throw new Error('empty snapshot')
    expect(toYoucomModel({ id: base.id }, base)).toEqual(base)
  })

  test('starts unknown models from text-only defaults', () => {
    expect(toYoucomModel({ id: 'new-model', max_input_tokens: 200_000 })).toMatchObject({
      id: 'new-model',
      name: 'new-model',
      reasoning: false,
      input: ['text'],
      contextWindow: 200_000,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    })
  })
})

describe('fetchYoucomModels', () => {
  test("lists the key's models from the configured base URL", async () => {
    const fetch = stubFetch(modelsResponse(['kimi-k3', 'new-model']))

    const models = await fetchYoucomModels('ydc-test', 'https://proxy.example/v1/', signal())

    expect(fetch.mock.calls[0]?.[0]).toBe('https://proxy.example/v1/models')
    expect(models.map((model) => model.id)).toEqual(['kimi-k3', 'new-model'])
  })

  test.each([401, 402, 403])('returns no models when the key has no inference access (%i)', async (status) => {
    stubFetch(denied(status))

    expect(await fetchYoucomModels('ydc-test', BASE_URL, signal())).toEqual([])
  })

  test('returns the snapshot when the endpoint is missing (404)', async () => {
    stubFetch(new Response('', { status: 404 }))

    expect(await fetchYoucomModels('ydc-test', BASE_URL, signal())).toEqual(SNAPSHOT_MODELS)
  })

  test.each([
    ['listed models', modelsResponse(['kimi-k3', 'new-model'])],
    ['the 404 snapshot', new Response('', { status: 404 })],
  ])('points %s at the checked base URL, so a proxy override carries through', async (_label, response) => {
    stubFetch(response)

    const models = await fetchYoucomModels('ydc-test', 'https://proxy.example/v1', signal())

    expect(models.length).toBeGreaterThan(0)
    expect(new Set(models.map((model) => model.baseUrl))).toEqual(new Set(['https://proxy.example/v1']))
  })

  test('throws on other failures so pi reports the refresh error', async () => {
    stubFetch(new Response('', { status: 500 }))

    expect(fetchYoucomModels('ydc-test', BASE_URL, signal())).rejects.toThrow('500')
  })
})

describe('model list lifecycle', () => {
  test('lists no models before access is confirmed', () => {
    expect(youcomProvider().getModels()).toEqual([])
  })

  test('network refresh with access lists and saves the models', async () => {
    stubFetch(modelsResponse(['kimi-k3']))
    const provider = youcomProvider()
    const { context, publications } = refreshContext({ allowNetwork: true, key: 'ydc-test' })

    await provider.refreshModels?.(context)

    expect(provider.getModels().map((model) => model.id)).toEqual(['kimi-k3'])
    expect(publications.at(-1)?.persist).toMatchObject({ models: [{ id: 'kimi-k3' }] })
  })

  test('network refresh without access hides saved models and clears the saved list', async () => {
    stubFetch(denied(402))
    const provider = youcomProvider()
    const { context, publications } = refreshContext({
      allowNetwork: true,
      key: 'ydc-test',
      stored: SNAPSHOT_MODELS.slice(0, 2),
    })

    await provider.refreshModels?.(context)

    expect(provider.getModels()).toEqual([])
    expect(publications.at(-1)?.persist).toBeNull()
  })

  test('a saved list is restored on a cache-only start without a network call', async () => {
    const fetch = stubFetch(modelsResponse(['kimi-k3']))
    process.env.YDC_API_KEY = 'ydc-test'
    const provider = youcomProvider()
    const { context } = refreshContext({ allowNetwork: false, stored: SNAPSHOT_MODELS.slice(0, 2) })

    await provider.refreshModels?.(context)

    expect(provider.getModels().length).toBe(2)
    expect(fetch).not.toHaveBeenCalled()
  })

  test('saves the list seeded at load on the first cache-only refresh', async () => {
    const provider = youcomProvider({ initialModels: SNAPSHOT_MODELS.slice(0, 1) })
    const { context, publications } = refreshContext({ allowNetwork: false })

    await provider.refreshModels?.(context)

    expect(provider.getModels().length).toBe(1)
    expect(publications.at(-1)?.persist).toMatchObject({ models: [{ id: SNAPSHOT_MODELS[0]?.id }] })
  })
})

describe('loadYoucomProvider (first run)', () => {
  const writeAgentFile = (name: string, value: unknown) =>
    writeFileSync(join(process.env.PI_CODING_AGENT_DIR ?? '', name), JSON.stringify(value))

  beforeEach(() => {
    process.env.PI_CODING_AGENT_DIR = mkdtempSync(join(tmpdir(), 'yc-pi-'))
  })

  afterEach(() => {
    rmSync(process.env.PI_CODING_AGENT_DIR ?? '', { recursive: true, force: true })
    delete process.env.PI_CODING_AGENT_DIR
  })

  test('checks access before registration, so models exist when Pi picks the initial model', async () => {
    const fetch = stubFetch(modelsResponse(['kimi-k3']))
    process.env.YDC_API_KEY = 'ydc-env'

    const provider = await loadYoucomProvider()

    expect(provider.getModels().map((model) => model.id)).toEqual(['kimi-k3'])
    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.you.com/v1/models')
    expect(new Headers(fetch.mock.calls[0]?.[1]?.headers).get('authorization')).toBe('Bearer ydc-env')
  })

  test("uses a base URL override from Pi's models.json", async () => {
    const fetch = stubFetch(modelsResponse(['kimi-k3']))
    process.env.YDC_API_KEY = 'ydc-env'
    writeAgentFile('models.json', { providers: { youcom: { baseUrl: 'https://proxy.example/v1' } } })

    await loadYoucomProvider()

    expect(fetch.mock.calls[0]?.[0]).toBe('https://proxy.example/v1/models')
  })

  test('reads a models.json with comments, trailing commas, and a BOM, as Pi allows', async () => {
    const fetch = stubFetch(modelsResponse(['kimi-k3']))
    process.env.YDC_API_KEY = 'ydc-env'
    writeFileSync(
      join(process.env.PI_CODING_AGENT_DIR ?? '', 'models.json'),
      '\uFEFF{\n  // route through the corporate proxy\n  "providers": {\n    "youcom": { "baseUrl": "https://proxy.example/v1", },\n  },\n}\n',
    )

    await loadYoucomProvider()

    expect(fetch.mock.calls[0]?.[0]).toBe('https://proxy.example/v1/models')
  })

  test('expands ~ in PI_CODING_AGENT_DIR, as Pi does', async () => {
    const fetch = stubFetch(modelsResponse(['kimi-k3']))
    process.env.YDC_API_KEY = 'ydc-env'
    // A directory under the home directory, so it can be named with a leading ~.
    const dir = mkdtempSync(join(homedir(), '.yc-pi-test-'))
    try {
      writeFileSync(
        join(dir, 'models.json'),
        JSON.stringify({ providers: { youcom: { baseUrl: 'https://proxy.example/v1' } } }),
      )
      process.env.PI_CODING_AGENT_DIR = `~/${dir.slice(homedir().length + 1)}`

      await loadYoucomProvider()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }

    expect(fetch.mock.calls[0]?.[0]).toBe('https://proxy.example/v1/models')
  })

  test('lists nothing for a key without inference access', async () => {
    stubFetch(denied(402))
    process.env.YDC_API_KEY = 'ydc-env'

    expect((await loadYoucomProvider()).getModels()).toEqual([])
  })

  test('never fails startup on a network error', async () => {
    spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    process.env.YDC_API_KEY = 'ydc-env'

    expect((await loadYoucomProvider()).getModels()).toEqual([])
  })

  test.each([
    ['no key', {}, undefined],
    ['PI_OFFLINE', { YDC_API_KEY: 'ydc-env', PI_OFFLINE: '1' }, undefined],
    ['a saved list', { YDC_API_KEY: 'ydc-env' }, { youcom: { models: [{ id: 'kimi-k3' }], checkedAt: 0 } }],
  ])('makes no network call with %s', async (_label, env, store) => {
    const fetch = stubFetch(modelsResponse(['kimi-k3']))
    Object.assign(process.env, env)
    if (store) writeAgentFile('models-store.json', store)

    await loadYoucomProvider()

    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('attribution', () => {
  const captureHeaders = async (headers?: Record<string, string>) => {
    const fetch = stubFetch(Response.json({ error: { message: 'rejected' } }, { status: 401 }))
    const model = SNAPSHOT_MODELS[0]
    if (!model) throw new Error('empty snapshot')
    await youcomProvider()
      .streamSimple(model, normalizeContext({ messages: [{ role: 'user', content: 'test', timestamp: 0 }] }), {
        apiKey: 'ydc-test',
        headers,
        maxRetries: 0,
      })
      .result()
    return new Headers(fetch.mock.calls[0]?.[1]?.headers)
  }

  test('sends X-Client-Info on inference requests', async () => {
    expect((await captureHeaders()).get('x-client-info')).toBe('harness; client=pi')
  })

  test('keeps a caller-provided X-Client-Info header', async () => {
    expect((await captureHeaders({ 'x-client-info': 'harness; client=custom' })).get('x-client-info')).toBe(
      'harness; client=custom',
    )
  })
})
