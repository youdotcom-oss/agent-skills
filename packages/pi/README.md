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
- MCP servers (tools named `mcp__<server>__<tool>`), registered one of two
  ways depending on the runtime:
  - Pi: `pi.registerMcpServer` at extension load.
  - omp (whose forked extension API has no `registerMcpServer`): the
    package's bundled `mcp.json`, discovered automatically as an extension
    package entry.
  - `you` — authenticated web search, content extraction, balance, discovery
  - `you-finance` — authenticated finance research
  - `you-research` — authenticated research synthesis
  - `you-free` — keyless web search (free profile)
  - `you-discover` — keyless integration discovery (discover profile)
  - `you-docs` — keyless You.com documentation search

## Auth

- `you-free`, `you-discover`, and `you-docs` do not require auth.
- The keyed servers send `YDC_API_KEY` as a bearer token when it is set.
  Without it, the built-in OAuth flow offers sign-in (`/mcp login you`).
  - On Pi the key is read at extension load; after changing it, run
    `/reload`.
  - On omp the bundled `mcp.json` resolves the key via a shell lookup when
    connecting; if the lookup cannot run (for example no POSIX shell), the
    header is omitted and OAuth is used instead.

## Configuration

Manage the servers with `/mcp` or your own `mcp.json` (see
https://pi.dev/docs/latest/mcp). A same-name `mcp.json` entry overrides the
package's registration, so you can adjust exposure, timeouts, or auth per
server without code changes. SDK sessions must add Pi's MCP extension to the
resource loader for these registrations to connect (see
https://pi.dev/docs/latest/sdk#codemode-mcp).

## Test

```sh
bun test
```
