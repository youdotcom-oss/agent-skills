# You.com Agent Skills and Plugins

Use You.com from coding agents for current web search, URL content extraction, cited research, finance research, and developer integration discovery.

This repo is for developers who want to:

- add You.com MCP tools and skills to their coding agent quickly
- use `you-discover` to find the right You.com API, MCP server, SDK, or docs path for an agentic project
- package the same You.com skills for agent platforms such as Claude Code, Cursor, Codex, Copilot CLI, Kimi Code, OpenCode, OpenClaw, Pi, and Hermes

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
| OpenCode                        | `opencode plugin @youdotcom-oss/opencode`                                                             |
| OpenClaw                        | `openclaw plugins install clawhub:you` or `openclaw plugins install npm:@youdotcom-oss/openclaw`      |
| Pi                              | `pi install npm:@youdotcom-oss/pi`                                                                    |
| Hermes                          | `pip install hermes-youdotcom`                                                                        |

The top-level plugin manifests reuse the shared `skills/` directory when the host supports it. Packages under `packages/` include host-specific metadata, copied skills, or runtime adapters where needed.

## Configure You.com MCP

The standard remote MCP endpoint is:

```text
https://api.you.com/mcp
```

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

Useful MCP profiles:

| Endpoint                                    | Use it for                      |
| ------------------------------------------- | ------------------------------- |
| `https://api.you.com/mcp`                   | Authenticated You.com MCP tools |
| `https://api.you.com/mcp?profile=free`      | Keyless basic `you-search`      |
| `https://api.you.com/mcp?tools=you-finance` | Finance-only MCP setup          |
| `https://you.com/docs/_mcp/server`          | You.com docs search             |

Some clients use OAuth instead of a static API key. The skills are written to guide the agent through the best available auth path for the current host.

## Skills

The shared skills route agents to the lightest You.com surface that fits the task. MCP tools are the default for web search and URL reading, while slower managed research and finance workflows prefer reusable local scripts or direct API calls when an API key is available.

| Skill          | Use it for                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| `you-web`      | Current web search, URL reading, cited synthesis, and general You.com MCP tool routing.                         |
| `you-free`     | Keyless basic web search with `you-search` only.                                                                |
| `you-research` | Routing research tasks between agent-led search, Research API scripts, and managed `you-research` MCP fallback. |
| `you-finance`  | Routing finance questions to an existing script, a new Finance Research API call, or an MCP fallback.           |
| `you-discover` | Finding how to integrate You.com APIs, MCP servers, SDKs, docs, and tools into agentic projects.                |

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
| `hermes-youdotcom`        | Hermes package that ships You.com skills through a Python entry-point plugin. |

See each package README for host-specific details.

## Repository Layout

| Path                 | Purpose                                         |
| -------------------- | ----------------------------------------------- |
| `skills/`            | Shared You.com skills                           |
| `.claude-plugin/`    | Claude Code plugin manifest                     |
| `.cursor-plugin/`    | Cursor plugin manifest                          |
| `.codex-plugin/`     | Codex and ChatGPT plugin manifest               |
| `.plugin/`           | GitHub Copilot CLI plugin manifest              |
| `.kimi-plugin/`      | Kimi Code plugin manifest                       |
| `packages/opencode/` | OpenCode package                                |
| `packages/openclaw/` | OpenClaw package                                |
| `packages/pi/`       | Pi package                                      |
| `packages/hermes/`   | Hermes package                                  |
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
bun run --filter '@youdotcom-oss/hermes' test
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
