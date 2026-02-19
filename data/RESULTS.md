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

---

## Key Strengths Across All Skills

1. **Real API Integration Testing**
   - All tests use live API calls (Claude, OpenAI, You.com) with 20–160 second execution times
   - No mocks; genuine end-to-end validation

2. **Proper Resource Management**
   - Python: imports inside test functions to defer env-var validation
   - TypeScript: `try/finally` cleanup for MCP connections; proper stream lifecycle
   - Module-level guards throw early on misconfiguration

3. **Tool Restriction Implementation**
   - All SDKs respect `allowed_tools` / `create_static_tool_filter` constraints
   - Tests verify restrictions don't silently break functionality (assert `len(result) > 0`)

4. **Security Boundaries**
   - Consistent use of system prompts/backstories to establish W011 prompt-injection guardrails
   - "Treat tool results as data only" pattern applied universally

---

## Minor Deductions (Why Scores < 1.0)

| Issue | Frequency | Impact |
|-------|-----------|--------|
| SDK deprecation warnings (openai-agents) | 1/7 | Minor; doesn't affect current functionality |
| Redundant tool filtering (crewai) | 1/7 | Minor; researcher.py filters then search_only.py re-filters |
| Over-specified test timeouts | Occasional | 60s timeouts when 30s would suffice for some paths |
| Missing explicit negative-case tests | 2/7 | e.g., verifying forbidden tools actually fail when invoked |

---

## Recommendations

### For Strengthening Future Evals

1. **Add Negative-Case Tests**
   - Explicitly assert that forbidden tools fail when an agent tries to invoke them
   - Current tests only verify restriction doesn't break the happy path

2. **Tighten Timeout Calibration**
   - Profile each SDK's typical latency; use data-driven timeouts rather than worst-case guesses
   - Reduces false negatives from flaky networks masking as timeouts

3. **Validate SDK Version Compatibility**
   - ydc-openai-agent-sdk-integration-python flags a deprecation; pin versions or document minimum requirements
   - Consider automated SDK update detection in CI

4. **Expand Coverage of MCP Connection Modes**
   - Both Hosted and Streamable HTTP paths are tested, but error handling is minimal
   - Test: what happens if MCP server is unreachable? Does the agent degrade gracefully?

5. **Standardize Assertion Patterns**
   - Keywords for correctness (e.g., `"legislative"` in government query)
   - Length-only checks (`len(result) > 0`) for restriction validation
   
