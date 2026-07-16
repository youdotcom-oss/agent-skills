/**
 * You.com Cursor postToolUse hook — trust-boundary floor.
 *
 * The You.com remote MCP server (https://api.you.com/mcp) exposes you-search /
 * you-contents / you-research / you-finance as MCP tools Cursor loads from
 * `mcp.json`. Cursor does NOT label MCP tool output as untrusted, so this hook
 * owns the non-negotiable floor: it replaces each You.com tool's output with an
 * untrusted-labeled version via `postToolUse` → `updated_mcp_tool_output`,
 * before the model sees it. Non-You.com tools are left untouched.
 *
 * Protocol (Cursor Hooks reference): the hook is a spawned process that reads
 * a postToolUse JSON object on stdin and writes a JSON response on stdout.
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
const wrapUntrusted = (text: string): string => (text.includes(MARKER) ? text : `${OPEN}\n${text}\n${CLOSE}`)

/** Wraps each text item of an MCP-standard `content` array; leaves other items. */
const wrapContentItems = (items: unknown[]): unknown[] =>
  items.map((item) => {
  if (typeof item !== 'object' || item === null) return item
  const it = item as { type?: unknown; text?: unknown }
  return it.type === 'text' && typeof it.text === 'string' ? { ...it, text: wrapUntrusted(it.text) } : item
})

/** postToolUse input shape (only the fields this hook reads). */
type PostToolUseInput = { tool_name: string; tool_output: string }

/** postToolUse output shape (only the fields this hook writes). */
export type PostToolUseOutput = { updated_mcp_tool_output?: unknown; additional_context?: string }

/**
 * Replaces a You.com tool's output with an untrusted-labeled version. Returns
 * `undefined` for non-You.com tools (Cursor leaves their output untouched).
 *
 * Wraps the text items of an MCP-standard `{ content: [...] }` result in place;
 * any other shape is wrapped wholesale as a single untrusted text item so the
 * floor holds regardless of the server's response schema. Idempotent.
 *
 * @public
 */
export const wrapYouComToolResult = (input: PostToolUseInput): PostToolUseOutput | undefined => {
  if (!isYouComTool(input.tool_name)) return undefined

  let parsed: unknown
  try {
    parsed = JSON.parse(input.tool_output)
  } catch {
    return { updated_mcp_tool_output: { content: [{ type: 'text', text: wrapUntrusted(input.tool_output) }] } }
  }

  if (typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as { content?: unknown }).content)) {
    const obj = parsed as { content: unknown[] } & Record<string, unknown>
    return { updated_mcp_tool_output: { ...obj, content: wrapContentItems(obj.content) } }
  }

  return { updated_mcp_tool_output: { content: [{ type: 'text', text: wrapUntrusted(input.tool_output) }] } }
}

// --- stdio runner (Cursor invokes this file as a process) ---
if (import.meta.main) {
  const raw = await Bun.stdin.text()
  const input = raw.trim().length > 0 ? (JSON.parse(raw) as PostToolUseInput) : ({ tool_name: '', tool_output: '' } as PostToolUseInput)
  const output = wrapYouComToolResult(input) ?? {}
  await Bun.write(Bun.stdout, `${JSON.stringify(output)}\n`)
}
