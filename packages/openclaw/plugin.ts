/**
 * You.com plugin for OpenClaw.
 *
 * Registers three things:
 *
 * - Skills and MCP setup metadata through the plugin manifest
 *   (`openclaw.plugin.json`), which is where the You.com MCP servers and
 *   `YDC_API_KEY` setup live.
 * - A You.com **web search provider** (`youcom`), so OpenClaw's own
 *   `web_search` tool answers from You.com instead of a second search
 *   surface. This mirrors the DeepSeek Harness package, which also backs the
 *   host's native search tool with a provider rather than removing it.
 *
 * Selecting the provider is a user config choice:
 * `tools.web.search.provider: "youcom"`. Without that, the provider is
 * registered but not used, and the bundled MCP tools still work.
 *
 * @module @youdotcom-oss/openclaw
 */

import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry'
import {
  DEFAULT_SEARCH_COUNT,
  MAX_SEARCH_COUNT,
  readPositiveIntegerParam,
  readStringParam,
  resolveSearchTimeoutSeconds,
  resolveSiteName,
  resolveWebSearchProviderCredential,
  throwWebSearchApiError,
  withTrustedWebSearchEndpoint,
  wrapWebContent,
} from 'openclaw/plugin-sdk/provider-web-search'
import {
  createWebSearchProviderContractFields,
  type WebSearchProviderPlugin,
} from 'openclaw/plugin-sdk/provider-web-search-contract'

/** Provider id registered with OpenClaw; matches the dsh package's `youcom`. */
export const YOUCOM_WEB_SEARCH_PROVIDER_ID = 'youcom'

/** You.com Search REST endpoint (same contract the dsh package's provider POSTs to). */
const SEARCH_ENDPOINT = 'https://ydc-index.io/v1/search'

/** Config path OpenClaw reports for this provider's credential in doctor/migration flows. */
const CREDENTIAL_PATH = 'plugins.entries.you.config.webSearch.apiKey'

/** `YDC_API_KEY` is the credential source; OpenClaw's own env fallback reads it. */
const ENV_VARS = ['YDC_API_KEY']

const DOCS_URL = 'https://docs.you.com/api-reference/search/v1-search'

const MISSING_KEY_DOCS = 'https://docs.you.com/api-reference/authentication'

/**
 * You.com accepts these `freshness` values (`day`, `week`, `month`, `year`, or
 * an inclusive `YYYY-MM-DDtoYYYY-MM-DD` range). Validated here because
 * OpenClaw's shared `normalizeFreshness` rewrites values into Brave/Perplexity
 * shorthand, which You.com rejects.
 */
const FRESHNESS_PATTERN = /^(?:day|week|month|year|\d{4}-\d{2}-\d{2}to\d{4}-\d{2}-\d{2})$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readString = (value: unknown): string | undefined => (typeof value === 'string' && value ? value : undefined)

/** One result the host renders; `description` is the snippet-based shape used by web-mode providers. */
export interface YouComSearchResult {
  title: string
  url: string
  description?: string
  siteName?: string
  published?: string
}

/**
 * Read a snippet string from a You.com result section.
 *
 * @remarks
 * The API returns `contents.highlights` (highlights mode) or `contents.snippets`
 * (default snippets mode), and news entries carry their own fields. All three
 * shapes are accepted so one mapper covers web and news sections.
 */
const readSnippet = (contents: unknown): string | undefined => {
  if (typeof contents === 'string') return readString(contents)
  if (!isRecord(contents)) return undefined

  for (const key of ['snippet', 'description', 'summary'] as const) {
    const value = readString(contents[key])
    if (value) return value
  }
  for (const key of ['highlights', 'snippets'] as const) {
    const value = contents[key]
    if (Array.isArray(value)) {
      const joined = value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0).join(' ')
      if (joined) return joined
    }
  }
  return undefined
}

/**
 * Build the You.com Search request body from validated tool arguments.
 *
 * @param args - `{ query, count, freshness }` after validation.
 * @returns JSON body for `POST https://ydc-index.io/v1/search`.
 */
export const buildYouComSearchRequest = (args: {
  query: string
  count: number
  freshness?: string
}): Record<string, unknown> => ({
  query: args.query,
  count: args.count,
  ...(args.freshness ? { freshness: args.freshness } : {}),
})

/**
 * Map a You.com Search response into the host's result shape.
 *
 * @remarks
 * Licensed knowledge entries are intentionally not mapped: they carry data
 * attribution rather than page URLs, and mapping them into URL-shaped results
 * would invent citations. The MCP `you-search` tool remains the path for
 * licensed knowledge. Titles and snippets are passed through `wrapWebContent`
 * so the host's untrusted-content wrapping applies.
 *
 * @param data - Parsed response body (untrusted).
 * @returns Web and news results; `[]` when the response has no usable sections.
 */
export const mapYouComSearchResults = (data: unknown): YouComSearchResult[] => {
  if (!isRecord(data) || !isRecord(data.results)) return []

  const results: YouComSearchResult[] = []
  for (const section of ['web', 'news'] as const) {
    const entries = data.results[section]
    if (!Array.isArray(entries)) continue

    for (const entry of entries) {
      if (!isRecord(entry)) continue
      const url = readString(entry.url)
      if (!url) continue

      const title = readString(entry.title)
      const snippet = readSnippet(entry.contents)
      const published = readString(entry.page_age) ?? readString(entry.published)

      results.push({
        title: title ? wrapWebContent(title, 'web_search') : url,
        url,
        ...(snippet ? { description: wrapWebContent(snippet, 'web_search') } : {}),
        ...(resolveSiteName(url) ? { siteName: resolveSiteName(url) } : {}),
        ...(published ? { published } : {}),
      })
    }
  }
  return results
}

