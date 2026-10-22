// Pi resolves only a fixed set of pi-ai specifiers for extensions (root, /compat, /models,
// /oauth, /providers/all). /compat re-exports the lazy API wrappers; /api/* does not resolve.
import {
  createProvider,
  envApiKeyAuth,
  type Model,
  openAICompletionsApi,
  type Provider,
  type ProviderStreams,
  type RefreshModelsContext,
  type StreamOptions,
} from '@earendil-works/pi-ai/compat'
import snapshot from './models.json' with { type: 'json' }

const BASE_URL = 'https://api.you.com/v1'
const MODELS_TIMEOUT_MS = 15_000
const CLIENT_INFO_HEADER = 'X-Client-Info'
// You.com attributes API traffic by the leading source token of this header.
const CLIENT_INFO = 'harness; client=pi'

type YoucomModel = Model<'openai-completions'>

/** One entry of `GET /v1/models`. */
export type YoucomApiModel = {
  id: string
  display_name?: string
  max_input_tokens?: number | null
  max_tokens?: number | null
  capabilities?: { input?: string[] } | null
  pricing?: {
    input_per_mtok?: string
    output_per_mtok?: string
    cached_input_per_mtok?: string
    cache_write_per_mtok?: string
  } | null
}

/**
 * Snapshot of `GET /v1/models` at release time. Reasoning, thinking levels, and request
 * compatibility are not in the API response, so they come from here.
 */
export const SNAPSHOT_MODELS: YoucomModel[] = (snapshot as Omit<YoucomModel, 'api' | 'provider' | 'baseUrl'>[]).map(
  (model) => ({ ...model, api: 'openai-completions', provider: 'youcom', baseUrl: BASE_URL }),
)

const perMillion = (value: string | undefined) => (value === undefined ? 0 : Number(value) || 0)

/**
 * Applies one `/v1/models` entry to a model: display name, limits, image input, and prices.
 * A missing field keeps the existing value. Unknown ids start from text-only defaults.
 */
export const toYoucomModel = (entry: YoucomApiModel, base?: YoucomModel): YoucomModel => {
  const input = entry.capabilities?.input
  return {
    ...(base ?? {
      id: entry.id,
      name: entry.id,
      api: 'openai-completions',
      provider: 'youcom',
      baseUrl: BASE_URL,
      reasoning: false,
      input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128_000,
      maxTokens: 16_384,
    }),
    name: entry.display_name || base?.name || entry.id,
    contextWindow: entry.max_input_tokens || base?.contextWindow || 128_000,
    maxTokens: entry.max_tokens || base?.maxTokens || 16_384,
    ...(input ? { input: input.includes('image') ? ['text', 'image'] : ['text'] } : {}),
    ...(entry.pricing
      ? {
          cost: {
            input: perMillion(entry.pricing.input_per_mtok),
            output: perMillion(entry.pricing.output_per_mtok),
            cacheRead: perMillion(entry.pricing.cached_input_per_mtok),
            cacheWrite: perMillion(entry.pricing.cache_write_per_mtok),
          },
        }
      : {}),
  }
}

/**
 * Lists the models the key may use, with their limits and prices from `GET /v1/models`.
 * A rejected key (401/403) or missing endpoint (404), for example a proxy configured in
 * models.json, keeps the snapshot.
 */
export const fetchYoucomModels = async (context: RefreshModelsContext): Promise<YoucomModel[]> => {
  const key = context.credential?.type === 'oauth' ? context.credential.access : context.credential?.key
  if (!key) return SNAPSHOT_MODELS
  const response = await fetch(`${(context.baseUrl ?? BASE_URL).replace(/\/+$/, '')}/models`, {
    headers: { accept: 'application/json', authorization: `Bearer ${key}` },
    signal: AbortSignal.any([context.signal, AbortSignal.timeout(MODELS_TIMEOUT_MS)]),
  })
  if (response.status === 401 || response.status === 403 || response.status === 404) return SNAPSHOT_MODELS
  if (!response.ok) throw new Error(`You.com model list request failed: ${response.status}`)
  const body: unknown = await response.json()
  if (typeof body !== 'object' || body === null || !('data' in body) || !Array.isArray(body.data)) {
    throw new Error('Invalid You.com model list response')
  }
  const known = new Map(SNAPSHOT_MODELS.map((model) => [model.id, model]))
  return (body.data as unknown[])
    .filter(
      (entry): entry is YoucomApiModel =>
        typeof entry === 'object' && entry !== null && 'id' in entry && typeof entry.id === 'string',
    )
    .map((entry) => toYoucomModel(entry, known.get(entry.id)))
}

const hasHeader = (headers: StreamOptions['headers'], name: string) =>
  Object.keys(headers ?? {}).some((key) => key.toLowerCase() === name.toLowerCase())

const withClientInfo = <T extends StreamOptions>(options: T | undefined): T | StreamOptions =>
  options && hasHeader(options.headers, CLIENT_INFO_HEADER)
    ? options
    : { ...options, headers: { ...options?.headers, [CLIENT_INFO_HEADER]: CLIENT_INFO } }

/** Adds the `X-Client-Info` attribution header unless the caller already set one. */
const withYoucomClientInfo = (streams: ProviderStreams): ProviderStreams => ({
  ...streams,
  stream: (model, context, options) => streams.stream(model, context, withClientInfo(options)),
  streamSimple: (model, context, options) => streams.streamSimple(model, context, withClientInfo(options)),
})

/**
 * The You.com inference provider: OpenAI Chat Completions at `https://api.you.com/v1`,
 * authenticated with `YDC_API_KEY`.
 *
 * @public
 */
export const youcomProvider = (): Provider<'openai-completions'> =>
  createProvider({
    id: 'youcom',
    name: 'You.com',
    baseUrl: BASE_URL,
    auth: { apiKey: envApiKeyAuth('You.com API key', ['YDC_API_KEY']) },
    models: SNAPSHOT_MODELS,
    fetchModels: fetchYoucomModels,
    api: withYoucomClientInfo(openAICompletionsApi()),
  })
