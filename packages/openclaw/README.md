# @youdotcom-oss/openclaw

You.com skills and MCP setup metadata for [OpenClaw](https://openclaw.ai).

This plugin packages You.com skills for web search, content extraction,
research, finance, docs lookup, and guidance on adding You.com APIs, MCP, and
SDKs to agentic projects. It also declares `YDC_API_KEY` setup metadata so
OpenClaw can guide users through authenticated You.com MCP configuration.

## Install

```sh
openclaw plugins install clawhub:you
```

## What it includes

- Skills from `./skills`: `you-web`, `you-research`, `you-finance`,
  `you-discover`, and `you-free`
- Setup metadata for the You.com provider and `YDC_API_KEY`
- A runtime-free plugin entry point, because skills and setup metadata do the
  work

The You.com MCP servers provide the tools. The bundled skills explain when and
how to use them safely.

## Auth

- `you-free` can use keyless You.com search.
- Authenticated You.com MCP tools require `YDC_API_KEY`.

## Test

```sh
bun test
```
