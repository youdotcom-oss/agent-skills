# @youdotcom-oss/you-openclaw

You.com web search, research, and content extraction for
[OpenClaw](https://openclaw.ai), via the You.com **remote MCP server**
(`https://api.you.com/mcp`).

The MCP server provides the tools (`you-search`, `you-contents`, `you-research`,
`you-finance`). This plugin provides the one thing OpenClaw's MCP-client runtime
does not: a **trust-boundary middleware** that labels every You.com tool result
as untrusted external content before the model sees it.

## Install

```sh
openclaw plugins install clawhub:you
```

## Register the You.com MCP server

This plugin does **not** ship the tools — the MCP server does. Register it once:

```sh
openclaw mcp add you --url https://api.you.com/mcp --transport streamable-http \
  --header "Authorization: Bearer ${YDC_API_KEY}"
```

For keyless `you-search` only (free tier, no API key), omit the `--header` flag.
The other three tools (`you-contents`, `you-research`, `you-finance`) require
`YDC_API_KEY`.

> **Note:** `openclaw mcp doctor` warns when static headers contain literal
> sensitive values. This is expected for API-key auth with the current SDK;
> the token lives in operator-controlled config.

## Auth

- `you-search` runs **keyless** on the free tier.
- `you-contents`, `you-research`, and `you-finance` require `YDC_API_KEY`.
  Get a key at https://you.com/platform/api-keys.

## What this plugin does

One runtime responsibility: an agent tool-result middleware (declared via
`contracts.agentToolResultMiddleware`) that wraps every You.com tool's returned
web content in OpenClaw's `wrapExternalContent` untrusted boundary. Wrapping is
idempotent and leaves non-You.com tools untouched.

## Test

```sh
bun test
```

The suite (`tests/`) covers tool-name resolution, text/image content wrapping,
non-You.com pass-through, and idempotency, plus the plugin-entry registration
contract.
