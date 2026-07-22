import { afterEach, describe, expect, mock, test } from 'bun:test'
import packageJson from '../../package.json' with { type: 'json' }

type RegisteredTool = {
  name: string
  execute: (_toolCallId: string, params: unknown) => Promise<unknown>
}

type RegisteredEvent = {
  eventName: string
  handler: () => unknown
}

const connectMock = mock(async (_transport: unknown): Promise<void> => {})
const closeMock = mock(async (): Promise<void> => {})
const callToolMock = mock(
  async (_input: unknown): Promise<unknown> => ({
    content: [{ type: 'text', text: 'ok' }],
    structuredContent: { answer: 'ok' },
  }),
)
const listToolsMock = mock((url: string) => ({
  tools: url.includes('/docs/')
    ? [{ name: 'searchDocs', description: 'Search You.com docs', inputSchema: { type: 'object' } }]
    : [
        { name: 'you-search', description: 'Search the web', inputSchema: { type: 'object' } },
        { name: 'you-contents', description: 'Extract page contents', inputSchema: { type: 'object' } },
        { name: 'you-research', description: 'Research a topic', inputSchema: { type: 'object' } },
        { name: 'you-finance', description: 'Research finance', inputSchema: { type: 'object' } },
      ],
}))
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

const loadExtension = async () => (await import(`../you.ts?test=${Date.now()}-${Math.random()}`)).default

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

describe('Pi extension', () => {
  const originalApiKey = process.env.YDC_API_KEY

  afterEach(() => {
    connectMock.mockClear()
    closeMock.mockClear()
    callToolMock.mockClear()
    listToolsMock.mockClear()
    clientConstructorMock.mockClear()
    transportMock.mockClear()
    delete process.env.YDC_API_KEY

    if (originalApiKey) {
      process.env.YDC_API_KEY = originalApiKey
    }
  })

  test('registers bundled skills via resources_discover', async () => {
    const extension = await loadExtension()
    const { events, pi } = createPiMock()
    process.env.YDC_API_KEY = 'test-key'

    await extension(pi)

    expect(pi.on).toHaveBeenCalled()
    const resourcesDiscover = events.find((event) => event.eventName === 'resources_discover')
    expect(resourcesDiscover).toBeDefined()

    if (!resourcesDiscover) {
      throw new Error('resources_discover was not registered')
    }

    expect(resourcesDiscover.handler()).toEqual({
      skillPaths: [expect.stringContaining('/packages/pi/skills')],
    })
  })

  test('bridges a Pi tool call to the hosted You.com MCP server', async () => {
    const extension = await loadExtension()
    const { pi, tools } = createPiMock()
    process.env.YDC_API_KEY = 'test-key'

    await extension(pi)
    transportMock.mockClear()
    connectMock.mockClear()
    closeMock.mockClear()
    const tool = tools.find((registeredTool) => registeredTool.name === 'you-search')
    expect(tool).toBeDefined()

    if (!tool) {
      throw new Error('you-search tool was not registered')
    }

    const result = await tool.execute('call-1', {
      query: 'OpenAI',
    })

    expect(transportMock).toHaveBeenCalledWith(
      new URL('https://api.you.com/mcp?profile=free'),
      expect.objectContaining({
        requestInit: {
          headers: {},
        },
      }),
    )
    expect(connectMock).toHaveBeenCalled()
    expect(clientConstructorMock).toHaveBeenCalledWith({
      name: '@youdotcom-oss/pi-plugin',
      version: packageJson.version,
    })
    expect(callToolMock).toHaveBeenCalledWith({ name: 'you-search', arguments: { query: 'OpenAI' } })
    expect(closeMock).toHaveBeenCalled()
    expect(result).toEqual({ content: [{ type: 'text', text: 'ok' }], structuredContent: { answer: 'ok' } })
  })

  test('registers free and finance MCP server variants', async () => {
    const extension = await loadExtension()
    const { pi, tools } = createPiMock()
    process.env.YDC_API_KEY = 'test-key'

    await extension(pi)

    expect(tools.map((tool) => tool.name).sort()).toEqual(
      ['searchDocs', 'you-contents', 'you-finance', 'you-research', 'you-search'].sort(),
    )

    const freeTool = tools.find((registeredTool) => registeredTool.name === 'you-search')
    const financeTool = tools.find((registeredTool) => registeredTool.name === 'you-finance')
    expect(freeTool).toBeDefined()
    expect(financeTool).toBeDefined()

    if (!freeTool || !financeTool) {
      throw new Error('variant tools were not registered')
    }

    transportMock.mockClear()
    await freeTool.execute('call-1', {
      query: 'OpenAI',
    })
    await financeTool.execute('call-2', {
      query: 'Nvidia earnings',
    })

    expect(transportMock).toHaveBeenNthCalledWith(
      1,
      new URL('https://api.you.com/mcp?profile=free'),
      expect.objectContaining({
        requestInit: {
          headers: {},
        },
      }),
    )
    expect(transportMock).toHaveBeenNthCalledWith(
      2,
      new URL('https://api.you.com/mcp?tools=you-finance'),
      expect.objectContaining({
        requestInit: {
          headers: {
            Authorization: 'Bearer test-key',
          },
        },
      }),
    )
  })

  test('rejects authenticated MCP variants when YDC_API_KEY is missing', async () => {
    const extension = await loadExtension()
    const { pi } = createPiMock()
    delete process.env.YDC_API_KEY

    await expect(extension(pi)).rejects.toThrow('YDC_API_KEY is required for this You.com MCP server variant')
  })

  test('registers You.com docs MCP server variant', async () => {
    const extension = await loadExtension()
    const { pi, tools } = createPiMock()
    process.env.YDC_API_KEY = 'ignored-key'

    await extension(pi)
    transportMock.mockClear()
    const docsTool = tools.find((registeredTool) => registeredTool.name === 'searchDocs')
    expect(docsTool).toBeDefined()

    if (!docsTool) {
      throw new Error('searchDocs tool was not registered')
    }

    await docsTool.execute('call-1', {
      query: 'MCP server',
    })

    expect(transportMock).toHaveBeenCalledWith(
      new URL('https://you.com/docs/_mcp/server'),
      expect.objectContaining({
        requestInit: {
          headers: {},
        },
      }),
    )
    expect(callToolMock).toHaveBeenCalledWith({ name: 'searchDocs', arguments: { query: 'MCP server' } })
  })

  test('rejects invalid tool input before crossing the MCP boundary', async () => {
    const extension = await loadExtension()
    const { pi, tools } = createPiMock()
    process.env.YDC_API_KEY = 'test-key'

    await extension(pi)
    connectMock.mockClear()
    const tool = tools.find((registeredTool) => registeredTool.name === 'you-search')
    expect(tool).toBeDefined()

    if (!tool) {
      throw new Error('you-search tool was not registered')
    }

    await expect(tool.execute('call-1', [])).rejects.toThrow('params must be an object')
    expect(connectMock).not.toHaveBeenCalled()
  })
})
