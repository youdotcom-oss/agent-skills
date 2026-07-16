/**
 * Contract tests for the You.com Claude Code PostToolUse hook.
 *
 * Driven entirely through the single public transform `wrapYouComToolResult`.
 * The You.com remote MCP server (bundled via .mcp.json) provides the tools;
 * this hook owns only the non-negotiable trust-boundary floor — replacing a
 * You.com tool's output with an untrusted-labeled version via Claude Code's
 * `PostToolUse` → `hookSpecificOutput.updatedToolOutput`, before the model
 * sees it. Non-You.com tools pass through untouched.
 *
 * @public
 */

import { describe, expect, test } from 'bun:test'
import { wrapYouComToolResult } from '../hooks/you-com.ts'

/** Builds a PostToolUse input: an MCP-standard tool_response object. */
const input = (tool_name: string, content: unknown[]) => ({
  hook_event_name: 'PostToolUse',
  tool_name,
  tool_input: {},
  tool_response: { content },
  tool_use_id: 'c1',
  cwd: '/p',
})

const replaced = (out: unknown): unknown =>
  (out as { hookSpecificOutput: { updatedToolOutput: unknown } }).hookSpecificOutput.updatedToolOutput

describe('wrapYouComToolResult', () => {
  test('wraps a you-search text result as untrusted', () => {
    const out = wrapYouComToolResult(input('mcp__you-com__you-search', [{ type: 'text', text: 'AI breakthrough' }]))
    const r = replaced(out) as { content: Array<{ type: string; text: string }> }
    expect(r.content[0]?.text).toContain('UNTRUSTED')
    expect(r.content[0]?.text).toContain('AI breakthrough')
  })

  test('wraps every text item, leaving image items untouched', () => {
    const out = wrapYouComToolResult(input('mcp__you-com__you-contents', [
      { type: 'text', text: 'page one' },
      { type: 'image', data: 'b64', mimeType: 'image/png' },
      { type: 'text', text: 'page two' },
    ]))
    const r = replaced(out) as { content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }
    expect(r.content[0]?.text).toContain('UNTRUSTED')
    expect(r.content[1]).toEqual({ type: 'image', data: 'b64', mimeType: 'image/png' })
    expect(r.content[2]?.text).toContain('UNTRUSTED')
  })

  test.each([
    'mcp__you-com__you-search',
    'mcp__you-com__you-contents',
    'mcp__you-com__you-research',
    'mcp__you-com__you-finance',
    'mcp__plugin_you_you-com__you-search',
  ])('wraps %s', (tool) => {
    const out = wrapYouComToolResult(input(tool, [{ type: 'text', text: 'x' }]))
    expect((replaced(out) as { content: Array<{ text: string }> }).content[0]?.text).toContain('UNTRUSTED')
  })

  test('leaves a fused substring like myou-search untouched (returns undefined)', () => {
    expect(wrapYouComToolResult(input('mcp__you-com__myou-search', [{ type: 'text', text: 'x' }]))).toBeUndefined()
  })

  test('returns undefined for a non-You.com tool', () => {
    expect(wrapYouComToolResult(input('Bash', [{ type: 'text', text: 'ls' }]))).toBeUndefined()
  })

  test('does not double-wrap already-untrusted content', () => {
    const already = '<<<EXTERNAL_UNTRUSTED_CONTENT>>>payload<<<END_EXTERNAL_UNTRUSTED_CONTENT>>>'
    const out = wrapYouComToolResult(input('mcp__you-com__you-search', [{ type: 'text', text: already }]))
    expect((replaced(out) as { content: Array<{ text: string }> }).content[0]?.text).toBe(already)
  })

  test('falls back to a single wrapped text block when tool_response has no content array', () => {
    const out = wrapYouComToolResult({ ...input('mcp__you-com__you-search', []), tool_response: { results: [{ url: 'x' }] } })
    const r = replaced(out) as { content: Array<{ type: string; text: string }> }
    expect(r.content).toHaveLength(1)
    expect(r.content[0]?.text).toContain('UNTRUSTED')
    expect(r.content[0]?.text).toContain('"url":"x"')
  })
})
