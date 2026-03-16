# Skill Eval Results

_Generated: 2026-03-16T06:45:35.020Z (CI run 23131202246)_

# Skill Evaluation Report

## Summary
**Pass Rate: 9/9 (100%)**

| Skill | Pass | Score | Notes |
|-------|------|-------|-------|
| ydc-ai-sdk-integration | ✅ | 0.95 | Both `generateText` and `streamText` paths tested end-to-end with real You.com API calls (11–12s each). Strong keyword assertions. |
| ydc-langchain-integration-python | ✅ | 0.78 | All 6 tests pass with live API (33.84s). YouRetriever, YouSearchTool, YouContentsTool, and create_react_agent working. Minor: incomplete test file truncation in output. |
| ydc-crewai-mcp-integration | ✅ | 0.88 | 4 tests pass with live crewAI execution traces. Tool restriction (`ALLOWED_TOOLS`) explicit and testable. Full code deployed correctly despite output truncation. |
| ydc-openai-agent-sdk-integration-python | ✅ | 0.96 | Both hosted and self-managed MCP connections tested (16.29s). Real API timings confirm web search calls. Meaningful keyword assertions. |
| ydc-openai-agent-sdk-integration-typescript | ✅ | 0.95 | All 4 tests pass (14.1s total). Both hosted and streamable HTTP MCP variants verified with keyword assertions. |
| ydc-claude-agent-sdk-integration-typescript | ✅ | 1.0 | 1 test passed with live MCP integration (15.45s). Tool restriction to web search only enforced. |
| ydc-langchain-integration-typescript | ✅ | 0.78 | Test passes with real API (7.1s). Both youSearch and youContents tools invoked. Assertions validate tool presence but lack semantic content validation. |
| ydc-claude-agent-sdk-integration-python | ✅ | 0.91 | 2 tests pass with real MCP calls (38.40s). Meaningful keyword assertions on restricted integration. One test validates keywords; second only checks non-empty response. |
| teams-anthropic-integration | ✅ | 0.95 | Both paths pass with real API (2.5s and 12.2s). Path A: basic Claude integration. Path B: You.com MCP web search. Tool-forcing queries present. |

All skills passed evaluation thresholds (≥0.65). All integrations compile and execute against live APIs.
