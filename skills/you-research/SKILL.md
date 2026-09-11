---
name: you-research
description: Route research tasks between a cost-conscious agentic search workflow and the You.com you-research MCP tool for one-shot cited synthesis.
compatibility: Requires network access and You.com MCP tools with `YDC_API_KEY`, OAuth, or MPP/x402 payment support.
license: MIT
metadata:
  mcp_servers: '{"you-research":{"url":"https://api.you.com/mcp/research"}}'
  author: youdotcom-oss
  version: 0.3.0
  category: research
  keywords: you.com,mcp,web-search,content-extraction,deep-research,citations
---

# You.com Research Routing

Use this skill to choose the right You.com research path for the user's goal: agent-led search with `you-search` and `you-contents`, or one-shot cited synthesis with the `you-research` MCP tool.

## Prerequisites

The You.com MCP endpoints must be reachable from the host:

- Base tools (`you-search`, `you-contents`): `https://api.you.com/mcp` with `YDC_API_KEY` bearer auth or OAuth. Declared by the `you-web` skill, which owns the agent-led pipeline.
- Managed research (`you-research`): `https://api.you.com/mcp/research` with `YDC_API_KEY` bearer auth, OAuth, or an MPP/x402-aware MCP client.

MPP/x402-aware MCP clients may receive HTTP `402` payment challenges from You.com tools, then retry with payment headers. Let the host client handle external payment and retry; do not add wallet signing logic to this skill.

## Managed research with the you-research MCP tool

Call the `you-research` MCP tool when the user wants a synthesized answer with citations in one step. It runs You.com's managed research pipeline and returns a concise answer with inline citations and source metadata, so the host does not orchestrate multi-step search itself.

For keyless payment with no API key and no manual signing, compose the You.com MCP server with the Coinbase Payments MCP server; see [Coinbase Payments MCP path](references/coinbase-payments-mcp.md) for setup and when to choose it.

If the `you-research` tool is unavailable or the client cannot tolerate its response time, fall back to the agent-led search pipeline in the `you-web` skill and say which path was used.

## Decision Tree

- User is cost-conscious or wants to develop/fine-tune a research skill -> use the agent-led search pipeline in the `you-web` skill.
- User needs a one-shot synthesized answer with citations -> call the `you-research` MCP tool.
- User needs OAuth or MPP/x402 payment handling -> use the `you-research` MCP tool with a payment-aware MCP client or the Coinbase Payments MCP composition.
- Required MCP tools are unavailable -> tell the user what is missing, provide the setup options from the prerequisites above, and request approval before installing, connecting, or changing configuration.
- Simple lookup -> use `you-search` once, answer directly.
- URL provided -> use `you-contents` on those URLs.
- Everything else -> use the agent-led search pipeline in the `you-web` skill.

Preserve the core research requirements regardless of path: read sources before relying on exact claims, cross-check key facts, cite real URLs, and finish with the best supported answer even when evidence is incomplete.
