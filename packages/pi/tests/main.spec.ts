import { afterEach, describe, expect, mock, test } from 'bun:test'

type RegisteredTool = {
  name: string
  execute: (_toolCallId: string, params: unknown) => Promise<unknown>
}

type RegisteredEvent = {
  eventName: string
  handler: (...args: unknown[]) => unknown
}

const connectMock = mock(async (_transport: unknown): Promise<void> => {})
const closeMock = mock(async (): Promise<void> => {})
const callToolMock = mock(
  async (_input: unknown): Promise<unknown> => ({
    content: [{ type: 'text', text: 'ok' }],
    structuredContent: { answer: 'ok' },
  }),
)
const defaultListToolsImpl = (url: string) => ({
  tools: url.includes('/docs/')
    ? [{ name: 'searchDocs', description: 'Search You.com docs', inputSchema: { type: 'object' } }]
    : [
        { name: 'you-search', description: 'Search the web', inputSchema: { type: 'object' } },
        { name: 'you-contents', description: 'Extract page contents', inputSchema: { type: 'object' } },
        { name: 'you-research', description: 'Research a topic', inputSchema: { type: 'object' } },
        { name: 'you-finance', description: 'Research finance', inputSchema: { type: 'object' } },
      ],
})

const listToolsMock = mock(defaultListToolsImpl)
const clientConstructorMock = mock((_clientInfo: unknown): void => {})

class MockClient {
  url = ''

  constructor(clientInfo: unknown) {
    clientConstructorMock(clientInfo)
  }

  async connect(transport: unknown) {
    this.url = (transport as { url: URL }).url.href
    connectMock(transport)
  }

  async listTools() {
    return listToolsMock(this.url)
  }

  async callTool(input: unknown) {
    return callToolMock(input)
  }

  async close() {
    closeMock()
  }
}

const transportMock = mock((url: URL, options: unknown) => ({ options, url }))

mock.module('@modelcontextprotocol/sdk/client/index.js', () => ({ Client: MockClient }))
mock.module('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: transportMock,
}))

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

describe('Pi extension', () => {
  afterEach(() => {
    connectMock.mockClear()
    closeMock.mockClear()
    callToolMock.mockClear()
    listToolsMock.mockReset()
    listToolsMock.mockImplementation(defaultListToolsImpl)
    clientConstructorMock.mockClear()
    transportMock.mockClear()
    delete process.env.YDC_API_KEY
  })

  describe('tool registration', () => {
    test('registers bundled skills via resources_discover', async () => {
      const extension = await loadExtension()
      const { events, pi } = createPiMock()
      process.env.YDC_API_KEY = 'test-key'

      await extension(pi)

      const resourcesDiscover = events.find((event) => event.eventName === 'resources_discover')
      expect(resourcesDiscover).toBeDefined()
      if (!resourcesDiscover) throw new Error('resources_discover was not registered')

      expect(resourcesDiscover.handler()).toEqual({
        skillPaths: [expect.stringContaining('/packages/pi/skills')],
      })
    })

    test('registers all You.com MCP tool variants', async () => {
      const extension = await loadExtension()
      const { pi, tools } = createPiMock()
      process.env.YDC_API_KEY = 'test-key'

      await extension(pi)

      expect(tools.map((tool) => tool.name).sort()).toEqual(
        ['searchDocs', 'you-contents', 'you-finance', 'you-research', 'you-search'].sort(),
      )
    })

    test('bridges a Pi tool call to the free-profile You.com MCP server', async () => {
      const extension = await loadExtension()
      const { pi, tools } = createPiMock()
      process.env.YDC_API_KEY = 'test-key'

      await extension(pi)
      transportMock.mockClear()
      connectMock.mockClear()
      closeMock.mockClear()
      const tool = tools.find((registeredTool) => registeredTool.name === 'you-search')
      expect(tool).toBeDefined()
      if (!tool) throw new Error('you-search tool was not registered')

      await tool.execute('call-1', { query: 'OpenAI' })

      expect(transportMock).toHaveBeenCalledWith(
        new URL('https://api.you.com/mcp?profile=free'),
        expect.objectContaining({ requestInit: { headers: {} } }),
      )
      expect(callToolMock).toHaveBeenCalledWith({ name: 'you-search', arguments: { query: 'OpenAI' } })
      expect(closeMock).toHaveBeenCalled()
    })

    test('bridges the finance tool to the authenticated You.com MCP server', async () => {
      const extension = await loadExtension()
      const { pi, tools } = createPiMock()
      process.env.YDC_API_KEY = 'test-key'

      await extension(pi)
      transportMock.mockClear()
      const financeTool = tools.find((registeredTool) => registeredTool.name === 'you-finance')
      expect(financeTool).toBeDefined()
      if (!financeTool) throw new Error('you-finance tool was not registered')

      await financeTool.execute('call-2', { query: 'Nvidia earnings' })

      expect(transportMock).toHaveBeenCalledWith(
        new URL('https://api.you.com/mcp?tools=you-finance'),
        expect.objectContaining({
          requestInit: { headers: { Authorization: 'Bearer test-key' } },
        }),
      )
    })

    test('rejects invalid tool input before crossing the MCP boundary', async () => {
      const extension = await loadExtension()
      const { pi, tools } = createPiMock()
      process.env.YDC_API_KEY = 'test-key'

      await extension(pi)
      connectMock.mockClear()
      const tool = tools.find((registeredTool) => registeredTool.name === 'you-search')
      expect(tool).toBeDefined()
      if (!tool) throw new Error('you-search tool was not registered')

      await expect(tool.execute('call-1', [])).rejects.toThrow('params must be an object')
      expect(connectMock).not.toHaveBeenCalled()
    })
  })

  describe('host context', () => {
    test('appends static host context identifying the MCP adapter config in before_agent_start', async () => {
      const extension = await loadExtension()
      const { pi, events } = createPiMock()
      process.env.YDC_API_KEY = 'test-key'

      await extension(pi)

      const result = await callBeforeAgentStart(events, 'existing system prompt')

      expect(result.systemPrompt).toContain('existing system prompt')
      expect(result.systemPrompt).toContain('@youdotcom-oss/pi')
      expect(result.systemPrompt).toContain('Pi has no separate MCP configuration mechanism')
      // All four configs identified
      expect(result.systemPrompt).toContain('https://api.you.com/mcp?profile=free')
      expect(result.systemPrompt).toContain('https://api.you.com/mcp?tools=you-finance')
      expect(result.systemPrompt).toContain('https://api.you.com/mcp')
      expect(result.systemPrompt).toContain('https://you.com/docs/_mcp/server')
    })
  })
})
