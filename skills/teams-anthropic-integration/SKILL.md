---
name: teams-anthropic-integration
description: Integrate Microsoft Teams app with You.com MCP server using @youdotcom-oss/teams-anthropic package. Use when developer mentions Teams.ai, Microsoft Teams, or integrating Teams with Anthropic Claude and MCP.
license: MIT
compatibility: Node.js 18+, @microsoft/teams.ai, @microsoft/teams.mcpclient
metadata:
  author: youdotcom-oss
  version: "0.2.0"
  category: enterprise-integration
  keywords: microsoft-teams,mcp,you.com,integration,anthropic,claude, web-search, search, crawling, scraping
---

# Generate Teams App with You.com MCP

Set up Microsoft Teams application with You.com MCP server integration using the `@youdotcom-oss/teams-anthropic` package.

## Workflow

1. **Install Package**
   ```bash
   npm install @youdotcom-oss/teams-anthropic @microsoft/teams.ai @microsoft/teams.mcpclient
   ```

2. **Ask Integration Type**
   * New Teams app (use entire template)
   * Existing app (follow inline markers)

3. **Copy Template**
   * Template location: `assets/mcp-client.ts` (in this skill directory)
   * New app: Use entire file
   * Existing: Follow EXISTING APP markers in template

4. **Environment Setup**
   * Create .env with YDC_API_KEY and ANTHROPIC_API_KEY
   * Guide developer to get API keys

## Template Sections

The template has clear inline markers:

* `// ← EXISTING APP: SKIP THIS LINE` - Skip for existing apps
* `// ← EXISTING APP: START HERE` - Start copying here
* `// ← EXISTING APP: SKIP THIS ENTIRE SECTION` - Skip section

**For NEW apps**: Use entire template (lines 1-93)

**For EXISTING apps**:

* Skip line 20 (App import)
* Copy lines 21-25 (other imports)
* Copy lines 31-45 (environment validation)
* Copy lines 52-74 (ChatPrompt setup)
* Skip lines 82-93 (app setup)

## Key Integration Points

**Template markers:**
* `// ← EXISTING APP: SKIP THIS LINE` - Skip for existing apps
* `// ← EXISTING APP: START HERE` - Start copying here
* `// ← EXISTING APP: SKIP THIS ENTIRE SECTION` - Skip entire section

**ChatPrompt Configuration (always needed):**
* AnthropicChatModel with Claude Sonnet 4.5
* McpClientPlugin for MCP support
* `getYouMcpConfig()` utility - automatically configures:
  * URL: `https://api.you.com/mcp`
  * Bearer authentication with YDC_API_KEY
  * User-Agent with package version

**For Existing Apps:**
* Add to your existing app structure
* Ensure logger is configured
* Add environment validation
* Integrate ChatPrompt where needed

## Validation Checklist

Before completing:

- [ ] Package installed: `@youdotcom-oss/teams-anthropic`
- [ ] Dependencies installed: `@microsoft/teams.ai` `@microsoft/teams.mcpclient`
- [ ] Template copied appropriately (new app vs existing app)
- [ ] Environment variables set in .env
- [ ] Imports match integration type (skip App import for existing apps)
- [ ] ChatPrompt properly configured
- [ ] `getYouMcpConfig()` used (automatically handles URL and auth)

## Common Issues

**Issue**: "Cannot find module @youdotcom-oss/teams-anthropic"
**Fix**: Run `npm install @youdotcom-oss/teams-anthropic`

**Issue**: "YDC_API_KEY environment variable is required"
**Fix**: Add to .env file: `YDC_API_KEY=your-key-here`

**Issue**: "ANTHROPIC_API_KEY environment variable is required"
**Fix**: Add to .env file: `ANTHROPIC_API_KEY=your-key-here`

**Issue**: "MCP connection fails"
**Fix**: Verify API key is valid at https://you.com/platform/api-keys

**Issue**: "Import error for App from @microsoft/teams.apps"
**Fix**: For existing apps, skip this import (line 20 in template)

## Advanced: Teams.ai Integration Patterns

For developers creating custom Teams.ai applications or contributing to @youdotcom-oss/teams-anthropic:

### Teams.ai Memory API

Always use `push()` and `values()`, NEVER `addMessage()` or `getMessages()`:

```ts
// ✅ Correct - Teams.ai memory API
const memory = options?.messages || new LocalMemory();
await memory.push(input);
const messages = await memory.values();

// ❌ Wrong - these methods don't exist
await memory.addMessage(input);
const messages = await memory.getMessages();
```

**Why this pattern?**
- Teams.ai Memory interface uses `push()` and `values()` methods
- `addMessage()` and `getMessages()` are not part of the IMemory interface

### FunctionMessage Structure

ALWAYS include `function_id` property in FunctionMessage:

```ts
// ✅ Correct - includes function_id
const fnResult: Message = {
  role: 'function',
  function_id: fnCall.id || fnCall.name,
  content: typeof result === 'string' ? result : JSON.stringify(result),
};

// ❌ Wrong - missing function_id (will fail)
const fnResult: Message = {
  role: 'function',
  content: result,
};
```

