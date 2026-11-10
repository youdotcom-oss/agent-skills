/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { test } from 'vitest'
import schema from './schema.js'
export const modules = import.meta.glob('./**/*.*s')

export function initConvexTest() {
  return convexTest(schema, modules)
}

/** A fake fetch that returns a You.com style payload and records calls. */
export function mockYouFetch(
  results: Array<Record<string, unknown>> = [
    {
      url: 'https://docs.convex.dev/components',
      title: 'Components | Convex Developer Hub',
      description: 'Convex components',
      snippets: ['Components are sandboxed building blocks.'],
      page_age: '2026-10-01T00:00:00',
      favicon_url: 'https://you.com/favicon?domain=docs.convex.dev&size=128',
    },
  ],
  status = 200,
) {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const fn = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, init })
    if (status !== 200) {
      return new Response(JSON.stringify({ detail: 'nope' }), { status })
    }
    const payload = {
      results: { web: results },
      metadata: { query: 'q', search_uuid: 'uuid-1', latency: 0.4 },
    }
    if (url.startsWith('https://api.you.com/mcp')) {
      return new Response(
        `data: ${JSON.stringify({ jsonrpc: '2.0', id: 1, result: { structuredContent: payload } })}\n\n`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        },
      )
    }
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  return { fn: fn as typeof fetch, calls }
}

test('setup', () => {})
