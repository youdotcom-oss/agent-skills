/**
 * You.com-backed `WebSearchProvider` (`POST /v1/search`). Maps `results.web[]`
 * and `results.news[]` to citeable sources: the first non-blank snippet (or
 * `description` as a fallback) becomes `snippet`, and the wire's `page_age`
 * becomes `publishedAt`. You.com's search endpoint returns no generated
 * answer, so `content` is omitted rather than invented.
 *
 * The endpoint accepts `POST` with a JSON body.
 * @module @youdotcom-oss/dsh-plugin/web/search-provider
 */

import type { WebSearchProvider, WebSearchRequest, WebSearchResult, WebSearchSource } from '@deepseek-ai/dsh-web'
import { WebError } from '@deepseek-ai/dsh-web'
import { buildClientInfoHeader } from './attribution.ts'
import { extractYouComErrorMessage } from './error-message.ts'
import { fetchWithOneRetry, isAbortError, isValidBaseUrl, resolveApiUrl } from './shared.ts'
import type { YouComKnowledgeEntry, YouComSearchResponse, YouComSearchResultEntry } from './types.ts'

/** Stable id this provider registers under. */
export const YOUCOM_PROVIDER_ID = 'youcom'

/** Default You.com API endpoint base; `/v1/search` is appended. */
export const YOUCOM_DEFAULT_BASE_URL = 'https://ydc-index.io'

/**
 * You.com's public, unauthenticated MCP profile, which exposes only `you-search`
 * (and `you-discover`); it does not expose `you-contents`, so there is no keyless fetch
 * equivalent. Used as the search fallback when no `apiKey` is configured. Also imported by
 * `src/index.ts` to mount the same profile as an MCP server, so the URL lives here as the
 * single source of truth rather than being duplicated.
 */
export const YOUCOM_FREE_MCP_URL = 'https://api.you.com/mcp?profile=free'

/** The tool name this provider calls on the free MCP profile. */
const FREE_SEARCH_TOOL_NAME = 'you-search'

/** Fixed JSON-RPC request id: each call is one independent HTTP request, never multiplexed. */
const MCP_REQUEST_ID = 1

/** Resolved provider options (the plugin's `apply` supplies env-var and constant defaults). */
export interface YouComSearchProviderOptions {
  /** You.com API key. Empty/absent falls back to the keyless MCP profile below. */
  apiKey: string
  /** Endpoint base; `/v1/search` is appended. Only used when `apiKey` is set. */
  baseURL: string
  /** Keyless MCP endpoint used when `apiKey` is empty. */
  freeSearchURL: string
  /** This package's version, sent in the `X-Client-Info` attribution header. */
  pluginVersion: string
  /** Default result count when a request carries no `maxResults`. */
  numResults?: number
  /** Whether `results.news[]` is merged into `sources[]` alongside `results.web[]`. */
  includeNews: boolean
  /** Request licensed knowledge results alongside web and news (`results.knowledge[]`). */
  knowledge?: 'core'
}

/** One MCP tool-result content block — a search or tool-error message arrives as its `text`. */
interface McpContentBlock {
  readonly type: string
  readonly text?: string
}

/** Minimal shape of one JSON-RPC 2.0 message read off the MCP response (request or notification). */
interface McpJsonRpcMessage {
  readonly id?: number | string
  readonly error?: { readonly code: number; readonly message: string }
  readonly result?: {
    readonly isError?: boolean
    readonly content?: readonly McpContentBlock[]
    readonly structuredContent?: unknown
  }
}

/**
 * Split an SSE body (`event: message\ndata: {...}\n\n`, possibly several frames — a tool call
 * can emit a `notifications/message` log frame before its `result` frame) into parsed JSON
 * blocks. An unparseable block is skipped rather than failing the whole response.
 */
function parseSseDataBlocks(body: string): unknown[] {
  const blocks: unknown[] = []
  for (const frame of body.split(/\r?\n\r?\n/)) {
    const dataLines = frame
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
    if (dataLines.length === 0) continue
    try {
      blocks.push(JSON.parse(dataLines.join('\n')))
    } catch {
      // Skip: an unparseable frame must not fail the whole response.
    }
  }
  return blocks
}

