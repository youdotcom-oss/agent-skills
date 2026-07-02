# MCP Configuration Types

Detailed comparison of the two MCP configuration modes, with configuration blocks for both
languages. For complete runnable files, see [templates.md](templates.md).

## Hosted MCP (Recommended)

**What it is:** OpenAI manages the MCP connection and tool routing through their Responses API.

**Benefits:**
- ✅ Simpler configuration (no connection management)
- ✅ OpenAI handles authentication and retries
- ✅ Lower latency (tools run in OpenAI infrastructure)
- ✅ Automatic tool discovery and listing
- ✅ No need to manage async context or cleanup

**Use when:**
- Building production applications
- Want minimal boilerplate code
- Need reliable tool execution
- Don't require custom transport layer

**Configuration:**

**Python:**
```python
from agents import HostedMCPTool

tools=[
    HostedMCPTool(
        tool_config={
            "type": "mcp",
            "server_label": "ydc",
            "server_url": "https://api.you.com/mcp",
            "headers": {
                "Authorization": f"Bearer {os.environ['YDC_API_KEY']}"
            },
            "require_approval": "never",
        }
    )
]
```

**TypeScript:**
```typescript
import { hostedMcpTool } from '@openai/agents';

tools: [
  hostedMcpTool({
    serverLabel: 'ydc',
    serverUrl: 'https://api.you.com/mcp',
    headers: {
      Authorization: 'Bearer ' + process.env.YDC_API_KEY,
    },
  }),
]
```

## Streamable HTTP MCP

**What it is:** You manage the MCP connection and transport layer yourself.

**Benefits:**
- ✅ Full control over network connection
- ✅ Custom infrastructure integration
- ✅ Can add custom headers, timeouts, retry logic
- ✅ Run MCP server in your own environment
- ✅ Better for testing and development

**Use when:**
- Need custom transport configuration
- Running MCP server in your infrastructure
- Require specific networking setup
- Development and testing scenarios

**Configuration:**

**Python:**
```python
from agents.mcp import MCPServerStreamableHttp

async with MCPServerStreamableHttp(
    name="You.com MCP Server",
    params={
        "url": "https://api.you.com/mcp",
        "headers": {"Authorization": f"Bearer {os.environ['YDC_API_KEY']}"},
        "timeout": 10,
    },
    cache_tools_list=True,
    max_retry_attempts=3,
) as server:
    agent = Agent(mcp_servers=[server])
```

**TypeScript:**
```typescript
import { MCPServerStreamableHttp } from '@openai/agents';

const mcpServer = new MCPServerStreamableHttp({
  url: 'https://api.you.com/mcp',
  name: 'You.com MCP Server',
  requestInit: {
    headers: {
      Authorization: 'Bearer ' + process.env.YDC_API_KEY,
    },
  },
});

await mcpServer.connect();
try {
  const agent = new Agent({ mcpServers: [mcpServer] });
  // Use agent
} finally {
  await mcpServer.close();
}
```
