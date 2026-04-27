# Skill Eval Results

_Generated: 2026-04-27T07:08:15.557Z (CI run 24981160665)_

# Agent Skill Evaluation Summary

**Pass Rate: 8/9 skills (89%)**

| Skill | Pass | Score | Notes |
|-------|------|-------|-------|
| ydc-openai-agent-sdk-integration-typescript | ✅ | 1.00 | All 4 tests pass; hosted + streamable MCP paths verified |
| ydc-crewai-mcp-integration | ✅ | 0.88 | All 4 tests pass; web search restriction validated |
| ydc-langchain-integration-typescript | ✅ | 0.87 | Both tools (youSearch + youContents) integrated; 7.9s real API call |
| ydc-ai-sdk-integration | ✅ | 0.95 | Both generateText and streamText paths tested; 20s+ real API calls |
| teams-anthropic-integration | ✅ | 0.96 | Claude + MCP web search integration verified; 15s real API call |
| ydc-langchain-integration-python | ✅ | 0.72 | 6 tests pass but assertions weak; retriever + agent both functional |
| ydc-claude-agent-sdk-integration-python | ✅ | 0.78 | 2 tests pass; tool restriction partially validated |
| ydc-openai-agent-sdk-integration-python | ✅ | 0.96 | Both hosted and streamable MCP approaches tested; 20s real API calls |
| ydc-claude-agent-sdk-integration-typescript | ❌ | 0.00 | **Test failure** — generated code is syntactically broken |

## Failures

### ydc-claude-agent-sdk-integration-typescript
**Root Cause:** The test file (`agent.spec.ts`) was truncated mid-function, and `agent.ts` is missing its closing brace and systemPrompt definition in the `runSearch` function. This caused a syntax error preventing the tests from executing (exit code 1).

**Recommended Fix:** Regenerate both files with complete, valid TypeScript syntax. Ensure all functions have proper closing braces and all helper references are properly initialized before use.