/**
 * Find the JSON-RPC message matching `id` in an MCP response body, whether the server framed
 * it as SSE (`text/event-stream`) or sent a bare JSON object.
 * Compares `id` as a string: JSON-RPC 2.0 permits either a number or a string id, and nothing
 * here should assume a gateway echoes the request's numeric id back as a number.
 */
export function extractJsonRpcMessage(body: string, id: number): McpJsonRpcMessage | undefined {
  const sseBlocks = parseSseDataBlocks(body)
  let candidates = sseBlocks
  if (candidates.length === 0) {
    try {
      candidates = [JSON.parse(body)]
    } catch {
      candidates = []
    }
  }
  return candidates.find(
    (candidate): candidate is McpJsonRpcMessage =>
      typeof candidate === 'object' && candidate !== null && String((candidate as { id?: unknown }).id) === String(id),
  )
}

/** The first `text` content block's text, if any — both a success payload and a tool error report their message this way. */
function findTextBlock(content: readonly McpContentBlock[] | undefined): string | undefined {
  return content?.find((block) => block.type === 'text')?.text
}

/**
 * Pull the tool's search payload out of a successful `tools/call` result: prefer
 * `structuredContent` (already-parsed JSON), falling back
 * to parsing the `content[0].text` block — the same envelope shape `/v1/search` returns.
 */
function extractSearchResponse(result: McpJsonRpcMessage['result']): YouComSearchResponse | undefined {
  if (result === undefined) return undefined
  if (typeof result.structuredContent === 'object' && result.structuredContent !== null) {
    return result.structuredContent as YouComSearchResponse
  }
  const text = findTextBlock(result.content)
  if (text === undefined) return undefined
  try {
    return JSON.parse(text) as YouComSearchResponse
  } catch {
    return undefined
  }
}

/**
 * Map one You.com result entry to a normalized source, or `undefined` when it
 * carries no usable URL — the response body is cast rather than validated, so a
 * URL-less entry is still reachable at runtime despite the type saying otherwise.
 *
 * @param entry - one entry of `results.web[]` or `results.news[]`.
 * @returns the normalized source, or `undefined` when the entry has no URL.
 */
export function mapYouComResult(entry: YouComSearchResultEntry): WebSearchSource | undefined {
  if (entry.url == null || entry.url.length === 0) return undefined
  const snippet = entry.snippets?.find((candidate) => candidate.trim().length > 0) ?? entry.description
  return {
    url: entry.url,
    ...(entry.title != null && entry.title.length > 0 ? { title: entry.title } : {}),
    ...(snippet != null && snippet.length > 0 ? { snippet } : {}),
    ...(entry.page_age != null && entry.page_age.length > 0 ? { publishedAt: entry.page_age } : {}),
  }
}

/**
 * Assemble `content` from `results.knowledge[]`: the answer prose of each
 * `type: "answer"` entry, deduplicated by exact string and joined with a space.
 * You.com can return several `answer` entries carrying the same prose but
 * different attribution credits, so duplication is removed rather than repeated.
 * Entries of an unrecognized `type` are skipped (the docs say to ignore rather
 * than fail on a future kind), and a blank description is skipped.
 */
function mapKnowledgeContent(knowledge: readonly YouComKnowledgeEntry[] | undefined): string | undefined {
  if (knowledge === undefined || knowledge.length === 0) return undefined
  const parts: string[] = []
  for (const entry of knowledge) {
    if (entry.type !== 'answer') continue
    const description = entry.description
    if (description === undefined || description.trim().length === 0) continue
    if (!parts.includes(description)) parts.push(description)
  }
  return parts.length === 0 ? undefined : parts.join(' ')
}

/**
 * Map a You.com search response envelope to a normalized search result.
 *
 * @param response - the parsed `POST /v1/search` response body.
 * @param includeNews - whether `results.news[]` is merged in after `results.web[]`.
 * @returns the normalized result; URL-less entries are dropped ({@link mapYouComResult}).
 */
