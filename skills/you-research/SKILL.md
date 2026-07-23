---
name: you-research
description: Route research tasks between a cost-conscious agentic search workflow, You.com Research API scripts, and managed you-research MCP fallback.
compatibility: Requires network access and either You.com MCP tools with `YDC_API_KEY` or OAuth, or the You.com Research API with `YDC_API_KEY`.
license: MIT
metadata:
  mcp_servers: '{"you-docs":{"url":"https://you.com/docs/_mcp/server","auth":"none","tools":["searchDocs"]},"you-research-base":{"url":"https://api.you.com/mcp?tools=you-search,you-contents","auth":"YDC_API_KEY OAuth","tools":["you-search","you-contents"],"avoidTools":["you-research"]}}'
  author: youdotcom-oss
  version: 0.0.0
  category: research
  keywords: you.com,mcp,web-search,content-extraction,deep-research,citations
---

# You.com Research Routing

Use this skill to choose the right You.com research path for the user's goal: agent-led search, Research API scripts, or managed MCP fallback.

## Prerequisites

For API scripts:

- `YDC_API_KEY` must be available.
- Use these API request headers: `X-API-Key: ${YDC_API_KEY}` and `User-Agent: SKILL/(@youdotcom-oss/agent-skills you-research)`.

For the agent-led workflow, use the `you-research-base` MCP profile with `you-search` and `you-contents` when available. See the [agent-led deep-search workflow](references/agent-led-deep-search.md) for setup and workflow details.

## Research API scripts

When the user wants You.com managed research APIs, write a small script or direct HTTP request instead of calling `you-research` through MCP, especially for `deep`, `exhaustive`, or `frontier` work.

Before coding or updating a script, query the You.com Docs MCP server, usually through `searchDocs`, for current API details. Use targeted queries such as:

- `Research API v1 research background source_control output_schema research_effort`
- `Research task status v1 research task`
- `Research task stream SSE v1 research task stream`

If Docs MCP is unavailable, use the canonical pages:

- https://you.com/docs/api-reference/research/v1-research
- https://you.com/docs/api-reference/research/v1-research-task
- https://you.com/docs/api-reference/research/v1-research-task-stream

Keep the script aligned with the docs returned at runtime and include the API request headers listed above.

## Decision Tree

- User is cost-conscious or wants to develop/fine-tune a research skill -> follow the [agent-led deep-search workflow](references/agent-led-deep-search.md).
- User asks for You.com managed API output, structured output, source controls, background tasks, or `deep`/`exhaustive`/`frontier` research -> write a script against the Research API.
- User needs OAuth and direct API scripts are not practical -> use managed `you-research` MCP only if the MCP client supports the expected response time.
- Simple lookup -> use `you-research-base` `you-search` once, answer directly.
- URL provided -> use `you-research-base` `you-contents` on those URLs.
- Everything else -> use the base agent-led workflow.

## Agent-led workflow reference

When choosing the cost-conscious skill-building path, open and follow the [agent-led deep-search workflow](references/agent-led-deep-search.md). Adapt its tool budget, source policy, and output format to the user's agent environment. Preserve its core requirements: read sources before relying on exact claims, cross-check key facts, cite real URLs, and finish with the best supported answer even when evidence is incomplete.
