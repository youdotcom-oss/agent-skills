# @youdotcom-oss/dsh-plugin

You.com agent skills, MCP setup, and `web_search` provider for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`).

With no API key, you get a working `web_search` tool (keyless, anonymous MCP), the five bundled skills (`you-web`, `you-research`, `you-finance`, `you-discover`, `you-free`), and the no-auth `you-free` MCP server's tools. With `YDC_API_KEY` set, the keyed MCP servers and the keyed search provider activate.

## Install

```sh
dsh plugin --profile <your-profile> add @youdotcom-oss/dsh-plugin
```

The bundle ships [`cordis.patch.yml`](./cordis.patch.yml) and declares it in `package.json`'s `dsh.bundle.patch`, so the loader applies it automatically when the bundle is in your profile's `dsh.profile.bundles`. You only need to add `@youdotcom-oss/dsh-plugin` to the bundle list — no manual patch required.

To override or extend the patch, drop the same rows into your profile's `cordis.patch.yml` (applied after every bundle layer).

Set `YDC_API_KEY` in the environment for the authenticated servers (get one at [you.com/platform/api-keys](https://you.com/platform/api-keys)). The keyless servers work without it.

## What it configures

- Skills from `./skills`: `you-web`, `you-research`, `you-finance`, `you-discover`, and `you-free`, registered under the `youcom` skill provider name
- MCP server `you`: authenticated You.com MCP tools (`you-search`, `you-contents`, `you-balance`, `you-discover`)
- MCP server `you-free`: no-auth web search
- MCP server `you-finance`: finance tools
- MCP server `you-research`: one-shot cited research synthesis
- MCP server `you-docs`: You.com docs search
- Web search provider: registers into `ctx.web` and is pinned by the shipped patch as `searchProvider: youcom` (keyless path; keyed path activates when `YDC_API_KEY` is present)

The MCP servers provide the tools. The skills explain when and how to use them safely.

## Configuration

The plugin takes an optional config. Every field defaults when omitted, so the shipped bundle patch needs no config. Set fields on the `youcom-skills` row in your profile's `cordis.patch.yml`:

```yaml
- id: youcom-skills
  config:
    apiKey: sk-…
    numResults: 10
    includeNews: false
```

| Field | Type | Default | Meaning |
|---|---|---|---|
| `apiKey` | string | `$YDC_API_KEY` | You.com API key. An explicit value wins over the launch environment's `YDC_API_KEY`, which wins over `$YDC_API_KEY`. Empty enables the keyless search fallback and disables fetch. |
| `baseURL` | string | `https://ydc-index.io` | Base endpoint for `/v1/search` and `/v1/contents`. A path prefix (for a proxy) is preserved. |
| `freeSearchURL` | string | `https://api.you.com/mcp?profile=free` | Keyless MCP endpoint used when `apiKey` is empty. No fetch equivalent exists. |
| `numResults` | number | server default | Default result count when a request carries no `maxResults`. |
| `includeNews` | boolean | `true` | Merge `results.news[]` into search sources alongside `results.web[]`. |

## Auth

- `you-free` and `you-docs` do not require `$YDC_API_KEY`.
- `you`, `you-finance`, and `you-research` send `Authorization: Bearer $YDC_API_KEY` when the variable is set. An authenticated server with no key still mounts — `failOnStartupError: false` degrades a failed connection to zero tools from that server rather than blocking the rest of the profile.
- `you` and `you-free` both expose a `you-search` tool, but `dsh-mcp-client` namespaces tools per server, so `mcp__you__you-search` and `mcp__you-free__you-search` coexist without collision.
- The keyed search provider activates when `YDC_API_KEY` is present; without it, the keyless MCP profile handles `web_search`. The keyed `fetchProvider` (`youcom`) is opt-in — see `cordis.patch.yml` for how to add `fetchProvider: youcom` to the `web` row's `config`.

## Requirements

DeepSeek Harness is in developer preview and ships `cordis` / `dsh-mcp-client` / `dsh-skill` / `dsh-skill-filesystem` / `dsh-web` as separate peer dependencies. The peer-dep ranges in [`package.json`](./package.json) track dsh's prerelease line accordingly. The composition must already have `@deepseek-ai/dsh-skill`, `@deepseek-ai/dsh-mcp-client`, and `@deepseek-ai/dsh-web` loaded — every shipped dsh profile does.

> The keyless search path sends a bare `tools/call` (no `initialize` handshake) to the `you-search` tool on the anonymous MCP server, relying on observed rather than documented server behavior. If the upstream ever starts requiring an `initialize` round-trip, the keyless path will need a small session-cache layer. The keyed path uses the regular You.com HTTP API and is unaffected.

## Test

```sh
bun test
```
