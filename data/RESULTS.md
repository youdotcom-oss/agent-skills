# Skill Eval Results

_Generated: 2026-02-19T05:47:09.823Z_

# Agent Skill Evaluation Summary

## Overall Results
**Pass Rate: 6/7 skills (85.7%)**

| Skill | Pass | Score | Notes |
|-------|------|-------|-------|
| ydc-claude-agent-sdk-integration-python | ✅ | 0.95 | Correct tool restriction via `allowed_tools` allowlist; tests validate both unrestricted and search-only modes |
| ydc-claude-agent-sdk-integration-typescript | ✅ | 0.95 | Proper async/await patterns; `allowedTools` enforces tool boundaries; systemPrompt correctly retained as security boundary |
| ydc-ai-sdk-integration | ✅ | 0.95 | Both generateText and streamText paths fully implemented; correct assertion strategy (content keywords vs. length) |
| ydc-openai-agent-sdk-integration-python | ✅ | 0.95 | Both hosted MCP and self-managed (MCPServerStreamableHttp) paths working; identical assertions verify behavioral equivalence |
| ydc-openai-agent-sdk-integration-typescript | ✅ | 0.95 | Correct lifecycle management (`connect()`/`close()` in try/finally); avoids connection leaks in test suite |
| ydc-crewai-mcp-integration | ✅ | 0.95 | Tool restriction enforced via `tool_filter`; factory pattern prevents connection lifecycle coupling |
| **teams-anthropic-integration** | ❌ | 0.35 | **CRITICAL: Fabricated packages and endpoints** — `@youdotcom-oss/teams-anthropic`, `@microsoft/teams.mcpclient` don't exist; You.com MCP endpoint is non-existent |

## Failure Pattern: teams-anthropic-integration

**Root Cause:** The agent hallucinated non-existent npm packages and a fake MCP server endpoint. While tests report passing, this is a **false positive** — the test harness is not validating that packages actually exist or that endpoints are reachable.

**Evidence:**
- Tests claim to pass with `@youdotcom-oss/teams-anthropic` and `@microsoft/teams.mcpclient`
- Neither package exists on npm
- You.com MCP endpoint at `https://api.you.com/mcp` does not exist
- Integration cannot function with real APIs despite passing tests

## Recommendations

### High Priority
1. **teams-anthropic-integration**: 
   - Verify all imported packages exist on npm registry before using them
   - Validate that You.com MCP endpoints are real and reachable
   - Add pre-flight package existence checks to skill validation
   - Consider using `npm view <package>` in skill tests to catch fabrications

2. **Strengthen test validation**:
   - Add assertions that verify packages were actually imported (e.g., check `typeof MyClass === 'function'`)
   - For network endpoints, include a health-check or metadata call in tests
   - Don't rely solely on test exit code — validate the actual API contracts

### Medium Priority
3. **Documentation**:
   - Document the critical pattern of **dynamic imports inside test bodies** to defer module-level validation
   - Clarify tool filter patterns (`tool_filter`, `allowed_tools`, `allowedTools` naming varies by SDK)
   - Highlight the importance of **identical assertions across transport paths** to catch silent degradation

4. **Reusable patterns library**:
   - Extract the `try/finally` + `connect()`/`close()` pattern for MCP lifecycle management
   - Codify the env var guard pattern (module-level validation vs. test-level checks)
   - Create a reference template for multi-path integrations (Hosted vs. Streamable, generateText vs. streamText)

### Low Priority
5. **Test harness improvements**:
   - Add a "package existence" pre-check step before running integration tests
   - Consider sandboxing npm installs to catch missing-package errors at install time
   - Log actual package versions imported for post-mortem debugging

---

## Key Insights from Passing Skills

- **Tool restriction via allowlists** (6/6 implementations): Using SDK-level filters (`allowed_tools`, `tool_filter`, `allowedTools`) is the canonical pattern — more reliable than prompt-only guards
- **
