# @youdotcom-oss/strands-agents

You.com MCP servers and Agent Skills for [Strands Agents](https://strandsagents.com), in one TypeScript plugin.

`YouDotComPlugin` registers the You.com MCP servers (search, content extraction, cited research, finance data, docs lookup) and the bundled You.com Agent Skills, so a Strands agent gets web-grounded tools and the skills to use them well in one line.

## Install

```sh
npm install @youdotcom-oss/strands-agents
```

## Quickstart

```ts
import { Agent } from '@strands-agents/sdk'
import { YouDotComPlugin } from '@youdotcom-oss/strands-agents'

const agent = new Agent({
  model: 'global.anthropic.claude-sonnet-4-6', // any Strands model
  plugins: [new YouDotComPlugin()],
})
const result = await agent.invoke('What changed in the latest release of strands-agents? Cite sources.')
```

The API key comes from `YDC_API_KEY` by default, or pass it explicitly: `new YouDotComPlugin({ apiKey: '...' })`. Get one at [you.com/platform](https://you.com/platform).

## What it configures

- MCP servers from `mcp.json`: `you`, `you-finance`, `you-research` (auth via
  `YDC_API_KEY`), plus keyless `you-discover` and `you-docs`
- Skills from the bundled `skills/`: `you-web`, `you-research`, `you-finance`,
  `you-discover`

Without an API key the keyed servers are skipped with a warning and the agent is told which servers are unavailable; keyless servers always work. The shipped server and skill sets mirror the repo-root `skills/` and `mcp.json` at build time. Peer deps: `@strands-agents/sdk >=1.0.0 <2.0.0`, `zod ^4`.

## Build and test

```sh
bun run build   # stage shared assets -> src/ (gitignored), bundle -> dist/
bun test
```

The TypeScript package shares its version line with the Python package (`packages/strands-agents/python`); both are stamped by the release plan's `strands` unit.

## License

MIT. Bundled skills are from this repository, MIT.