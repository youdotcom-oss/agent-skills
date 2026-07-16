/**
 * Contract tests for the You.com OpenCode plugin.
 *
 * Driven entirely through the single public interface: the default-exported
 * plugin function. No implementation helpers are imported. The You.com remote
 * MCP server provides the tools; this plugin owns only the trust-boundary
 * floor — labeling You.com tool output as untrusted before the model sees it.
 *
 * @public
 */

import { describe, expect, test } from 'bun:test'
import plugin from '../plugin.ts'

/** The OpenCode plugin context. Only the fields the plugin reads are populated. */
const ctx = (): Parameters<typeof plugin>[0] =>
  ({
    project: { id: 'p' } as never,
    directory: '/tmp',
    worktree: '/tmp',
  }) as never

/** Runs the plugin and returns the one hook it should register. */
const hook = async (): Promise<NonNullable<Awaited<ReturnType<typeof plugin>>['tool.execute.after']>> => {
  const hooks = await plugin(ctx())
  const fn = hooks?.['tool.execute.after']
  if (!fn) throw new Error('plugin did not register tool.execute.after')
  return fn
}

/** Minimal `tool.execute.after` output shape the hook mutates in place. */
const out = (output: string) => ({ title: '', output, metadata: {} as Record<string, unknown> })

describe('plugin', () => {
  test('registers exactly a tool.execute.after hook', async () => {
    const hooks = await plugin(ctx())
    expect(typeof hooks['tool.execute.after']).toBe('function')
  })
})

describe('tool.execute.after', () => {
  test('wraps a you-search tool output as untrusted', async () => {
    const after = await hook()
    const o = out('AI breakthrough announced')
    await after({ tool: 'you-search', sessionID: 's', callID: 'c', args: {} }, o)
    expect(o.output).toContain('UNTRUSTED')
    expect(o.output).toContain('AI breakthrough announced')
    expect(o.output).not.toBe('AI breakthrough announced')
  })

  test.each(['you-search', 'you-contents', 'you-research', 'you-finance'])('wraps %s output', async (tool) => {
    const after = await hook()
    const o = out('payload')
    await after({ tool, sessionID: 's', callID: 'c', args: {} }, o)
    expect(o.output).toContain('UNTRUSTED')
  })

  test('wraps a host-namespaced you-search callable (mcp__you-com__you-search)', async () => {
    const after = await hook()
    const o = out('payload')
    await after({ tool: 'mcp__you-com__you-search', sessionID: 's', callID: 'c', args: {} }, o)
    expect(o.output).toContain('UNTRUSTED')
  })

  test('leaves a fused substring like myou-search untouched', async () => {
    const after = await hook()
    const o = out('payload')
    await after({ tool: 'myou-search', sessionID: 's', callID: 'c', args: {} }, o)
    expect(o.output).toBe('payload')
  })

  test('leaves a non-You.com tool output untouched', async () => {
    const after = await hook()
    const o = out('ls output')
    await after({ tool: 'bash', sessionID: 's', callID: 'c', args: {} }, o)
    expect(o.output).toBe('ls output')
  })

  test('does not double-wrap already-untrusted output', async () => {
    const after = await hook()
    const o = out('[UNTRUSTED EXTERNAL CONTENT]\npayload\n[END UNTRUSTED]')
    const first = o.output
    await after({ tool: 'you-search', sessionID: 's', callID: 'c', args: {} }, o)
    expect(o.output).toBe(first)
  })
})
