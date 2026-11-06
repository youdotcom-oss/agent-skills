# @youdotcom-oss/opencode

You.com skills and remote MCP setup for [OpenCode 2](https://opencode.ai/v2/docs/plugins).

This plugin registers bundled You.com skills and configures You.com MCP servers
for web search, content extraction, research, finance, docs search, and
guidance on adding You.com APIs, MCP, and SDKs to agentic projects. It removes
OpenCode's built-in `websearch` tool so agents use the richer You.com MCP tools.

## Compatibility

Requires OpenCode 2 (`@opencode/plugin >= 2.0.0`). OpenCode 1 users should pin
`@youdotcom-oss/opencode@0.x`, which ships the legacy `config`-hook plugin.

## Install

Install with OpenCode 2:

```sh
opencode2 plugin add @youdotcom-oss/opencode
```

Or add the plugin to your `opencode.json`:

```json
{ "plugins": ["@youdotcom-oss/opencode"] }
```

## What it configures

- Skills from `./skills`: `you-web`, `you-research`, `you-finance`,
  `you-discover`
- MCP server `you`: authenticated You.com MCP tools
- MCP server `you-free`: no-auth web search
- MCP server `you-finance`: finance tools
- MCP server `you-research`: multi-source research with citations
- MCP server `you-docs`: You.com docs search
- Removal of built-in `websearch`; agents use `you-search` instead

The MCP servers provide the tools. The skills explain when and how to use them
safely.

## Web search

OpenCode's built-in `websearch` tool is removed for plugin users. Agents use
`you-search` with its full parameter descriptions and `you-contents` to read
selected pages. The `websearch.provider` setting does not affect these MCP calls.

Authenticated You.com connections provide `you-search` and `you-contents`.
The plugin tells agents to prefer the authenticated `you` server over
`you-free`, and `you-contents` over `webfetch`, when they are available.
Keyless users get `you-search` through the free MCP profile, which does not
include `you-contents`. OpenCode's built-in `webfetch` stays available for
direct page reads and when free-profile search is unavailable.

## Auth

- `you-free` and `you-docs` do not require auth.
- `you`, `you-finance`, and authenticated You.com tools use OAuth through
  OpenCode's remote MCP support.

## Test

```sh
bun test
```
