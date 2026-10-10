# strands-you

You.com MCP servers and Agent Skills for [Strands Agents](https://strandsagents.com), in one Python plugin.

`YouDotComPlugin` registers the You.com MCP servers (search, content extraction, cited research, finance data, docs lookup) and the bundled You.com Agent Skills, so a Strands agent gets web-grounded tools and the skills to use them well in one line.

## Install

```sh
pip install strands-you
```

## Quickstart

```python
from strands import Agent
from strands_you import YouDotComPlugin

agent = Agent(plugins=[YouDotComPlugin()])
result = agent("What changed in the latest release of strands-agents? Cite sources.")
```

The API key comes from `YDC_API_KEY` by default, or pass it explicitly: `YouDotComPlugin(api_key="...")`. Get one at [you.com/platform](https://you.com/platform).

## What it configures

- MCP servers from `mcp.json`: `you`, `you-finance`, `you-research` (auth via
  `YDC_API_KEY`), plus keyless `you-discover` and `you-docs`
- Skills from the bundled `skills/`: `you-web`, `you-research`, `you-finance`,
  `you-discover`

Without an API key the keyed servers are skipped with a warning and the agent is told which servers are unavailable; keyless servers always work. The shipped server and skill sets mirror the repo-root `skills/` and `mcp.json` at release time.

## Build and test

```sh
bun scripts/stage.ts   # stage shared skills + mcp.json (gitignored)
uv sync --group dev
uv run pytest -q
```

The Python package shares its version line with the TypeScript package (`packages/strands-agents/typescript`); both are stamped by the release plan's `strands` unit.

## License

MIT. Bundled skills are from this repository, MIT.