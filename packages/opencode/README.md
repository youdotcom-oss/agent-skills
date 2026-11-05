# @youdotcom-oss/opencode

You.com skills and remote MCP setup for [OpenCode 2](https://opencode.ai/v2/docs/plugins).

This plugin registers bundled You.com skills, configures You.com MCP servers
for web search, content extraction, research, finance, docs search, and
guidance on adding You.com APIs, MCP, and SDKs to agentic projects, and adds
You.com as a provider for OpenCode's built-in `websearch` tool.

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
- Web search provider `youcom`: backs OpenCode's built-in `websearch` tool

The MCP servers provide the tools. The skills explain when and how to use them
safely.

## Web search

OpenCode asks which provider to use on the first search. Pick You.com, or set it
in `opencode.json`:

```json
{ "websearch": { "provider": "youcom" } }
```

It works without a key through the free MCP profile (`you-search`, 100 searches
per day). Connect a key with `/connect` or set `YDC_API_KEY` for higher limits.

## Auth

- `you-free` and `you-docs` do not require auth.
- `you`, `you-finance`, and authenticated You.com tools use OAuth through
  OpenCode's remote MCP support.

## Test

```sh
bun test
```
