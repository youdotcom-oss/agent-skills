/**
 * Extract a human-readable message from a You.com API error response body.
 * The shape varies by status, endpoint, and which layer rejected the request:
 *
 * - `{"detail": "..."}` — a common 401/403/500 shape, returned when a syntactically valid key
 *   is rejected by the API.
 * - `{"error": "..."}` — the search endpoint's 422 "search spec" shape.
 * - `{"detail": [{"msg": "...", ...}]}` — a FastAPI request-validation 422,
 *   also from the search endpoint; `detail` here is an array, not a string.
 * - `{"errors": [{"title": "...", ...}]}` — a JSON:API-style 422 shape.
 * - `{"message": "..."}` — a gateway/authorizer layer in front of the API rejects a malformed
 *   key with this shape before the API-level error models ever apply.
 *
 * Each shape belongs to a different endpoint or rejection layer, so at most one can appear on
 * any single body and the order these are checked in carries no priority.
 * @module @youdotcom-oss/dsh-plugin/web/error-message
 */

export function extractYouComErrorMessage(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined
  const record = body as Record<string, unknown>

  if (typeof record.error === 'string' && record.error.length > 0) return record.error
  if (typeof record.detail === 'string' && record.detail.length > 0) return record.detail
  if (typeof record.message === 'string' && record.message.length > 0) return record.message

  const fromDetailArray = joinStringField(record.detail, 'msg')
  if (fromDetailArray !== undefined) return fromDetailArray

  return joinStringField(record.errors, 'title')
}

/** Join a named string field across an array of error entries, dropping non-string/blank values. */
function joinStringField(entries: unknown, field: string): string | undefined {
  if (!Array.isArray(entries)) return undefined
  const values = entries
    .map((entry) =>
      typeof entry === 'object' && entry !== null ? (entry as Record<string, unknown>)[field] : undefined,
    )
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
  return values.length > 0 ? values.join('; ') : undefined
}
