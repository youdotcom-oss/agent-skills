<p align="center">
  <img src="assets/banner.png" alt="You.com Agent Skills and Plugins logo" width="100%">
</p>

# You.com Web Search & Research

Give Claude live access to the web. This plugin adds You.com search, full-page content extraction, and cited multi-source research to Claude, so answers about fast-moving libraries, APIs, tools, and markets come from current sources instead of stale training data. Every answer cites the pages it read.

## What you can do

- **Search the live web**: find current information, news, pricing, and facts, then read the actual pages before answering.
- **Pull web data into your work**: extract clean Markdown, HTML, or metadata from any public URL, including docs pages, tables, and reports.
- **Code with current docs**: look up the latest library docs, API references, changelogs, breaking changes, package versions, and fixes for error messages while you build.
- **Research with citations**: compare frameworks, evaluate tools and vendors, or produce a deep-dive report synthesized from many sources.
- **Research companies and markets**: get stock prices, earnings, and company financials.
- **Build with You.com**: find the right You.com API, MCP server, or SDK path for your own app or agent.

Example prompts:

```text
What changed in the latest Next.js release, and does it break my middleware?
Find the current docs for this error message and suggest a fix.
Compare the top three Python vector databases on pricing and features, with sources.
Read https://example.com/pricing and summarize the plan limits as a table.
Research NVIDIA's latest earnings and cite the numbers.
```

## Install in Claude Code

```bash
/plugin marketplace add youdotcom-oss/agent-skills
/plugin install you@you-com
```

