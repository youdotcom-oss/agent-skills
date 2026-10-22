# @youdotcom-oss/pi

You.com inference, skills, and MCP tools for Pi.

This package registers You.com as a model provider, registers bundled You.com
skills, and connects the You.com remote MCP servers through Pi's built-in MCP
support for web search, content extraction, research, finance, docs lookup,
and guidance on adding You.com APIs, MCP, and SDKs to agentic projects. One
`YDC_API_KEY` covers models and tools.

## Install

```sh
pi install npm:@youdotcom-oss/pi
```

## What it includes

- The `youcom` model provider: You.com inference through the OpenAI-compatible
  Chat Completions API at `https://api.you.com/v1`.
- Skills from `./skills`: `you-web`, `you-research`, `you-finance`,
  `you-discover`
- MCP servers (tools named `mcp__<server>__<tool>`), registered one of two
  ways depending on the runtime:
  - Pi: `pi.registerMcpServer` at extension load.
  - omp (whose forked extension API has no `registerMcpServer`): the
    build-generated package `mcp.json` (from the repo-root `mcp.json`),
    discovered automatically as an extension package entry.
  - `you` — authenticated web search, content extraction, balance, discovery
  - `you-finance` — authenticated finance research
  - `you-research` — authenticated research synthesis
  - `you-free` — keyless web search (free profile)
  - `you-discover` — keyless integration discovery (discover profile)
  - `you-docs` — keyless You.com documentation search

## Inference

Set `YDC_API_KEY`, then pick a model with `/model` or on the command line:

```sh
pi --model youcom/kimi-k3
pi --list-models youcom
```

The package ships a snapshot of the model list so models are available on
first start. When Pi refreshes model catalogs (at interactive startup and when
`/model` opens), the provider replaces the snapshot with the models your key
may use, with context size, max output, and prices from `GET /v1/models`, and
saves the list for offline use.

Inference requests send `X-Client-Info: harness; client=pi` so You.com can
attribute Pi traffic. A request that already sets `X-Client-Info` keeps its
own value.

To route through a proxy, set the base URL in Pi's `models.json`:

```json
{
  "providers": {
    "youcom": { "baseUrl": "https://proxy.example/v1" }
  }
}
```

The provider needs a Pi version with native extension providers (1.x). On
omp, whose extension API has no provider-object form of `registerProvider`,
only the skills and MCP tools load.

## Auth

- `you-free`, `you-discover`, and `you-docs` do not require auth.
- The keyed servers send `YDC_API_KEY` as a bearer token when it is set.
  Without it, the built-in OAuth flow offers sign-in (`/mcp login you`).
  - On Pi the key is read at extension load; after changing it, run
    `/reload`.
  - On omp the generated `mcp.json` resolves the key via a shell lookup when
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
