/**
 * Contract tests for the You.com OpenCode plugin.
 *
 * Driven entirely through the single public interface: the default export.
 * No implementation helpers are imported. The You.com remote MCP servers
 * provide the tools; the plugin installs the server configs and registers the
 * packaged OpenCode skills through OpenCode 2 domain transforms.
 *
 * @public
 */

import { beforeAll, describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import plugin from '../plugin.ts'
import { buildSkills } from '../scripts/build.ts'

const skillsDir = join(import.meta.dirname, '..', 'skills')

// The packaged skills directory is a build artifact (gitignored). Rebuild it
// so a bare `bun test` on a fresh checkout has the SKILL.md files to read.
beforeAll(async () => {
  await buildSkills()
})

/** A minimal OpenCode 2 plugin context that records transform registrations. */
const v2Ctx = () => {
  const servers = new Map<string, Record<string, unknown>>()
  const skills: Record<string, unknown>[] = []
  const ctx = {
    mcp: {
      transform: async (callback: (editor: { set: (name: string, config: Record<string, unknown>) => void }) => void) =>
        callback({ set: (name, config) => servers.set(name, config) }),
    },
    skill: {
      transform: async (callback: (editor: { add: (skill: Record<string, unknown>) => void }) => void) =>
        callback({ add: (skill) => skills.push(skill) }),
    },
  }
  return { ctx, servers, skills }
}

describe('plugin', () => {
  test('exposes only the OpenCode 2 plugin contract', () => {
    expect(plugin.id).toBe('youdotcom')
    expect(typeof plugin.setup).toBe('function')
    expect('server' in plugin).toBe(false)
  })

  test('registers You.com remote MCP servers via the mcp transform', async () => {
    const { ctx, servers } = v2Ctx()
    await plugin.setup(ctx as never)

    expect([...servers.keys()].sort()).toEqual(['you', 'you-docs', 'you-finance', 'you-free', 'you-research'])
    expect(servers.get('you')).toEqual({ type: 'remote', url: 'https://api.you.com/mcp' })
    expect(servers.get('you-free')).toEqual({ type: 'remote', url: 'https://api.you.com/mcp?profile=free' })
    expect(servers.get('you-finance')).toEqual({ type: 'remote', url: 'https://api.you.com/mcp/finance' })
    expect(servers.get('you-research')).toEqual({ type: 'remote', url: 'https://api.you.com/mcp/research' })
    expect(servers.get('you-docs')).toEqual({ type: 'remote', url: 'https://you.com/docs/_mcp/server' })
    for (const config of servers.values()) {
      expect('enabled' in config).toBe(false)
      expect('oauth' in config).toBe(false)
    }
  })

  test('registers each bundled skill via the skill transform', async () => {
    const { ctx, skills } = v2Ctx()
    await plugin.setup(ctx as never)

    const byId = new Map(skills.map((skill) => [skill.id, skill]))
    for (const id of ['you-discover', 'you-finance', 'you-research', 'you-web']) {
      const skill = byId.get(id)
      expect(skill, `bundled skill ${id}`).toBeDefined()
      if (!skill) continue
      expect(skill.name).toBe(id)
      expect(typeof skill.description).toBe('string')
      expect((skill.description as string).length).toBeGreaterThan(0)
      expect(skill.path).toBe(join(skillsDir, id))
      expect(skill.content as string).not.toMatch(/^---/)
      expect((skill.content as string).trim().length).toBeGreaterThan(0)
    }
  })
})
