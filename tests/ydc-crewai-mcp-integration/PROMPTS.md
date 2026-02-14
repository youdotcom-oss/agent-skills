# YDC crewAI MCP Integration - Test Prompts

These prompts trigger the `ydc-crewai-mcp-integration` skill and generate Python code that is validated by the integration tests.

## Usage

**Working Directory:** `/Users/edward/Workspace/agent-skills/tests/ydc-crewai-mcp-integration/`

Run these prompts from the test directory. The **Primary Prompts** (marked with 🧪) explicitly specify output file paths and are validated by integration tests. Other prompts are examples for skill documentation.

## 🧪 Primary Prompts (Tested)

### Path A: Basic DSL Configuration

**Prompt:**
```
Create a crewAI application with You.com MCP server using DSL structured configuration (MCPServerHTTP). Include all available tools. Use Python. Save the code to generated/path_a_basic_dsl.py.
```

**Expected Output:**
- `generated/path_a_basic_dsl.py` - Basic DSL MCP integration
- Uses `MCPServerHTTP` from `crewai.mcp`
- Configures HTTP MCP server at `https://api.you.com/mcp`
- Standard environment variable: `YDC_API_KEY`
- Uses `streamable=True` (default)
- All tools available: `you-search` and `you-contents`
- Includes environment variable validation

---

### Path B: DSL with Tool Filter

**Prompt:**
```
Create a crewAI application with You.com MCP server using DSL structured configuration. Use tool_filter to include only you-search tool. Use Python. Save the code to generated/path_b_tool_filter.py.
```

**Expected Output:**
- `generated/path_b_tool_filter.py` - DSL with tool filtering
- Imports `create_static_tool_filter` from `crewai.mcp.filters`
- Configures `tool_filter=create_static_tool_filter(allowed_tool_names=["you-search"])`
- Only `you-search` tool available (not `you-contents`)
- Same HTTP MCP setup as Path A

---

### Path C: Custom API Key Handling

**Prompt:**
```
Create a crewAI application with You.com MCP server using DSL structured configuration. Use custom environment variable CUSTOM_YDC_KEY. Use Python. Save the code to generated/path_c_custom_key.py.
```

**Expected Output:**
- `generated/path_c_custom_key.py` - Custom environment variable
- Reads from `os.getenv("CUSTOM_YDC_KEY")` instead of `YDC_API_KEY`
- Validates custom env var with helpful error message
- Same HTTP MCP setup with custom key

---

### Path D: MCPServerAdapter Approach

**Prompt:**
```
Create a crewAI application with You.com MCP server using Advanced MCPServerAdapter with context manager. Use Python. Save the code to generated/path_d_adapter.py.
```

**Expected Output:**
- `generated/path_d_adapter.py` - MCPServerAdapter integration
- Uses `MCPServerAdapter` from `crewai_tools`
- Context manager pattern: `with MCPServerAdapter(...) as tools:`
- Configures `transport="streamable-http"`
- Passes tools explicitly to agent: `tools=tools`
- Same HTTP MCP setup

---

## 📚 Example Prompts (Documentation Only)

These prompts demonstrate skill capabilities but are not validated by automated tests.

### Multi-Agent Crew with Different Tools

**Prompt:**
```
Create a crewAI multi-agent crew where one agent uses you-search and another uses you-contents.
```

**Expected Behavior:**
- Two agents with different tool filters
- Sequential task execution with context sharing
- Crew orchestration with `Crew()` and `kickoff()`

---

### Manual Lifecycle Management

**Prompt:**
```
Create a crewAI application using MCPServerAdapter with manual start/stop lifecycle management.
```

**Expected Behavior:**
- Manual `start()` and `stop()` calls
- Try/finally block for cleanup
- `is_connected` property checks

---

## Validation

Each generated file should:
- [ ] Import required modules (`Agent`, `MCPServerHTTP` or `MCPServerAdapter`)
- [ ] Validate `YDC_API_KEY` (or custom) environment variable
- [ ] Configure HTTP MCP server with correct URL: `https://api.you.com/mcp`
- [ ] Use Bearer token authentication in headers: `Authorization: Bearer {key}`
- [ ] For DSL: Use `mcps=[]` field with `MCPServerHTTP`
- [ ] For MCPServerAdapter: Use context manager or manual lifecycle
- [ ] Include verbose mode for agent: `verbose=True`
- [ ] Export a `main()` function for testing
- [ ] Use type hints for function parameters
- [ ] Include docstrings for main functions

---

## Testing Notes

**Environment Setup:**

These integration tests validate crewAI MCP integration patterns without executing full agent workflows.

**Static Analysis Tests:**
- Verify imports and configuration structure
- Check tool filter configuration
- Validate API key handling patterns

**Runtime Tests:**
- Initialize agents with MCP servers
- Verify tool discovery (you-search, you-contents)
- Test connection establishment
- Validate tool filtering behavior

**Note:** Full crew execution with task kickoff is not tested in these integration tests. We focus on validating MCP configuration and tool availability.
