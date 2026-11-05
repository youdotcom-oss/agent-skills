import { createRequire } from 'node:module'
import type { Plugin } from '@opencode/plugin'

type SearchResult = { url: string; title?: string; content?: string; time: { published?: number } }

type Endpoints = { free: string; keyed: string }

const PROVIDER_ID = 'youcom'
const RESULT_COUNT = 8
const REQUEST_ID = 1

const CLIENT_NAME = 'youdotcom-opencode'
const pluginVersion: string = createRequire(import.meta.url)('./package.json').version

type WebEntry = {
  url?: string
  title?: string
  description?: string
  page_age?: string
  contents?: { highlights?: string[] }
}
type SearchPayload = { results?: { web?: WebEntry[] } }
type JsonRpcMessage = {
  id?: number | string
  method?: string
  error?: { message?: string }
  result?: { isError?: boolean; content?: { type: string; text?: string }[]; structuredContent?: SearchPayload }
}

/**
 * Registers You.com as an OpenCode web search provider. Without a key it calls
 * `you-search` on the free MCP profile; a key from `/connect` or `YDC_API_KEY`
 * switches to the authenticated MCP endpoint for higher limits. The default
 * provider is left to the user.
 */
export const registerWebSearch = async (ctx: Plugin.Context, endpoints: Endpoints) => {
  await ctx.integration.transform((editor) => {
    editor.update(PROVIDER_ID, (integration) => {
      integration.name = 'You.com'
    })
    editor.method.update({ integrationID: PROVIDER_ID, method: { type: 'key' } })
    editor.method.update({ integrationID: PROVIDER_ID, method: { type: 'env', names: ['YDC_API_KEY'] } })
  })
  await ctx.websearch.transform((editor) => {
    editor.add({
      id: PROVIDER_ID,
      name: 'You.com',
      execute: async (input, { signal }) => {
        const connection = await ctx.integration.connection.active(PROVIDER_ID)
        const credential = connection ? await ctx.integration.connection.resolve(connection) : undefined
        const key = credential?.type === 'key' ? credential.key : undefined
        return search(key ? endpoints.keyed : endpoints.free, input.query, key, signal)
      },
    })
  })
}

// MINIMAL: one stateless `tools/call` with no `initialize` handshake, which the You.com MCP server
// accepts. If it ever requires a session, switch to the MCP SDK's StreamableHTTPClientTransport.
const search = async (
  url: string,
  query: string,
  key: string | undefined,
  signal: AbortSignal,
): Promise<SearchResult[]> => {
  const response = await fetch(url, {
    method: 'POST',
    redirect: 'error',
    signal,
    headers: {
      'content-type': 'application/json',
      // The MCP Streamable HTTP transport requires clients to accept both.
      accept: 'application/json, text/event-stream',
      // The MCP server attributes traffic from the User-Agent and `_meta` clientInfo, not X-Client-Info.
      'user-agent': `${CLIENT_NAME}/${pluginVersion} ${navigator.userAgent}`,
      ...(key ? { authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: REQUEST_ID,
      method: 'tools/call',
      params: {
        name: 'you-search',
        arguments: { query, count: RESULT_COUNT },
        _meta: { 'io.modelcontextprotocol/clientInfo': { name: CLIENT_NAME, version: pluginVersion } },
      },
    }),
  })
  if (!response.ok) throw new Error(`You.com web search failed (HTTP ${response.status})`)

  const message = findResponse(await response.text())
  if (!message) throw new Error('You.com web search returned no search result')
  if (message.error) throw new Error(`You.com web search failed: ${message.error.message ?? 'unknown error'}`)
  const text = message.result?.content?.find((block) => block.type === 'text')?.text
  if (message.result?.isError) throw new Error(text ?? 'You.com web search failed')
  const payload = message.result?.structuredContent ?? (text ? parseJson<SearchPayload>(text) : undefined)
  return (payload?.results?.web ?? []).flatMap(toResult)
}

/** The JSON-RPC response in a plain JSON or SSE body; SSE may carry notifications before it. */
const findResponse = (body: string) => {
  const messages = body.trimStart().startsWith('{')
    ? [parseJson<JsonRpcMessage>(body)]
    : body.split(/\r?\n\r?\n/).map((event) =>
        parseJson<JsonRpcMessage>(
          event
            .split(/\r?\n/)
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5))
            .join('\n'),
        ),
      )
  return messages.find((message) => String(message?.id) === String(REQUEST_ID) && message?.method === undefined)
}

const toResult = (entry: WebEntry): SearchResult[] => {
  if (!entry.url) return []
  const content = entry.contents?.highlights?.join('\n\n') || entry.description
  const published = entry.page_age ? Date.parse(entry.page_age) : Number.NaN
  return [
    {
      url: entry.url,
      ...(entry.title ? { title: entry.title } : {}),
      ...(content ? { content } : {}),
      time: Number.isFinite(published) ? { published } : {},
    },
  ]
}

const parseJson = <T>(text: string): T | undefined => {
  try {
    return JSON.parse(text) as T
  } catch {
    return undefined
  }
}
