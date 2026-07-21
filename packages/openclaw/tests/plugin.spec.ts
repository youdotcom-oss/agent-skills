import { describe, expect, test } from 'bun:test'
import pluginEntry from '../plugin.ts'

const manifestPath = new URL('../openclaw.plugin.json', import.meta.url)

type McpServerConnectionResolver = {
  serverName: string
  resolve: (ctx: { requesterSenderId: string }) => { url: string; headers?: Record<string, string> }
}

const setYouApiKey = (value: string | undefined): void => {
  if (value === undefined) {
    delete process.env.YDC_API_KEY
    return
  }
  process.env.YDC_API_KEY = value
}

/** Captured registrations from a mock api. */
const mockApi = () => {
  const captured = {
    mcpResolvers: [] as McpServerConnectionResolver[],
  }
  pluginEntry.register({
    registerMcpServerConnectionResolver: (resolver: McpServerConnectionResolver) => {
      captured.mcpResolvers.push(resolver)
    },
  } as never)
  return captured
}

describe('plugin entry', () => {
  test('has the you id and You.com name', () => {
    expect(pluginEntry.id).toBe('you')
    expect(pluginEntry.name).toBe('You.com')
  })

  test('registers requester-scoped MCP connection resolvers for each You.com profile', () => {
    const { mcpResolvers } = mockApi()
    expect(mcpResolvers.map((resolver) => resolver.serverName)).toEqual(['you', 'you-free', 'you-finance', 'you-docs'])
  })

  test('default MCP resolver attaches the You.com API key without static config headers', () => {
    const previous = process.env.YDC_API_KEY
    setYouApiKey('test-key')
    try {
      const { mcpResolvers } = mockApi()
      const resolver = mcpResolvers.find((entry) => entry.serverName === 'you')
      expect(resolver).toBeDefined()
      const resolved = resolver?.resolve({ requesterSenderId: 'sender-1' })
      expect(resolved).toEqual({
        url: 'https://api.you.com/mcp',
        headers: { Authorization: 'Bearer test-key' },
      })
    } finally {
      setYouApiKey(previous)
    }
  })

  test('default MCP resolver omits auth headers when OAuth should handle auth', () => {
    const previous = process.env.YDC_API_KEY
    setYouApiKey(undefined)
    try {
      const { mcpResolvers } = mockApi()
      const resolver = mcpResolvers.find((entry) => entry.serverName === 'you')
      expect(resolver).toBeDefined()
      expect(resolver?.resolve({ requesterSenderId: 'sender-1' })).toEqual({
        url: 'https://api.you.com/mcp',
      })
    } finally {
      setYouApiKey(previous)
    }
  })

  test('free profile resolver uses unauthenticated search-only MCP profile', () => {
    const previous = process.env.YDC_API_KEY
    setYouApiKey('ignored-key')
    try {
      const { mcpResolvers } = mockApi()
      const resolver = mcpResolvers.find((entry) => entry.serverName === 'you-free')
      expect(resolver).toBeDefined()
      expect(resolver?.resolve({ requesterSenderId: 'sender-1' })).toEqual({
        url: 'https://api.you.com/mcp?profile=free',
      })
    } finally {
      setYouApiKey(previous)
    }
  })

  test('finance resolver scopes the MCP server to finance with optional API key auth', () => {
    const previous = process.env.YDC_API_KEY
    setYouApiKey('test-key')
    try {
      const { mcpResolvers } = mockApi()
      const resolver = mcpResolvers.find((entry) => entry.serverName === 'you-finance')
      expect(resolver).toBeDefined()
      expect(resolver?.resolve({ requesterSenderId: 'sender-1' })).toEqual({
        url: 'https://api.you.com/mcp?tools=you-finance',
        headers: { Authorization: 'Bearer test-key' },
      })
    } finally {
      setYouApiKey(previous)
    }
  })

  test('docs resolver uses the unauthenticated You.com documentation MCP server', () => {
    const previous = process.env.YDC_API_KEY
    setYouApiKey('ignored-key')
    try {
      const { mcpResolvers } = mockApi()
      const resolver = mcpResolvers.find((entry) => entry.serverName === 'you-docs')
      expect(resolver).toBeDefined()
      expect(resolver?.resolve({ requesterSenderId: 'sender-1' })).toEqual({
        url: 'https://you.com/docs/_mcp/server',
      })
    } finally {
      setYouApiKey(previous)
    }
  })
})

describe('plugin manifest', () => {
  test('declares YDC_API_KEY as setup env metadata for You.com auth', async () => {
    const manifest = JSON.parse(await Bun.file(manifestPath).text())
    expect(manifest.providers).toEqual(['you'])
    expect(manifest.setup).toEqual({
      providers: [
        {
          id: 'you',
          envVars: ['YDC_API_KEY'],
        },
      ],
      requiresRuntime: false,
    })
  })
})
