# @youdotcom-oss/claude-code

You.com web search, research, and content extraction for
[Claude Code](https://code.claude.com), via the You.com **remote MCP server**
(`https://api.you.com/mcp`).

The MCP server provides the tools (`you-search`, `you-contents`, `you-research`,
`you-finance`). This plugin provides the one thing Claude Code does not apply
itself: a `PostToolUse` hook that replaces each You.com tool's output with an
untrusted-labeled version (`hookSpecificOutput.updatedToolOutput`) before the
model sees it.

## What's in the plugin

- `.mcp.json` — bundles the You.com remote MCP server (`type: http`, `Authorization: Bearer ${YDC_API_KEY}`).
- `hooks/hooks.json` — wires `PostToolUse` (matcher `mcp__.*`, exec-form command) to `hooks/you-com.ts`.
- `hooks/you-com.ts` — the stdio hook: reads a `PostToolUse` JSON on stdin, wraps the You.com tool's `tool_response` as untrusted, writes the `updatedToolOutput` JSON on stdout. Non-You.com tools pass through untouched.
- `skills/you/SKILL.md` — agent guidance for the You.com tools.
- `.claude-plugin/plugin.json` — plugin manifest.

## Install / test locally

```sh
claude --plugin-dir ./plugins/claude-code
```

Then `/reload-plugins` after edits.

## Auth

- `you-search` runs **keyless** on the free tier.
- `you-contents`, `you-research`, `you-finance` require `YDC_API_KEY` — get one at https://you.com/platform/api-keys.

## Test

```sh
bun test                            # 11 contract tests over the transform
bun run hooks/you-com.ts            # run the hook manually (reads stdin JSON)
```

## Notes / ceilings

- The `PostToolUse` matcher is `mcp__.*` (all MCP tools); the script's
  `isYouComTool` decides You.com vs not by boundary-delimited suffix match, so
  the floor never silently misses a You.com tool whether the server is
  plugin-bundled (`mcp__plugin_you_you-com__you-search`) or user-configured
  (`mcp__you-com__you-search`).
- `MINIMAL:` `updatedToolOutput` replaces what Claude sees but the tool has
  already executed (files/network already took effect). Ceiling: to gate a
  call *before* it runs, add a `PreToolUse` hook — out of scope for the floor.
- `MINIMAL:` The hook spawns `bun` for every MCP tool call; non-You.com MCP
  tools no-op cheaply but still pay process-spawn cost. Ceiling: a native
  compiled runner if this becomes a latency issue.
