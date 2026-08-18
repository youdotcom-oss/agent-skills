import { describe, expect, test } from 'bun:test'
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import { createMcpHandler, fromJsonSchema, McpServer } from '@modelcontextprotocol/server'

type RegisteredTool = {
  name: string
  execute: (_toolCallId: string, params: unknown) => Promise<unknown>
}

type RegisteredEvent = {
  eventName: string
  handler: (...args: never[]) => unknown
}

const loadExtension = async () => (await import(`../main.ts?test=${Date.now()}-${Math.random()}`)).default

const createPiHarness = () => {
  const events: RegisteredEvent[] = []
  const tools: RegisteredTool[] = []

  const pi = {
    on: (eventName: string, handler: (...args: never[]) => unknown) => {
      events.push({ eventName, handler })
    },
    registerTool: (tool: RegisteredTool) => {
      tools.push(tool)
    },
  } as unknown as ExtensionAPI

  return { events, pi, tools }
}

/** Real in-process MCP server: the extension's transport fetch is wired straight to handler.fetch. */
const createTestServer = () => {
  let initializeCount = 0
  let failNextToolCall = false

  const handler = createMcpHandler(() => {
    const server = new McpServer({ name: 'fixture', version: '1.0.0' })
    server.registerTool(
      'echo',
      {
        description: 'Echo the query back',
        inputSchema: fromJsonSchema<{ query: string }>({
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
        }),
      },
      async ({ query }) => ({ content: [{ type: 'text' as const, text: `echo:${query}` }] }),
    )
    return server
  })

  const fetchHandler = async (url: string | URL, init?: RequestInit) => {
    const request = new Request(String(url), init)
    if (request.method === 'POST') {
      const body = (await request.clone().json()) as { method?: string }
      if (body.method === 'initialize') initializeCount += 1
      if (body.method === 'tools/call' && failNextToolCall) {
        failNextToolCall = false
        throw new TypeError('fetch failed')
      }
    }
    return handler.fetch(request)
  }

  return {
    close: () => handler.close(),
    failNextToolCall: () => {
      failNextToolCall = true
    },
    initializeCount: () => initializeCount,
    serverConfig: {
      url: 'http://fixture.local/mcp',
      authenticated: false,
      fetch: fetchHandler,
      promptGuidelines: ['fixture server'],
    },
  }
}

const findTool = (tools: RegisteredTool[], name: string) => {
  const tool = tools.find((registeredTool) => registeredTool.name === name)
  expect(tool).toBeDefined()
  if (!tool) throw new Error(`${name} tool was not registered`)
  return tool
}

describe('MCP connection lifecycle', () => {
  test('reuses one MCP connection across tool executions', async () => {
    const server = createTestServer()
    try {
      const extension = await loadExtension()
      const { pi, tools } = createPiHarness()

      await extension(pi, [server.serverConfig])
      // Tool discovery pays its own one-shot handshake; start counting from here.
      const afterDiscovery = server.initializeCount()

      const tool = findTool(tools, 'echo')
      const first = (await tool.execute('call-1', { query: 'one' })) as { content: Array<{ text: string }> }
      const second = (await tool.execute('call-2', { query: 'two' })) as { content: Array<{ text: string }> }

      expect(first.content[0]?.text).toBe('echo:one')
      expect(second.content[0]?.text).toBe('echo:two')
      expect(server.initializeCount()).toBe(afterDiscovery + 1)
    } finally {
      await server.close()
    }
  })

  test('reconnects and retries once when the connection drops', async () => {
    const server = createTestServer()
    try {
      const extension = await loadExtension()
      const { pi, tools } = createPiHarness()

      await extension(pi, [server.serverConfig])
      const afterDiscovery = server.initializeCount()

      const tool = findTool(tools, 'echo')
      await tool.execute('call-1', { query: 'one' })
      expect(server.initializeCount()).toBe(afterDiscovery + 1)

      server.failNextToolCall()
      const result = (await tool.execute('call-2', { query: 'two' })) as { content: Array<{ text: string }> }

      expect(result.content[0]?.text).toBe('echo:two')
      // The dropped pooled client was replaced: one new handshake, then success.
      expect(server.initializeCount()).toBe(afterDiscovery + 2)
    } finally {
      await server.close()
    }
  })

  test('closes pooled clients on session_shutdown', async () => {
    const server = createTestServer()
    try {
      const extension = await loadExtension()
      const { events, pi, tools } = createPiHarness()

      await extension(pi, [server.serverConfig])
      const afterDiscovery = server.initializeCount()

      const tool = findTool(tools, 'echo')
      await tool.execute('call-1', { query: 'one' })
      expect(server.initializeCount()).toBe(afterDiscovery + 1)

      const shutdown = events.find((event) => event.eventName === 'session_shutdown')
      expect(shutdown).toBeDefined()
      if (!shutdown) throw new Error('session_shutdown handler was not registered')
      await shutdown.handler()

      await tool.execute('call-2', { query: 'two' })
      // Shutdown dropped the pooled client: the next execution reconnects.
      expect(server.initializeCount()).toBe(afterDiscovery + 2)
    } finally {
      await server.close()
    }
  })
})
