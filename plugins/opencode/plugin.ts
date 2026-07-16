/**
 * You.com OpenCode plugin — trust-boundary floor for the You.com remote MCP
 * server (https://api.you.com/mcp), which exposes you-search / you-contents /
 * you-research / you-finance as MCP tools OpenCode loads from its config.
 *
 * The MCP server provides the tools; this plugin owns only the non-negotiable
 * floor OpenCode does not apply itself: labeling every You.com tool's output
 * as untrusted external content before the model sees it, via the
 * `tool.execute.after` hook (which mutates `output.output` in place).
 *
 * @public
 */

import type { Plugin } from '@opencode-ai/plugin'

/** You.com tool ids exposed by the remote MCP server. */
const YOU_COM_TOOLS = new Set(['you-search', 'you-contents', 'you-research', 'you-finance'])

/** Boundary delimiter preceding a tool id in a host-namespaced callable. */
const TOOL_ID_BOUNDARY = /[-_:]/

/** Marker the wrapper emits; used to skip already-wrapped output. */
const UNTRUSTED_MARKER = 'UNTRUSTED'

/** Open/close the untrusted region. Nonce-free so wrapping is idempotent. */
const OPEN = '<<<EXTERNAL_UNTRUSTED_CONTENT>>>'
const CLOSE = '<<<END_EXTERNAL_UNTRUSTED_CONTENT>>>'

/**
 * True when a tool name is (or is a host-namespaced callable of) a You.com
 * tool id, so a fused identifier like `myou-search` does not match.
 */
const isYouComTool = (name: string): boolean => {
  if (YOU_COM_TOOLS.has(name)) return true
  for (const id of YOU_COM_TOOLS) {
    if (name.length <= id.length || !name.endsWith(id)) continue
    if (TOOL_ID_BOUNDARY.test(name[name.length - id.length - 1]!)) return true
  }
  return false
}

/** Wraps text in an untrusted region unless it already carries the marker. */
const wrapUntrusted = (text: string): string =>
  text.includes(UNTRUSTED_MARKER) ? text : `${OPEN}\n${text}\n${CLOSE}`

/**
 * You.com OpenCode plugin. Registers a single `tool.execute.after` hook that
 * wraps You.com tool output as untrusted external content; all other tools are
 * left untouched. Wrapping is idempotent.
 */
const YouComPlugin: Plugin = async () => ({
  'tool.execute.after': async (_input, output) => {
    if (!isYouComTool(_input.tool)) return
    output.output = wrapUntrusted(output.output)
  },
})

export default YouComPlugin