export function mapYouComSearchResponse(response: YouComSearchResponse, includeNews: boolean): WebSearchResult {
  const entries = [...(response.results?.web ?? []), ...(includeNews ? (response.results?.news ?? []) : [])]
  const sources = entries.map(mapYouComResult).filter((source): source is WebSearchSource => source !== undefined)
  const content = mapKnowledgeContent(response.results?.knowledge)
  // `content` carries the licensed answer text when knowledge results are present; otherwise it
  // is omitted (You.com's search endpoint returns no generated answer). The web service owns the
  // final `maxResults` truncation, so this provider reports `truncated: false`.
  return { sources, ...(content === undefined ? {} : { content }), truncated: false }
}

/** The You.com-backed search provider. */
export class YouComSearchProvider implements WebSearchProvider {
  readonly id = YOUCOM_PROVIDER_ID

  constructor(private readonly options: YouComSearchProviderOptions) {}

  available(): boolean {
    // Only the endpoint the active path actually calls needs to be a valid URL: baseURL is
    // never dereferenced once apiKey is empty, and vice versa.
    const endpointValid =
      this.options.apiKey.length > 0 ? isValidBaseUrl(this.options.baseURL) : isValidBaseUrl(this.options.freeSearchURL)
    return endpointValid && (this.options.numResults === undefined || isPositiveInteger(this.options.numResults))
  }

