# @youdotcom-oss/opencode

You.com web search, research, and content extraction for
[OpenCode](https://opencode.ai), via the You.com **remote MCP server**
(`https://api.you.com/mcp`).

The MCP server provides the tools (`you-search`, `you-contents`, `you-research`,
`you-finance`). This plugin provides the one thing OpenCode does not apply
itself: a `tool.execute.after` hook that labels every You.com tool result as
untrusted external content before the model sees it.

## Install

Add the plugin to your `opencode.json`:

```json
{ "plugin": ["@youdotcom-oss/opencode"] }
```

## Register the You.com MCP server

This plugin does **not** ship the tools — the MCP server does. Register it in
`opencode.json`:

```json
{
  "mcp": {
    "you-com": {
      "type": "remote",
      "url": "https://api.you.com/mcp",
      "headers": { "Authorization": "Bearer ${YDC_API_KEY}" }
    }
  }
}
```

## Auth

- `you-search` runs **keyless** on the free tier.
- `you-contents`, `you-research`, and `you-finance` require `YDC_API_KEY`.
  Get a key at https://you.com/platform/api-keys.

## What this plugin does

One runtime responsibility: a `tool.execute.after` hook that wraps every
You.com tool's output in an untrusted-content boundary. Wrapping is idempotent;
non-You.com tools are left untouched.

## Test

```sh
bun test
```

The suite (`tests/`) covers tool-name resolution, output wrapping, non-You.com
pass-through, host-namespaced callables, and idempotency — all driven through
the single public plugin interface.
