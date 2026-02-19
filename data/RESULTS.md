# Skill Eval Results

_Generated: 2026-02-19T06:37:15.624Z_

# Claude Code Agent Skill Evaluation Report

## Summary

**Pass Rate: 7/7 (100%)**

All evaluated skills successfully passed integration tests with real API calls to external services.

---

## Results Table

| Skill | Pass | Score | Notes |
|-------|------|-------|-------|
| ydc-claude-agent-sdk-integration-python | ✅ | 0.92 | Both turns passed; tool restriction via `allowed_tools` properly enforced |
| ydc-openai-agent-sdk-integration-python | ✅ | 0.92 | Hosted MCP + self-managed streamable HTTP modes both working; deprecation warning in newer SDK |
| ydc-claude-agent-sdk-integration-typescript | ✅ | 0.95 | Clean restriction implementation; keyword assertions validate actual tool invocation |
| teams-anthropic-integration | ✅ | 0.95 | Both Claude-only and MCP paths working; proper env-var validation at module load |
| ydc-openai-agent-sdk-integration-typescript | ✅ | 0.95 | Hosted + streamable HTTP with correct lifecycle management (`try/finally` cleanup) |
| ydc-ai-sdk-integration | ✅ | 0.95 | Streaming and non-streaming paths both functional; lazy stream evaluation handled correctly |
| ydc-crewai-mcp-integration | ✅ | 0.92 | Tool filtering via `create_static_tool_filter` works; DSL path avoids `you-contents` schema bug |

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
   
