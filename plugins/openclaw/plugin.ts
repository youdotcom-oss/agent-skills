/**
 * You.com OpenClaw plugin — trust-boundary floor for the You.com remote MCP
 * server (https://api.you.com/mcp), which exposes you-search / you-contents /
 * you-research / you-finance.
 *
 * All tool execution, schemas, and credential handling are provided by the MCP
 * server, registered once by the operator via `openclaw mcp add` (see README).
 * This plugin owns only the non-negotiable floor OpenClaw's MCP-client runtime
 * does not: labeling every You.com tool result as untrusted external content
 * before the model sees it.
 *
 * @public
 */

import type {
  AgentToolResultMiddleware,
  AgentToolResultMiddlewareEvent,
} from 'openclaw/plugin-sdk/agent-harness-runtime'
import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry'
import { wrapExternalContent } from 'openclaw/plugin-sdk/provider-web-fetch'

/** You.com tool ids exposed by the remote MCP server. */
const YOU_COM_TOOLS = new Set(['you-search', 'you-contents', 'you-research', 'you-finance'])

/** Boundary delimiter preceding a tool id in a host-namespaced callable. */
const TOOL_ID_BOUNDARY = /[-_:]/

/** Open marker `wrapExternalContent` emits; used to skip already-wrapped content. */
const UNTRUSTED_OPEN_MARKER = '<<<EXTERNAL_UNTRUSTED_CONTENT'

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

/** Maps a You.com tool id to the `wrapExternalContent` source label. */
const sourceFor = (toolName: string): 'web_fetch' | 'web_search' =>
  toolName === 'you-contents' ? 'web_fetch' : 'web_search'

/**
 * The trust-boundary middleware: wraps each You.com tool result's text items as
 * untrusted external content. Non-You.com tools are left untouched (returns
 * `undefined`). Already-wrapped text is not re-wrapped (idempotent).
 */
const youComMiddleware: AgentToolResultMiddleware = (event: AgentToolResultMiddlewareEvent) => {
  if (!isYouComTool(event.toolName)) return undefined
  const source = sourceFor(event.toolName)
  const content = event.result.content.map((item) =>
    item.type === 'text' && !item.text.includes(UNTRUSTED_OPEN_MARKER)
      ? { ...item, text: wrapExternalContent(item.text, { source }) }
      : item,
  )
  return { result: { ...event.result, content } }
}

export default definePluginEntry({
  id: 'you',
  name: 'You.com',
  description:
    'Trust-boundary middleware for the You.com remote MCP server (you-search, you-contents, you-research, you-finance).',
  register: (api) => {
    api.registerAgentToolResultMiddleware(youComMiddleware)
  },
})
