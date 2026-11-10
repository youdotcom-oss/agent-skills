// Thin fetch layer for the You.com search APIs. No Convex imports, so it can
// be unit tested on its own (including against the live free MCP profile).
import pkg from '../../package.json' with { type: 'json' }
import type { SearchParams, SearchResultItem } from './validators.js'

export const KEYLESS_SEARCH_URL = 'https://api.you.com/mcp?profile=free'
export const KEYED_SEARCH_URL = 'https://ydc-index.io/v1/search'
const CLIENT_INFO = `plugin; client=convex-search/${pkg.version}`
const MCP_REQUEST_ID = 1
const NO_MCP_RESPONSE = 'You.com keyless search returned no matching JSON-RPC response.'

/** The keyless free MCP profile rejects `count` above 50 with HTTP 402. */
export const KEYLESS_MAX_COUNT = 50
/** The keyed endpoint accepts 1 to 100 (50 when highlights are requested). */
export const KEYED_MAX_COUNT = 100
export const DEFAULT_COUNT = 10
/** Both endpoints reject longer queries (keyed: HTTP 422, keyless: a tool error). */
export const MAX_QUERY_CHARS = 400
export const MAX_QUERY_WORDS = 50

export type Source = 'keyless' | 'keyed'

export class YouSearchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly source: Source,
  ) {
    super(message)
    this.name = 'YouSearchError'
  }
}

/** Clamp and trim params so equivalent requests share one cache entry. */
export function normalizeParams(params: SearchParams, source: Source): SearchParams {
  const query = params.query.trim().replace(/\s+/g, ' ')
  if (!query) throw new Error('query must not be empty')
  if (query.length > MAX_QUERY_CHARS) throw new Error(`query must be at most ${MAX_QUERY_CHARS} characters`)
  if (query.split(' ').length > MAX_QUERY_WORDS) throw new Error(`query must be at most ${MAX_QUERY_WORDS} words`)
  const max = source === 'keyless' || params.highlights ? KEYLESS_MAX_COUNT : KEYED_MAX_COUNT
  const requested = Number.isFinite(params.count) ? (params.count as number) : DEFAULT_COUNT
  const count = Math.min(max, Math.max(1, Math.floor(requested)))
  const out: SearchParams = { query, count }
  if (params.freshness) out.freshness = params.freshness.trim()
  if (params.offset !== undefined && Number.isFinite(params.offset) && params.offset > 0) {
    out.offset = Math.min(9, Math.floor(params.offset))
  }
  if (params.country) out.country = params.country.toUpperCase()
  if (params.language) out.language = params.language.toUpperCase()
  if (params.safesearch) out.safesearch = params.safesearch
  const domains = (d?: string[]) => {
    const list = [...new Set((d ?? []).map((x) => x.trim().toLowerCase()).filter(Boolean))].sort()
    return list.length ? list : undefined
  }
  const inc = domains(params.includeDomains)
  const exc = domains(params.excludeDomains)
  if (inc && exc) throw new Error('includeDomains and excludeDomains cannot be combined')
  if (inc) out.includeDomains = inc
  if (exc) out.excludeDomains = exc
  if (params.highlights) out.highlights = true
  return out
}

/** Stable string form of normalized params, with keys in a fixed order. */
export function canonicalize(params: SearchParams, source: Source): string {
  const keys = Object.keys(params).sort() as (keyof SearchParams)[]
  const ordered: Record<string, unknown> = { source }
  for (const k of keys) ordered[k] = params[k]
  return JSON.stringify(ordered)
}

/** 64-bit FNV-1a hash as hex. Synchronous, so queries can compute it too. */
export function hashKey(input: string): string {
  let h = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  const mask = 0xffffffffffffffffn
  for (let i = 0; i < input.length; i++) {
    h ^= BigInt(input.charCodeAt(i))
    h = (h * prime) & mask
  }
  return h.toString(16).padStart(16, '0')
}

export function buildRequest(
  params: SearchParams,
  apiKey?: string,
): { url: string; init: RequestInit; source: Source } {
  if (apiKey) {
    const body: Record<string, unknown> = {
      query: params.query,
      count: params.count,
    }
    if (params.freshness) body.freshness = params.freshness
    if (params.offset) body.offset = params.offset
    if (params.country) body.country = params.country
    if (params.language) body.language = params.language
    if (params.safesearch) body.safesearch = params.safesearch
    if (params.includeDomains) body.include_domains = params.includeDomains
    if (params.excludeDomains) body.exclude_domains = params.excludeDomains
    if (params.highlights) body.extraction = { extraction_mode: 'highlights' }
    return {
      url: KEYED_SEARCH_URL,
      source: 'keyed',
      init: {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
          'X-Client-Info': CLIENT_INFO,
        },
        body: JSON.stringify(body),
      },
    }
  }
  const args: Record<string, unknown> = { query: params.query, extraction: params.highlights ? 'highlights' : 'none' }
  if (params.count !== undefined) args.count = params.count
  if (params.freshness) args.freshness = params.freshness
  if (params.offset) args.offset = params.offset
  if (params.safesearch) args.safesearch = params.safesearch
  if (params.excludeDomains) args.exclude_domains = params.excludeDomains
  const overrides: Record<string, unknown> = {}
  if (params.country) overrides.country = params.country
  if (params.language) overrides.language = params.language
  if (params.includeDomains) overrides.include_domains = params.includeDomains
  return {
    url: KEYLESS_SEARCH_URL,
    source: 'keyless',
    init: {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json',
        'X-Client-Info': CLIENT_INFO,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: MCP_REQUEST_ID,
        method: 'tools/call',
        params: {
          name: 'you-search',
          arguments: args,
          ...(Object.keys(overrides).length ? { _meta: { 'com.you.com/search': overrides } } : {}),
        },
      }),
    },
  }
}

