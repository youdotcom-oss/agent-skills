# Skill Eval Results

_Generated: 2026-05-11T07:43:13.676Z (CI run 25656200320)_

# Claude Code Agent Skill Evaluation Report

## Summary
**Pass Rate: 7/9 skills (77.8%)**

| Skill | Pass | Score | Notes |
|-------|------|-------|-------|
| ydc-openai-agent-sdk-integration-typescript | ✅ | 1.00 | Both hosted and self-managed MCP paths work; 2 tests pass |
| ydc-crewai-mcp-integration | ✅ | 0.95 | Real crew execution with tool restriction validation |
| ydc-langchain-integration-typescript | ✅ | 0.78 | Both youSearch and youContents tools called; weak content assertions |
| ydc-ai-sdk-integration | ✅ | 0.94 | generateText and streamText both pass with real API calls |
| teams-anthropic-integration | ✅ | 0.96 | Basic and MCP web-search paths both pass |
| ydc-langchain-integration-python | ✅ | 0.94 | Retriever and agent with both tools; comprehensive validation |
| ydc-openai-agent-sdk-integration-python | ✅ | 0.96 | Hosted and self-managed MCP variants both work |
| ydc-claude-agent-sdk-integration-python | ❌ | 0.15 | Agent returns empty result; integration does not work |
| ydc-claude-agent-sdk-integration-typescript | ❌ | 0.00 | Runtime error during Anthropic SDK initialization |

## Failures

### ydc-claude-agent-sdk-integration-python
**Root Cause:** Agent executes but returns empty string from API call. Result extraction or MCP server integration is broken.  
**Recommended Fix:** Debug the `agent.py` result extraction logic; verify Claude Agent SDK properly handles You.com MCP server responses; check if the API key validation is silently failing.

### ydc-claude-agent-sdk-integration-typescript
**Root Cause:** Runtime error in Anthropic SDK initialization during test execution. The test structure is correct, but the SDK fails to instantiate in the test environment.  
**Recommended Fix:** Verify Anthropic SDK compatibility with the test environment (Bun runtime); check if API keys are properly injected; consider using a different SDK initialization pattern or updating dependencies.
