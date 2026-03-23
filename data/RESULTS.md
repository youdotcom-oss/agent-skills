# Skill Eval Results

_Generated: 2026-03-23T06:38:45.199Z (CI run 23424598916)_

# Skill Evaluation Summary

**Pass Rate: 9/9 skills (100%)**

| Skill | Pass | Score | Notes |
|-------|------|-------|-------|
| ydc-ai-sdk-integration | ✅ | 0.93 | TypeScript/Vercel AI SDK; both generateText and streamText paths validated with real You.com API calls |
| ydc-langchain-integration-python | ✅ | 0.88 | Python/LangChain YouRetriever; 6 tests passing; agent uses both search and contents tools |
| ydc-crewai-mcp-integration | ✅ | 0.88 | Python/crewAI with MCP; tool restriction explicitly validated via ALLOWED_TOOLS constant |
| ydc-openai-agent-sdk-integration-python | ✅ | 0.95 | Python/OpenAI Agents; 4 tests covering hosted and self-managed MCP connections |
| ydc-openai-agent-sdk-integration-typescript | ✅ | 0.94 | TypeScript/OpenAI Agents; 4 tests with meaningful keyword assertions and real API timings |
| ydc-claude-agent-sdk-integration-typescript | ✅ | 0.87 | TypeScript/Claude Agent SDK; web-search-only restriction verified with real API call |
| ydc-langchain-integration-typescript | ✅ | 0.88 | TypeScript/LangChain; both youSearch and youContents tools explicitly asserted in ToolMessage list |
| ydc-claude-agent-sdk-integration-python | ✅ | 0.93 | Python/Claude Agent SDK; search-only mode validated with dedicated test and real API timings |
| teams-anthropic-integration | ✅ | 0.96 | TypeScript/Teams+Anthropic+You.com MCP; both basic and MCP paths tested with tool-forcing queries |