  async search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult> {
    if (this.options.apiKey.length === 0) return this.searchKeyless(request, signal)

    // A per-request bound wins over the configured default; either may be absent.
    const numResults = request.maxResults ?? this.options.numResults
    const url = resolveApiUrl(this.options.baseURL, 'v1/search')

    let response: Response
    try {
      response = await fetchWithOneRetry(url, {
        method: 'POST',
        redirect: 'error',
        headers: {
          'x-api-key': this.options.apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
          'x-client-info': buildClientInfoHeader(this.options.pluginVersion),
        },
        body: JSON.stringify({
          query: request.query,
          ...(numResults === undefined ? {} : { count: numResults }),
          ...(this.options.knowledge === undefined ? {} : { knowledge: this.options.knowledge }),
        }),
        ...(signal === undefined ? {} : { signal }),
      })
    } catch (error: unknown) {
      if (isAbortError(error)) throw new WebError('You.com search aborted', 'WEB_ABORTED', { cause: error })
      throw new WebError(`You.com search request failed: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }

    if (!response.ok) {
      const status = response.status
      let message = `You.com API error (HTTP ${status})`
      try {
        const parsed: unknown = await response.json()
        const detail = extractYouComErrorMessage(parsed)
        if (detail !== undefined) message = detail
      } catch (error: unknown) {
        // An abort fired mid-body must surface as WEB_ABORTED, not be swallowed
        // into a generic HTTP-error message — cancellation is not a provider
        // error (the seam's cancellation contract).
        if (isAbortError(error)) throw new WebError('You.com search aborted', 'WEB_ABORTED', { cause: error })
        // Otherwise: the HTTP status is already captured in `message` above; a
        // malformed/non-JSON error body can only cost a richer provider message.
      }
      throw new WebError(message, 'WEB_PROVIDER_ERROR')
    }

    try {
      const payload = (await response.json()) as YouComSearchResponse
      return mapYouComSearchResponse(payload, this.options.includeNews)
    } catch (error: unknown) {
      if (isAbortError(error)) throw new WebError('You.com search aborted', 'WEB_ABORTED', { cause: error })
      throw new WebError(`You.com returned an unprocessable response body: ${String(error)}`, 'WEB_PROVIDER_ERROR', {
        cause: error,
      })
    }
  }

  /**
   * Keyless fallback: calls `you-search` on You.com's public, unauthenticated MCP profile
   * (an anonymous, rate-limited `tools/call`, SSE-framed) instead of the keyed REST endpoint.
   * There is no keyless fetch equivalent — that profile does not expose `you-contents` — so
   * `YouComFetchProvider` stays key-gated.
   *
   * The bare `tools/call` (no `initialize` handshake) relies on observed, undocumented server
   * behavior rather than a published contract. If the free profile ever requires session
   * tracking, this breaks where an SDK-based transport would adapt automatically. Upgrade path:
   * switch to `@modelcontextprotocol/sdk`'s `Client` + `StreamableHTTPClientTransport`.
   */
  private async searchKeyless(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult> {
    const numResults = request.maxResults ?? this.options.numResults

    let response: Response
    try {
      response = await fetchWithOneRetry(this.options.freeSearchURL, {
        method: 'POST',
        redirect: 'error',
        headers: {
          'content-type': 'application/json',
          // Both media types are required: the server framed its response as SSE even though
          // this request also accepts a bare JSON body.
          accept: 'application/json, text/event-stream',
          'x-client-info': buildClientInfoHeader(this.options.pluginVersion),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: MCP_REQUEST_ID,
          method: 'tools/call',
          params: {
            name: FREE_SEARCH_TOOL_NAME,
            arguments: {
              query: request.query,
              ...(numResults === undefined ? {} : { count: numResults }),
              ...(this.options.knowledge === undefined ? {} : { knowledge: this.options.knowledge }),
            },
          },
        }),
        ...(signal === undefined ? {} : { signal }),
      })
    } catch (error: unknown) {
      if (isAbortError(error)) throw new WebError('You.com keyless search aborted', 'WEB_ABORTED', { cause: error })
      throw new WebError(`You.com keyless search request failed: ${String(error)}`, 'WEB_PROVIDER_ERROR', {
        cause: error,
      })
    }

    if (!response.ok) {
      const status = response.status
      // HTTP 429 (rate limit) is the expected failure mode for the shared anonymous quota —
      // surface a distinct, actionable message pointing at the keyed fallback.
      if (status === 429) {
        throw new WebError(
          'You.com anonymous MCP rate limit reached (HTTP 429); configure YDC_API_KEY for higher limits',
          'WEB_PROVIDER_ERROR',
        )
      }
      // Other non-2xx: best-effort read of the body for server detail, mirroring the keyed
      // path. The keyless endpoint's error shape is unstructured (MCP, not the keyed REST
      // error JSON), so append a bounded snippet rather than parsing it.
      let detail = ''
      try {
        const text = await response.text()
        if (text.length > 0) detail = `: ${text.slice(0, 200)}`
      } catch (error: unknown) {
        if (isAbortError(error)) throw new WebError('You.com keyless search aborted', 'WEB_ABORTED', { cause: error })
        // Unreadable body: the HTTP status alone is the message.
      }
      throw new WebError(`You.com keyless search HTTP error (HTTP ${status})${detail}`, 'WEB_PROVIDER_ERROR')
    }

    let body: string
    try {
      body = await response.text()
    } catch (error: unknown) {
      if (isAbortError(error)) throw new WebError('You.com keyless search aborted', 'WEB_ABORTED', { cause: error })
      throw new WebError(`You.com keyless search returned an unreadable body: ${String(error)}`, 'WEB_PROVIDER_ERROR', {
        cause: error,
      })
    }

    const message = extractJsonRpcMessage(body, MCP_REQUEST_ID)
    if (message === undefined) {
      throw new WebError('You.com keyless search returned no matching JSON-RPC response', 'WEB_PROVIDER_ERROR')
    }
    // A protocol-level failure (bad method/tool name, malformed request) — distinct from a
    // tool-level failure below, which succeeds at the JSON-RPC layer but reports isError. The
    // body is cast, not validated, so `error.message` may be missing or non-string in practice.
    if (message.error !== undefined) {
      const detail =
        typeof message.error.message === 'string' && message.error.message.length > 0
          ? message.error.message
          : `code ${message.error.code}`
      throw new WebError(`You.com keyless search error: ${detail}`, 'WEB_PROVIDER_ERROR')
    }
    if (message.result?.isError === true) {
      const text = findTextBlock(message.result.content)
      throw new WebError(text ?? 'You.com keyless search tool reported an error', 'WEB_PROVIDER_ERROR')
    }

    const payload = extractSearchResponse(message.result)
    if (payload === undefined) {
      throw new WebError('You.com keyless search returned an unprocessable tool result', 'WEB_PROVIDER_ERROR')
    }
    return mapYouComSearchResponse(payload, this.options.includeNews)
  }
}

/** True for a request limit that can be sent to You.com (a positive whole number). */
function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}
