// Apps call these as `components.youSearch.lib.<fn>`, usually through the
// `YouSearch` client class in src/client.
import { v } from 'convex/values'
import { internal } from './_generated/api.js'
import type { Doc } from './_generated/dataModel.js'
import { action, internalMutation, internalQuery, type MutationCtx, mutation, query } from './_generated/server.js'
import {
  resultValidator,
  type SearchResponse,
  searchParamsValidator,
  searchResponseValidator,
  sourceValidator,
} from './validators.js'
import { canonicalize, fetchSearch, hashKey, normalizeParams, type Source } from './youApi.js'

/** Default cache lifetime: one hour. */
export const DEFAULT_TTL_MS = 60 * 60 * 1000
const MAX_TTL_MS = 30 * 24 * 60 * 60 * 1000

function keyFor(params: Doc<'searches'>['params'], source: Source) {
  const normalized = normalizeParams(params, source)
  const canonical = canonicalize(normalized, source)
  return { normalized, canonical, cacheKey: hashKey(canonical) }
}

function toResponse(doc: Doc<'searches'>, cached: boolean): SearchResponse {
  return {
    query: doc.params.query,
    source: doc.source,
    cached,
    results: doc.results,
    ...(doc.searchUuid ? { searchUuid: doc.searchUuid } : {}),
    fetchedAt: doc.fetchedAt,
    expiresAt: doc.expiresAt,
  }
}

/**
 * Search the web with You.com, reading from and writing to the cache.
 *
 * With no `apiKey` this calls You.com's free MCP profile. Pass `apiKey` to use the
 * keyed API. The key is only used for the outbound request; it is not stored.
 */
export const search = action({
  args: {
    params: searchParamsValidator,
    apiKey: v.optional(v.string()),
    ttlMs: v.optional(v.number()),
    force: v.optional(v.boolean()),
  },
  returns: searchResponseValidator,
  handler: async (ctx, args): Promise<SearchResponse> => {
    const source: Source = args.apiKey ? 'keyed' : 'keyless'
    const { normalized, canonical, cacheKey } = keyFor(args.params, source)

    if (!args.force) {
      const hit = await ctx.runQuery(internal.lib.getFresh, {
        cacheKey,
        canonical,
        now: Date.now(),
      })
      if (hit) return toResponse(hit, true)
    }

    const fetched = await fetchSearch(normalized, { apiKey: args.apiKey })
    const requestedTtl = Number.isFinite(args.ttlMs) ? (args.ttlMs as number) : DEFAULT_TTL_MS
    const ttl = Math.min(MAX_TTL_MS, Math.max(0, requestedTtl))
    const fetchedAt = Date.now()
    const doc = await ctx.runMutation(internal.lib.store, {
      cacheKey,
      canonical,
      source,
      params: normalized,
      results: fetched.results,
      ...(fetched.searchUuid ? { searchUuid: fetched.searchUuid } : {}),
      fetchedAt,
      expiresAt: fetchedAt + ttl,
    })
    return toResponse(doc, false)
  },
})

export const getFresh = internalQuery({
  args: { cacheKey: v.string(), canonical: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('searches')
      .withIndex('cacheKey', (q) => q.eq('cacheKey', args.cacheKey))
      .collect()
    return rows.find((r) => r.canonical === args.canonical && r.expiresAt > args.now) ?? null
  },
})

export const store = internalMutation({
  args: {
    cacheKey: v.string(),
    canonical: v.string(),
    source: sourceValidator,
    params: searchParamsValidator,
    results: v.array(resultValidator),
    searchUuid: v.optional(v.string()),
    fetchedAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Replace any earlier row for the same request so there is one per key.
    const existing = await ctx.db
      .query('searches')
      .withIndex('cacheKey', (q) => q.eq('cacheKey', args.cacheKey))
      .collect()
    for (const row of existing) {
      if (row.canonical === args.canonical) await ctx.db.delete('searches', row._id)
    }
    const id = await ctx.db.insert('searches', args)
    return (await ctx.db.get('searches', id))!
  },
})

/**
 * Reactive read of a cached search. Returns null when there is no entry or
 * the entry has expired. Pass the same params (and `keyed`) used for search.
 *
 * Expiry is checked against `now` when given, otherwise against the time the
 * query runs. Convex re-runs queries when the underlying rows change, not on
 * a timer, so a subscribed client sees expiry on the next change or reload.
 */
export const getCached = query({
  args: {
    params: searchParamsValidator,
    keyed: v.optional(v.boolean()),
    includeExpired: v.optional(v.boolean()),
  },
  returns: v.union(v.null(), searchResponseValidator),
  handler: async (ctx, args) => {
    const source: Source = args.keyed ? 'keyed' : 'keyless'
    let key: ReturnType<typeof keyFor>
    try {
      key = keyFor(args.params, source)
    } catch {
      return null
    }
    const rows = await ctx.db
      .query('searches')
      .withIndex('cacheKey', (q) => q.eq('cacheKey', key.cacheKey))
      .collect()
    const row = rows.find((r) => r.canonical === key.canonical)
    if (!row) return null
    if (!args.includeExpired && row.expiresAt <= Date.now()) return null
    return toResponse(row, true)
  },
})

/** Most recent cached searches, newest first. */
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(searchResponseValidator),
  handler: async (ctx, args) => {
    const limit = Number.isFinite(args.limit) ? Math.floor(args.limit as number) : 20
    const rows = await ctx.db
      .query('searches')
      .withIndex('fetchedAt')
      .order('desc')
      .take(Math.min(100, Math.max(1, limit)))
    return rows.map((r) => toResponse(r, true))
  },
})

/** Drop the cache entry for one request so the next search refetches. */
export const invalidate = mutation({
  args: { params: searchParamsValidator, keyed: v.optional(v.boolean()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const source: Source = args.keyed ? 'keyed' : 'keyless'
    const { cacheKey, canonical } = keyFor(args.params, source)
    const rows = await ctx.db
      .query('searches')
      .withIndex('cacheKey', (q) => q.eq('cacheKey', cacheKey))
      .collect()
    let n = 0
    for (const row of rows) {
      if (row.canonical === canonical) {
        await ctx.db.delete('searches', row._id)
        n++
      }
    }
    return n
  },
})

/** Delete up to `batchSize` expired rows. Reschedules itself if more remain. */
export const deleteExpired = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const batchSize = Number.isFinite(args.batchSize) ? Math.max(1, Math.floor(args.batchSize as number)) : 500
    const rows = await ctx.db
      .query('searches')
      .withIndex('expiresAt', (q) => q.lte('expiresAt', Date.now()))
      .take(batchSize)
    for (const row of rows) await ctx.db.delete('searches', row._id)
    if (rows.length === batchSize) {
      await ctx.scheduler.runAfter(0, internal.lib.deleteExpired, {
        batchSize,
      })
    }
    return rows.length
  },
})

/** Remove every cached row, in batches. Returns the number deleted now. */
export const clearAll = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    return await deleteBatch(ctx)
  },
})

export const clearAllInternal = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    return await deleteBatch(ctx)
  },
})

async function deleteBatch(ctx: MutationCtx): Promise<number> {
  const rows = await ctx.db.query('searches').take(500)
  for (const row of rows) await ctx.db.delete('searches', row._id)
  if (rows.length === 500) {
    await ctx.scheduler.runAfter(0, internal.lib.clearAllInternal, {})
  }
  return rows.length
}
