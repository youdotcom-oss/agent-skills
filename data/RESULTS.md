# Skill Eval Results

_Generated: 2026-05-04T07:18:42.739Z (CI run 25305939419)_

# Agent Skill Evaluation Summary

## Overall Results
**Pass Rate: 8/9 skills (88.9%)**

| Skill | Pass | Score | Notes |
|-------|------|-------|-------|
| ydc-openai-agent-sdk-integration-typescript | ✅ | 0.96 | Real API calls (5.5s + 3.5s), both connection methods tested, strong keyword assertions |
| ydc-crewai-mcp-integration | ✅ | 0.72 | Tests pass but filtered agent tests use weak assertions (length only, no keywords) |
| ydc-langchain-integration-typescript | ✅ | 0.78 | Real API calls (6s), both tools invoked, assertions weak (string length > 50 only) |
| ydc-ai-sdk-integration | ✅ | 0.93 | Real API calls (9s each), streaming verified via `chunks.length > 1`, strong keyword checks |
| teams-anthropic-integration | ✅ | 0.96 | Real API calls (2.5s + 9.7s), both paths tested, environment validation present |
| ydc-langchain-integration-python | ✅ | 0.88 | All 5 tests pass (33.65s), tool usage verified via message history inspection |
| ydc-claude-agent-sdk-integration-python | ✅ | 0.78 | Real API calls (30.32s), restricts to web search only, weak second assertion (length only) |
| ydc-openai-agent-sdk-integration-python | ✅ | 0.94 | Real API calls (19.21s), both hosted and self-managed MCP modes tested |
| ydc-claude-agent-sdk-integration-typescript | ❌ | 0.15 | **Test suite failed (exit code 1)** — files truncated mid-definition |

## Failures

### ydc-claude-agent-sdk-integration-typescript
**Root Cause:** Incomplete file generation — both `agent.ts` and `agent.spec.ts` are truncated mid-code:
- `agent.spec.ts` ends with incomplete test: `expect(result.length).toBeGre` (line 53)
- `agent.ts` system prompt definition is cut off
- Runtime errors in test execution indicate syntax issues

**Recommended Fix:** Regenerate both files ensuring complete code output. Verify file size and content completeness before returning.
