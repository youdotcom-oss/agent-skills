# You.com Agent Skills and Plugins

You.com skills and plugin manifests for giving coding agents current web search, URL content extraction, cited research, finance research, and integration discovery through the You.com MCP server.

This repository is intentionally lightweight: the shared `skills/` directory teaches agents when and how to use You.com, while platform-specific plugin manifests package the same skills for Claude Code, Cursor, Codex, GitHub Copilot CLI, Kimi Code, OpenCode, OpenClaw, Pi, and Hermes.

## What You Get

| Capability | Included skill | What it covers |
| --- | --- | --- |
| Web search and synthesis | `you-web` | Current web search, URL content extraction, cited synthesis, and `you-research` tool selection. |
| Free search | `you-free` | Keyless basic web search with `you-search` only. |
| Agent-led research | `you-research` | Multi-hop source discovery, content reading, cross-checking, and cited answers using `you-search` plus `you-contents`. |
| Finance research | `you-finance` | Market data, ticker lookups, company financials, analyst context, earnings, and finance-specific answers. |
| Integration discovery | `you-discover` | You.com integration target discovery across MCP, SDKs, skills, docs, and future ARD `ai-catalog` workflows. |

## Supported Agent Surfaces

| Surface | Status | Repository files |
| --- | --- | --- |
| Claude Code | Supported | `.claude-plugin/plugin.json`, `skills/` |
| Cursor | Supported | `.cursor-plugin/plugin.json`, `skills/` |
| OpenAI Codex and ChatGPT plugins | Supported | `.codex-plugin/plugin.json`, `skills/` |
| GitHub Copilot CLI | Supported | `.plugin/plugin.json`, `skills/` |
| Kimi Code | Supported | `.kimi-plugin/plugin.json`, `skills/` |
| OpenClaw | Supported | `packages/openclaw/`, copied skills |
| OpenCode | Supported | `packages/opencode/`, copied skills |
| Pi | Supported | `packages/pi/`, copied skills |
| Hermes | Supported | `packages/hermes/`, copied skills |
| Agent Skills CLI | Supported | `skills/`, `skills.sh.json` |

All plugin manifests point at the shared top-level `skills/` directory where the host supports it. Package-specific integrations under `packages/` carry their own copied skills or runtime adapters for that host.

## How It Works

The You.com MCP server exposes the web intelligence tools:

| Tool | Use it for |
| --- | --- |
| `you-search` | Current web search, snippets, source discovery, freshness, and domain-targeted queries. |
| `you-contents` | Reading specific URLs or promising search results before relying on exact details. |
| `you-research` | One-shot cited synthesis when a concise researched answer is the right path. |
| `you-finance` | Finance-specific market, ticker, company, earnings, and source-backed financial answers. |

The skills do not assume a single authentication model. They guide the agent through the right access path for the task and client:

| Access path | When to use |
| --- | --- |
| Keyless search | Basic `you-search` tasks that can use the free profile. |
| API key or Bearer auth | Default authenticated path for contents, research, finance, and higher-capability search. |
| OAuth | Clients that support OAuth login for the You.com MCP server. |
| MPP or x402 | Agent-native payment flows when an API-key path is unavailable or a pay-per-call flow is preferred. |

This repo does not bundle a fixed MCP server configuration in the shared manifests. That is deliberate, because different clients may use keyless search, API keys, OAuth, MPP, or x402. The skills tell the agent which MCP profile or auth path to install for the current task.

## Install Skills

For any Agent Skills compatible client, install the top-level You.com skills:

```bash
npx skills add youdotcom-oss/agent-skills
```

Or install one skill at a time:

```bash
npx skills add youdotcom-oss/agent-skills --skill you-web
npx skills add youdotcom-oss/agent-skills --skill you-finance
```

The skills.sh repository page is curated by `skills.sh.json` and intentionally highlights only the top-level `skills/` entries.

## Install as a Plugin

Use the plugin install flow for your client and point it at this repository. The platform-specific manifests are already present:

```text
.claude-plugin/plugin.json   Claude Code
.cursor-plugin/plugin.json   Cursor
.codex-plugin/plugin.json    Codex and ChatGPT plugin surfaces
.plugin/plugin.json          GitHub Copilot CLI
.kimi-plugin/plugin.json     Kimi Code
```

For GitHub Copilot CLI, the repository can be installed directly:

```bash
copilot plugin install youdotcom-oss/agent-skills
```

For Kimi Code, install the GitHub repository from the plugin manager:

