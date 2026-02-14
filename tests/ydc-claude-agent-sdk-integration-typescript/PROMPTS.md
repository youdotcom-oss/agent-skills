# YDC Claude Agent SDK Integration - TypeScript Test Prompts

These prompts trigger the `ydc-claude-agent-sdk-integration` skill and generate TypeScript code that is validated by the integration tests.

## Usage

**Working Directory:** `/Users/edward/Workspace/agent-skills/tests/ydc-claude-agent-sdk-integration-typescript/`

Run these prompts from the test directory. The **Primary Prompts** (marked with 🧪) explicitly specify output file paths and are validated by integration tests. Other prompts are examples for skill documentation.

## 🧪 Primary Prompts (Tested)

### Path A: Basic HTTP MCP Integration (TypeScript v1)

**Prompt:**
```
Create a TypeScript application using Claude Agent SDK v1 with You.com HTTP MCP server. Use TypeScript v1 (generator pattern). Save the code to generated/path-a-basic.ts.
```

**Expected Output:**
- `generated/path-a-basic.ts` - TypeScript v1 integration with generator pattern
- Uses `query()` from `@anthropic-ai/claude-agent-sdk`
- Configures HTTP MCP server at `https://api.you.com/mcp`
- Uses standard `YDC_API_KEY` and `ANTHROPIC_API_KEY` environment variables
- Includes both `you_search` and `you_contents` tools in `allowedTools`
- Uses Claude Sonnet 4.5 model
- Implements `for await...of` loop to consume generator results

---

### Path B: Allowed Tools Configuration

**Prompt:**
```
Create a TypeScript application using Claude Agent SDK v1 with You.com HTTP MCP server. Configure allowed_tools to include only you_search (not you_contents). Use TypeScript v1. Save the code to generated/path-b-tools.ts.
```

**Expected Output:**
- `generated/path-b-tools.ts` - TypeScript v1 with restricted tools
- `allowedTools` array contains only `mcp__ydc__you_search`
- Does NOT include `mcp__ydc__you_contents`
- Otherwise same structure as Path A

---

### Path C: Custom API Key Handling

**Prompt:**
```
Create a TypeScript application using Claude Agent SDK v1 with You.com HTTP MCP server. Use custom environment variables CUSTOM_YDC_KEY and CUSTOM_ANTHROPIC_KEY. Use TypeScript v1. Save the code to generated/path-c-custom-keys.ts.
```

**Expected Output:**
- `generated/path-c-custom-keys.ts` - Custom environment variable names
- Reads from `process.env.CUSTOM_YDC_KEY` instead of `YDC_API_KEY`
- Reads from `process.env.CUSTOM_ANTHROPIC_KEY` instead of `ANTHROPIC_API_KEY`
- Validates both custom environment variables exist
- Passes custom keys to MCP configuration

---

### Path D: Model Selection (Haiku 3.5)

**Prompt:**
```
Create a TypeScript application using Claude Agent SDK v1 with You.com HTTP MCP server. Use Claude Haiku 3.5 model for faster responses. Use TypeScript v1. Save the code to generated/path-d-haiku.ts.
```

**Expected Output:**
- `generated/path-d-haiku.ts` - Uses Haiku model
- Model configured as `claude-3-5-haiku-20241022` instead of Sonnet
- Otherwise same structure as Path A

---

## 📚 Example Prompts (Documentation Only)

These prompts demonstrate skill capabilities but are not validated by automated tests.

### TypeScript v2 (Preview API)

**Prompt:**
```
Create a TypeScript application using Claude Agent SDK v2 with You.com HTTP MCP server. Use TypeScript v2 (send/receive pattern).
```

**Expected Behavior:**
- Uses `unstable_v2_createSession` from `@anthropic-ai/claude-agent-sdk`
- Implements `await using` for automatic cleanup
- Uses `session.send()` and `session.receive()` pattern
- Includes warning about preview API stability

---

### Custom Prompt with Web Search

**Prompt:**
```
Create a TypeScript application that searches for the latest AI developments using Claude Agent SDK.
```

**Expected Behavior:**
- Default prompt changed to search for AI developments
- Otherwise follows basic HTTP MCP integration pattern

---

## Validation Checklist

Each generated file should:
- [ ] Import `query` from `@anthropic-ai/claude-agent-sdk`
- [ ] Configure HTTP MCP server at `https://api.you.com/mcp`
- [ ] Set Authorization header with Bearer token
- [ ] Include `allowedTools` array with MCP tool names (prefixed with `mcp__ydc__`)
- [ ] Validate environment variables exist
- [ ] Use `for await...of` loop to consume generator results
- [ ] Check for `'result' in msg` to identify final result message
- [ ] Export a `main()` function for test imports
- [ ] Use TypeScript v1 generator pattern (not v2 send/receive)
- [ ] Follow TypeScript best practices (arrow functions, type safety)

## Test Structure

Each path has corresponding tests in `integration.spec.ts`:

| Path | Test File | Test Focus |
|------|-----------|------------|
| Path A | path-a-basic.ts | Basic HTTP MCP integration, environment variables |
| Path B | path-b-tools.ts | Allowed tools configuration, tool restriction |
| Path C | path-c-custom-keys.ts | Custom environment variable handling |
| Path D | path-d-haiku.ts | Model selection (Haiku vs Sonnet) |

## Running Tests

```bash
# From test directory
bun test

# Run specific test file
bun test integration.spec.ts

# With coverage
bun test --coverage
```

## Notes

- **TypeScript v1 (stable)**: Generator-based pattern with `query()` function
- **TypeScript v2 (preview)**: Send/receive pattern with `unstable_v2_createSession`
- Tests focus on v1 as it's the stable, recommended API
- Generated files are gitignored (test artifacts, not committed)
- Bun automatically loads `.env` from parent directories