/**
 * Create the You.com search tool definition OpenClaw exposes as `web_search`.
 *
 * @param params.apiKey - Resolved `YDC_API_KEY`, or `undefined` when unset.
 * @param params.searchConfig - The provider's search config (timeout, etc.).
 * @returns Tool definition whose `execute` returns the host's search payload.
 */
export const createYouComSearchTool = (params: {
  apiKey: string | undefined
  searchConfig: Record<string, unknown> | undefined
}) => {
  const { apiKey, searchConfig } = params

  return {
    description:
      'Search the web using You.com. Returns ranked web and news results with titles, URLs, and snippets for research and citation.',
    parameters: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string' as const,
          description: 'Search query string.',
        },
        count: {
          type: 'integer' as const,
          description: `Number of results to return (1-${MAX_SEARCH_COUNT}).`,
          minimum: 1,
          maximum: MAX_SEARCH_COUNT,
        },
        freshness: {
          type: 'string' as const,
          description:
            'Limit results to a recent window: day, week, month, year, or YYYY-MM-DDtoYYYY-MM-DD. Omit for evergreen facts. The broader window wins when the query text also specifies a timeframe.',
        },
      },
      required: ['query'],
    },
    execute: async (args: Record<string, unknown>, context?: { signal?: AbortSignal }) => {
      if (!apiKey) {
        return {
          error: 'missing_api_key',
          message:
            'YDC_API_KEY is not configured, so You.com search is unavailable. Set it, or select another web search provider.',
          docs: MISSING_KEY_DOCS,
        }
      }

      const query = readStringParam(args, 'query', { required: true })
      // The host's reader throws for a non-integer or an out-of-range value, so this
      // is only the default for an omitted count.
      const count =
        readPositiveIntegerParam(args, 'count', {
          max: MAX_SEARCH_COUNT,
          message: `count must be an integer from 1 to ${MAX_SEARCH_COUNT}.`,
        }) ?? DEFAULT_SEARCH_COUNT

      const rawFreshness = readStringParam(args, 'freshness')
      const freshness = rawFreshness?.trim().toLowerCase()
      if (freshness && !FRESHNESS_PATTERN.test(freshness)) {
        return {
          error: 'invalid_freshness',
          message: 'freshness must be day, week, month, year, or a YYYY-MM-DDtoYYYY-MM-DD range.',
          docs: DOCS_URL,
        }
      }

      const startedAt = Date.now()
      const body = buildYouComSearchRequest({ query, count, ...(freshness ? { freshness } : {}) })

      const data = await withTrustedWebSearchEndpoint(
        {
          url: SEARCH_ENDPOINT,
          timeoutSeconds: resolveSearchTimeoutSeconds(searchConfig),
          ...(context?.signal ? { signal: context.signal } : {}),
          init: {
            method: 'POST',
            headers: {
              'X-API-Key': apiKey,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          },
        },
        async (response) => {
          if (!response.ok) await throwWebSearchApiError(response, 'You.com')
          return await response.json()
        },
      )

      const results = mapYouComSearchResults(data)
      return {
        query,
        provider: YOUCOM_WEB_SEARCH_PROVIDER_ID,
        count: results.length,
        tookMs: Date.now() - startedAt,
        externalContent: {
          untrusted: true,
          source: 'web_search',
          provider: YOUCOM_WEB_SEARCH_PROVIDER_ID,
          wrapped: true,
        },
        results,
      }
    },
  }
}

/**
 * Build the You.com web search provider descriptor.
 *
 * @remarks
 * Credential hooks come from the SDK's contract-fields helper so the host's
 * setup, doctor, and migration flows read the same `webSearch.apiKey` location
 * as every other provider. `YDC_API_KEY` stays the fallback.
 *
 * @returns Provider descriptor for `api.registerWebSearchProvider`.
 */
export const createYouComWebSearchProvider = (): WebSearchProviderPlugin => {
  const contractFields = createWebSearchProviderContractFields({
    credentialPath: CREDENTIAL_PATH,
    searchCredential: { type: 'top-level' },
    configuredCredential: { pluginId: 'you' },
  })

  return {
    id: YOUCOM_WEB_SEARCH_PROVIDER_ID,
    label: 'You.com',
    hint: 'Requires YDC_API_KEY · ranked web and news results with snippets',
    requiresCredential: true,
    credentialLabel: 'You.com API key',
    envVars: ENV_VARS,
    placeholder: 'ydc-...',
    signupUrl: 'https://you.com/platform/api-keys',
    docsUrl: DOCS_URL,
    credentialPath: CREDENTIAL_PATH,
    ...contractFields,
    createTool: (ctx) =>
      createYouComSearchTool({
        apiKey: resolveWebSearchProviderCredential({
          credentialValue: contractFields.getCredentialValue(ctx.searchConfig),
          path: CREDENTIAL_PATH,
          envVars: ENV_VARS,
        }),
        searchConfig: ctx.searchConfig,
      }),
  }
}

export default definePluginEntry({
  id: 'you',
  name: 'You.com',
  description: 'You.com skill pack with MCP setup metadata and a You.com-backed web search provider.',
  register: (api) => {
    api.registerWebSearchProvider(createYouComWebSearchProvider())
  },
})
