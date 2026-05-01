# Skill Eval Results

_Generated: 2026-05-01T21:46:31.744Z_

# Skill Evaluation Summary

**Pass Rate: 12/12 (100%)**

| Skill | Pass | Score | Notes |
|-------|------|-------|-------|
| teams-anthropic-integration | ✓ | 0.96 | Real API timings (2.2s Claude, 10.6s MCP search). Both paths tested with keyword assertions. |
| ydc-ai-sdk-integration | ✓ | 0.95 | 3 tests pass (10–13s each). Streaming validated via chunk count > 1. |
| ydc-claude-agent-sdk-integration-python | ✓ | 0.88 | 4 tests pass (118.86s). Full-tool and restricted-tool agents verified. |
| ydc-claude-agent-sdk-integration-typescript | ✓ | 0.93 | 2 tests pass (20–26s). Web-search-only restriction verified with keyword assertions. |
| ydc-crewai-mcp-integration | ✓ | 0.78 | 4 tests pass. Tool restriction tested but assertions are minimal (length checks). |
| ydc-openai-agent-sdk-integration-python | ✓ | 0.96 | 2 tests pass (17.40s). Hosted MCP and self-managed Streamable HTTP both working. |
| ydc-openai-agent-sdk-integration-typescript | ✓ | 0.94 | 4 tests pass (1.4–9.2s). Both connection strategies with identical assertions. |
| ydc-langchain-integration-typescript | ✓ | 0.88 | 1 test passes (8.4s). Sequential tool invocation (youSearch → youContents) verified. |
| ydc-langchain-integration-python | ✓ | 0.93 | 2 tests pass (15.72s). Both retriever and multi-tool agent paths working. |
| youdotcom-cli | ✓ | 0.94 | 5 tests pass (750ms–16.7s). Search, Research, Contents endpoints + livecrawl + effort levels. |
| youdotcom-api-typescript | ✓ | 0.88 | 9 tests pass (500ms–4.7s). Research API + Search+Contents pipeline end-to-end. |
| youdotcom-api-python | ✓ | 0.94 | 18 tests pass (5.84s total). Research, Search, Contents with fixture memoization. |

All evaluations passed with real API integrations confirmed by live endpoint timings.
