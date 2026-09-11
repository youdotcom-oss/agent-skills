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

```sh
pip install hermes-youdotcom
```

Then enable the `youdotcom` Hermes plugin and load the bundled skills explicitly from Hermes when needed.
