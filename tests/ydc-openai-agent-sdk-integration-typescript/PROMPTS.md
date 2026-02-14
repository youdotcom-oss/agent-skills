# YDC OpenAI Agents SDK Integration (TypeScript) - Test Prompts

These prompts trigger the `ydc-openai-agent-sdk-integration` skill and generate TypeScript code that is validated by the integration tests.

## Usage

**Working Directory:** `/Users/edward/Workspace/agent-skills/tests/ydc-openai-agent-sdk-integration-typescript/`

Run these prompts from the test directory. The **Primary Prompts** (marked with 🧪) explicitly specify output file paths and are validated by integration tests. Other prompts are examples for skill documentation.

## 🧪 Primary Prompts (Tested)

### Path A: Hosted MCP

**Prompt:**
```
Create a TypeScript application using OpenAI Agents SDK with You.com Hosted MCP. Use TypeScript. Save the code to generated/path-a-hosted.ts.
```

**Expected Output:**
- `generated/path-a-hosted.ts` - Hosted MCP integration
- Uses `hostedMcpTool` from `@openai/agents`
- OpenAI-managed infrastructure (simpler setup)
- Standard environment variables: `YDC_API_KEY` and `OPENAI_API_KEY`
- Includes environment variable validation
- Uses `run()` function for agent execution
- Exports async `main()` function for testing

---

### Path B: Streamable HTTP

**Prompt:**
```
Create a TypeScript application using OpenAI Agents SDK with You.com Streamable HTTP MCP server. Use TypeScript. Save the code to generated/path-b-streamable.ts.
```

**Expected Output:**
- `generated/path-b-streamable.ts` - Streamable HTTP integration
- Uses `MCPServerStreamableHttp` from `@openai/agents`
- Self-managed connection with explicit connect/close
- Configures: `url`, `name`, `requestInit` with headers
- Uses `mcpServers=` parameter (not `tools=`)
- Includes connection management with try/finally
- Calls `mcpServer.connect()` before use
- Calls `mcpServer.close()` in finally block

---

### Path C: Custom API Key Handling

**Prompt:**
```
Create a TypeScript application using OpenAI Agents SDK with You.com Hosted MCP. Use custom environment variables CUSTOM_YDC_KEY and CUSTOM_OPENAI_KEY. Use TypeScript. Save the code to generated/path-c-custom-keys.ts.
```

**Expected Output:**
- `generated/path-c-custom-keys.ts` - Custom environment variables
- Reads from `process.env.CUSTOM_YDC_KEY` and `process.env.CUSTOM_OPENAI_KEY`
- Validates custom env vars with helpful error messages
- Same Hosted MCP pattern with custom keys

---

### Path D: Streamable HTTP with Configuration Options

**Prompt:**
```
Create a TypeScript application using OpenAI Agents SDK with You.com Streamable HTTP MCP server. Include request timeout and custom configuration. Use TypeScript. Save the code to generated/path-d-streamable-config.ts.
```

**Expected Output:**
- `generated/path-d-streamable-config.ts` - Advanced Streamable HTTP config
- Uses `MCPServerStreamableHttp` with configuration options
- Includes timeout in `requestInit`
- Custom headers configuration
- Same connection management pattern with connect/close

---

## 📚 Example Prompts (Documentation Only)

These prompts demonstrate skill capabilities but are not validated by automated tests.

### Multi-Agent System

**Prompt:**
```
Create a multi-agent system with OpenAI Agents SDK where different agents use different MCP tools.
```

**Expected Behavior:**
- Multiple agents with different instructions
- Coordinated workflow between agents
- Agent-to-agent communication

---

### Error Handling and Retry Logic

**Prompt:**
```
Create an OpenAI Agents SDK application with comprehensive error handling for MCP connection failures.
```

**Expected Behavior:**
- Try/catch blocks for MCP connection errors
- Graceful handling of missing API keys
- Retry logic for transient failures

---

## Validation

Each generated file should:
- [ ] Import required modules (`Agent`, `run`, `hostedMcpTool` or `MCPServerStreamableHttp`)
- [ ] Validate `YDC_API_KEY` and `OPENAI_API_KEY` environment variables
- [ ] Configure MCP with correct URL: `https://api.you.com/mcp`
- [ ] Use Bearer token authentication: `Authorization: Bearer ${key}`
- [ ] For Hosted MCP: Use `tools=` parameter with `hostedMcpTool()`
- [ ] For Streamable HTTP: Use `mcpServers=` parameter with explicit connection management
- [ ] Use async/await pattern
- [ ] Export an async `main()` function for testing
- [ ] Include TypeScript types
- [ ] Include JSDoc comments for main functions

---

## Testing Notes

**Environment Setup:**

These integration tests validate OpenAI Agents SDK MCP integration patterns for TypeScript.

**Static Analysis Tests:**
- Verify imports and configuration structure
- Check MCP configuration patterns (Hosted vs Streamable)
- Validate API key handling patterns
- TypeScript compilation checks

**Runtime Tests:**
- Initialize agents with MCP servers
- Verify MCP connection establishment
- Test tool discovery
- Validate configuration options

**Note:** Full agent execution with queries requires both YDC_API_KEY and OPENAI_API_KEY to be set. Tests focus on validating MCP configuration and connection setup.
