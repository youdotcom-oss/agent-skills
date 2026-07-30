import { afterEach, describe, expect, mock, test } from 'bun:test'

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

    test('passes MCP content text blocks to the model without JSON-wrapping the full result', async () => {
      const extension = await loadExtension()
      const { pi, tools } = createPiMock()
      process.env.YDC_API_KEY = YDC_API_KEY

      await extension(pi)
      const tool = tools.find((registeredTool) => registeredTool.name === 'you-search-free')
      expect(tool).toBeDefined()
      if (!tool) throw new Error('you-search-free tool was not registered')

      const result = (await tool.execute('call-1', { query: 'OpenAI' })) as {
        content: Array<{ type: string; text: string }>
        details: { structuredContent?: unknown }
      }

      // Model-facing content is raw text blocks from the MCP server, not JSON.stringify(result)
      expect(result.content.length).toBeGreaterThan(0)
      expect(result.content.every((block) => block.type === 'text')).toBe(true)
      const firstBlock = result.content[0]
      expect(firstBlock).toBeDefined()
      if (!firstBlock) throw new Error('content block missing')
      // The text must not be a JSON wrapper of the entire MCP response (which would include structuredContent)
      expect(firstBlock.text).not.toContain('structuredContent')
      expect(firstBlock.text).not.toMatch(/^\{"content":/)
      // Full raw result (including structuredContent) is preserved in details for UI/logs
      expect(result.details.structuredContent).toBeDefined()
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
})
