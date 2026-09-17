/**
 * Wire types for the You.com Search (`POST /v1/search`) and Contents
 * (`POST /v1/contents`) endpoints. Types only — no runtime code. Field names
 * are snake_case because they reflect the literal wire shape.
 * @module @youdotcom-oss/dsh-plugin/web/types
 */

/**
 * One entry of `results.web[]` or `results.news[]` in a search response.
 * Field names are snake_case because they reflect the literal wire shape; the response is
 * parsed directly with no SDK deserialization layer in between.
 */
export interface YouComSearchResultEntry {
  url: string
  title?: string
  description?: string
  snippets?: string[]
  /** ISO-8601 publication/crawl timestamp, or a provider-specific string; absent when unknown. */
  page_age?: string
}

/** You.com's search response envelope (`POST /v1/search`). */
export interface YouComSearchResponse {
  results?: {
    web?: YouComSearchResultEntry[]
    news?: YouComSearchResultEntry[]
  }
}

/**
 * One entry of You.com's contents response. The endpoint's wire response is
 * an array of these — one per requested URL, in request order — even for a
 * single-URL request.
 */
export interface YouComContentsResponse {
  url?: string
  title?: string
  html?: string | null
  markdown?: string | null
}
