# @youdotcom-oss/opencode

You.com skills and remote MCP setup for [OpenCode](https://opencode.ai).

This plugin registers bundled You.com skills and configures You.com MCP servers
for web search, content extraction, research, finance, docs search, and
guidance on adding You.com APIs, MCP, and SDKs to agentic projects.

## Install

Install with OpenCode:

```sh
opencode plugin @youdotcom-oss/opencode
```

Or add the plugin to your `opencode.json`:

```json
{ "plugin": ["@youdotcom-oss/opencode"] }
```

## What it configures

- Skills from `./skills`: `you-web`, `you-research`, `you-finance`,
  `you-discover`, and `you-free`
- MCP server `you`: authenticated You.com MCP tools
- MCP server `you-free`: no-auth web search
- MCP server `you-finance`: finance tools
- MCP server `you-docs`: You.com docs search

The MCP servers provide the tools. The skills explain when and how to use them
safely.

## Auth

- `you-free` and `you-docs` do not require auth.
- `you`, `you-finance`, and authenticated You.com tools use OAuth through
  OpenCode's remote MCP support.

## Test

```sh
bun test
```
