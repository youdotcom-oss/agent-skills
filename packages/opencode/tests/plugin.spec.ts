/**
 * Contract tests for the You.com OpenCode plugin.
 *
 * Driven entirely through the single public interface: the default-exported
 * plugin function. No implementation helpers are imported. The You.com remote
 * MCP server provides the tools; this plugin installs the server configs and
 * registers the packaged OpenCode skill path.
 *
 * @public
 */

import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import plugin from '../plugin.ts'

/** The OpenCode plugin context. Only the fields the plugin reads are populated. */
const ctx = (): Parameters<typeof plugin>[0] =>
  ({
    project: { id: 'p' } as never,
    directory: '/tmp',
    worktree: '/tmp',
  }) as never

const skillsDir = join(import.meta.dirname, '..', 'skills')

type ConfigWithSkills = Parameters<NonNullable<Awaited<ReturnType<typeof plugin>>['config']>>[0] & {
  skills?: { paths?: string[] }
}

describe('plugin', () => {
  test('registers a config hook', async () => {
    const hooks = await plugin(ctx())
    expect(typeof hooks.config).toBe('function')
    expect(hooks['shell.env']).toBeUndefined()
    expect(hooks['tool.execute.after']).toBeUndefined()
  })

  test('installs You.com remote MCP server profiles', async () => {
    const hooks = await plugin(ctx())
    const config = hooks.config
    expect(typeof config).toBe('function')
    if (!config) throw new Error('plugin did not register config')

    const input = {} as Parameters<typeof config>[0]
    await config(input)

    expect(input.mcp?.you).toEqual({
      type: 'remote',
      url: 'https://api.you.com/mcp',
      enabled: true,
      oauth: {},
    })
    expect(input.mcp?.['you-free']).toEqual({
      type: 'remote',
      url: 'https://api.you.com/mcp?profile=free',
      enabled: true,
    })
    expect(input.mcp?.['you-finance']).toEqual({
      type: 'remote',
      url: 'https://api.you.com/mcp?tools=you-finance',
      enabled: true,
      oauth: {},
    })
    expect(input.mcp?.['you-docs']).toEqual({
      type: 'remote',
      url: 'https://you.com/docs/_mcp/server',
      enabled: true,
    })
  })

  test('registers packaged OpenCode skill paths', async () => {
    const hooks = await plugin(ctx())
    const config = hooks.config
    expect(typeof config).toBe('function')
    if (!config) throw new Error('plugin did not register config')

    const input = {} as ConfigWithSkills
    await config(input)

    expect(input.instructions).toEqual([])
    expect(input.skills?.paths).toContain(skillsDir)
  })
})
