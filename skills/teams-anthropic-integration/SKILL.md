---
name: teams-anthropic-integration
description: Integrate Microsoft Teams app with You.com MCP server using @youdotcom-oss/teams-anthropic package. Use when developer mentions Teams.ai, Microsoft Teams, or integrating Teams with Anthropic Claude and MCP.
license: MIT
compatibility: Node.js 18+, @microsoft/teams.ai, @microsoft/teams.mcpclient
metadata:
  author: youdotcom-oss
  category: enterprise-integration
  version: "1.0.0"
  keywords: microsoft-teams,teams-ai,mcp,you.com,integration,anthropic,claude,web-search,content-extraction
---

# Integrate Teams App with You.com MCP Server

Add You.com MCP server capabilities (web search, AI agent, content extraction) to Microsoft Teams applications using Anthropic Claude models.

## Workflow

1. **Install Packages**
   ```bash
   npm install @youdotcom-oss/teams-anthropic @microsoft/teams.ai @microsoft/teams.mcpclient
   ```

2. **Get API Keys**
   * You.com API key: https://you.com/platform/api-keys
   * Anthropic API key: https://console.anthropic.com/

3. **Set Environment Variables**
   ```bash
   # Create .env file
   YDC_API_KEY=your-you-com-api-key
   ANTHROPIC_API_KEY=your-anthropic-api-key
   ```

4. **Ask: New or Existing App?**
   * **New Teams app**: Use entire template below
   * **Existing app**: Follow `EXISTING APP` markers in template

5. **Copy Template Code**
   * See "Integration Template" section below
   * Follow markers for your integration type

6. **Test Integration**
   * Verify environment variables are set
   * Run app and test MCP tool access

## Integration Template

```typescript
/**
 * MCP Client Integration with You.com
 *
 * For NEW apps: Use this entire template
 * For EXISTING apps: Follow EXISTING APP comments
 */

// === Imports ===
import { ChatPrompt } from '@microsoft/teams.ai';
import { App } from '@microsoft/teams.apps'; // EXISTING APP: Skip this import
import { ConsoleLogger } from '@microsoft/teams.common';
import { McpClientPlugin } from '@microsoft/teams.mcpclient';
import {
  AnthropicChatModel,
  AnthropicModel,
  getYouMcpConfig,
} from '@youdotcom-oss/teams-anthropic';

// === Environment Validation ===
if (!process.env.YDC_API_KEY) {
  throw new Error('YDC_API_KEY environment variable is required');
}

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required');
}

// === Configure Logger ===
const logger = new ConsoleLogger('mcp-client', { level: 'info' });

// === Instructions ===
const instructions = `You are a helpful assistant with access to web search and AI capabilities through You.com.
Always use the available tools to provide accurate, up-to-date information.`;

// === ChatPrompt with MCP Integration ===
// EXISTING APP: Copy this block to integrate MCP into your existing app
const prompt = new ChatPrompt(
  {
    instructions,
    model: new AnthropicChatModel({
      model: AnthropicModel.CLAUDE_SONNET_4_5,
      apiKey: process.env.ANTHROPIC_API_KEY,
      requestOptions: {
        max_tokens: 2048,
      },
    }),
  },
  [new McpClientPlugin({ logger })],
).usePlugin(
  'mcpClient',
  getYouMcpConfig({
    // apiKey: 'custom-key', // Optional: defaults to YDC_API_KEY env var
  }),
);

// === App Setup ===
// EXISTING APP: Skip this section - use your own app setup
// NEW APP: Use this to create a standalone app

const app = new App();

app.on('message', async ({ send, activity }) => {
  await send({ type: 'typing' });

  const result = await prompt.send(activity.text);
  if (result.content) {
    await send(result.content);
  }
});

app.start().catch(console.error);
```

## Template Usage

### For NEW Teams Apps

1. Copy entire template above
2. Save as `app.ts` (or your preferred filename)
3. Ensure environment variables are set
4. Run: `npm start` or `bun run app.ts`

### For EXISTING Teams Apps

Copy these sections only:

1. **Imports** - Add to your existing imports (skip `App` import)
   ```typescript
   import { ChatPrompt } from '@microsoft/teams.ai';
   import { ConsoleLogger } from '@microsoft/teams.common';
   import { McpClientPlugin } from '@microsoft/teams.mcpclient';
   import {
     AnthropicChatModel,
     AnthropicModel,
     getYouMcpConfig,
   } from '@youdotcom-oss/teams-anthropic';
   ```

