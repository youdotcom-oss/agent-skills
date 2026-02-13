# Teams Anthropic Integration - Test Prompts

These prompts trigger the `teams-anthropic-integration` skill and generate code that is validated by the integration tests.

## Usage

**Working Directory:** `/Users/edward/Workspace/agent-skills/tests/teams-anthropic-integration/`

Run these prompts from the test directory. The **Primary Prompts** (marked with 🧪) explicitly specify output file paths and are validated by integration tests. Other prompts are examples for skill documentation.

## 🧪 Primary Prompts (Tested)

### Path A: Basic Setup (Claude Only)

### New Application

**Prompt:**
```
Create a new Teams app using Anthropic Claude Sonnet 4.5 for message handling. Save the code to generated/path-a-basic.ts.
```

**Expected Output:**
- `generated/path-a-basic.ts` - Complete Teams app with Anthropic integration
- Uses `@youdotcom-oss/teams-anthropic` package
- Configures Claude model with API key from environment
- Handles message activities with streaming responses

---

### Path B: With You.com MCP

### New Application with MCP

**Prompt:**
```
Create a new Teams app with Anthropic Claude Sonnet 4.5 and You.com MCP server for web search and content extraction. Save the code to generated/path-b-mcp.ts.
```

**Expected Output:**
- `generated/path-b-mcp.ts` - Complete Teams app with Anthropic + MCP
- Configures `ChatPrompt` with `McpClientPlugin`
- Integrates You.com MCP server with direct configuration (not getYouMcpConfig helper)
- Handles both YDC_API_KEY and ANTHROPIC_API_KEY

---

## 📚 Example Prompts (Documentation Only)

These prompts demonstrate skill capabilities but are not validated by automated tests.

### Existing Application - Basic Setup

**Prompt:**
```
Add Anthropic Claude models to my existing Teams.ai application. I want to use Claude Sonnet 4.5 for chat responses.
```

**Expected Behavior:**
- Adds `AnthropicChatModel` configuration
- Integrates with existing `App` instance
- Preserves existing message handlers

---

### Existing Application - Add MCP

**Prompt:**
```
Add You.com MCP server capabilities to my existing Teams app that uses Anthropic Claude.
```

**Expected Behavior:**
- Upgrades from basic `AnthropicChatModel` to `ChatPrompt`
- Adds `McpClientPlugin` configuration
- Adds You.com MCP server setup
- Preserves existing message handling logic

---

### Custom Model Selection

**Prompt:**
```
Create a Teams app with Anthropic Claude Opus 4.6 instead of Sonnet.
```

**Expected Behavior:**
- Uses `AnthropicModel.CLAUDE_OPUS_4_6` instead of default Sonnet
- Otherwise follows standard Path A setup

---

### Streaming Configuration

**Prompt:**
```
Set up a Teams app with Anthropic Claude that uses streaming responses.
```

**Expected Behavior:**
- Configures streaming in `AnthropicChatModel` options
- Handles streaming message responses appropriately
- Uses `addAiGenerated()` for AI-generated content marking

---

## Validation

Each generated file should:
- [ ] Import required packages from `@youdotcom-oss/teams-anthropic`
- [ ] Configure API keys from environment variables
- [ ] Handle `message` events with proper async/await
- [ ] Use `MessageActivity` with `addAiGenerated()` for responses
- [ ] For MCP path: Include `McpClientPlugin` and `getYouMcpConfig()`
- [ ] Follow TypeScript best practices (arrow functions, type safety)
