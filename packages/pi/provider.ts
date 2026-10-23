// Pi resolves only a fixed set of pi-ai specifiers for extensions (root, /compat, /models,
// /oauth, /providers/all). /compat re-exports the lazy API wrappers; /api/* does not resolve.

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
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
const API_KEY_ENV = 'YDC_API_KEY'
const MODELS_TIMEOUT_MS = 15_000
// First run only: the check blocks startup so a key with inference access has models before
// Pi picks the initial model. Short, because a key without access must not slow startup.
// MINIMAL: a slower gateway gets no models on the first start until the background refresh
// lands; raise the cap or show a startup notice if first-start reports show up.
const FIRST_RUN_TIMEOUT_MS = 5_000
const CLIENT_INFO_HEADER = 'X-Client-Info'
// You.com attributes API traffic by the leading source token of this header.
const CLIENT_INFO = 'harness; client=pi'

type YoucomModel = Model<'openai-completions'>

/**
 * One entry of `GET /v1/models`.
 *
 * @public
 */
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
 * Snapshot of `GET /v1/models` at release time. Never listed on its own: it supplies reasoning,
 * thinking levels, and request compatibility, which the API response does not carry, and serves
 * as the list when the endpoint is missing (404).
 *
 * MINIMAL: hand-maintained; new API models get text-only defaults until it is updated. Add a
 * sync script (needs a key, since `/v1/models` is authenticated) if model churn makes this stale.
 *
 * @public
 */
export const SNAPSHOT_MODELS: YoucomModel[] = (snapshot as Omit<YoucomModel, 'api' | 'provider' | 'baseUrl'>[]).map(
  (model) => ({ ...model, api: 'openai-completions', provider: 'youcom', baseUrl: BASE_URL }),
)

const perMillion = (value: string | undefined) => (value === undefined ? 0 : Number(value) || 0)

/**
 * Applies one `/v1/models` entry to a model: display name, limits, image input, and prices.
 * A missing field keeps the existing value. Unknown ids start from text-only defaults.
 *
 * @param entry - one entry of the `/v1/models` response.
 * @param base - the snapshot model with the same id, if any; supplies the fields the API omits.
 * @returns the model to list.
 *
 * @public
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
 * The models a key may use, with limits and prices from `GET /v1/models`.
 *
 * - A key without inference access (401 invalid, 402 no purchased credit, 403 not enabled)
 *   gets an empty list, so Pi neither lists nor auto-selects You.com models for it.
 * - A missing endpoint (404), for example a proxy configured in models.json, gets the snapshot.
 * - Anything else throws, so Pi reports the refresh error and keeps the last saved list.
 *
 * Every returned model carries `baseUrl`, so listed and saved models point at the endpoint that
 * was checked, including a proxy configured in models.json.
 *
 * @param key - the You.com API key, sent as a bearer token.
 * @param baseUrl - the API base URL; `/models` is appended.
 * @param signal - aborts the request.
 * @param timeoutMs - request timeout; defaults to 15 seconds.
 * @returns the models the key may use; empty when the key has no inference access.
 *
 * @public
 */
export const fetchYoucomModels = async (
  key: string,
  baseUrl: string,
  signal: AbortSignal,
  timeoutMs = MODELS_TIMEOUT_MS,
): Promise<YoucomModel[]> => {
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/models`, {
    headers: { accept: 'application/json', authorization: `Bearer ${key}` },
    signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
  })
  const atBaseUrl = (model: YoucomModel): YoucomModel => ({ ...model, baseUrl })
  if (response.status === 401 || response.status === 402 || response.status === 403) return []
  if (response.status === 404) return SNAPSHOT_MODELS.map(atBaseUrl)
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
    .map((entry) => atBaseUrl(toYoucomModel(entry, known.get(entry.id))))
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

const credentialKey = (context: RefreshModelsContext) =>
  context.credential?.type === 'oauth' ? context.credential.access : context.credential?.key

// Pi's agent directory, where it keeps models.json and models-store.json. Expands `~` the way
// Pi does for PI_CODING_AGENT_DIR.
const agentDir = () => {
  const dir = process.env.PI_CODING_AGENT_DIR
  if (!dir) return join(homedir(), '.pi', 'agent')
  if (dir === '~') return homedir()
  return dir.startsWith('~/') ? join(homedir(), dir.slice(2)) : dir
}

// Pi's models.json allows `//` comments, trailing commas, and a BOM; strip them as Pi does,
// leaving string contents (such as URLs) untouched.
const parseJsonc = (text: string): unknown =>
  JSON.parse(
    text
      .replace(/^\uFEFF/, '')
      .replace(/"(?:\\.|[^"\\])*"|\/\/[^\n]*/g, (match) => (match[0] === '"' ? match : ''))
      .replace(/"(?:\\.|[^"\\])*"|,(\s*[}\]])/g, (match, tail) => tail ?? (match[0] === '"' ? match : '')),
  )

