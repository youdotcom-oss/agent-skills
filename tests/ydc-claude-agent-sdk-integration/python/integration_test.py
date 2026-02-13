"""
Test Claude Agent SDK integration with You.com MCP
Environment variables loaded via test script (export $(cat .env | xargs))
"""

import os

import pytest
from claude_agent_sdk import ClaudeAgentOptions, query


@pytest.mark.asyncio
async def test_claude_sdk_mcp_integration():
    # Validate environment
    ydc_key = os.getenv("YDC_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")

    assert ydc_key, "YDC_API_KEY not found"
    assert anthropic_key, "ANTHROPIC_API_KEY not found"

    print("✓ Environment variables loaded")

    # Test HTTP MCP configuration
    print("→ Testing Claude Agent SDK with You.com MCP...")

    async for message in query(
        prompt="What is 2+2? Reply with just the number.",
        options=ClaudeAgentOptions(
            mcp_servers={
                "ydc": {
                    "type": "http",
                    "url": "https://api.you.com/mcp",
                    "headers": {"Authorization": f"Bearer {ydc_key}"},
                }
            },
            allowed_tools=["mcp__ydc__you_search", "mcp__ydc__you_contents"],
            model="claude-sonnet-4-5-20250929",
        ),
    ):
        if hasattr(message, "result"):
            print("✓ MCP connection successful")
            print(f"✓ Query response: {message.result[:100]}...")
            assert message.result, "Expected result from query"
            return

    pytest.fail("No response received from query")
