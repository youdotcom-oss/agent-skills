# Vercel AI SDK Plugin for You.com

Give your AI applications **real-time access to the web** through the hosted You.com MCP server. This package exposes an async `createYouClient()` helper that connects to `https://api.you.com/mcp` and returns the underlying AI SDK MCP client. By default, `await client.tools()` resolves to the default hosted tool set: `you-search`, `you-research`, and `you-contents`. It also ships `uploadYouSkill()` for AI SDK 7's [skills](https://ai-sdk.dev/docs/ai-sdk-core/skill-uploads) support.

## AI SDK version

This plugin targets **AI SDK 7** (`ai@^7.0.0`, `@ai-sdk/mcp@^2.0.0`). AI SDK 7 introduces native [`skills`](https://ai-sdk.dev/docs/ai-sdk-core/skill-uploads) support and a `reasoning` option for `generateText`/`streamText`. Continue using `stopWhen: stepCountIs(n)` for multi-step tool execution.

## Features

Build AI applications that can:
- **Search the web in real-time** - Access current information with advanced filtering (dates, sites, file types)
- **Research** - Comprehensive answers with cited sources, configurable effort (lite to exhaustive)
- **Extract any webpage** - Pull full content in markdown or HTML format
- **Zero configuration** - Works with any AI SDK model provider (Anthropic, OpenAI, Google, and more)
- **Hosted MCP transport** - Connects directly to the You.com hosted MCP server
- **Type-safe** - Full TypeScript support for async tool initialization
- **Production-ready** - Built on You.com's enterprise search API

## AI Agent Skills

**For AI SDK Integration**: Use the [ydc-ai-sdk-integration](https://github.com/youdotcom-oss/agent-skills/tree/main/skills/ydc-ai-sdk-integration) skill to quickly integrate You.com tools with your Vercel AI SDK applications.

```bash
# Install the AI SDK integration skill
npx skills add youdotcom-oss/agent-skills --skill ydc-ai-sdk-integration
```

Once installed, ask your AI agent: **"Integrate Vercel AI SDK with You.com tools"**

**Supported AI agents**: Claude Code, Cursor, Windsurf, Cody, Continue, and more.

See [Skill Documentation](https://github.com/youdotcom-oss/agent-skills/tree/main/skills/ydc-ai-sdk-integration) for complete integration guide.

## Getting started

Get up and running in 4 quick steps:

### 1. Get your API key

Visit [you.com/platform/api-keys](https://you.com/platform/api-keys) to get your You.com API key. Keep this key secure - you'll need it for configuration.

### 2. Install the package (NPM, Bun, or Yarn)

Choose your package manager:

```bash
# NPM
npm install @youdotcom-oss/ai-sdk-plugin ai

# Bun
bun add @youdotcom-oss/ai-sdk-plugin ai

# Yarn
yarn add @youdotcom-oss/ai-sdk-plugin ai
```

> Requires `ai@^7.0.0` (AI SDK 7). For AI SDK 6, pin `@youdotcom-oss/ai-sdk-plugin@^3.x` with `ai@^6`.

### 3. Add tools to your application

Import `createYouClient()`, await the MCP-backed client, then resolve tools from that client for your AI SDK call:

```typescript
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, stepCountIs } from 'ai';
import { createYouClient } from '@youdotcom-oss/ai-sdk-plugin';

// Create your AI model provider
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const client = await createYouClient({
  apiKey: process.env.YDC_API_KEY,
});

try {
  const tools = await client.tools();

  const result = await generateText({
    model: anthropic('claude-sonnet-4-5-20250929'),
    tools,
    stopWhen: stepCountIs(5),  // Required for tool result processing
    prompt: 'Search for the latest developments in quantum computing',
  });

  console.log(result.text);
} finally {
  await client.close();
}
```

`createYouClient()` returns the underlying MCP client. Call `await client.tools()` to resolve the default hosted tool set (`you-search`, `you-research`, and `you-contents`) unless you scope it with `tools`, and call `await client.close()` when finished.

Set your You.com API key as an environment variable:

```bash
export YDC_API_KEY=your-api-key-here
```

Set your model provider credentials separately for whichever provider you use.

### 4. Test your setup

Ask your AI something that needs real-time information:

- "What are the latest developments in quantum computing?"
- "Find recent articles about sustainable energy and summarize the key trends"
- "Extract and analyze the content from https://anthropic.com"

Your AI will automatically choose the right tool and return up-to-date, accurate answers.

## What you can build

Your AI can now handle requests like these:

### Research & information

**Current events:**
- "What's trending in AI research this week?"
- "Find the latest news about climate policy from the past month"

**Comparative research:**
- "Compare the features of the top 3 CRM platforms"
- "What are developers saying about the new React version?"

**Technical documentation:**
- "Search for TypeScript best practices on the official docs"
- "Find examples of using WebAssembly in production"

### Content analysis & extraction

**Documentation analysis:**
- "Extract and summarize the main points from https://docs.example.com"
- "Get the pricing information from https://competitor.com/pricing"

**Multi-page research:**
- "Extract content from these 3 blog posts and compare their approaches"
- "Pull the documentation from these URLs and create a summary"

### Real-time workflows

**Market intelligence:**
- "What's the current status of the stock market?"
- "Find recent funding announcements in the AI space"

**Competitive analysis:**
- "Search for recent product launches by our competitors"
- "Extract feature comparisons from competitor websites"

## Configuration

The plugin works out of the box with environment variables:

```bash
export YDC_API_KEY=your-api-key-here
```

<details>
<summary>Advanced configuration options</summary>

### Passing configuration directly

You can override the API key, request a specific hosted MCP profile, or scope the request to specific tool ids:

```typescript
import { createYouClient } from '@youdotcom-oss/ai-sdk-plugin';

const client = await createYouClient({
  apiKey: 'your-api-key-here',
  tools: ['you-search', 'you-contents'],
});

const tools = await client.tools();
```

`you-finance` is not included in the default tool set. Request it explicitly with `tools`.

Lead with the smallest explicit form when you only want finance:

```typescript
const client = await createYouClient({
  tools: 'you-finance',
});

const financeTools = await client.tools();
```

If you want the default tools plus finance, request all of them explicitly:

```typescript
const client = await createYouClient({
  tools: ['you-search', 'you-research', 'you-contents', 'you-finance'],
});

const tools = await client.tools();
```

Use `profile` when you want the hosted server to resolve tools through a named profile instead:

```typescript
const client = await createYouClient({
  profile: 'free',
});

const tools = await client.tools();
```

### Configuration type

```typescript
export type YouClientConfig = {
  apiKey?: string;           // Defaults to YDC_API_KEY
  tools?: string | string[]; // Added as ?tools=...
  profile?: string;          // Added as ?profile=...
  headers?: Record<string, string>; // Merged over defaults; caller values win
};
```

### App attribution

By default the plugin sends `http-referer` and `x-title` headers identifying
itself to You.com (`https://github.com/youdotcom-oss/agent-skills` and
`You.com AI SDK Plugin`). Set `headers` to attribute traffic to your own app
instead:

```typescript
const client = await createYouClient({
  apiKey: process.env.YDC_API_KEY,
  headers: {
    'http-referer': 'https://myapp.vercel.app',
    'x-title': 'MyApp',
  },
});
```

Caller `headers` override the plugin defaults and can add arbitrary new ones.

### Skills (AI SDK 7)

Use `uploadYouSkill()` to upload the bundled You.com skill (tool-selection +
trust-boundary guidance) to a provider and get back a `ProviderReference` for
`providerOptions`:

```typescript
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, stepCountIs } from 'ai';
import { createYouClient, uploadYouSkill } from '@youdotcom-oss/ai-sdk-plugin';

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Upload the You.com skill to the provider.
const { providerReference } = await uploadYouSkill({ api: anthropic });

const client = await createYouClient({ apiKey: process.env.YDC_API_KEY });
const tools = await client.tools();

const result = await generateText({
  model: anthropic('claude-sonnet-4-6'),
  tools,
  stopWhen: stepCountIs(5),
  prompt: 'Search for the latest quantum computing breakthroughs',
  providerOptions: {
    anthropic: {
      container: { skills: [{ type: 'custom', providerReference }] },
    },
  },
});
```

`uploadYouSkill` works with any provider that exposes `.skills()` (Anthropic,
OpenAI); pass either a provider instance or `provider.skills()` as `api`.

### Tool selection

The package always connects to `https://api.you.com/mcp`.

The default hosted tool set is:

- `you-search`
- `you-research`
- `you-contents`

Optional tools:

- `you-finance`

`you-finance` is not included in the default tool set. Request it explicitly with `tools`.

`tools` scopes the visible tool set.

`profile` selects a hosted server profile. `tools` scopes which tools are visible. If `profile` is provided, it takes precedence over `tools`.

Today, `profile: 'free'` is a search-only mode. It overrides `tools` and does not expose `you-research`, `you-contents`, `you-finance`, or livecrawl.

### Using different model providers

This plugin works with any AI SDK compatible model provider:

```typescript
import { generateText, stepCountIs } from 'ai';

// Anthropic Claude
import { createAnthropic } from '@ai-sdk/anthropic';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const client = await createYouClient();
const tools = await client.tools();

const result = await generateText({
  model: anthropic('claude-sonnet-4-5-20250929'),
  tools,
  stopWhen: stepCountIs(3),
  prompt: 'Search for AI news',
});

// OpenAI
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const searchClient = await createYouClient({
  tools: 'you-search',
});
const searchTools = await searchClient.tools();

const result = await generateText({
  model: openai('gpt-4'),
  tools: searchTools,
  stopWhen: stepCountIs(3),
  prompt: 'Search for AI news',
});

// Google Gemini
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const googleClient = await createYouClient({
  tools: 'you-search',
});
const googleTools = await googleClient.tools();

const result = await generateText({
  model: google('gemini-2.0-flash-exp'),
  tools: googleTools,
  stopWhen: stepCountIs(3),
  prompt: 'Search for AI news',
});
```

</details>

## Available tools

Default tools:

- `you-search`
- `you-research`
- `you-contents`

Optional tools:

- `you-finance`

---

**Note**: Your AI automatically selects the right tool based on the user's request. Use `stopWhen: stepCountIs(n)` to enable multi-step tool execution, and your AI handles the orchestration.

## Examples

The `examples/` directory contains complete working examples demonstrating all features:

- **basic-search.ts** - Web search with filters and parameters
- **streaming-text.ts** - Real-time streaming responses
- **agent-response.ts** - AI reasoning with web context
- **content-extraction.ts** - Extract and analyze webpages
- **error-handling.ts** - Production-ready error handling

**Quick start:**

1. Set up your environment variables (see [examples/README.md](./examples/README.md) for 3 setup options)
2. Run an example:

```bash
# Using the example script (easiest)
bun run example              # Runs basic-search (default)
bun run example agent        # Runs agent-response
bun run example help         # Shows all available examples

# Or run directly
cd packages/ai-sdk-plugin
bun examples/basic-search.ts
```

All examples include:
- Environment variable validation with helpful error messages
- Explicit provider pattern matching integration tests
- Error handling best practices

**For complete setup instructions, environment variable options, and troubleshooting**, see [examples/README.md](./examples/README.md)

## Troubleshooting

### Problem: "YDC_API_KEY is required" error

**Solution**: Set your API key as an environment variable:

```bash
export YDC_API_KEY=your-api-key-here
# Then restart your application
```

Or pass it directly when creating tools:

```typescript
const client = await createYouClient({ apiKey: 'your-api-key-here' });
const tools = await client.tools();
```

### Problem: AI isn't using the tools

**Solution**: Make sure you're using `stopWhen` to enable multi-step tool execution:

```typescript
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, stepCountIs } from 'ai';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const client = await createYouClient();
const tools = await client.tools();

const result = await generateText({
  model: anthropic('claude-sonnet-4-5-20250929'),
  tools,
  stopWhen: stepCountIs(3),  // Required: enables tool result processing
  prompt: 'Search for recent AI news',
});
```

### Problem: Tools execute but response is empty

**Symptoms**: You see tool calls in `result.steps` but `result.text` is empty or minimal.

**Solution**: Replace `maxSteps` with `stopWhen: stepCountIs(n)`:

```typescript
import { generateText, stepCountIs } from 'ai';

// ❌ WRONG - tools execute but results aren't integrated
const client = await createYouClient();
const tools = await client.tools();

const result = await generateText({
  model: anthropic('claude-sonnet-4-5-20250929'),
  tools,
  maxSteps: 5,  // Don't use this!
  prompt: 'Search for AI news',
});

// ✅ CORRECT - tool results properly integrated
const result = await generateText({
  model: anthropic('claude-sonnet-4-5-20250929'),
  tools,
  stopWhen: stepCountIs(3),  // Use this instead
  prompt: 'Search for AI news',
});
```

**Why this happens**: `maxSteps` doesn't properly integrate tool results into the response generation. The `stopWhen` pattern ensures the AI processes tool outputs before stopping.

### Problem: Getting 401 authentication errors

**Solution**: Verify your API key is correct and properly set:

```bash
# Check if environment variable is set
echo $YDC_API_KEY

# If empty, set it
export YDC_API_KEY=your-api-key-here
```

Get a new API key at [you.com/platform/api-keys](https://you.com/platform/api-keys) if needed.

### Problem: Getting rate limit errors (429)

**Solution**: You've hit the API rate limit. Wait a few minutes before retrying, or check your API usage at [you.com/platform/api-keys](https://you.com/platform/api-keys).

### Problem: Tool execution failing silently

**Solution**: Check the AI SDK's tool results for error details:

```typescript
import { createAnthropic } from '@ai-sdk/anthropic';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const client = await createYouClient();
const tools = await client.tools();

const result = await generateText({
  model: anthropic('claude-sonnet-4-5-20250929'),
  tools,
  prompt: 'Search for AI news',
});

// Inspect tool results for errors
console.log(result.toolResults);
```

### Need more help?

- **GitHub Issues**: [Report bugs](https://github.com/youdotcom-oss/dx-toolkit/issues)
- **Email Support**: support@you.com

## For contributors

Interested in contributing? We'd love your help!

**Development setup**: See [AGENTS.md](./AGENTS.md) for complete development guide, architecture overview, code patterns, and testing guidelines.

**Quick contribution steps:**
1. Fork the repository
2. Create a feature branch following [CONTRIBUTING.md](../../CONTRIBUTING.md) conventions
3. Follow code style guidelines (Biome enforced)
4. Write tests for your changes
5. Run quality checks: `bun run check && bun test`
6. Submit a pull request with a clear description

We appreciate contributions of all kinds:
- Bug fixes and improvements
- New features and enhancements
- Documentation improvements
- Test coverage improvements
- Performance optimizations

---

**License**: MIT - see [LICENSE](../../LICENSE) for details

**Author**: You.com (https://you.com)
