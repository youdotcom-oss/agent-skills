/**
 * You.com Claude Code PostToolUse hook — trust-boundary floor.
 *
 * The You.com remote MCP server (https://api.you.com/mcp) is bundled via this
 * plugin's `.mcp.json` and exposes you-search / you-contents / you-research /
 * you-finance as MCP tools. Claude Code does NOT label MCP tool output as
 * untrusted, so this hook owns the non-negotiable floor: it replaces each
 * You.com tool's output with an untrusted-labeled version via
 * `PostToolUse` → `hookSpecificOutput.updatedToolOutput`, before the model
 * sees it. Non-You.com tools pass through untouched.
 *
 * Protocol (Claude Code Hooks reference): the hook is a spawned command that
 * reads a PostToolUse JSON object on stdin and writes a JSON response on
 * stdout. MCP tools appear as `mcp__<server>__<tool>` (or, for plugin-bundled
 * servers, `mcp__plugin_<plugin>_<server>__<tool>`); the `hooks.json` matcher
 * `mcp__.*` narrows to MCP tools and this script decides You.com vs not, so the
 * floor never silently misses a You.com tool regardless of naming.
 *
 * @public
 */

/** You.com tool ids exposed by the remote MCP server. */
const YOU_COM_TOOLS = new Set(['you-search', 'you-contents', 'you-research', 'you-finance'])

/** Boundary delimiter preceding a tool id in a host-namespaced callable. */
const TOOL_ID_BOUNDARY = /[-_:]/

/** Open/close the untrusted region. Nonce-free so wrapping is idempotent. */
const OPEN = '<<<EXTERNAL_UNTRUSTED_CONTENT>>>'
const CLOSE = '<<<END_EXTERNAL_UNTRUSTED_CONTENT>>>'
const MARKER = 'EXTERNAL_UNTRUSTED_CONTENT'

/**
 * True when a tool name is (or is a host-namespaced callable of) a You.com
 * tool id, so a fused identifier like `myou-search` does not match. Handles
 * both bare (`mcp__you-com__you-search`) and plugin-scoped
 * (`mcp__plugin_you_you-com__you-search`) names.
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
const wrapUntrusted = (text: string): string => (text.includes(MARKER) ? text : `${OPEN}\n${text}\n${CLOSE}`)

/** Wraps each text item of an MCP-standard `content` array; leaves other items. */
const wrapContentItems = (items: unknown[]): unknown[] =>
  items.map((item) => {
    if (typeof item !== 'object' || item === null) return item
    const it = item as { type?: unknown; text?: unknown }
    return it.type === 'text' && typeof it.text === 'string' ? { ...it, text: wrapUntrusted(it.text) } : item
  })

/** PostToolUse input shape (only the fields this hook reads). */
type PostToolUseInput = { tool_name: string; tool_response: unknown }

/** PostToolUse output shape this hook writes. */
export type PostToolUseOutput = {
  hookSpecificOutput: { hookEventName: 'PostToolUse'; updatedToolOutput: unknown }
}

/**
 * Replaces a You.com tool's output with an untrusted-labeled version. Returns
 * `undefined` for non-You.com tools (Claude Code leaves their output untouched).
 *
 * Wraps the text items of an MCP-standard `{ content: [...] }` response in place;
 * any other shape is wrapped wholesale as a single untrusted text item so the
 * floor holds regardless of the server's response schema. Idempotent.
 *
 * @public
 */
export const wrapYouComToolResult = (input: PostToolUseInput): PostToolUseOutput | undefined => {
  if (!isYouComTool(input.tool_name)) return undefined

  const response = input.tool_response
  if (typeof response === 'object' && response !== null && Array.isArray((response as { content?: unknown }).content)) {
    const obj = response as { content: unknown[] } & Record<string, unknown>
    return { hookSpecificOutput: { hookEventName: 'PostToolUse', updatedToolOutput: { ...obj, content: wrapContentItems(obj.content) } } }
  }

  const payload = JSON.stringify(response)
  return { hookSpecificOutput: { hookEventName: 'PostToolUse', updatedToolOutput: { content: [{ type: 'text', text: wrapUntrusted(payload) }] } } }
}

// --- stdio runner (Claude Code invokes this file as a command) ---
if (import.meta.main) {
  const raw = await Bun.stdin.text()
  const event = raw.trim().length > 0 ? (JSON.parse(raw) as PostToolUseInput) : ({ tool_name: '', tool_response: undefined } as PostToolUseInput)
  const output = wrapYouComToolResult(event) ?? {}
  await Bun.write(Bun.stdout, `${JSON.stringify(output)}\n`)
}
