# YDC Claude Agent SDK Integration (Python) - Test Prompts

These prompts trigger the `ydc-claude-agent-sdk-integration` skill and generate Python code that is validated by the integration tests.

## Usage

**Working Directory:** `/Users/edward/Workspace/agent-skills/tests/ydc-claude-agent-sdk-integration-python/`

Run these prompts from the test directory. The **Primary Prompts** (marked with 🧪) explicitly specify output file paths and are validated by integration tests. Other prompts are examples for skill documentation.

## 🧪 Primary Prompts (Tested)

### Path A: Basic HTTP MCP Integration

**Prompt:**
```
Create a Python application using Claude Agent SDK with You.com HTTP MCP server. Use Python. Save the code to generated/path_a_basic.py.
```

**Expected Output:**
- `generated/path_a_basic.py` - Basic HTTP MCP integration
- Uses `claude_agent_sdk` package with `query()` function
- Configures HTTP MCP server at `https://api.you.com/mcp`
- Standard environment variables: `YDC_API_KEY` and `ANTHROPIC_API_KEY`
- Uses `claude-sonnet-4-5-20250929` model
- Includes environment variable validation

---

### Path B: Allowed Tools Configuration

**Prompt:**
```
Create a Python application using Claude Agent SDK with You.com HTTP MCP server. Configure allowed_tools to include only you_search. Use Python. Save the code to generated/path_b_tools.py.
```

**Expected Output:**
- `generated/path_b_tools.py` - Specific tools configuration
- Configures `allowed_tools=["mcp__ydc__you_search"]` (only search, not contents)
- Tests selective tool access control
- Same HTTP MCP setup as Path A

---

### Path C: Custom API Key Handling

**Prompt:**
```
Create a Python application using Claude Agent SDK with You.com HTTP MCP server. Use custom environment variables CUSTOM_YDC_KEY and CUSTOM_ANTHROPIC_KEY. Use Python. Save the code to generated/path_c_custom_keys.py.
```

**Expected Output:**
- `generated/path_c_custom_keys.py` - Custom environment variables
- Reads from `os.getenv("CUSTOM_YDC_KEY")` and `os.getenv("CUSTOM_ANTHROPIC_KEY")`
- Validates custom env vars with helpful error messages
- Same HTTP MCP setup with custom keys

---

### Path D: Model Selection

**Prompt:**
```
Create a Python application using Claude Agent SDK with You.com HTTP MCP server. Use Claude Haiku 3.5 model for faster responses. Use Python. Save the code to generated/path_d_haiku.py.
```

**Expected Output:**
- `generated/path_d_haiku.py` - Different model configuration
- Uses `model="claude-3-5-haiku-20241022"` instead of Sonnet
- Tests model selection flexibility
- Same HTTP MCP setup

---

## 📚 Example Prompts (Documentation Only)

These prompts demonstrate skill capabilities but are not validated by automated tests.

### Multi-Message Conversation

**Prompt:**
```
Create a Python application using Claude Agent SDK that handles a multi-turn conversation with context.
```

**Expected Behavior:**
- Multiple query() calls with conversation history
- Context maintained across queries
- Message handling for conversation state

---

### Error Handling

**Prompt:**
```
Create a Python application with comprehensive error handling for HTTP MCP connection failures.
```

**Expected Behavior:**
- Try/except blocks for MCP connection errors
- Graceful handling of missing API keys
- Retry logic for transient failures

---

## Validation

Each generated file should:
- [ ] Import `query` and `ClaudeAgentOptions` from `claude_agent_sdk`
- [ ] Validate `YDC_API_KEY` and `ANTHROPIC_API_KEY` environment variables
- [ ] Configure HTTP MCP server with correct URL and headers
- [ ] Use async/await pattern with `asyncio.run()`
- [ ] Handle messages with `hasattr(message, "result")`
- [ ] Use type hints for function parameters
- [ ] Include docstrings for main functions
- [ ] Export a `main()` async function for testing

---

## Testing Notes

**Environment Setup:**

These integration tests are designed to run inside Claude Code. The `conftest.py` file automatically unsets the `CLAUDECODE` environment variable to bypass nested session protection, allowing the Python SDK to spawn Claude Code as a subprocess during testing.

**Why this is needed:**
- Claude Agent SDK (Python) launches Claude Code as a subprocess to execute queries
- The `CLAUDECODE` environment variable prevents nested Claude Code sessions
- Tests need to unset this variable to allow the subprocess to run

**For normal usage:**
Users won't encounter this issue - they'll be running their own applications that use the SDK, not running tests inside Claude Code. This workaround is purely for automated testing infrastructure.
