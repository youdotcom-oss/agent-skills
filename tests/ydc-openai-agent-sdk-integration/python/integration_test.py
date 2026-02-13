"""
Test OpenAI Agents SDK integration with You.com MCP (Hosted MCP)
Environment variables loaded via test script (bun run test:py)
"""

import asyncio
import os

from agents import Agent, Runner
from agents.mcp import HostedMCPTool


async def main():
    ydc_key = os.getenv("YDC_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    if not ydc_key:
        print("✗ YDC_API_KEY not found")
        return 1

    if not openai_key:
        print("✗ OPENAI_API_KEY not found")
        return 1

    print("✓ Environment variables loaded")

    try:
        print("→ Testing OpenAI Agents SDK with Hosted MCP...")

        agent = Agent(
            name="Test Assistant",
            instructions="You are a helpful assistant.",
            tools=[
                HostedMCPTool(
                    tool_config={
                        "type": "mcp",
                        "server_label": "ydc",
                        "server_url": "https://api.you.com/mcp",
                        "headers": {"Authorization": f"Bearer {ydc_key}"},
                        "require_approval": "never",
                    }
                )
            ],
        )

        print("✓ Agent initialized with Hosted MCP")

        result = await Runner.run(agent, "What is 2+2? Reply with just the number.")

        print("✓ MCP connection successful")
        print(f"✓ Query response: {result.final_output[:100]}...")
        print("\n✅ All tests passed")
        return 0

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(asyncio.run(main()))
