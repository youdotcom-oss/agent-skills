# Troubleshooting

Common issues when integrating OpenAI Agents SDK with the You.com MCP server.

## Cannot find module @openai/agents

Install the package:

```bash
# NPM
npm install @openai/agents

# Bun
bun add @openai/agents

# Yarn
yarn add @openai/agents

# pnpm
pnpm add @openai/agents
```

## YDC_API_KEY environment variable is required

Set your You.com API key:

```bash
export YDC_API_KEY="your-api-key-here"
```

Get your key at: https://you.com/platform/api-keys

## OPENAI_API_KEY environment variable is required

Set your OpenAI API key:

```bash
export OPENAI_API_KEY="your-api-key-here"
```

Get your key at: https://platform.openai.com/api-keys

## MCP connection fails with 401 Unauthorized

Verify your YDC_API_KEY is valid:
1. Check the key at https://you.com/platform/api-keys
2. Ensure no extra spaces or quotes in the environment variable
3. Verify the Authorization header format: `Bearer ${YDC_API_KEY}`

## Tools not available or not being called

**For Both Modes:**
- Ensure `server_url: "https://api.you.com/mcp"` is correct
- Verify Authorization header includes `Bearer` prefix
- Check `YDC_API_KEY` environment variable is set
- Confirm `require_approval` is set to `"never"` for automatic execution

**For Streamable HTTP specifically:**
- Ensure MCP server is connected before creating agent
- Verify connection was successful before running agent

## Connection timeout or network errors

**For Streamable HTTP only:**

Increase timeout or retry attempts:

**Python:**
```python
async with MCPServerStreamableHttp(
    params={
        "url": "https://api.you.com/mcp",
        "headers": {"Authorization": f"Bearer {os.environ['YDC_API_KEY']}"},
        "timeout": 30,  # Increased timeout
    },
    max_retry_attempts=5,  # More retries
) as server:
    # ...
```

**TypeScript:**
```typescript
const mcpServer = new MCPServerStreamableHttp({
  url: 'https://api.you.com/mcp',
  requestInit: {
    headers: { Authorization: 'Bearer ' + process.env.YDC_API_KEY },
    // Add custom timeout via fetch options
  },
});
```