**Why this pattern?**
- Teams.ai requires `function_id` to match function calls with results
- Missing `function_id` causes runtime errors

### Function Handler Access

NEVER call function definition directly, always access handler property:

```ts
// ✅ Correct - access handler property
const fnDef = options.functions[fnCall.name];
if (fnDef && typeof fnDef === 'object' && 'handler' in fnDef) {
  const handler = (fnDef as { handler: (args: unknown) => Promise<unknown> }).handler;
  const result = await handler(fnCall.arguments);
}

// ❌ Wrong - Function type has no call signatures
const fn = options.functions[fnCall.name];
const result = await fn(fnCall.arguments);
```

**Why this pattern?**
- TypeScript Function type has no call signatures
- Functions in Teams.ai are objects with handler property

### Anthropic Streaming

Use `messages.stream()` method, NEVER `messages.create()` with stream parameter:

```ts
// ✅ Correct - use stream() method
const stream = this._anthropic.messages.stream({
  ...requestParams,
  stream: true,
});

for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    if (event.delta.type === 'text_delta') {
      const delta = event.delta.text;
      textParts.push(delta);
      if (options.onChunk) {
        await options.onChunk(delta);
      }
    }
  }
}

// ❌ Wrong - type errors with create() + stream parameter
requestParams.stream = true;
const stream = await this._anthropic.messages.create(requestParams);
```

**Why this pattern?**
- `messages.create()` returns MessageResponse, not Stream
- `messages.stream()` returns proper streaming interface

### Anthropic System Messages

Extract system messages separately, Anthropic requires them as separate parameter:

```ts
// ✅ Correct - system as separate parameter
const systemMessage = extractSystemMessage(conversationMessages);
if (systemMessage) {
  requestParams.system = systemMessage;
}

// ❌ Wrong - system messages in conversation array
const anthropicMessages = transformToAnthropicMessages([
  { role: 'system', content: 'You are helpful' },
  { role: 'user', content: 'Hello' },
]);
```

**Why this pattern?**
- Anthropic API requires system messages as separate `system` parameter
- System messages in conversation array will be rejected

### Anthropic Content Block Type Assertions

Always use explicit type assertions for content blocks:

```ts
// ✅ Correct - explicit type assertions
for (const block of response.content) {
  if (block.type === 'text') {
    const textBlock = block as Anthropic.TextBlock;
    textParts.push(textBlock.text);
  } else if (block.type === 'tool_use') {
    const toolBlock = block as Anthropic.ToolUseBlock;
    toolUses.push({ id: toolBlock.id, name: toolBlock.name, input: toolBlock.input });
  }
}

// ❌ Wrong - missing citations property error
for (const block of response.content) {
  if (block.type === 'text') {
    textParts.push(block.text);
  }
}
```

**Why this pattern?**
- Anthropic ContentBlock is union type (TextBlock | ToolUseBlock | etc.)
- TypeScript can't narrow union without explicit assertion

### MCP Client Integration

Use `getYouMcpConfig()` utility for automatic MCP configuration:

```ts
// ✅ Correct - automatic configuration
const prompt = new ChatPrompt(
  {
    instructions,
    model: new AnthropicChatModel({
      model: AnthropicModel.CLAUDE_SONNET_4_5,
      apiKey: process.env.ANTHROPIC_API_KEY,
    }),
  },
  [new McpClientPlugin({ logger })]
).usePlugin(
  'mcpClient',
  getYouMcpConfig({
    // apiKey: 'custom-key', // Optional: falls back to YDC_API_KEY env var
  })
);

// ❌ Wrong - manual configuration (error-prone)
.usePlugin('mcpClient', {
  url: 'https://api.you.com/mcp',
  authentication: { bearerToken: process.env.YDC_API_KEY },
});
```

**Why this pattern?**
- `getYouMcpConfig()` automatically configures URL and authentication
- Includes proper User-Agent with package version
- Falls back to YDC_API_KEY environment variable

### Template Integration

**For NEW Teams apps**: Use entire template from `assets/mcp-client.ts` (in this skill directory)

**For EXISTING Teams apps**: Follow inline markers in template:
- `// ← EXISTING APP: SKIP THIS LINE` - Skip for existing apps
- `// ← EXISTING APP: START HERE` - Start copying here
- `// ← EXISTING APP: SKIP THIS ENTIRE SECTION` - Skip section

**Required sections for existing apps**:
1. Imports (lines 21-28) - Skip App import
2. Environment validation (lines 34-44)
3. ChatPrompt setup (lines 55-72) - Core integration
4. Skip app setup section (lines 80-91) - Use your existing app structure

## Additional Resources

* Package README: https://github.com/youdotcom-oss/dx-toolkit/tree/main/packages/teams-anthropic
* Plugin README: https://github.com/youdotcom-oss/dx-toolkit/tree/main/plugins/teams-anthropic-integration
* You.com MCP Server: https://documentation.you.com/developer-resources/mcp-server
