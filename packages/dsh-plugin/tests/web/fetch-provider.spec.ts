import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { Context } from '@deepseek-ai/cordis'
import WebRuntime from '@deepseek-ai/dsh-web'
import * as youcomPlugin from '../../src/index.ts'
import {
  mapYouComContentsResponse,
  YOUCOM_FETCH_PROVIDER_ID,
  YouComFetchProvider,
} from '../../src/web/fetch-provider.ts'

const options = {
  apiKey: 'youcom-key',
  baseURL: 'https://api.youcom.test',
  pluginVersion: '0.1.0',
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init })
}

/** A Response whose body read rejects the way an abort mid-read does. */
function abortingResponse(init: ResponseInit = {}): Response {
  const body = new ReadableStream({
    start: (controller) => controller.error(new DOMException('aborted', 'AbortError')),
  })
  return new Response(body, { status: 200, ...init })
}

afterEach(() => {
  mock.restore()
})

describe('You.com contents mapping', () => {
  test('maps a markdown response to a text body', () => {
    expect(mapYouComContentsResponse({ url: 'https://a.test', markdown: '# Title' }, 'https://a.test')).toEqual({
      url: 'https://a.test',
      statusCode: 200,
      body: { kind: 'text', content: '# Title' },
      truncated: false,
    })
  })

  test('falls back to html when markdown is absent', () => {
    expect(mapYouComContentsResponse({ url: 'https://a.test', html: '<p>hi</p>' }, 'https://a.test')).toEqual({
      url: 'https://a.test',
      statusCode: 200,
      body: { kind: 'html', content: '<p>hi</p>' },
      truncated: false,
    })
  })

  test('falls back to the request URL when the response omits url', () => {
    expect(mapYouComContentsResponse({ markdown: 'hi' }, 'https://requested.test').url).toBe('https://requested.test')
  })

  test('throws WEB_PROVIDER_ERROR when neither markdown nor html is present', () => {
    expect(() => mapYouComContentsResponse({ url: 'https://a.test' }, 'https://a.test')).toThrow(
      expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }),
    )
  })

  test('treats an empty-string markdown as absent and falls back to html', () => {
    expect(
      mapYouComContentsResponse({ url: 'https://a.test', markdown: '', html: '<p>hi</p>' }, 'https://a.test').body,
    ).toEqual({ kind: 'html', content: '<p>hi</p>' })
  })

  test('throws WEB_PROVIDER_ERROR when both markdown and html are empty strings', () => {
    expect(() =>
      mapYouComContentsResponse({ url: 'https://a.test', markdown: '', html: '' }, 'https://a.test'),
    ).toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }))
  })
})

describe('YouComFetchProvider availability', () => {
  test('is unavailable without a key', () => {
    expect(new YouComFetchProvider({ ...options, apiKey: '' }).available()).toBe(false)
  })

  test('is available with a key', () => {
    expect(new YouComFetchProvider(options).available()).toBe(true)
  })

  test('is misconfigured when the base URL is unparseable', () => {
    expect(new YouComFetchProvider({ ...options, baseURL: 'not a url' }).available()).toBe(false)
  })

  test('is misconfigured when the base URL is parseable but not http(s)', () => {
    expect(new YouComFetchProvider({ ...options, baseURL: 'localhost:8080' }).available()).toBe(false)
    expect(new YouComFetchProvider({ ...options, baseURL: 'http://localhost:8080' }).available()).toBe(true)
  })
})

