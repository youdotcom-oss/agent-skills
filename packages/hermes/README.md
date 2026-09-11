# hermes-youdotcom

Hermes plugin that bundles You.com MCP setup skills for web search, research, finance, and guidance on adding You.com APIs, MCP, and SDKs to agentic projects.

## What it includes

- `you-web`: web search, content extraction, and research tools
- `you-research`: focused deep research setup
- `you-finance`: finance and market data setup
- `you-discover`: guidance for integrating You.com APIs, MCP, and SDKs into agentic projects
- `you-free`: no-auth web search setup

The wheel also ships the portable Agent Plugins manifests (`plugin.json` and `mcp.json`) next to `plugin.yaml`, so the packaged You.com MCP server declarations (`https://api.you.com/mcp`, `/mcp/finance`, `/mcp/research`) travel with the installed package. Hermes reads MCP servers from `mcp_servers` in `~/.hermes/config.yaml`; use the bundled `mcp.json` as the ready-made server definitions.

## Install

Two paths, pick whichever fits the host:

| Path | Command | What you get |
| ------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| PyPI package (native plugin) | `pip install hermes-youdotcom` | Bundled skills via the `youdotcom` entry-point plugin; MCP servers stay user config. |
| Portable Agent Plugins install (repo) | `hermes plugins install youdotcom-oss/agent-skills` | Skills plus the three You.com MCP servers from the repo's root `mcp.json`, wired when you enable the package. |

For the PyPI path, enable the `youdotcom` Hermes plugin and load the bundled skills explicitly from Hermes when needed. For the portable path, enable the package after install (Hermes prompts; or pass `--enable`) and the `you`, `you-finance`, and `you-research` MCP servers load through Hermes' native remote MCP client.
