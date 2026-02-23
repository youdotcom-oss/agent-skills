# Skill Eval Results

_Generated: 2026-02-23T06:35:13.841Z (CI run 22295406669)_

# Agent Skill Evaluation Summary

**Overall Pass Rate: 7/7 skills ✓**

| Skill | Pass | Score | Notes |
|-------|------|-------|-------|
| teams-anthropic-integration | ✓ | 0.96 | Both Path A (Claude) and Path B (MCP web search) pass with real API timings; meaningful keyword assertions |
| ydc-claude-agent-sdk-integration-python | ✓ | 0.89 | All 4 tests pass (42.43s); real You.com + Claude API calls; keyword validation on search content |
| ydc-claude-agent-sdk-integration-typescript | ✓ | 0.94 | Test passes (19.5s); web search-only tool restriction verified; meaningful content assertions |
| ydc-openai-agent-sdk-integration-typescript | ✓ | 1.00 | Both hosted and self-managed MCP paths pass (9.91s total); 12 assertions across 2 tests |
| ydc-ai-sdk-integration | ✓ | 0.96 | Both generateText and streamText paths pass (21.57s); real API integration; tool invocation validated |
| ydc-openai-agent-sdk-integration-python | ✓ | 0.92 | All 5 tests pass (23.66s); hosted + self-managed MCP connections working; meaningful assertions |
| ydc-crewai-mcp-integration | ✓ | 0.93 | All 3 tests pass; tool restriction to web search only enforced; keyword validation on results |

All evaluations passed with real API calls, meaningful assertions (keyword checks, content validation), and proper environment variable validation. No failures detected.
