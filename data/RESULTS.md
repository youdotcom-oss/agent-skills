# Skill Eval Results

_Generated: 2026-04-13T06:58:31.790Z (CI run 24329849265)_

# Agent Skill Evaluation Report

**Overall Results: 9/9 skills passed**

| Skill | Pass | Score | Notes |
|-------|------|-------|-------|
| ydc-openai-agent-sdk-integration-typescript | ✅ | 0.95 | Live API integration, both hosted and self-managed MCP paths tested |
| ydc-crewai-mcp-integration | ✅ | 0.88 | Real crewAI execution with 6 tests, includes tool restriction validation |
| ydc-langchain-integration-typescript | ✅ | 0.88 | Both youSearch and youContents tools verified with 10 assertions |
| ydc-ai-sdk-integration | ✅ | 0.95 | generateText and streamText paths tested, explicit chunk streaming validation |
| teams-anthropic-integration | ✅ | 1.0 | Basic Claude integration plus MCP extension, 2 tests with real APIs |
| ydc-langchain-integration-python | ✅ | 0.72 | 4 tests pass, YouRetriever and LangGraph agent with tools both working |
| ydc-claude-agent-sdk-integration-python | ✅ | 0.87 | Web-search-only restriction validated, 2 tests with real MCP calls |
| ydc-claude-agent-sdk-integration-typescript | ✅ | 0.94 | Web-search-only mode verified, keyword assertions on government/news queries |
| ydc-openai-agent-sdk-integration-python | ✅ | 0.94 | 7 tests including streamable HTTP MCP extension, both connection modes validated |
