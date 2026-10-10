import { describe, expect, mock, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const clientCalls = [] as Array<{ url?: string | URL; headers?: Record<string, string> }>

// Partial mock: spread the real SDK, replace only McpClient. bun's
// mock.module factory takes no arguments, so pull the original via require.
mock.module('@strands-agents/sdk', () => {
  const actual = require('@strands-agents/sdk') as Record<string, unknown>
  const serverNames = Object.keys(
    JSON.parse(readFileSync(new URL('../src/mcp.json', import.meta.url), 'utf-8')).mcpServers,
  ) as string[]
  class FakeMcpClient {
    toolName: string

    constructor(args: { url?: string | URL; headers?: Record<string, string> }) {
      clientCalls.push(args)
      this.toolName = serverNames[clientCalls.length - 1] ?? `tool-${clientCalls.length}`
    }

    async listTools() {
      return [{ name: this.toolName }]
    }

    set onToolsChanged(_callback: unknown) {}
  }
  return { ...actual, McpClient: FakeMcpClient }
})

import { YouDotComPlugin } from '../src/index.ts'

// The server set comes from the shipped mcp.json mirror, which the release
// sync owns. Expectations are derived from it so a sync that adds or removes
// a server never breaks these tests — the auth policy, not the topology, is
// what they pin down.
const ALL_SERVERS = Object.keys(
  JSON.parse(readFileSync(new URL('../src/mcp.json', import.meta.url), 'utf-8')).mcpServers,
) as string[]
const KEYED_SERVERS = ['you', 'you-finance', 'you-research']

/** Serves the real bundled skills directory through the sandbox interface. */
const realFsSandbox = {
  async listFiles(path: string) {
    return readdirSync(path, { withFileTypes: true }).map((entry) => ({
      name: entry.name,
      isDir: entry.isDirectory(),
    }))
  },
  async readText(path: string) {
    return readFileSync(path, 'utf-8')
  },
}

interface FakeAgent {
  addedTools: Array<{ name: string }>
  registeredHooks: Array<[unknown, (event: unknown) => unknown]>
  sandbox: typeof realFsSandbox
  appState: Map<string, unknown>
  toolRegistry: {
    add: (tools: Array<{ name: string }>) => void
    remove: (name: string) => void
    addOrReplace: (tools: Array<{ name: string }>) => void
  }
  addHook: (eventType: unknown, callback: (event: unknown) => unknown) => void
  systemPrompt?: string
}

function makeFakeAgent(): FakeAgent {
  const agent: FakeAgent = {
    addedTools: [],
    registeredHooks: [],
    sandbox: realFsSandbox,
    appState: new Map(),
    toolRegistry: {
      add: (tools) => agent.addedTools.push(...tools),
      remove: (_name) => {},
      addOrReplace: (tools) => {
        for (const tool of tools) {
          agent.addedTools.push(tool)
        }
      },
    },
    addHook: (_eventType, callback) => agent.registeredHooks.push([_eventType, callback]),
  }
  return agent
}

describe('YouDotComPlugin', () => {
  test('exposes a stable name', () => {
    const plugin = new YouDotComPlugin({ apiKey: '' })
    expect(plugin.name).toBe('youdotcom')
  })

  test('without an API key only keyless servers are enabled', () => {
    const plugin = new YouDotComPlugin({ apiKey: '' })
    expect(Object.keys(plugin.servers).sort()).toEqual(
      ALL_SERVERS.filter((name) => !KEYED_SERVERS.includes(name)).sort(),
    )
  })

  test('with an API key every server is enabled', () => {
    const plugin = new YouDotComPlugin({ apiKey: 'test-key' })
    expect(Object.keys(plugin.servers).sort()).toEqual([...ALL_SERVERS].sort())
  })

  test('keyed servers get a Bearer header, keyless servers get none', () => {
    clientCalls.length = 0
    const plugin = new YouDotComPlugin({ apiKey: 'test-key' })
    expect(clientCalls).toHaveLength(ALL_SERVERS.length)
    const headersByUrl = new Map(clientCalls.map((call) => [String(call.url), call.headers]))
    for (const [name, server] of Object.entries(plugin.servers)) {
      if (KEYED_SERVERS.includes(name)) {
        expect(headersByUrl.get(server.url)).toEqual({ Authorization: 'Bearer test-key' })
      } else {
        expect(headersByUrl.get(server.url)).toBeUndefined()
      }
    }
  })

  test('getTools vends the skills activation tool from the bundled skills directory', () => {
    const plugin = new YouDotComPlugin({ apiKey: '' })
    const toolNames = plugin.getTools().map((tool) => tool.name)
    expect(toolNames).toContain('skills')
  })

  test('initAgent registers one MCP tool per enabled server and the skills hook', async () => {
    clientCalls.length = 0
    const plugin = new YouDotComPlugin({ apiKey: 'test-key' })
    const agent = makeFakeAgent()

    await plugin.initAgent(agent as never)

    expect(agent.addedTools.map((tool) => tool.name).sort()).toEqual([...ALL_SERVERS].sort())
    // The inner AgentSkills hook (prompt injection); no capability note with a key.
    expect(agent.registeredHooks).toHaveLength(1)
  })

  test('keyless initAgent additionally registers the capability-note hook', async () => {
    const plugin = new YouDotComPlugin({ apiKey: '' })
    const agent = makeFakeAgent()

    await plugin.initAgent(agent as never)

    expect(agent.registeredHooks).toHaveLength(2)
    const [, noteHook] = agent.registeredHooks[1]!
    noteHook({ agent })
    expect(agent.systemPrompt).toContain('YDC_API_KEY')
    expect(agent.systemPrompt).toContain('you-finance')
  })

  test('capability-note hook appends a text block for structured prompts', async () => {
    const plugin = new YouDotComPlugin({ apiKey: '' })
    const agent = makeFakeAgent()
    await plugin.initAgent(agent as never)
    const [, noteHook] = agent.registeredHooks[1]!

    const structuredAgent = { ...agent, systemPrompt: [{ type: 'textBlock', text: 'base prompt' }] }
    noteHook({ agent: structuredAgent })

    expect(structuredAgent.systemPrompt).toHaveLength(2)
    expect(structuredAgent.systemPrompt?.[1]).toMatchObject({ type: 'textBlock' })
  })
})
