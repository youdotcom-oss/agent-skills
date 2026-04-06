# Skill Eval Results

_Generated: 2026-04-06T06:50:41.207Z (CI run 24021982706)_

# Agent Skill Evaluation Summary

**Overall Pass Rate: 9/9 skills (100%)**

| Skill | Pass | Score | Notes |
|-------|------|-------|-------|
| ydc-ai-sdk-integration | ✓ | 0.94 | Real API calls (11–13s), meaningful keyword assertions, minor gap in differentiated streaming behavior |
| ydc-langchain-integration-typescript | ✓ | 1.00 | Perfect: both tools exercised, structured output, real API calls (8s) |
| ydc-langchain-integration-python | ✓ | 0.88 | 4 tests passed with real APIs (16s), incomplete function body in source but executed successfully |
| teams-anthropic-integration | ✓ | 0.96 | Real API timings (2s Claude + 10s MCP), explicit tool-forcing queries, MCP extension validated |
| ydc-openai-agent-sdk-integration-python | ✓ | 0.94 | 4 tests passed (18s real calls), both hosted and streamable MCP paths tested, meaningful assertions |
| ydc-crewai-mcp-integration | ✓ | 0.78 | Tests pass with real APIs, tool restriction implemented, but weak tool enforcement verification |
| ydc-openai-agent-sdk-integration-typescript | ✓ | 1.00 | Perfect: 4 tests pass (13s total), both hosted and streamable MCP paths validated |
| ydc-claude-agent-sdk-integration-python | ✓ | 0.87 | Real API calls (58s), tool restriction works, but assertions only check string length/type |
| ydc-claude-agent-sdk-integration-typescript | ✓ | 1.00 | Perfect: 2 tests pass (31s), web-search-only restriction validated with meaningful assertions |

All skills successfully integrate external APIs (You.com, OpenAI, Anthropic, MCP servers) with real integration tests passing.