const readJson = (file: string): unknown => {
  try {
    return parseJsonc(readFileSync(join(agentDir(), file), 'utf8'))
  } catch {
    return undefined
  }
}

/** Whether Pi's model store already holds a confirmed You.com list. */
const hasSavedModels = () =>
  ((readJson('models-store.json') as { youcom?: { models?: unknown[] } } | undefined)?.youcom?.models?.length ?? 0) > 0

/** The base URL, honoring a `providers.youcom.baseUrl` override in Pi's models.json. */
const configuredBaseUrl = () => {
  const override = (readJson('models.json') as { providers?: { youcom?: { baseUrl?: unknown } } } | undefined)
    ?.providers?.youcom?.baseUrl
  return typeof override === 'string' && override ? override : BASE_URL
}

/**
 * The You.com inference provider: OpenAI Chat Completions at `https://api.you.com/v1`,
 * authenticated with `YDC_API_KEY`.
 *
 * Lists only models the key has been confirmed to use. Pi refreshes catalogs at interactive
 * startup and when `/model` opens, so a key that gains inference access picks up models on the
 * next start. The confirmed list is saved for offline and print-mode starts.
 *
 * @param options - `initialModels` seeds the list before the first refresh; see
 *   {@link loadYoucomProvider}.
 * @returns the provider to pass to `pi.registerProvider()`.
 *
 * @public
 */
export const youcomProvider = (options: { initialModels?: YoucomModel[] } = {}): Provider<'openai-completions'> => {
  let models: YoucomModel[] = options.initialModels ?? []
  const streams = withYoucomClientInfo(openAICompletionsApi())

  const publish = async (context: RefreshModelsContext, fetched: YoucomModel[]) => {
    // An empty list is not saved, so the next start checks again instead of restoring "no access".
    await context.publish({
      ...(fetched.length > 0 ? { persist: { models: fetched, checkedAt: Date.now() } } : { persist: null }),
      update: () => {
        models = fetched
      },
    })
  }

  return {
    id: 'youcom',
    name: 'You.com',
    baseUrl: BASE_URL,
    auth: { apiKey: envApiKeyAuth('You.com API key', [API_KEY_ENV]) },
    getModels: () => models,
    refreshModels: async (context) => {
      const stored = context.stored?.models.filter((model): model is YoucomModel => model.provider === 'youcom')
      if (stored?.length) {
        const restored = await context.publish({
          update: () => {
            models = stored
          },
        })
        if (!restored) return
      }
      const baseUrl = context.baseUrl ?? BASE_URL
      if (context.allowNetwork) {
        const key = credentialKey(context)
        if (!key || context.signal.aborted) return
        await publish(context, await fetchYoucomModels(key, baseUrl, context.signal))
        return
      }
      // First run: save the list seeded at load, so later starts restore it without a check.
      if (!stored?.length && models.length > 0) await publish(context, models)
    },
    stream: (model, context, options) => streams.stream(model, context, options),
    streamSimple: (model, context, options) => streams.streamSimple(model, context, options),
  }
}

/**
 * Builds the provider for registration. On the first run (a key, no saved list, not offline)
 * it checks access before returning, so a key with inference access has models before Pi picks
 * the initial model. Pi awaits async extension factories, and its startup refreshes overlap
 * and supersede each other, so a check started from a refresh can lose that race.
 *
 * @returns the provider to pass to `pi.registerProvider()`.
 *
 * @public
 */
export const loadYoucomProvider = async (): Promise<Provider<'openai-completions'>> => {
  const key = process.env[API_KEY_ENV]
  if (!key || process.env.PI_OFFLINE || hasSavedModels()) return youcomProvider()
  // Never block or fail startup: on a network error the background network refresh retries.
  const initialModels = await fetchYoucomModels(
    key,
    configuredBaseUrl(),
    new AbortController().signal,
    FIRST_RUN_TIMEOUT_MS,
  ).catch(() => undefined)
  return youcomProvider({ initialModels })
}
