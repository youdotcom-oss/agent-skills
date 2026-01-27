/**
 * MCP Client Integration Template
 *
 * This template shows how to integrate You.com MCP server with Microsoft Teams.ai
 * using Anthropic Claude models.
 *
 * Usage:
 * 1. New Teams App: Use this entire file as-is
 * 2. Existing App: Follow the inline markers (EXISTING APP comments)
 *
 * Prerequisites:
 * - Install: npm install @youdotcom-oss/teams-anthropic @microsoft/teams.ai @microsoft/teams.mcpclient
 * - Set environment variables: YDC_API_KEY, ANTHROPIC_API_KEY
 */

// ============================================================================
// Imports
// ============================================================================

import { ChatPrompt } from '@microsoft/teams.ai'; // ← EXISTING APP: START HERE
import { App } from '@microsoft/teams.apps'; // ← EXISTING APP: SKIP THIS LINE
import { ConsoleLogger } from '@microsoft/teams.common';
import { McpClientPlugin } from '@microsoft/teams.mcpclient';
import { AnthropicChatModel, AnthropicModel, getYouMcpConfig } from '@youdotcom-oss/teams-anthropic';

// ============================================================================
// Environment Validation & Configuration
// ============================================================================

// Validate required environment variables
if (!process.env.YDC_API_KEY) {
  throw new Error('YDC_API_KEY environment variable is required');
}

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required');
}

// Configure logger
const logger = new ConsoleLogger('mcp-client', { level: 'info' });

// Agent instructions
const instructions = `You are a helpful assistant with access to web search and AI capabilities through You.com.
Always use the available tools to provide accurate, up-to-date information.`;

// ============================================================================
// ChatPrompt Setup with MCP Client Integration
// Extract this block to integrate into existing Teams apps
// ============================================================================

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
    // apiKey: 'your-api-key-here', // Optional: falls back to YDC_API_KEY env var
  }),
);

// ============================================================================
// Teams App Setup (for standalone usage)
// ============================================================================
// ← EXISTING APP: SKIP THIS ENTIRE SECTION (you already have your own app)
// ← NEW APP: Keep this section

const app = new App();

app.on('message', async ({ send, activity }) => {
  await send({ type: 'typing' });

  const result = await prompt.send(activity.text);
  if (result.content) {
    await send(result.content);
  }
});

app.start().catch(console.error);