type RawResult = {
  url?: unknown
  title?: unknown
  description?: unknown
  snippets?: unknown
  page_age?: unknown
  favicon_url?: unknown
  thumbnail_url?: unknown
  contents?: { highlights?: unknown } | null
}

const str = (x: unknown) => (typeof x === 'string' && x ? x : undefined)
const strArr = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : undefined)

/** Map the API's snake_case JSON into the component's result shape. */
export function parseResponse(json: unknown): {
  results: SearchResultItem[]
  searchUuid?: string
  latency?: number
} {
  const root = (json ?? {}) as {
    results?: { web?: RawResult[]; news?: RawResult[] }
    metadata?: { search_uuid?: unknown; latency?: unknown }
  }
  const raw = [...(root.results?.web ?? []), ...(root.results?.news ?? [])]
  const seen = new Set<string>()
  const results: SearchResultItem[] = []
  for (const r of raw) {
    const url = str(r.url)
    if (!url || seen.has(url)) continue
    seen.add(url)
    const item: SearchResultItem = { url, title: str(r.title) ?? url }
    const description = str(r.description)
    if (description) item.description = description
    const snippets = strArr(r.snippets)
    if (snippets?.length) item.snippets = snippets
    const highlights = strArr(r.contents?.highlights)
    if (highlights?.length) item.highlights = highlights
    const pageAge = str(r.page_age)
    if (pageAge) item.pageAge = pageAge
    const faviconUrl = str(r.favicon_url)
    if (faviconUrl) item.faviconUrl = faviconUrl
    const thumbnailUrl = str(r.thumbnail_url)
    if (thumbnailUrl) item.thumbnailUrl = thumbnailUrl
    results.push(item)
  }
  const uuid = str(root.metadata?.search_uuid)
  const latency = typeof root.metadata?.latency === 'number' ? root.metadata.latency : undefined
  return {
    results,
    ...(uuid ? { searchUuid: uuid } : {}),
    ...(latency === undefined ? {} : { latency }),
  }
}

type McpMessage = {
  id?: unknown
  error?: { message?: unknown }
  result?: {
    isError?: unknown
    structuredContent?: unknown
    content?: Array<{ type?: unknown; text?: unknown }>
  }
}

/** Parse a bare JSON body, falling back to the `data:` frames of an SSE body. */
function parseMcpBody(body: string): McpMessage[] {
  try {
    return [JSON.parse(body) as McpMessage]
  } catch {
    return body.split(/\r?\n\r?\n/).flatMap((frame) => {
      const data = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n')
      try {
        return data ? [JSON.parse(data) as McpMessage] : []
      } catch {
        return []
      }
    })
  }
}

/**
 * Read the matching JSON-RPC response from the free MCP profile.
 *
 * MINIMAL: sends a bare `tools/call` with no `initialize` handshake, which the
 * free profile accepts today but does not document. If it starts requiring a
 * session, switch to `@modelcontextprotocol/sdk`'s `Client` with
 * `StreamableHTTPClientTransport`.
 */
function parseMcpResult(body: string): { json?: unknown; error?: string } {
  const message = parseMcpBody(body).find((m) => String(m.id) === String(MCP_REQUEST_ID))
  if (!message) return { error: NO_MCP_RESPONSE }
  const text = message.result?.content?.find((block) => block.type === 'text')?.text
  if (message.error) return { error: str(message.error.message) ?? 'You.com keyless search failed.' }
  if (message.result?.isError === true) return { error: str(text) ?? 'You.com keyless search failed.' }
  if (message.result?.structuredContent) return { json: message.result.structuredContent }
  if (typeof text === 'string') return { json: JSON.parse(text) }
  return { error: 'You.com keyless search returned no search results.' }
}

function describeError(status: number, source: Source, body: string): string {
  const detail = body.slice(0, 300)
  if (status === 402 && source === 'keyless') {
    return `You.com free MCP search returned 402 Payment Required. The free profile is for light use and has a usage limit; set YDC_API_KEY (or pass apiKey) to use the keyed API. ${detail}`
  }
  if (status === 401 || status === 403) {
    return `You.com rejected the API key (HTTP ${status}). ${detail}`
  }
  if (status === 429) {
    return `You.com rate limited the request (HTTP 429). ${detail}`
  }
  return `You.com search failed with HTTP ${status}. ${detail}`
}

/** Run one search against You.com. Throws YouSearchError on non-2xx. */
export async function fetchSearch(params: SearchParams, opts: { apiKey?: string; fetch?: typeof fetch } = {}) {
  const doFetch = opts.fetch ?? fetch
  const { url, init, source } = buildRequest(params, opts.apiKey)
  const res = await doFetch(url, init)
  if (source === 'keyless') {
    const body = await res.text()
    let parsed: { json?: unknown; error?: string }
    try {
      parsed = parseMcpResult(body)
    } catch {
      parsed = { error: body }
    }
    if (!res.ok || parsed.error !== undefined) {
      const detail = !res.ok && parsed.error === NO_MCP_RESPONSE ? body : (parsed.error ?? body)
      throw new YouSearchError(describeError(res.status, source, detail), res.status, source)
    }
    return { source, ...parseResponse(parsed.json) }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new YouSearchError(describeError(res.status, source, text), res.status, source)
  }
  return { source, ...parseResponse(await res.json()) }
}
