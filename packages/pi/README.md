# @youdotcom-oss/pi

You.com skills and MCP tools for Pi.

This package registers bundled You.com skills and connects the You.com remote
MCP servers through Pi's built-in MCP support for web search, content
extraction, research, finance, docs lookup, and guidance on adding You.com
APIs, MCP, and SDKs to agentic projects.

## Install

```sh
pi install npm:@youdotcom-oss/pi
```

## What it includes

- Skills from `./skills`: `you-web`, `you-research`, `you-finance`,
  `you-discover`
- MCP servers registered with `pi.registerMcpServer` at extension load, tools
  named `mcp__<server>__<tool>`:
  - `you` — authenticated web search, content extraction, balance, discovery
  - `you-finance` — authenticated finance research
  - `you-research` — authenticated research synthesis
  - `you-free` — keyless web search (free profile)
  - `you-discover` — keyless integration discovery (discover profile)
  - `you-docs` — keyless You.com documentation search

## Auth

- `you-free`, `you-discover`, and `you-docs` do not require auth.
- The keyed servers send `YDC_API_KEY` as a bearer token when it is set at
  extension load. Without it, Pi's built-in OAuth flow offers sign-in
  (`/mcp login you`). After changing `YDC_API_KEY`, run `/reload` —
  registrations are read once per load.

## Configuration

Manage the servers with `/mcp` or `mcp.json` (see
https://pi.dev/docs/latest/mcp). A same-name `mcp.json` entry overrides the
extension's registration, so you can adjust exposure, timeouts, or auth per
server without code changes. SDK sessions must add Pi's MCP extension to the
resource loader for these registrations to connect (see
https://pi.dev/docs/latest/sdk#codemode-mcp).

## Test

```sh
bun test
```
