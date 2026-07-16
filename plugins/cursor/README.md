# @youdotcom-oss/cursor

You.com web search, research, and content extraction for
[Cursor](https://cursor.com), via the You.com **remote MCP server**
(`https://api.you.com/mcp`).

The MCP server provides the tools (`you-search`, `you-contents`, `you-research`,
`you-finance`). This plugin provides the one thing Cursor does not apply itself:
a `postToolUse` hook that replaces each You.com tool's output with an
untrusted-labeled version (`updated_mcp_tool_output`) before the model sees it.

## What's in the plugin

- `mcp.json` — registers the You.com remote MCP server (`Authorization: Bearer ${env:YDC_API_KEY}`).
- `hooks/hooks.json` — wires `postToolUse` (matched to the You.com MCP tools, `failClosed`) to `hooks/you-com.ts`.
- `hooks/you-com.ts` — the stdio hook: reads a `postToolUse` JSON on stdin, wraps the You.com tool output as untrusted, writes the `updated_mcp_tool_output` JSON on stdout. Non-You.com tools pass through untouched.
- `skills/you/SKILL.md` — agent guidance for the You.com tools.

## Install

Load locally from `~/.cursor/plugins/local` (or symlink the plugin directory there), then reload the Cursor window.

## Auth

- `you-search` runs **keyless** on the free tier.
- `you-contents`, `you-research`, `you-finance` require `YDC_API_KEY` — get one at https://you.com/platform/api-keys.

## Test

```sh
bun test          # 12 contract tests over the transform
bun run hooks/you-com.ts  # run the hook manually (reads stdin JSON)
```

The transform is wrapped separately from the stdio runner so the floor logic is
testable without spawning a process.

## Notes / ceilings

- `failClosed: true` on the hook: a hook crash blocks the You.com tool call rather
  than leaking unwrapped output (floor-correct; the script is written to handle
  every documented input shape without throwing).
- `MINIMAL:` The `postToolUse` matcher uses the documented `MCP:<tool_name>`
  format with `|` alternation. If a future Cursor build changes MCP-tool matcher
  semantics, broaden the matcher (or drop it) so the hook still fires for You.com
  tools — the script no-ops safely for non-You.com tools.
- `MINIMAL:` The hook `command` path is plugin-root-relative
  (`bun run hooks/you-com.ts`), matching Cursor's own relative-path hook examples.
  Ceiling: if Cursor resolves plugin-hook `command` paths from the project root
  instead, prefix the path accordingly.
