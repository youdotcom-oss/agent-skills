# Skill Eval Results

_Generated: 2026-04-20T06:59:19.563Z (CI run 24652724607)_

# Skill Evaluation Results

**Overall Pass Rate: 8/9 skills passed**

| Skill | Pass | Score | Notes |
|-------|------|-------|-------|
| ydc-openai-agent-sdk-integration-typescript | ✅ | 0.94 | 6 tests pass. Both hosted and streamable HTTP MCP implementations tested. Real API timings (1.8–4.1s). Assertions verify keyword content. |
| ydc-crewai-mcp-integration | ✅ | 0.93 | 4 tests pass. Base integration + tool restriction tested. Real You.com and OpenAI API calls. Strong content assertions. |
| ydc-langchain-integration-typescript | ✅ | 1.00 | 1 test pass. 10 assertions. Both youSearch and youContents tools verified (10s latency). Structured Zod output validated. |
| ydc-ai-sdk-integration | ✅ | 0.95 | 3 tests pass. 14 assertions. Paths A, B, C cover generateText, streamText, and chunk-by-chunk streaming. Real API calls (10–11s each). |
| teams-anthropic-integration | ✅ | 1.00 | 2 tests pass. Basic Claude integration + MCP extension. Real API latency (2.3s base, 12s with MCP web search). Content assertions validated. |
| ydc-langchain-integration-python | ✅ | 0.88 | 4 tests pass. YouRetriever + agent with YouSearchTool/YouContentsTool. Real API calls (13.4s). Agent test file truncated in output; tool inspection logic unclear. |
| ydc-claude-agent-sdk-integration-typescript | ✅ | 0.94 | 2 tests pass. 10 assertions. Web-search-only restriction verified. Real Claude Agent SDK + MCP calls (12.5–22.8s). Meaningful keyword assertions. |
| ydc-openai-agent-sdk-integration-python | ✅ | 0.88 | 5 tests pass. Hosted MCP + self-managed MCPServerStreamableHttp tested. Real API calls (20.3s). Minor syntax inconsistency in test file; test output truncated. |
| ydc-claude-agent-sdk-integration-python | ❌ | 0.45 | 1 of 3 tests failed (exit code 1). `test_search_returns_content` returned empty string despite correct tool restriction. Core MCP integration may be broken under tool filtering. |

## Failures

### ydc-claude-agent-sdk-integration-python

**Root Cause:** The agent restricted to `mcp__ydc__you_search` fails to return content from the web search tool. While the implementation appears correct (async generator streaming, proper tool allowlist), the first meaningful test (`test_search_returns_content`) asserts on an empty result string, indicating the agent is not extracting or returning data from the You.com MCP server when restricted to a single tool.

**Recommended Fix:** 
- Verify the MCP server connection persists and responds correctly under tool filtering
- Ensure the async result aggregation logic properly captures output from single-tool agents
- Add debug logging to the agent's result extraction to diagnose where content is lost
- Compare against the passing TypeScript variant to identify Python-specific MCP integration issues
