# @youdotcom-oss/openclaw

You.com skills, MCP setup metadata, and a You.com-backed `web_search` provider
for [OpenClaw](https://openclaw.ai).

This plugin packages You.com skills for web search, content extraction,
research, finance, docs lookup, and guidance on adding You.com APIs, MCP, and
SDKs to agentic projects. It also declares `YDC_API_KEY` setup metadata so
OpenClaw can guide users through authenticated You.com MCP configuration, and
registers a web search provider so OpenClaw's own `web_search` tool answers
from You.com.

## Install

From ClawHub:

```sh
openclaw plugins install clawhub:you
```

From npm:

```sh
openclaw plugins install npm:@youdotcom-oss/openclaw
```

## What it includes

- Skills from `./skills`: `you-web`, `you-research`, `you-finance`,
  `you-discover`
- Setup metadata for the You.com provider and `YDC_API_KEY`
- MCP servers for search, contents, research, finance, and discovery
- A `youcom` web search provider that backs OpenClaw's native `web_search`
  tool, so "search the web" returns You.com results with citable URLs

## Web search provider

The plugin registers You.com as a web search provider named `youcom` and keeps
the host's `web_search` tool rather than removing it, matching how the
`@youdotcom-oss/dsh-plugin` package backs DeepSeek Harness's native search.
Registering the provider does not change search on its own — select it:

```jsonc
{
  "tools": {
    "web": {
      "search": {
        "provider": "youcom"
      }
    }
  }
}
```

With `YDC_API_KEY` unset, `web_search` returns a `missing_api_key` payload
telling the agent to configure the key or pick another provider; the keyless
You.com paths (free MCP profile, OAuth, MPP/x402) remain available through the
MCP tools and the bundled skills. The provider reads the credential from
`plugins.entries.you.config.webSearch.apiKey` first and falls back to
`YDC_API_KEY`.

Licensed knowledge results are deliberately not mapped into `web_search`
output: they carry data attribution rather than page URLs, so mapping them into
URL-shaped results would invent citations. Use the `you-search` MCP tool for
licensed knowledge.

## Auth

- Keyless You.com search is available through the free MCP profile; the
  `you-web` skill's free-profile reference covers it.
- Authenticated You.com MCP tools and the `youcom` web search provider require
  `YDC_API_KEY`.

## Test

```sh
bun test
```
