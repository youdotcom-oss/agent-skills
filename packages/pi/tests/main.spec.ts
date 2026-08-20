import { afterEach, describe, expect, mock, test } from 'bun:test'
import { createMcpHandler, fromJsonSchema, McpServer } from '@modelcontextprotocol/server'

type RegisteredTool = {
  name: string
  execute: (_toolCallId: string, params: unknown) => Promise<unknown>
}

type RegisteredEvent = {
  eventName: string
  handler: (...args: unknown[]) => unknown
}

const loadExtension = async () => (await import(`../main.ts?test=${Date.now()}-${Math.random()}`)).default

const createPiMock = () => {
  const events: RegisteredEvent[] = []
  const tools: RegisteredTool[] = []

  return {
    events,
    pi: {
      on: mock((eventName: string, handler: () => unknown) => {
        events.push({ eventName, handler })
      }),
      registerTool: mock((tool: RegisteredTool) => {
        tools.push(tool)
      }),
    },
    tools,
  }
}

const callBeforeAgentStart = async (
  events: RegisteredEvent[],
  systemPrompt: string,
): Promise<{ systemPrompt: string }> => {
  const handler = events.find((e) => e.eventName === 'before_agent_start')
  expect(handler).toBeDefined()
  if (!handler) throw new Error('before_agent_start handler not registered')

  const result = (await handler.handler({
    prompt: 'test',
    systemPrompt,
    systemPromptOptions: {},
    images: [],
  } as never)) as { systemPrompt: string } | undefined

  if (!result) throw new Error('handler returned nothing')
  return result
}

/** Real in-process MCP server: the extension's transport fetch is wired straight to handler.fetch. */
const createTestServer = () => {
  let closeWhileToolCallActive = 0
  let initializeCount = 0
  let failNextToolCall = false
  let slowToolCallActive = false
  let resolveSlowCallRelease: () => void = () => {}
  let resolveSlowCallStarted: () => void = () => {}
  const slowCallRelease = new Promise<void>((resolve) => {
    resolveSlowCallRelease = resolve
  })
  const slowCallStarted = new Promise<void>((resolve) => {
    resolveSlowCallStarted = resolve
  })

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
      async ({ query }) => {
        if (query === 'slow') {
          slowToolCallActive = true
          resolveSlowCallStarted()
          await slowCallRelease
          slowToolCallActive = false
        }
        return { content: [{ type: 'text' as const, text: `echo:${query}` }] }
      },
    )
    server.registerTool(
      'structured-echo',
      {
        description: 'Echo the query back as structured content',
        inputSchema: fromJsonSchema<{ query: string }>({
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
        }),
        outputSchema: fromJsonSchema<{ echo: string }>({
          type: 'object',
          properties: { echo: { type: 'string' } },
          required: ['echo'],
        }),
      },
      async ({ query }) => {
        const output = { echo: query }
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(output) }],
          structuredContent: output,
        }
      },
    )
    return server
  })

  const fetchHandler = async (url: string | URL, init?: RequestInit) => {
    const request = new Request(String(url), init)
    if (request.method === 'DELETE' && slowToolCallActive) {
      closeWhileToolCallActive += 1
    }
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
    closeWhileToolCallActive: () => closeWhileToolCallActive,
    failNextToolCall: () => {
      failNextToolCall = true
    },
    initializeCount: () => initializeCount,
    releaseSlowCall: () => resolveSlowCallRelease(),
    serverConfig: {
      url: 'http://fixture.local/mcp',
      authenticated: false,
      fetch: fetchHandler,
      promptGuidelines: ['fixture server'],
    },
    waitForSlowCall: () => slowCallStarted,
  }
}

const findTool = (tools: RegisteredTool[], name: string) => {
  const tool = tools.find((registeredTool) => registeredTool.name === name)
  expect(tool).toBeDefined()
  if (!tool) throw new Error(`${name} tool was not registered`)
  return tool
}

const YDC_API_KEY = process.env.YDC_API_KEY ?? ''

