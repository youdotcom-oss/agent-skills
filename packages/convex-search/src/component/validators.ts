import { type Infer, v } from 'convex/values'

export const sourceValidator = v.union(v.literal('keyless'), v.literal('keyed'))
/** Which You.com endpoint served a search: the keyless free MCP profile or the keyed API. */
export type Source = Infer<typeof sourceValidator>

/** Search parameters shared by the keyless and keyed You.com endpoints. */
export const searchParamsValidator = v.object({
  query: v.string(),
  count: v.optional(v.number()),
  /** `day`, `week`, `month`, `year`, or `YYYY-MM-DDtoYYYY-MM-DD`. */
  freshness: v.optional(v.string()),
  offset: v.optional(v.number()),
  country: v.optional(v.string()),
  language: v.optional(v.string()),
  safesearch: v.optional(v.union(v.literal('off'), v.literal('moderate'), v.literal('strict'))),
  includeDomains: v.optional(v.array(v.string())),
  excludeDomains: v.optional(v.array(v.string())),
  /** Return query-relevant passages per result. Capped at 50 results on both APIs. */
  highlights: v.optional(v.boolean()),
})
export type SearchParams = Infer<typeof searchParamsValidator>

export const resultValidator = v.object({
  url: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  snippets: v.optional(v.array(v.string())),
  highlights: v.optional(v.array(v.string())),
  pageAge: v.optional(v.string()),
  faviconUrl: v.optional(v.string()),
  thumbnailUrl: v.optional(v.string()),
})
export type SearchResultItem = Infer<typeof resultValidator>

export const searchResponseValidator = v.object({
  query: v.string(),
  source: sourceValidator,
  cached: v.boolean(),
  results: v.array(resultValidator),
  searchUuid: v.optional(v.string()),
  fetchedAt: v.number(),
  expiresAt: v.number(),
})
export type SearchResponse = Infer<typeof searchResponseValidator>
