# @youdotcom-oss/dsh-plugin

You.com agent skills and MCP setup for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`).

Registers the bundled You.com skills into dsh's skill registry (`ctx.skills`) through the official local filesystem provider, and mounts one `dsh-mcp-client` instance per You.com MCP server so the corresponding tools are available under `mcp__<serverName>__<rawName>` names.

This package covers skills, research, finance, docs, and integration discovery. It does not touch dsh's built-in `web_search`/`web_fetch` tools. For a `WebSearchProvider`/`WebFetchProvider` against dsh's `ctx.web` seam, see [`@youdotcom-oss/dsh-plugin-youcom`](https://github.com/youdotcom-oss/dsh-plugin-youcom).

## Install

```sh
dsh plugin --profile <your-profile> add @youdotcom-oss/dsh-plugin
```

Or mount it directly in a `cordis.patch.yml`. This package ships one (see [`cordis.patch.yml`](./cordis.patch.yml)) that inserts a row referencing this package by name.

Set `YDC_API_KEY` in the environment for the authenticated servers (get one at [you.com/platform/api-keys](https://you.com/platform/api-keys)). The keyless servers work without it.

## What it configures

- Skills from `./skills`: `you-web`, `you-research`, `you-finance`, `you-discover`, and `you-free`, registered under the `youcom` skill provider name
- MCP server `you`: authenticated You.com MCP tools (`you-search`, `you-contents`, `you-balance`, `you-discover`)
- MCP server `you-free`: no-auth web search
- MCP server `you-finance`: finance tools
- MCP server `you-research`: one-shot cited research synthesis
- MCP server `you-docs`: You.com docs search

The MCP servers provide the tools. The skills explain when and how to use them safely.

## Auth

- `you-free` and `you-docs` do not require `$YDC_API_KEY`.
- `you`, `you-finance`, and `you-research` send `Authorization: Bearer $YDC_API_KEY` when the variable is set. An authenticated server with no key still mounts — `failOnStartupError: false` degrades a failed connection to zero tools from that server rather than blocking the rest of the profile.
- `you` and `you-free` both expose a `you-search` tool, but `dsh-mcp-client` namespaces tools per server, so `mcp__you__you-search` and `mcp__you-free__you-search` coexist without collision.

## Requirements

DeepSeek Harness is in developer preview and ships `cordis` / `dsh-mcp-client` / `dsh-skill` / `dsh-skill-filesystem` as separate peer dependencies. The peer-dep ranges in [`package.json`](./package.json) track dsh's prerelease line accordingly. The composition must already have `@deepseek-ai/dsh-skill` and `@deepseek-ai/dsh-mcp-client` loaded — every shipped dsh profile does.

## Test

```sh
bun test
```
