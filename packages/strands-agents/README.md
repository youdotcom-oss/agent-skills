# Strands Agents packages for You.com

You.com MCP servers and Agent Skills for [Strands Agents](https://strandsagents.com), packaged as a single plugin in Python and TypeScript.

`YouDotComPlugin` registers the You.com MCP servers (search, content extraction, cited research, finance data, docs lookup) and the bundled You.com Agent Skills, so a Strands agent gets web-grounded tools and the skills to use them well in one line.

## Packages

| Language | Package | Install |
| --- | --- | --- |
| Python | [`strands-you`](https://pypi.org/project/strands-you/) | `pip install strands-you` |
| TypeScript | [`@youdotcom-oss/strands-agents`](https://www.npmjs.com/package/@youdotcom-oss/strands-agents) | `npm install @youdotcom-oss/strands-agents` |

## Quickstart

### Python

```python
from strands import Agent
from strands_you import YouDotComPlugin

agent = Agent(plugins=[YouDotComPlugin()])
result = agent("What changed in the latest release of strands-agents? Cite sources.")
```

### TypeScript

```ts
import { Agent } from '@strands-agents/sdk'
import { YouDotComPlugin } from '@youdotcom-oss/strands-agents'

const agent = new Agent({
  model: 'global.anthropic.claude-sonnet-4-6', // any Strands model
  plugins: [new YouDotComPlugin()],
})
const result = await agent.invoke('What changed in the latest release of strands-agents? Cite sources.')
```

## Authentication

The API key comes from `YDC_API_KEY` by default. Pass it explicitly if you prefer: `YouDotComPlugin(api_key="...")` (Python) or `new YouDotComPlugin({ apiKey: '...' })` (TypeScript). Get one at [you.com/platform](https://you.com/platform).

Without an API key the keyed servers are skipped with a warning and the agent is told which servers are unavailable; keyless servers always work.

## What it configures

- MCP servers: `you`, `you-finance`, `you-research` (auth via `YDC_API_KEY`), plus keyless `you-discover` and `you-docs`
- Skills: `you-web`, `you-research`, `you-finance`, `you-discover`

The shipped server and skill sets mirror the repo-root `skills/` and `mcp.json` at release time.

## Package-specific docs

- Python: [`packages/strands-agents/python/README.md`](./python/README.md) — build and test with `uv`
- TypeScript: [`packages/strands-agents/typescript/README.md`](./typescript/README.md) — peer deps (`@strands-agents/sdk >=1.0.0 <2.0.0`, `zod ^4`) and build with `bun`
