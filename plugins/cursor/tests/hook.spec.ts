/**
 * Contract tests for the You.com Cursor postToolUse hook.
 *
 * Driven entirely through the single public transform `wrapYouComToolResult`.
 * The You.com remote MCP server provides the tools; this hook owns only the
 * non-negotiable trust-boundary floor — replacing a You.com tool's output with
 * an untrusted-labeled version via Cursor's `postToolUse` → `updated_mcp_tool_output`.
 *
 * @public
 */

import { describe, expect, test } from 'bun:test'
import { wrapYouComToolResult } from '../hooks/you-com.ts'

/** Builds a postToolUse input with the given tool name and MCP-standard content. */
const input = (tool_name: string, content: unknown[], tool_output_override?: string) => ({
  tool_name,
  tool_input: {},
  tool_output: tool_output_override ?? JSON.stringify({ content }),
  tool_use_id: 'c1',
  cwd: '/p',
  duration: 1,
})

describe('wrapYouComToolResult', () => {
  test('wraps a you-search text result as untrusted', () => {
    const out = wrapYouComToolResult(input('you-search', [{ type: 'text', text: 'AI breakthrough' }]))
    const replaced = out?.updated_mcp_tool_output as { content: Array<{ type: string; text: string }> }
    expect(replaced.content[0]?.text).toContain('UNTRUSTED')
    expect(replaced.content[0]?.text).toContain('AI breakthrough')
  })

  test('wraps every text item, leaving image items untouched', () => {
    const out = wrapYouComToolResult(input('you-contents', [
      { type: 'text', text: 'page one' },
      { type: 'image', data: 'b64', mimeType: 'image/png' },
      { type: 'text', text: 'page two' },
    ]))
    const content = (out?.updated_mcp_tool_output as { content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }).content
    expect(content[0]?.text).toContain('UNTRUSTED')
    expect(content[1]).toEqual({ type: 'image', data: 'b64', mimeType: 'image/png' })
    expect(content[2]?.text).toContain('UNTRUSTED')
  })

  test.each(['you-search', 'you-contents', 'you-research', 'you-finance'])('wraps %s', (tool) => {
    const out = wrapYouComToolResult(input(tool, [{ type: 'text', text: 'x' }]))
    expect((out?.updated_mcp_tool_output as { content: Array<{ text: string }> }).content[0]?.text).toContain('UNTRUSTED')
  })

  test('wraps a host-namespaced you-search callable (mcp__you-com__you-search)', () => {
    const out = wrapYouComToolResult(input('mcp__you-com__you-search', [{ type: 'text', text: 'x' }]))
    expect((out?.updated_mcp_tool_output as { content: Array<{ text: string }> }).content[0]?.text).toContain('UNTRUSTED')
  })

  test('leaves a fused substring like myou-search untouched (returns undefined)', () => {
    expect(wrapYouComToolResult(input('myou-search', [{ type: 'text', text: 'x' }]))).toBeUndefined()
  })

  test('returns undefined for a non-You.com tool', () => {
    expect(wrapYouComToolResult(input('Shell', [{ type: 'text', text: 'ls' }]))).toBeUndefined()
  })

  test('does not double-wrap already-untrusted content', () => {
    const out = wrapYouComToolResult(input('you-search', [{ type: 'text', text: '<<<EXTERNAL_UNTRUSTED_CONTENT>>>payload<<<END_EXTERNAL_UNTRUSTED_CONTENT>>>' }]))
    expect((out?.updated_mcp_tool_output as { content: Array<{ text: string }> }).content[0]?.text)
      .toBe('<<<EXTERNAL_UNTRUSTED_CONTENT>>>payload<<<END_EXTERNAL_UNTRUSTED_CONTENT>>>')
  })

  test('falls back to a single wrapped text block when tool_output has no content array', () => {
    const out = wrapYouComToolResult(input('you-search', [], JSON.stringify({ results: [{ url: 'x' }] })))
    const replaced = out?.updated_mcp_tool_output as { content: Array<{ type: string; text: string }> }
    expect(replaced.content).toHaveLength(1)
    expect(replaced.content[0]?.text).toContain('UNTRUSTED')
    expect(replaced.content[0]?.text).toContain('"url":"x"')
  })

  test('treats unparseable tool_output as raw text to wrap', () => {
    const out = wrapYouComToolResult(input('you-search', [], 'not json {'))
    const replaced = out?.updated_mcp_tool_output as { content: Array<{ type: string; text: string }> }
    expect(replaced.content[0]?.text).toContain('UNTRUSTED')
    expect(replaced.content[0]?.text).toContain('not json {')
  })
})