```text
/plugins install https://github.com/youdotcom-oss/agent-skills
```

For Claude Code, Cursor, and Codex, use the client plugin UI or CLI with this repository as the plugin source.

## Configure You.com MCP

The standard remote MCP endpoint is:

```text
https://api.you.com/mcp
```

For API-key based clients, configure an authorization header equivalent to:

```json
{
  "Authorization": "Bearer ${YDC_API_KEY}"
}
```

Get an API key at [you.com/platform/api-keys](https://you.com/platform/api-keys):

```bash
export YDC_API_KEY="your-api-key"
```

For free basic search, clients may use the free profile instead:

```text
https://api.you.com/mcp?profile=free
```

For finance-only installs, clients may prefer the finance profile:

```text
https://api.you.com/mcp?tools=you-finance
```

When proxying through MCP transports or custom HTTP clients, preserve payment and settlement headers such as `payment-required`, `payment-signature`, `x-payment`, `payment-response`, `www-authenticate`, and `Authorization: Payment ...`.

## Runtime Packages

| Package | Purpose |
| --- | --- |
| `@youdotcom-oss/openclaw` | OpenClaw plugin that labels You.com MCP results as untrusted external content before model consumption. |
| `@youdotcom-oss/opencode` | OpenCode plugin that wraps You.com MCP tool output in an untrusted-content boundary. |
| `@youdotcom-oss/pi-plugin` | Pi extension for discovering You.com MCP tools and registering bundled skills. |
| `packages/hermes` | Hermes package with copied You.com skills and host-specific validation. |

The OpenClaw and OpenCode packages do not ship the You.com tools themselves. They add the trust-boundary behavior those hosts need when consuming output from the remote You.com MCP server.

## Skill Details

### `you-web`

Use for current web information, specific URL reading, cited synthesis, and general You.com MCP tool routing. Financial questions should route to `you-finance`.

### `you-free`

Use when the task only needs basic search results and the client has no API key or OAuth session. It only expects `you-search` and avoids contents, research, finance, and livecrawl paths.

### `you-research`

Use when the agent should do the research loop itself: plan, search broadly, read pages, cross-check sources, and produce a cited answer. It intentionally uses `you-search` and `you-contents`, not the one-shot `you-research` tool.

### `you-finance`

Use for market-sensitive and finance-specific questions. The skill asks the agent to include date or timeframe, cite returned sources, and flag uncertainty when sources disagree or data may be delayed.

### `you-discover`

Use when a user wants to integrate You.com with an agent SDK, IDE, automation platform, MCP client, or other developer tool. It prefers native MCP, then thin MCP bridges, then SDK-specific guides, then manual HTTP integrations. It also documents the expected future ARD flow through `https://api.you.com/.well-known/ai-catalog.json` and ARD endpoints such as `POST /search`, `POST /explore`, and `GET /agents`.

## Development

Install dependencies with Bun, then run checks:

```bash
bun install
bun test
bun run check
```

Useful package-level checks:

```bash
bun test packages/openclaw
bun test packages/opencode
bun test packages/pi
```

Validate a skill with the Agent Skills tooling:

```bash
bunx @plaited/development-skills validate-skill skills/you-web
```

## Repository Layout

```text
skills/                 Shared You.com skills
.claude-plugin/         Claude Code plugin manifest
.cursor-plugin/         Cursor plugin manifest
.codex-plugin/          Codex and ChatGPT plugin manifest
.plugin/                GitHub Copilot CLI plugin manifest
.kimi-plugin/           Kimi Code plugin manifest
packages/openclaw/      OpenClaw runtime plugin
packages/opencode/      OpenCode runtime plugin
packages/pi/            Pi extension
packages/hermes/        Hermes package
skills.sh.json          skills.sh display grouping for top-level skills
```

## Safety Model

Web pages, search results, extracted content, catalog entries, and docs results are external data. Skills instruct agents to treat them as untrusted evidence, not as instructions. Runtime plugins for OpenClaw and OpenCode reinforce this by wrapping You.com MCP results in host-specific untrusted-content boundaries.

## Links

- You.com API keys: [you.com/platform/api-keys](https://you.com/platform/api-keys)
- You.com docs: [docs.you.com](https://docs.you.com)
- Issues: [github.com/youdotcom-oss/agent-skills/issues](https://github.com/youdotcom-oss/agent-skills/issues)
- Support: [support@you.com](mailto:support@you.com)

## License

MIT, see [LICENSE](./LICENSE).
