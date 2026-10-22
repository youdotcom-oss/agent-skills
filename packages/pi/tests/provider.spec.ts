import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import { normalizeContext, type RefreshModelsContext } from '@earendil-works/pi-ai/compat'
import { fetchYoucomModels, SNAPSHOT_MODELS, toYoucomModel, youcomProvider } from '../provider.ts'

const refreshContext = (baseUrl?: string): RefreshModelsContext => ({
  credential: { type: 'api_key', key: 'ydc-test' },
  publish: async () => true,
  allowNetwork: true,
  signal: new AbortController().signal,
  baseUrl,
})

const stubFetch = (response: Response) => spyOn(globalThis, 'fetch').mockResolvedValue(response)

afterEach(() => {
  ;(globalThis.fetch as unknown as { mockRestore?: () => void }).mockRestore?.()
})

describe('snapshot catalog', () => {
  test('lists the release-time models on the You.com endpoint', () => {
    const provider = youcomProvider()
    expect(provider.id).toBe('youcom')
    expect(provider.getModels().length).toBe(SNAPSHOT_MODELS.length)
    for (const model of provider.getModels()) {
      expect(model).toMatchObject({ provider: 'youcom', api: 'openai-completions', baseUrl: 'https://api.you.com/v1' })
    }
  })
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
  test("lists only the key's models from /v1/models", async () => {
    const fetch = stubFetch(
      Response.json({ data: [{ id: 'kimi-k3', max_input_tokens: 1_000_000 }, { id: 'new-model' }] }),
    )

    const models = await fetchYoucomModels(refreshContext())

    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.you.com/v1/models')
    expect(models.map((model) => model.id)).toEqual(['kimi-k3', 'new-model'])
  })

  test('uses the configured base URL', async () => {
    const fetch = stubFetch(Response.json({ data: [] }))

    await fetchYoucomModels(refreshContext('https://proxy.example/v1/'))

    expect(fetch.mock.calls[0]?.[0]).toBe('https://proxy.example/v1/models')
  })

  test.each([401, 403, 404])(
    'keeps the snapshot when the endpoint rejects the key or is missing (%i)',
    async (status) => {
      stubFetch(new Response('', { status }))

      expect(await fetchYoucomModels(refreshContext())).toBe(SNAPSHOT_MODELS)
    },
  )

  test('throws on other failures so pi reports the refresh error', async () => {
    stubFetch(new Response('', { status: 500 }))

    expect(fetchYoucomModels(refreshContext())).rejects.toThrow('500')
  })
})

describe('attribution', () => {
  const captureHeaders = async (headers?: Record<string, string>) => {
    const fetch = stubFetch(Response.json({ error: { message: 'rejected' } }, { status: 401 }))
    const provider = youcomProvider()
    const model = provider.getModels()[0]
    if (!model) throw new Error('no models')
    await provider
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
