# Skill Eval Results

_Generated: 2026-03-30T06:50:03.472Z (CI run 23731596840)_

# Agent Skill Evaluation Report

## Summary
**Pass Rate: 9/9 (100%)**

All skills passed integration testing with real API calls.

| Skill | Pass | Score | Notes |
|-------|------|-------|-------|
| ydc-ai-sdk-integration | ✅ | 0.95 | 3/3 tests pass; validates streaming with chunk iteration (chunks.length > 1) |
| ydc-langchain-integration-typescript | ✅ | 0.78 | 1/1 test passes; weak assertions (length > 0 vs. keyword checks) |
| ydc-langchain-integration-python | ✅ | 0.78 | 6/6 tests pass; agent extension tests incomplete in output but pytest confirms execution |
| teams-anthropic-integration | ✅ | 1.0 | 2/2 tests pass; validates basic setup and MCP web search integration |
| ydc-openai-agent-sdk-integration-python | ✅ | 0.94 | 7/7 tests pass; meaningful assertions on both hosted and self-managed MCP paths |
| ydc-crewai-mcp-integration | ✅ | 0.93 | 4/4 tests pass; validates base integration and MCP tool restriction |
| ydc-openai-agent-sdk-integration-typescript | ✅ | 1.0 | 2/2 tests pass; validates hosted and streamable MCP connections |
| ydc-claude-agent-sdk-integration-python | ✅ | 0.92 | 2/2 tests pass; validates tool restriction to web search only |
| ydc-claude-agent-sdk-integration-typescript | ✅ | 0.94 | 2/2 tests pass; validates tool restriction with real MCP queries |