describe('Pi extension', () => {
  afterEach(() => {
    delete process.env.YDC_API_KEY
  })

  describe('tool registration', () => {
    test('registers bundled skills via resources_discover', async () => {
      const extension = await loadExtension()
      const { events, pi } = createPiMock()

      await extension(pi)

      const resourcesDiscover = events.find((event) => event.eventName === 'resources_discover')
      expect(resourcesDiscover).toBeDefined()
      if (!resourcesDiscover) throw new Error('resources_discover was not registered')

      expect(resourcesDiscover.handler()).toEqual({
        skillPaths: [expect.stringContaining('/packages/pi/skills')],
      })
    })

    test('registers all You.com MCP tool variants from real endpoints', async () => {
      const extension = await loadExtension()
      const { pi, tools } = createPiMock()
      process.env.YDC_API_KEY = YDC_API_KEY

      await extension(pi)

      const names = tools.map((tool) => tool.name)

      // Free-profile server returns only you-search (keyless)
      expect(names).toContain('you-search-free')

      // Finance server returns only you-finance
      expect(names).toContain('you-finance')

      // Base server returns you-contents, you-research (and NOT you-search or you-finance, which
      // are scoped to their own query-param endpoints)
      expect(names).toContain('you-contents')
      expect(names).toContain('you-research')

      // Docs server returns searchDocs
      expect(names).toContain('searchDocs')

      // No duplicate registrations across endpoints
      const duplicates = names.filter((name, i) => names.indexOf(name) !== i)
      expect(duplicates).toEqual([])
    })

    test('passes successful structured content to the model without JSON-wrapping the full result', async () => {
      const extension = await loadExtension()
      const { pi, tools } = createPiMock()
      process.env.YDC_API_KEY = YDC_API_KEY

      await extension(pi)
      const tool = tools.find((registeredTool) => registeredTool.name === 'you-search-free')
      expect(tool).toBeDefined()
      if (!tool) throw new Error('you-search-free tool was not registered')

      const result = (await tool.execute('call-1', { query: 'OpenAI' })) as {
        content: Array<{ type: string; text: string }>
        details: unknown
      }

      // Model-facing content is structuredContent, not JSON.stringify(result)
      expect(result.content.length).toBeGreaterThan(0)
      expect(result.content.every((block) => block.type === 'text')).toBe(true)
      const firstBlock = result.content[0]
      expect(firstBlock).toBeDefined()
      if (!firstBlock) throw new Error('content block missing')
      // The text must not be a JSON wrapper of the entire MCP response (which would include structuredContent)
      expect(firstBlock.text).not.toContain('structuredContent')
      expect(firstBlock.text).not.toMatch(/^\{"content":/)
      expect(result.details).toBeDefined()
    })

    test('rejects invalid tool input before crossing the MCP boundary', async () => {
      const extension = await loadExtension()
      const { pi, tools } = createPiMock()
      process.env.YDC_API_KEY = YDC_API_KEY

      await extension(pi)
      const tool = tools.find((registeredTool) => registeredTool.name === 'you-search-free')
      expect(tool).toBeDefined()
      if (!tool) throw new Error('you-search-free tool was not registered')

      await expect(tool.execute('call-1', [])).rejects.toThrow('params must be an object')
    })
  })

  describe('host context', () => {
    test('appends static host context identifying the MCP adapter config in before_agent_start', async () => {
      const extension = await loadExtension()
      const { pi, events } = createPiMock()
      process.env.YDC_API_KEY = YDC_API_KEY

      await extension(pi)

      const result = await callBeforeAgentStart(events, 'existing system prompt')

      expect(result.systemPrompt).toContain('existing system prompt')
      expect(result.systemPrompt).toContain('@youdotcom-oss/pi')
      expect(result.systemPrompt).toContain('Pi has no separate MCP configuration mechanism')
      // All four configs identified
      expect(result.systemPrompt).toContain('`you-search-free` (free profile, no auth)')
      expect(result.systemPrompt).toContain('https://api.you.com/mcp?profile=free')
      expect(result.systemPrompt).toContain('https://api.you.com/mcp?tools=you-finance')
      expect(result.systemPrompt).toContain('https://api.you.com/mcp')
      expect(result.systemPrompt).toContain('https://you.com/docs/_mcp/server')
    })
  })

  describe('MCP connection lifecycle', () => {
    test('pretty-prints structured content for successful tool calls', async () => {
      const server = createTestServer()
      try {
        const extension = await loadExtension()
        const { pi, tools } = createPiMock()

        await extension(pi, [server.serverConfig])

        const tool = findTool(tools, 'structured-echo')
        const result = (await tool.execute('call-1', { query: 'one' })) as {
          content: Array<{ text: string }>
          details: unknown
        }

        expect(result.content[0]?.text).toBe('{\n  "echo": "one"\n}')
        expect(result.details).toEqual({ echo: 'one' })
      } finally {
        await server.close()
      }
    })

    test('throws MCP tool execution errors so Pi marks the tool result as failed', async () => {
      const server = createTestServer()
      try {
        const extension = await loadExtension()
        const { pi, tools } = createPiMock()

        await extension(pi, [server.serverConfig])

        const tool = findTool(tools, 'structured-echo')

        await expect(tool.execute('call-1', { query: 1 })).rejects.toThrow('Input validation error')
      } finally {
        await server.close()
      }
    })

    test('reuses one MCP connection across tool executions', async () => {
      const server = createTestServer()
      try {
        const extension = await loadExtension()
        const { pi, tools } = createPiMock()

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
        const { pi, tools } = createPiMock()

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

    test('defers closing a dropped pooled client until concurrent calls drain', async () => {
      const server = createTestServer()
      try {
        const extension = await loadExtension()
        const { pi, tools } = createPiMock()

        await extension(pi, [server.serverConfig])
        const afterDiscovery = server.initializeCount()

        const tool = findTool(tools, 'echo')
        const slowResultPromise = tool.execute('call-slow', { query: 'slow' }) as Promise<{
          content: Array<{ text: string }>
        }>
        await server.waitForSlowCall()

        server.failNextToolCall()
        const retryResult = (await tool.execute('call-fail', { query: 'fail' })) as {
          content: Array<{ text: string }>
        }

        expect(retryResult.content[0]?.text).toBe('echo:fail')
        expect(server.initializeCount()).toBe(afterDiscovery + 2)
        expect(server.closeWhileToolCallActive()).toBe(0)

        server.releaseSlowCall()
        const slowResult = await slowResultPromise
        expect(slowResult.content[0]?.text).toBe('echo:slow')
        expect(server.closeWhileToolCallActive()).toBe(0)
      } finally {
        server.releaseSlowCall()
        await server.close()
      }
    })

    test('closes pooled clients on session_shutdown', async () => {
      const server = createTestServer()
      try {
        const extension = await loadExtension()
        const { events, pi, tools } = createPiMock()

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
})
