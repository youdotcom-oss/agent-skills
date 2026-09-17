/**
 * Utilities shared by the search and fetch providers.
 * @module @youdotcom-oss/dsh-plugin/web/shared
 */

/** True when `baseURL` is an absolute `http(s)` URL (a cheap local config check). */
export function isValidBaseUrl(baseURL: string): boolean {
  // Parsing alone is not enough: a scheme-less `localhost:8080` parses as scheme `localhost:`,
  // and resolving a path against a non-hierarchical scheme throws — so `available()` would
  // report usable and that throw would escape this provider's `WebError` contract.
  const url = URL.parse(baseURL)
  return url !== null && (url.protocol === 'https:' || url.protocol === 'http:')
}

/**
 * Resolve one API path against the configured base.
 *
 * @param baseURL - the configured endpoint base; any path prefix it carries is kept.
 * @param path - the endpoint path, relative (no leading slash).
 * @returns the absolute request URL.
 */
export function resolveApiUrl(baseURL: string, path: string): URL {
  // A leading-slash path would discard a proxy base's prefix (`https://gw.test/youcom` +
  // `/v1/search` resolves to `https://gw.test/v1/search`), so resolve relatively against a
  // slash-terminated base, which leaves the default origin-only base unchanged.
  return new URL(path, baseURL.endsWith('/') ? baseURL : `${baseURL}/`)
}

/** True for a fetch/`AbortSignal` abort, surfaced as `WEB_ABORTED`. */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * One bounded retry for transient transport failures: an HTTP 429 (rate limit) or a
 * network-level rejection. A 429 is returned to the caller after the retry rather than
 * swallowed, so its distinct handling still runs. Never retries after an abort — cancellation
 * is not a transient condition, and a retried `fetch` under an aborted signal still throws
 * `AbortError` for the caller to map to `WEB_ABORTED`.
 */
export async function fetchWithOneRetry(input: string | URL, init: RequestInit): Promise<Response> {
  const signal = init.signal
  let response: Response
  try {
    response = await fetch(input, init)
  } catch (error: unknown) {
    // Network-level rejection (connection reset/refused); aborts are re-thrown, not retried.
    if (signal?.aborted) throw error
    await sleep(jitteredBackoff())
    return fetch(input, init)
  }
  if (response.status === 429 && !signal?.aborted) {
    // Release the socket held by the unconsumed 429 body before sleeping; otherwise sustained
    // 429s (the keyless endpoint's expected rate-limit signal) delay socket return to the pool.
    await response.body?.cancel()
    await sleep(jitteredBackoff())
    return fetch(input, init)
  }
  return response
}

/** Retry delay with a little jitter so concurrent retries don't synchronize. */
function jitteredBackoff(): number {
  return 100 + Math.random() * 150
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