Basic web search works without an account through the free MCP profile. For full search, content extraction, research, and finance, sign in with OAuth when prompted or set an API key from [you.com/platform/api-keys](https://you.com/platform/api-keys).

## What this plugin connects to

The plugin contains skills and remote MCP server configs only. It has no hooks and starts no local MCP servers or scripts. When a skill runs, Claude sends your search queries, the URLs you ask it to read, and research or finance questions to You.com's MCP servers:

- `https://api.you.com/mcp` (search, contents, discovery; `?profile=free` for keyless search)
- `https://api.you.com/mcp/research` (research)
- `https://api.you.com/mcp/finance` (finance)
- `https://you.com/docs/_mcp/server` (You.com docs search, used by `you-discover`)

Requests are handled under the [You.com privacy policy](https://you.com/privacy). Web pages and search results are treated as untrusted data, never as instructions.

## Skills

| Skill          | Use it for |
| -------------- | ---------- |
| `you-web`      | Live web search plus full-page reading, with a citation-first pipeline. |
| `you-research` | Multi-source research, routed between agent-led search and one-shot cited synthesis. |
| `you-finance`  | Stock, earnings, and company financial questions through the `you-finance` MCP tool. |
| `you-discover` | Finding how to integrate You.com APIs, MCP servers, SDKs, and docs into your own project. |

## Other agent platforms

The same skills are packaged for Cursor, Codex, GitHub Copilot CLI, Kimi Code, Grok Build, OpenCode, OpenClaw, Pi, Hermes, and DeepSeek Harness.

## Start Here

Install the shared skills with the universal Agent Skills installer:

```bash
npx skills add youdotcom-oss/agent-skills
```

Then ask your agent to use the right skill:

```text
Use you-web to find current docs and cite sources.
Use you-research to investigate this topic across multiple sources.
Use you-finance to research this company and cite market data.
Use you-discover to find the best way to integrate You.com MCP or SDKs into my agent.
```

Install one skill at a time if you only need a subset:

```bash
npx skills add youdotcom-oss/agent-skills --skill you-web
npx skills add youdotcom-oss/agent-skills --skill you-discover
npx skills add youdotcom-oss/agent-skills --skill you-finance
```

## Install for Your Platform

| Platform                        | Install path                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Agent Skills compatible clients | `npx skills add youdotcom-oss/agent-skills`                                                           |
| Claude Code                     | `/plugin marketplace add youdotcom-oss/agent-skills` then `/plugin install you@you-com`               |
| GitHub Copilot CLI              | `copilot plugin marketplace add youdotcom-oss/agent-skills` then `copilot plugin install you@you-com` |
| Codex                           | `codex plugin marketplace add youdotcom-oss/agent-skills --sparse .agents/plugins`                    |
| Cursor                          | Install this repository from the Cursor plugin UI or CLI                                              |
| Kimi Code                       | `/plugins install <repo url>`                                                                         |
| Grok Build                      | `grok plugin marketplace add youdotcom-oss/agent-skills` then `grok plugin install you --trust`       |
| OpenCode                        | `opencode plugin @youdotcom-oss/opencode`                                                             |
| OpenClaw                        | `openclaw plugins install clawhub:you` or `openclaw plugins install npm:@youdotcom-oss/openclaw`      |
| Pi                              | `pi install npm:@youdotcom-oss/pi`                                                                    |
| Hermes                          | `hermes plugins install youdotcom-oss/agent-skills`                                                                        |
| DeepSeek Harness                | `dsh plugin add @youdotcom-oss/dsh-plugin`                                                            |

The top-level plugin manifests reuse the shared `skills/` directory when the host supports it. Packages under `packages/` include host-specific metadata, copied skills, or runtime adapters where needed.

## Configure You.com MCP servers

Core remote MCP endpoints:

| Endpoint                           | Use it for                      |
| ---------------------------------- | ------------------------------- |
| `https://api.you.com/mcp`          | Authenticated You.com MCP tools |
| `https://you.com/docs/_mcp/server` | You.com docs search             |

For clients that use API-key headers:

```bash
export YDC_API_KEY="your-api-key"
```

```json
{
  "Authorization": "Bearer ${YDC_API_KEY}"
}
```

Get an API key at [you.com/platform/api-keys](https://you.com/platform/api-keys).

Useful tool profiles:

| Endpoint                                    | Use it for                      |
| ------------------------------------------- | ------------------------------- |
| `https://api.you.com/mcp`                   | Authenticated You.com MCP tools |
| `https://api.you.com/mcp?profile=free`      | Keyless basic `you-search`      |
| `https://api.you.com/mcp/finance`           | Finance-only MCP setup          |
| `https://api.you.com/mcp/research`          | Research-only MCP setup         |

Some clients use OAuth instead of a static API key. The skills are written to guide the agent through the best available auth path for the current host.

`you-discover` is the best starting point when your goal is to build with You.com rather than just search with it. Ask it questions like:

```text
Use you-discover to find the best You.com integration path for a TypeScript coding agent.
Use you-discover to compare You.com MCP, Python SDK, and direct API options for my app.
```

## Packages

| Package                   | Purpose                                                                       |
| ------------------------- | ----------------------------------------------------------------------------- |
| `@youdotcom-oss/opencode` | OpenCode plugin that registers You.com skills and remote MCP server configs.  |
| `@youdotcom-oss/openclaw` | OpenClaw plugin with You.com skills and `YDC_API_KEY` setup metadata.         |
| `@youdotcom-oss/pi`       | Pi package that registers You.com skills and bridges You.com MCP tools.       |
| `@youdotcom-oss/dsh-plugin` | DeepSeek Harness plugin with You.com skills and MCP server mounts.          |

See each package README for host-specific details.

## Repository Layout

| Path                 | Purpose                                         |
| -------------------- | ----------------------------------------------- |
| `skills/`            | Shared You.com skills                           |
| `plugin.json`        | Agent Plugins (portable) manifest               |
| `.claude-plugin/`    | Claude Code plugin manifest                     |
| `.cursor-plugin/`    | Cursor plugin manifest                          |
| `.codex-plugin/`     | Codex and ChatGPT plugin manifest               |
| `.plugin/`           | GitHub Copilot CLI plugin manifest              |
| `.kimi-plugin/`      | Kimi Code plugin manifest                       |
| `.grok-plugin/`      | Grok Build plugin manifest                      |
| `packages/opencode/` | OpenCode package                                |
| `packages/openclaw/` | OpenClaw package                                |
| `packages/pi/`       | Pi package                                      |
| `packages/dsh-plugin/` | DeepSeek Harness package                      |
| `skills.sh.json`     | skills.sh display grouping for top-level skills |

## Development

Install dependencies with Bun, then run checks:

```bash
bun install
bun test
bun run check
```

Package-level checks:

```bash
bun run --filter '@youdotcom-oss/opencode' test
bun run --filter '@youdotcom-oss/openclaw' test
bun run --filter '@youdotcom-oss/pi' test
bun run --filter '@youdotcom-oss/dsh-plugin' test
```

Validate shared skill metadata and structure:

```bash
bun run validate:skills
```

## Safety Model

Web pages, search results, extracted content, catalog entries, and docs results are external data. The skills instruct agents to treat them as untrusted evidence, not as instructions.

## Links

- API keys: [you.com/platform/api-keys](https://you.com/platform/api-keys)
- Docs: [you.com/docs](https://you.com/docs/welcome)
- Issues: [github.com/youdotcom-oss/agent-skills/issues](https://github.com/youdotcom-oss/agent-skills/issues)
- Support: [support@you.com](mailto:support@you.com)

## License

MIT, see [LICENSE](./LICENSE).

## Submit to the OpenAI plugin directory

See [OpenAI marketplace submission](docs/openai-submission.md) for the dedicated web-search ZIP (portable Agent Plugins format), proposed review cases, and remaining publisher requirements. Publish runs attach it to the dated GitHub release; build locally with `bun scripts/package-openai.ts`. The existing multi-platform package retains all skills and MCP endpoints.