describe('YouComFetchProvider request mapping', () => {
  test('sends the url, requests markdown, and the API key header', async () => {
    const fetchMock = mock(async () => jsonResponse({ url: 'https://a.test', markdown: 'content' }))
    spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)

    await new YouComFetchProvider(options).fetch({ url: 'https://a.test' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(url.toString()).toBe('https://api.youcom.test/v1/contents')
    expect(init).toMatchObject({ method: 'POST', redirect: 'error' })
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('youcom-key')
    expect(JSON.parse(init.body as string)).toEqual({ urls: ['https://a.test'], formats: ['markdown', 'html'] })
  })

  test('keeps a path prefix on the configured base URL', async () => {
    const fetchMock = mock(async () => jsonResponse({ url: 'https://a.test', markdown: 'content' }))
    spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)
    await new YouComFetchProvider({ ...options, baseURL: 'https://gateway.test/youcom' }).fetch({
      url: 'https://a.test',
    })
    const [url] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(url.toString()).toBe('https://gateway.test/youcom/v1/contents')
  })

  test('takes the first entry when the response is an array', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => jsonResponse([{ url: 'https://a.test', markdown: 'content' }])) as unknown as typeof fetch,
    )
    const result = await new YouComFetchProvider(options).fetch({ url: 'https://a.test' })
    expect(result.body).toEqual({ kind: 'text', content: 'content' })
  })

  test('forwards the abort signal', async () => {
    const fetchMock = mock(async () => jsonResponse({ url: 'https://a.test', markdown: 'content' }))
    spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch)
    const controller = new AbortController()
    await new YouComFetchProvider(options).fetch({ url: 'https://a.test' }, controller.signal)
    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(init.signal).toBe(controller.signal)
  })
})

describe('YouComFetchProvider error handling', () => {
  test('maps a 401 {detail} error to WEB_PROVIDER_ERROR with the provider message', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => jsonResponse({ detail: 'bad key' }, { status: 401 })) as unknown as typeof fetch,
    )
    await expect(new YouComFetchProvider(options).fetch({ url: 'https://a.test' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'bad key' }),
    )
  })

  test('maps a network failure to WEB_PROVIDER_ERROR', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(() => Promise.reject(new TypeError('connection refused'))) as unknown as typeof fetch,
    )
    await expect(new YouComFetchProvider(options).fetch({ url: 'https://a.test' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }),
    )
  })

  test('maps an abort to WEB_ABORTED', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(() => Promise.reject(new DOMException('aborted', 'AbortError'))) as unknown as typeof fetch,
    )
    await expect(new YouComFetchProvider(options).fetch({ url: 'https://a.test' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_ABORTED' }),
    )
  })

  test('propagates the no-content WebError from response mapping, message intact', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => jsonResponse({ url: 'https://a.test' })) as unknown as typeof fetch,
    )
    // The message must survive the surrounding catch: without the `instanceof WebError`
    // re-throw it is rewrapped as an unprocessable-body error, which misdiagnoses a page
    // that was retrieved fine but yielded nothing extractable.
    await expect(new YouComFetchProvider(options).fetch({ url: 'https://a.test' })).rejects.toThrow(
      expect.objectContaining({
        code: 'WEB_PROVIDER_ERROR',
        message: 'You.com contents returned no retrievable page content',
      }),
    )
  })

  test('maps an empty array response to WEB_PROVIDER_ERROR', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(mock(async () => jsonResponse([])) as unknown as typeof fetch)
    await expect(new YouComFetchProvider(options).fetch({ url: 'https://a.test' })).rejects.toThrow(
      expect.objectContaining({
        code: 'WEB_PROVIDER_ERROR',
        message: 'You.com contents returned an empty response',
      }),
    )
  })

  test('maps an abort during the error-body read to WEB_ABORTED, not the HTTP status message', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => abortingResponse({ status: 500 })) as unknown as typeof fetch,
    )
    await expect(new YouComFetchProvider(options).fetch({ url: 'https://a.test' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_ABORTED' }),
    )
  })

  test('maps an abort during the success-body read to WEB_ABORTED', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(mock(async () => abortingResponse()) as unknown as typeof fetch)
    await expect(new YouComFetchProvider(options).fetch({ url: 'https://a.test' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_ABORTED' }),
    )
  })
})

describe('dsh-plugin fetch registration', () => {
  test('registers the provider into ctx.web (HMR-safe)', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      mock(async () => jsonResponse({ url: 'https://a.test', markdown: 'hi' })) as unknown as typeof fetch,
    )
    const ctx = new Context()
    await ctx.plugin(WebRuntime, { fetchProvider: YOUCOM_FETCH_PROVIDER_ID })
    const fiber = await ctx.plugin(youcomPlugin, { apiKey: 'youcom-key' })
    await expect(ctx.web.fetch({ url: 'https://a.test' })).resolves.toMatchObject({
      body: { kind: 'text', content: 'hi' },
    })
    await fiber.dispose()
    await expect(ctx.web.fetch({ url: 'https://a.test' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_PROVIDER_CONFIGURED_MISSING' }),
    )
  })
})
