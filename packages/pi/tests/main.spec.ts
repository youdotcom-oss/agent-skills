import { afterEach, describe, expect, mock, test } from 'bun:test'
import { ompMcpJson } from '../scripts/build.ts'

type McpServerConfig = Record<string, unknown>

type RegisteredEvent = {
  eventName: string
  handler: (...args: unknown[]) => unknown
}

const loadExtension = async () => (await import(`../main.ts?test=${Date.now()}-${Math.random()}`)).default

// Build-generated omp config (gitignored); the disk invariant below only runs
// when `bun run build` has produced it.
const generatedMcpJson = Bun.file(new URL('../mcp.json', import.meta.url))
const hasGeneratedMcpJson = await generatedMcpJson.exists()

const createPiMock = () => {
  const events: RegisteredEvent[] = []
  const servers: [string, McpServerConfig][] = []

  return {
    events,
    pi: {
      on: mock((eventName: string, handler: () => unknown) => {
        events.push({ eventName, handler })
      }),
      registerMcpServer: mock((name: string, config: McpServerConfig) => {
        servers.push([name, config])
      }),
    },
    servers,
  }
}

const originalApiKey = process.env.YDC_API_KEY

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.YDC_API_KEY
  else process.env.YDC_API_KEY = originalApiKey
})

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

describe('MCP server registration', () => {
  test('registers the six You.com MCP servers with urls and direct exposure', async () => {
    delete process.env.YDC_API_KEY
    const { pi, servers } = createPiMock()
    const plugin = await loadExtension()
    await plugin(pi)

    expect(Object.fromEntries(servers)).toEqual({
      you: {
        url: 'https://api.you.com/mcp',
        exposure: 'direct',
      },
      'you-finance': {
        url: 'https://api.you.com/mcp/finance',
        exposure: 'direct',
      },
      'you-research': {
        url: 'https://api.you.com/mcp/research',
        exposure: 'direct',
      },
      'you-free': {
        url: 'https://api.you.com/mcp?profile=free',
        exposure: 'direct',
        toolExposure: { 'you-discover': 'hidden' },
      },
      'you-discover': {
        url: 'https://api.you.com/mcp?profile=discover',
        exposure: 'direct',
      },
      'you-docs': {
        url: 'https://you.com/docs/_mcp/server',
        exposure: 'direct',
      },
    })
  })

  test('sends no Authorization header without YDC_API_KEY so Pi offers OAuth', async () => {
    delete process.env.YDC_API_KEY
    const { pi, servers } = createPiMock()
    const plugin = await loadExtension()
    await plugin(pi)

    for (const [, config] of servers) {
      expect(config.headers).toBeUndefined()
    }
  })

  test('sends YDC_API_KEY as a bearer token on the keyed servers only', async () => {
    process.env.YDC_API_KEY = 'test-key'
    const { pi, servers } = createPiMock()
    const plugin = await loadExtension()
    await plugin(pi)

    const keyed = ['you', 'you-finance', 'you-research']
    const keyless = ['you-free', 'you-discover', 'you-docs']
    for (const [serverName, config] of servers) {
      if (keyed.includes(serverName)) {
        expect(config.headers).toEqual({ Authorization: 'Bearer test-key' })
      }
      if (keyless.includes(serverName)) {
        expect(config.headers).toBeUndefined()
      }
    }
  })
})

// omp discovers the package-level mcp.json instead of pi.registerMcpServer;
// it is generated from the repo-root mcp.json by scripts/build.ts, so the
// contract is tested against the transform (source, not a build artifact).
describe('bundled mcp.json generation', () => {
  const AUTH_COMMAND = '!if [ -n "$YDC_API_KEY" ]; then printf \'Bearer %s\' "$YDC_API_KEY"; fi'

  const source = {
    mcpServers: {
      you: { type: 'streamable-http', url: 'https://api.you.com/mcp' },
      'you-finance': { type: 'streamable-http', url: 'https://api.you.com/mcp/finance' },
      'you-research': { type: 'streamable-http', url: 'https://api.you.com/mcp/research' },
      'you-discover': { type: 'streamable-http', url: 'https://api.you.com/mcp?profile=discover' },
      'you-docs': { type: 'streamable-http', url: 'https://you.com/docs/_mcp/server' },
    },
  }

  test('rewrites transport, injects you-free, adds !command auth to keyed servers', () => {
    expect(ompMcpJson(source)).toEqual({
      mcpServers: {
        you: { type: 'http', url: 'https://api.you.com/mcp', headers: { Authorization: AUTH_COMMAND } },
        'you-finance': {
          type: 'http',
          url: 'https://api.you.com/mcp/finance',
          headers: { Authorization: AUTH_COMMAND },
        },
        'you-research': {
          type: 'http',
          url: 'https://api.you.com/mcp/research',
          headers: { Authorization: AUTH_COMMAND },
        },
        'you-discover': { type: 'http', url: 'https://api.you.com/mcp?profile=discover' },
        'you-docs': { type: 'http', url: 'https://you.com/docs/_mcp/server' },
        'you-free': { type: 'http', url: 'https://api.you.com/mcp?profile=free' },
      },
    })
  })

  test('fails on root servers not classified keyed or keyless', () => {
    const unknown = { mcpServers: { 'you-pro': { type: 'streamable-http', url: 'https://api.you.com/mcp/pro' } } }
    expect(() => ompMcpJson(unknown)).toThrow('Unclassified')
  })

  test.skipIf(!hasGeneratedMcpJson)(
    'when built, the generated file matches the transform of the root mcp.json',
    async () => {
      expect(await generatedMcpJson.json()).toEqual(
        ompMcpJson(await Bun.file(new URL('../../../mcp.json', import.meta.url)).json()),
      )
    },
  )
})

describe('runtimes without registerMcpServer (omp)', () => {
  test('loads without throwing and still registers skills and host context', async () => {
    const { pi, events } = createPiMock()
    const plugin = await loadExtension()

    await plugin({ on: pi.on })

    expect(events.map((e) => e.eventName).sort()).toEqual(['before_agent_start', 'resources_discover'])
  })
})

describe('skill resources', () => {
  test('registers bundled skills via resources_discover', async () => {
    const { pi, events } = createPiMock()
    const plugin = await loadExtension()
    await plugin(pi)

    const handler = events.find((e) => e.eventName === 'resources_discover')
    expect(handler).toBeDefined()
    if (!handler) throw new Error('resources_discover handler not registered')

    const result = (await handler.handler()) as { skillPaths: string[] }
    expect(result.skillPaths).toHaveLength(1)
    expect(result.skillPaths[0]).toMatch(/skills$/)
  })
})

describe('host context', () => {
  test('appends the server map, naming scheme, and override mechanism to the system prompt', async () => {
    const { pi, events } = createPiMock()
    const plugin = await loadExtension()
    await plugin(pi)

    const { systemPrompt } = await callBeforeAgentStart(events, 'BASE PROMPT')
    expect(systemPrompt).toContain('BASE PROMPT')
    expect(systemPrompt).toContain('mcp__<server>__<tool>')
    for (const url of [
      'https://api.you.com/mcp',
      'https://api.you.com/mcp/finance',
      'https://api.you.com/mcp/research',
      'https://api.you.com/mcp?profile=free',
      'https://api.you.com/mcp?profile=discover',
      'https://you.com/docs/_mcp/server',
    ]) {
      expect(systemPrompt).toContain(url)
    }
    expect(systemPrompt).toContain('/mcp')
    expect(systemPrompt).toContain('mcp.json')
    expect(systemPrompt).toContain('untrusted external data')
  })
})
