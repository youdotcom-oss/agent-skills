import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { resultValidator, searchParamsValidator } from './validators.js'

/**
 * Cached You.com search responses.
 *
 * One row per unique (source, normalized params) pair. `cacheKey` is a
 * deterministic hash of the canonical params; `canonical` holds the full
 * canonical string so a hash collision can never return the wrong results.
 */
export default defineSchema({
  searches: defineTable({
    cacheKey: v.string(),
    canonical: v.string(),
    source: v.union(v.literal('keyless'), v.literal('keyed')),
    params: searchParamsValidator,
    results: v.array(resultValidator),
    searchUuid: v.optional(v.string()),
    latency: v.optional(v.number()),
    fetchedAt: v.number(),
    expiresAt: v.number(),
  })
    .index('cacheKey', ['cacheKey'])
    .index('expiresAt', ['expiresAt'])
    .index('fetchedAt', ['fetchedAt']),
})
