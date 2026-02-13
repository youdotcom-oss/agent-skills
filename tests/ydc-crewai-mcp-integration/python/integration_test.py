"""
Test crewAI integration with You.com MCP (DSL approach)
Environment variables loaded via test script (bun run test:py)
"""

import os

from crewai import Agent
from crewai.mcp import MCPServerHTTP


def main():
    ydc_key = os.getenv("YDC_API_KEY")

    if not ydc_key:
        print("✗ YDC_API_KEY not found")
        return 1

    print("✓ Environment variables loaded")

    try:
        print("→ Testing crewAI with You.com MCP (DSL)...")

        agent = Agent(
            role="Test Researcher",
            goal="Test MCP integration",
            backstory="Expert at testing MCP connections",
            mcps=[
                MCPServerHTTP(
                    url="https://api.you.com/mcp",
                    headers={"Authorization": f"Bearer {ydc_key}"},
                    streamable=True,
                )
            ],
            verbose=True,
        )

        print("✓ Agent initialized with MCP server")
        print("✓ MCP connection configured")
        print("\n✅ All tests passed")
        return 0

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
