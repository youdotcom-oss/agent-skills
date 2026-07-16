/**
 * Plugin contract tests — driven entirely through the single public interface
 * (the default plugin entry). No implementation helpers are imported.
 *
 * @public
 */

import { describe, expect, test } from 'bun:test'
import { wrapExternalContent } from 'openclaw/plugin-sdk/provider-web-fetch'
import type { AgentToolResultMiddlewareEvent } from 'openclaw/plugin-sdk/agent-harness-runtime'
import pluginEntry from '../plugin.ts'

type Middleware = (event: AgentToolResultMiddlewareEvent) => unknown

/** Registers the plugin against a mock api and returns the one middleware it registers. */
const registeredMiddleware = (): Middleware => {
  let captured: Middleware | undefined
  pluginEntry.register({
    registerAgentToolResultMiddleware: (handler: Middleware) => {
      captured = handler
    },
  } as never)
  if (!captured) throw new Error('plugin did not register a middleware')
  return captured
}

/** Builds a middleware event fixture with the required `result.details` field. */
const event = (
  toolName: string,
  content: AgentToolResultMiddlewareEvent['result']['content'],
): AgentToolResultMiddlewareEvent => ({ toolName, toolCallId: 'c1', args: {}, result: { content, details: {} } })

const textOf = (outcome: unknown, i = 0): string =>
  ((outcome as { result: { content: Array<{ type: string; text?: string }> } }).result.content[i]?.text) ?? ''

describe('plugin entry', () => {
  test('has the you id and You.com name', () => {
    expect(pluginEntry.id).toBe('you')
    expect(pluginEntry.name).toBe('You.com')
  })

  test('register registers exactly one agent tool-result middleware', () => {
    // RED would fail if register threw or registered nothing; capture proves exactly one.
    expect(typeof registeredMiddleware()).toBe('function')
  })
})

describe('registered middleware', () => {
  test('wraps a you-search text result as untrusted external content', () => {
    const mw = registeredMiddleware()
    const outcome = mw(event('you-search', [{ type: 'text', text: 'AI breakthrough' }]))
    expect(textOf(outcome)).toContain('<<<EXTERNAL_UNTRUSTED_CONTENT')
    expect(textOf(outcome)).toContain('AI breakthrough')
  })

  test('wraps every text item, leaving image items untouched', () => {
    const mw = registeredMiddleware()
    const outcome = mw(event('you-contents', [
      { type: 'text', text: 'page one' },
      { type: 'image', data: 'base64...', mimeType: 'image/png' },
      { type: 'text', text: 'page two' },
    ])) as { result: { content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> } }
    expect(outcome.result.content[0]?.text).toContain('<<<EXTERNAL_UNTRUSTED_CONTENT')
    expect(outcome.result.content[1]).toEqual({ type: 'image', data: 'base64...', mimeType: 'image/png' })
    expect(outcome.result.content[2]?.text).toContain('<<<EXTERNAL_UNTRUSTED_CONTENT')
  })

  test.each(['you-search', 'you-contents', 'you-research', 'you-finance'])('wraps %s results', (name) => {
    const mw = registeredMiddleware()
    const outcome = mw(event(name, [{ type: 'text', text: 'x' }]))
    expect(textOf(outcome)).toContain('<<<EXTERNAL_UNTRUSTED_CONTENT')
  })

  test('wraps a host-namespaced you-search callable (mcp__you-com__you-search)', () => {
    const mw = registeredMiddleware()
    const outcome = mw(event('mcp__you-com__you-search', [{ type: 'text', text: 'x' }]))
    expect(textOf(outcome)).toContain('<<<EXTERNAL_UNTRUSTED_CONTENT')
  })

  test('leaves a fused substring like myou-search untouched', () => {
    const mw = registeredMiddleware()
    expect(mw(event('myou-search', [{ type: 'text', text: 'x' }]))).toBeUndefined()
  })

  test('returns undefined for a non-You.com tool (leave output untouched)', () => {
    const mw = registeredMiddleware()
    expect(mw(event('bash', [{ type: 'text', text: 'ls' }]))).toBeUndefined()
  })

  test('is idempotent — already-wrapped content is not re-wrapped', () => {
    const mw = registeredMiddleware()
    const wrapped = wrapExternalContent('already wrapped', { source: 'web_search' })
    const outcome = mw(event('you-search', [{ type: 'text', text: wrapped }]))
    expect(textOf(outcome)).toBe(wrapped)
  })
})
