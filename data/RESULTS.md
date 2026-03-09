# Skill Eval Results

_Generated: 2026-03-09T06:33:01.787Z (CI run 22841246238)_

# Agent Skills Evaluation Report

**Overall Pass Rate: 9/9 (100%)**

| Skill | Pass | Score | Notes |
|-------|------|-------|-------|
| ydc-ai-sdk-integration | ✓ | 0.95 | Both generateText and streamText paths tested end-to-end with real API calls (22s total). Streaming assertions correctly avoid post-consumption access. |
| ydc-langchain-integration-python | ✓ | 0.88 | All 6 tests passed (13.81s). Both YouRetriever and agent paths with YouSearchTool/YouContentsTool verified. Minor: test file truncation in output, tool-forcing queries could be stronger. |
| ydc-crewai-mcp-integration | ✓ | 0.88 | 5 tests passed with real crewAI execution traces. Tool restriction explicit via `ALLOWED_TOOLS`. Minor: length-based assertions rather than content validation. |
| ydc-openai-agent-sdk-integration-python | ✓ | 0.94 | 4 tests passed (23.59s total). Both hosted MCP and self-managed MCPServerStreamableHttp variants tested with keyword assertions. |
| ydc-openai-agent-sdk-integration-typescript | ✓ | 0.96 | 4 tests passed with real API timings (1229–7699ms). Strong assertions on specific keywords. Both connection types validated. |
| ydc-claude-agent-sdk-integration-typescript | ✓ | 0.94 | 3 tests passed (37s total). Base integration and search-only restriction both verified with meaningful content checks. |
| ydc-langchain-integration-typescript | ✓ | 1.0 | 1 test passed (6.11s). Agent correctly uses both youSearch and youContents tools with structured Zod output validation. |
| ydc-claude-agent-sdk-integration-python | ✓ | 0.78 | 2 tests passed (19.38s). Web search restriction working, but assertions minimal (one length-only check). |
| teams-anthropic-integration | ✓ | 1.0 | 2 tests passed (14.42s total). Both base Anthropic integration and MCP extension with live web search verified. |

All skills passed integration testing with real API calls, environment validation, and meaningful content assertions.
