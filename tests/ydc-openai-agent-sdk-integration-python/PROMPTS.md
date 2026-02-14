# YDC OpenAI Agents SDK Integration (Python) - Test Prompts

These prompts trigger the `ydc-openai-agent-sdk-integration` skill and generate Python code that is validated by the integration tests.

## Usage

**Working Directory:** `/Users/edward/Workspace/agent-skills/tests/ydc-openai-agent-sdk-integration-python/`

Run these prompts from the test directory. The **Primary Prompts** (marked with 🧪) explicitly specify output file paths and are validated by integration tests. Other prompts are examples for skill documentation.

## 🧪 Primary Prompts (Tested)

### Path A: Hosted MCP

**Prompt:**
```
Create a Python application using OpenAI Agents SDK with You.com Hosted MCP. Use Python. Save the code to generated/path_a_hosted.py.
```

**Expected Output:**
- `generated/path_a_hosted.py` - Hosted MCP integration
- Uses `HostedMCPTool` from `agents.mcp`
- OpenAI-managed infrastructure (simpler setup)
- Standard environment variables: `YDC_API_KEY` and `OPENAI_API_KEY`
- Includes environment variable validation
- Uses `Runner.run()` for agent execution

---

### Path B: Streamable HTTP

**Prompt:**
```
Create a Python application using OpenAI Agents SDK with You.com Streamable HTTP MCP server. Use Python. Save the code to generated/path_b_streamable.py.
```

**Expected Output:**
- `generated/path_b_streamable.py` - Streamable HTTP integration
- Uses `MCPServerStreamableHttp` from `agents.mcp`
- Self-managed connection with async context manager
- Configures: `url`, `name`, `params` with headers
- Uses `mcp_servers=` parameter (not `tools=`)
- Includes connection management with `async with`

---

### Path C: Custom API Key Handling

**Prompt:**
```
Create a Python application using OpenAI Agents SDK with You.com Hosted MCP. Use custom environment variables CUSTOM_YDC_KEY and CUSTOM_OPENAI_KEY. Use Python. Save the code to generated/path_c_custom_keys.py.
```

**Expected Output:**
- `generated/path_c_custom_keys.py` - Custom environment variables
- Reads from `os.getenv("CUSTOM_YDC_KEY")` and `os.getenv("CUSTOM_OPENAI_KEY")`
- Validates custom env vars with helpful error messages
- Same Hosted MCP pattern with custom keys

---

### Path D: Streamable HTTP with Configuration Options

**Prompt:**
```
Create a Python application using OpenAI Agents SDK with You.com Streamable HTTP MCP server. Include advanced configuration options like cache_tools_list and max_retry_attempts. Use Python. Save the code to generated/path_d_streamable_config.py.
```

**Expected Output:**
- `generated/path_d_streamable_config.py` - Advanced Streamable HTTP config
- Uses `MCPServerStreamableHttp` with configuration options
- Includes `cache_tools_list=True`
- Includes `max_retry_attempts=3`
- Includes `timeout` in params
- Same async context manager pattern

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
- Try/except blocks for MCP connection errors
- Graceful handling of missing API keys
- Retry logic for transient failures

---

## Validation

Each generated file should:
- [ ] Import required modules (`Agent`, `Runner`, `HostedMCPTool` or `MCPServerStreamableHttp`)
- [ ] Validate `YDC_API_KEY` and `OPENAI_API_KEY` environment variables
- [ ] Configure MCP with correct URL: `https://api.you.com/mcp`
- [ ] Use Bearer token authentication: `Authorization: Bearer {key}`
- [ ] For Hosted MCP: Use `tools=` parameter with `HostedMCPTool`
- [ ] For Streamable HTTP: Use `mcp_servers=` parameter with async context manager
- [ ] Use async/await pattern with `asyncio.run()`
- [ ] Export an async `main()` function for testing
- [ ] Include type hints for function parameters
- [ ] Include docstrings for main functions

---

## Testing Notes

**Environment Setup:**

These integration tests validate OpenAI Agents SDK MCP integration patterns.

**Static Analysis Tests:**
- Verify imports and configuration structure
- Check MCP configuration patterns (Hosted vs Streamable)
- Validate API key handling patterns

**Runtime Tests:**
- Initialize agents with MCP servers
- Verify MCP connection establishment
- Test tool discovery
- Validate configuration options

**Note:** Full agent execution with queries requires both YDC_API_KEY and OPENAI_API_KEY to be set. Tests focus on validating MCP configuration and connection setup.
