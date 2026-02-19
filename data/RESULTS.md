# Skill Eval Results

_Generated: 2026-02-19T07:05:00.000Z (CI run 22171839777)_

# Claude Code Agent Skill Evaluation Report

## Summary

**Pass Rate: 7/7 (100%)**

All evaluated skills successfully passed integration tests with real API calls to external services.

---

## Results Table

| Skill | Pass | Score | Notes |
|-------|------|-------|-------|
| teams-anthropic-integration | ✅ | 0.92 | All 4 tests pass with real API timings (5780ms and 9773ms for live calls); working integrations with both Claude-only and MCP paths |
| ydc-ai-sdk-integration | ✅ | 0.95 | Both tests pass with real API timings (9795ms and 8958ms); live You.com search calls validated end-to-end |
| ydc-claude-agent-sdk-integration-python | ✅ | 0.93 | Both tests pass with real API timings (33.50s total); env-var validation and MCP integration calls confirmed |
| ydc-claude-agent-sdk-integration-typescript | ✅ | 0.94 | Both tests pass with real API timings (12–16s); live integration with Claude Agent SDK and You.com MCP confirmed |
| ydc-crewai-mcp-integration | ✅ | 0.93 | 4 tests pass; real API integration with You.com MCP confirmed; YDC_API_KEY validated before running |
| ydc-openai-agent-sdk-integration-python | ✅ | 0.95 | Both tests pass with real API timings (13.64s total); meaningful assertions on web search output |
| ydc-openai-agent-sdk-integration-typescript | ✅ | 0.96 | Both tests pass with real API timings (7060ms and 4681ms); keyword assertions on live web search results |

