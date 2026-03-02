# Skill Eval Results

_Generated: 2026-03-02T06:30:27.676Z (CI run 22564128473)_

# Skill Evaluation Summary

**Overall Pass Rate: 8/8 (100%)**

| Skill | Pass | Score | Notes |
|-------|------|-------|-------|
| ydc-ai-sdk-integration | ✅ | 0.96 | Three streaming paths tested; validates incremental chunk delivery |
| ydc-crewai-mcp-integration | ✅ | 0.88 | Tool restriction verified; assertions could be stronger |
| ydc-openai-agent-sdk-integration-python | ✅ | 0.94 | Both hosted and self-managed MCP modes tested |
| ydc-openai-agent-sdk-integration-typescript | ✅ | 1.00 | Both connection modes pass; real API timings confirm integration |
| ydc-claude-agent-sdk-integration-typescript | ✅ | 0.95 | Web-search-only restriction enforced; meaningful keyword assertions |
| ydc-claude-agent-sdk-integration-python | ✅ | 0.88 | Tool restriction implemented; second test lacks content validation |
| teams-anthropic-integration | ✅ | 0.96 | Path A (Claude) and Path B (MCP) both working; keyword assertions present |
| ydc-langchain-integration | ✅ | 0.78 | Dual-tool workflow confirmed (youSearch + youContents); weak assertions |

All evaluations passed with real API calls and live integration tests.
