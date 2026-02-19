# Skill Eval Results

_Generated: 2026-02-19T18:54:38.921Z_

# Skill Evaluation Summary

**Pass Rate: 7/7 (100%)**

| Skill | Pass | Score | Notes |
|-------|------|-------|-------|
| ydc-claude-agent-sdk-integration-python | ✓ | 0.88 | Real API timings (37.44s), strong keyword assertions, minor weakness in one test using only length check |
| ydc-claude-agent-sdk-integration-typescript | ✓ | 0.96 | Real API timings (19.1s), explicit tool-forcing queries, semantic keyword validation |
| ydc-crewai-mcp-integration | ✓ | 0.88 | Real API timings (32.15s), both basic and tool-restricted integrations tested, keyword assertions present |
| teams-anthropic-integration | ✓ | 0.96 | Real API timings (3.6s Path A, 10.2s Path B), tool-forcing queries, MCP round-trip verified |
| ydc-openai-agent-sdk-integration-typescript | ✓ | 0.96 | Real API timings (5.8s and 5.1s), both hosted and streamable MCP modes tested, semantic assertions |
| ydc-ai-sdk-integration | ✓ | 0.94 | Real API timings (9-10s each), streaming chunking verified, meaningful content assertions |
| ydc-openai-agent-sdk-integration-python | ✓ | 0.95 | Real API timings (12.56s), both HostedMCPTool and MCPServerStreamableHttp modes tested, factual keyword assertions |

All evaluations passed with live API integration tests. Tests consistently validate environment variables, use tool-forcing queries where appropriate, and assert on meaningful content rather than trivial existence checks.