2. **Environment Validation** - Add at top of your app initialization
   ```typescript
   if (!process.env.YDC_API_KEY) {
     throw new Error('YDC_API_KEY environment variable is required');
   }
   if (!process.env.ANTHROPIC_API_KEY) {
     throw new Error('ANTHROPIC_API_KEY environment variable is required');
   }
   ```

3. **ChatPrompt Configuration** - Replace or add to your existing prompt setup
   ```typescript
   const logger = new ConsoleLogger('mcp-client', { level: 'info' });

   const prompt = new ChatPrompt(
     {
       instructions: 'Your instructions here',
       model: new AnthropicChatModel({
         model: AnthropicModel.CLAUDE_SONNET_4_5,
         apiKey: process.env.ANTHROPIC_API_KEY,
       }),
     },
     [new McpClientPlugin({ logger })],
   ).usePlugin('mcpClient', getYouMcpConfig());
   ```

4. **Skip App Setup** - Use your existing app structure

## Key Configuration Points

### getYouMcpConfig() Utility

Automatically configures MCP connection:
- **URL**: `https://api.you.com/mcp`
- **Authentication**: Bearer token from `YDC_API_KEY`
- **User-Agent**: Includes package version for telemetry

```typescript
// Option 1: Use environment variable (recommended)
getYouMcpConfig()

// Option 2: Custom API key
getYouMcpConfig({ apiKey: 'your-custom-key' })
```

### Available Claude Models

```typescript
AnthropicModel.CLAUDE_OPUS_4_5    // Most capable
AnthropicModel.CLAUDE_SONNET_4_5  // Balanced (recommended)
AnthropicModel.CLAUDE_HAIKU_3_5   // Fast and efficient
AnthropicModel.CLAUDE_SONNET_3_5  // Previous generation
```

## Validation Checklist

Before testing:

- [ ] Packages installed: `@youdotcom-oss/teams-anthropic`, `@microsoft/teams.ai`, `@microsoft/teams.mcpclient`
- [ ] Environment variables set: `YDC_API_KEY`, `ANTHROPIC_API_KEY`
- [ ] Imports added (skip `App` import for existing apps)
- [ ] Environment validation added
- [ ] ChatPrompt configured with `getYouMcpConfig()`
- [ ] Logger configured

## Common Issues

**"Cannot find module @youdotcom-oss/teams-anthropic"**
Run: `npm install @youdotcom-oss/teams-anthropic`

**"YDC_API_KEY environment variable is required"**
Add to .env: `YDC_API_KEY=your-key-here`
Get key: https://you.com/platform/api-keys

**"ANTHROPIC_API_KEY environment variable is required"**
Add to .env: `ANTHROPIC_API_KEY=your-key-here`
Get key: https://console.anthropic.com/

**"MCP connection fails"**
Verify API key is valid at https://you.com/platform/api-keys

**"Import error for App from @microsoft/teams.apps"**
For existing apps, skip the `App` import

## Advanced: Package Development Patterns

These patterns are for developers **contributing to** `@youdotcom-oss/teams-anthropic` or building custom integrations.

### Memory API Pattern

```typescript
// ✅ Correct - Teams.ai Memory interface
const memory = options?.messages || new LocalMemory();
await memory.push(input);
const messages = await memory.values();

// ❌ Wrong - these methods don't exist
await memory.addMessage(input);
const messages = await memory.getMessages();
```

### Anthropic Streaming

```typescript
// ✅ Correct - use stream() method
const stream = this._anthropic.messages.stream({
  ...requestParams,
  stream: true,
});

for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    if (event.delta.type === 'text_delta') {
      const delta = event.delta.text;
      if (options.onChunk) {
        await options.onChunk(delta);
      }
    }
  }
}

// ❌ Wrong - type errors
const stream = await this._anthropic.messages.create(requestParams);
```

### System Messages

```typescript
// ✅ Correct - system as separate parameter
const systemMessage = extractSystemMessage(conversationMessages);
if (systemMessage) {
  requestParams.system = systemMessage;
}

// ❌ Wrong - system in conversation array
const anthropicMessages = transformToAnthropicMessages([
  { role: 'system', content: 'You are helpful' },
  { role: 'user', content: 'Hello' },
]);
```

### Content Block Type Assertions

```typescript
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

// ❌ Wrong - missing type assertion
for (const block of response.content) {
  if (block.type === 'text') {
    textParts.push(block.text); // Type error
  }
}
```

## Resources

* Package: https://github.com/youdotcom-oss/dx-toolkit/tree/main/packages/teams-anthropic
* You.com MCP: https://documentation.you.com/developer-resources/mcp-server
