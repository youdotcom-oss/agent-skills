import { describe, expect, test } from 'bun:test'
import { Context } from '@deepseek-ai/cordis'
import * as McpClientPlugin from '@deepseek-ai/dsh-mcp-client'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as SkillFilesystemPlugin from '@deepseek-ai/dsh-skill-filesystem'
import * as youcomPlugin from '../src/index.ts'
import {
  applyMcpServers,
  applySkills,
  buildMcpClientConfig,
  name,
  SKILL_PROVIDER_NAME,
  YOUCOM_MCP_SERVERS,
} from '../src/index.ts'

describe('YOUCOM_MCP_SERVERS', () => {
  test('lists the five You.com MCP servers with the right auth requirement', () => {
    expect(YOUCOM_MCP_SERVERS.map((server) => [server.serverName, server.authenticated])).toEqual([
      ['you', true],
      ['you-free', false],
      ['you-finance', true],
      ['you-research', true],
      ['you-docs', false],
    ])
  })
})

const findServer = (serverName: string) => {
  const server = YOUCOM_MCP_SERVERS.find((candidate) => candidate.serverName === serverName)
  if (!server) throw new Error(`${serverName} missing from YOUCOM_MCP_SERVERS`)
  return server
}

describe('buildMcpClientConfig', () => {
  test('adds an Authorization header for an authenticated server when a key is set', () => {
    expect(buildMcpClientConfig(findServer('you'), 'test-key')).toEqual({
      transport: 'streamable-http',
      serverName: 'you',
      url: 'https://api.you.com/mcp',
      headers: { Authorization: 'Bearer test-key' },
      toolCallTimeoutMs: 60_000,
      failOnStartupError: false,
    })
  })

  test('omits the Authorization header for an authenticated server with no key', () => {
    expect(buildMcpClientConfig(findServer('you'), undefined).headers).toEqual({})
  })

  test('never adds an Authorization header for a keyless server, even if a key is set', () => {
    expect(buildMcpClientConfig(findServer('you-free'), 'test-key').headers).toEqual({})
  })
})

/** Records `ctx.plugin()` calls without mounting anything real — no network, no Cordis. */
const fakeContext = () => {
  const mounted: { plugin: unknown; config: unknown }[] = []
  const injected: { names: string[]; cb: (ctx: Context) => void }[] = []
  const ctx = {
    plugin: (plugin: unknown, config?: unknown) => {
      mounted.push({ plugin, config })
      return { dispose: async () => {} }
    },
    // `launchEnvironmentOf` calls `ctx.get('launchEnvironment')` and falls
    // back to a process.env snapshot when the slot is empty — returning
    // undefined here preserves that fallback.
    get: (_key: string) => undefined,
    // `apply` defers web-provider registration via `ctx.inject(['web'], …)`.
    // The real Cordis Context only invokes the callback once the named
    // services are available; here we just record it so tests can verify
    // the deferral (or invoke it manually with a fake web seam).
    inject: (names: string[], cb: (ctx: Context) => void) => {
      injected.push({ names: Array.isArray(names) ? names : [names], cb })
      return { dispose: async () => {} }
    },
  }
  return { ctx: ctx as unknown as Context, mounted, injected }
}

describe('applySkills', () => {
  test('mounts the filesystem skill provider with a scoped provider name and no default roots', () => {
    const { ctx, mounted } = fakeContext()
    applySkills(ctx)

    expect(mounted).toHaveLength(1)
    expect(mounted[0]?.plugin).toBe(SkillFilesystemPlugin)
    expect(mounted[0]?.config).toMatchObject({
      providerName: SKILL_PROVIDER_NAME,
      includeDefaultRoots: false,
    })
    const config = mounted[0]?.config as { customSkillDirs: string[] }
    expect(config.customSkillDirs).toHaveLength(1)
    expect(config.customSkillDirs[0]).toMatch(/packages[/\\]dsh-plugin[/\\]skills$/)
  })
})

describe('applyMcpServers', () => {
  test('mounts one mcp-client instance per server, using the given key', () => {
    const { ctx, mounted } = fakeContext()
    applyMcpServers(ctx, 'test-key')

    expect(mounted).toHaveLength(YOUCOM_MCP_SERVERS.length)
    expect(mounted.every((entry) => entry.plugin === McpClientPlugin)).toBe(true)
    const serverNames = mounted.map((entry) => (entry.config as { serverName: string }).serverName)
    expect(serverNames).toEqual(YOUCOM_MCP_SERVERS.map((server) => server.serverName))
  })

  test('falls back to $YDC_API_KEY when no key argument is given', () => {
    const prev = process.env.YDC_API_KEY
    process.env.YDC_API_KEY = 'env-key'
    try {
      const { ctx, mounted } = fakeContext()
      applyMcpServers(ctx)
      const youConfig = mounted.find((entry) => (entry.config as { serverName: string }).serverName === 'you')
        ?.config as { headers: Record<string, string> }
      expect(youConfig.headers).toEqual({ Authorization: 'Bearer env-key' })
    } finally {
      if (prev === undefined) delete process.env.YDC_API_KEY
      else process.env.YDC_API_KEY = prev
    }
  })
})

describe('apply', () => {
  test('mounts the skill provider and every mcp server', () => {
    const { ctx, mounted } = fakeContext()
    youcomPlugin.apply(ctx)
    expect(mounted).toHaveLength(1 + YOUCOM_MCP_SERVERS.length)
  })

  test('passes a configured apiKey through to the MCP servers, over the environment', () => {
    const prev = process.env.YDC_API_KEY
    process.env.YDC_API_KEY = 'env-key'
    try {
      const { ctx, mounted } = fakeContext()
      youcomPlugin.apply(ctx, { apiKey: 'config-key' })
      const youConfig = mounted.find((entry) => (entry.config as { serverName: string }).serverName === 'you')
        ?.config as { headers: Record<string, string> }
      expect(youConfig.headers).toEqual({ Authorization: 'Bearer config-key' })
    } finally {
      if (prev === undefined) delete process.env.YDC_API_KEY
      else process.env.YDC_API_KEY = prev
    }
  })

  test('has no default export (namespace plugin export shape)', () => {
    expect('default' in youcomPlugin).toBe(false)
  })
})

describe('dsh-plugin skill registration (real ctx.skills, no network)', () => {
  test('registers the five bundled You.com skills under the youcom provider', async () => {
    const ctx = new Context()
    await ctx.plugin(SkillRegistry)
    const fiber = await ctx.plugin({ name, apply: applySkills })

    const summaries = await ctx.skills.list()
    expect(summaries.map((summary) => summary.name).sort()).toEqual(
      ['you-discover', 'you-finance', 'you-free', 'you-research', 'you-web'].sort(),
    )
    for (const summary of summaries) {
      expect(summary.provider).toBe(SKILL_PROVIDER_NAME)
    }

    await fiber.dispose()
  })

  test('loads a full skill body, not just its summary', async () => {
    const ctx = new Context()
    await ctx.plugin(SkillRegistry)
    const fiber = await ctx.plugin({ name, apply: applySkills })

    const skill = await ctx.skills.get('you-web')
    expect(skill?.content).toContain('you-search')
    expect(skill?.content.length).toBeGreaterThan(0)

    await fiber.dispose()
  })
})
