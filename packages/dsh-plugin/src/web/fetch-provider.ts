/**
 * You.com-backed `WebFetchProvider` (`POST /v1/contents`). Unlike a raw HTTP
 * fetch provider, retrieval, rendering, and extraction happen server-side at
 * You.com, so this provider is a thin request/response mapper with no SSRF
 * surface of its own to police.
 * @module @youdotcom-oss/dsh-plugin/web/fetch-provider
 */

import type { WebFetchProvider, WebFetchRequest, WebFetchResult } from '@deepseek-ai/dsh-web'
import { WebError } from '@deepseek-ai/dsh-web'
import { buildClientInfoHeader } from './attribution.ts'
import { extractYouComErrorMessage } from './error-message.ts'
import { fetchWithOneRetry, isAbortError, isValidBaseUrl, resolveApiUrl } from './shared.ts'
import type { YouComContentsResponse } from './types.ts'

/** Stable id this provider registers under. */
export const YOUCOM_FETCH_PROVIDER_ID = 'youcom'

/** Default You.com API endpoint base; `/v1/contents` is appended. */
export const YOUCOM_FETCH_DEFAULT_BASE_URL = 'https://ydc-index.io'

/** Resolved provider options (the plugin's `apply` supplies env-var and constant defaults). */
export interface YouComFetchProviderOptions {
  /** You.com API key. Empty/absent makes the provider unavailable — unlike search, there is no keyless MCP fallback here (the free profile exposes no contents/fetch tool). */
  apiKey: string
  /** Endpoint base; `/v1/contents` is appended. */
  baseURL: string
  /** This package's version, sent in the `X-Client-Info` attribution header. */
  pluginVersion: string
}

/**
 * Map a You.com contents response to a normalized fetch result.
 *
 * @param response - the parsed `POST /v1/contents` response body.
 * @param requestUrl - the URL that was requested (used when You.com omits `url`).
 * @returns the normalized result; body is the retrieved Markdown as `text`.
 * @throws {WebError} `WEB_PROVIDER_ERROR` when the response carries neither
 *   `markdown` nor `html` — You.com found nothing retrievable for the URL.
 */
export function mapYouComContentsResponse(response: YouComContentsResponse, requestUrl: string): WebFetchResult {
  // An empty string is not usable content either (a real response shape for an unparseable
  // page) — treat it the same as absent rather than returning an empty-but-successful body.
  const markdown = response.markdown != null && response.markdown.length > 0 ? response.markdown : undefined
  const html = response.html != null && response.html.length > 0 ? response.html : undefined
  if (markdown === undefined && html === undefined) {
    throw new WebError('You.com contents returned no retrievable page content', 'WEB_PROVIDER_ERROR')
  }
  return {
    url: response.url ?? requestUrl,
    // You.com's contents endpoint retrieves and extracts server-side; it reports no origin HTTP
    // status, and a successful API response means the page was retrieved, so 200 is accurate here.
    statusCode: 200,
    body: markdown === undefined ? { kind: 'html', content: html as string } : { kind: 'text', content: markdown },
    // The endpoint documents no truncation signal, so this can only under-report — never invent one.
    truncated: false,
  }
}

/** The You.com-backed fetch provider (retrieves via `/v1/contents`, requesting Markdown). */
export class YouComFetchProvider implements WebFetchProvider {
  readonly id = YOUCOM_FETCH_PROVIDER_ID

  constructor(private readonly options: YouComFetchProviderOptions) {}

  available(): boolean {
    return this.options.apiKey.length > 0 && isValidBaseUrl(this.options.baseURL)
  }

  async fetch(request: WebFetchRequest, signal?: AbortSignal): Promise<WebFetchResult> {
    const url = resolveApiUrl(this.options.baseURL, 'v1/contents')
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
        // Request both formats so the html fallback in mapYouComContentsResponse is reachable:
        // the endpoint returns only included formats, and a page that fails Markdown
        // conversion may still yield HTML.
        body: JSON.stringify({ urls: [request.url], formats: ['markdown', 'html'] }),
        ...(signal === undefined ? {} : { signal }),
      })
    } catch (error: unknown) {
      if (isAbortError(error)) throw new WebError('You.com contents fetch aborted', 'WEB_ABORTED', { cause: error })
      throw new WebError(`You.com contents request failed: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }

    if (!response.ok) {
      const status = response.status
      let message = `You.com API error (HTTP ${status})`
      try {
        const parsed: unknown = await response.json()
        const detail = extractYouComErrorMessage(parsed)
        if (detail !== undefined) message = detail
      } catch (error: unknown) {
        if (isAbortError(error)) throw new WebError('You.com contents fetch aborted', 'WEB_ABORTED', { cause: error })
      }
      throw new WebError(message, 'WEB_PROVIDER_ERROR')
    }

    try {
      // The wire response is an array — one entry per requested URL, in request order — even
      // for our single-URL request; tolerate a bare object defensively in case that ever changes.
      const payload = (await response.json()) as YouComContentsResponse | YouComContentsResponse[]
      const entry = Array.isArray(payload) ? payload[0] : payload
      if (entry === undefined) throw new WebError('You.com contents returned an empty response', 'WEB_PROVIDER_ERROR')
      return mapYouComContentsResponse(entry, request.url)
    } catch (error: unknown) {
      if (error instanceof WebError) throw error
      if (isAbortError(error)) throw new WebError('You.com contents fetch aborted', 'WEB_ABORTED', { cause: error })
      throw new WebError(`You.com returned an unprocessable response body: ${String(error)}`, 'WEB_PROVIDER_ERROR', {
        cause: error,
      })
    }
  }
}
