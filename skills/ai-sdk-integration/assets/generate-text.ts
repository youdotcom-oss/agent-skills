/**
 * AI SDK Integration Template - generateText()
 *
 * Shows how to integrate You.com tools with Vercel AI SDK's generateText().
 *
 * Key Integration Points:
 * 1. Import tools: youSearch(), youExpress(), youContents()
 * 2. Add to tools object
 * 3. API key: Use env variable or pass directly to each tool
 * 4. Model handles everything - you just get result.text
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { youContents, youExpress, youSearch } from '@youdotcom-oss/ai-sdk-plugin';
import { generateText } from 'ai';

// ============================================================================
// INTEGRATION STEP 1: Environment Variables
// ============================================================================
// Option A: Use environment variables (recommended)
// Set YDC_API_KEY in your .env file - tools read it automatically

if (!process.env.YDC_API_KEY) {
  throw new Error('YDC_API_KEY environment variable is required');
}

// Your AI provider key (Anthropic, OpenAI, etc.)
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required');
}

// ============================================================================
// INTEGRATION STEP 2: Add Tools to generateText
// ============================================================================

const anthropic = createAnthropic();

// Single tool example
const result = await generateText({
  model: anthropic('claude-sonnet-4-5-20250929'),
  tools: {
    search: youSearch(), // Reads YDC_API_KEY from environment
  },
  prompt: 'Your dynamic prompt here', // Replace with your actual prompt
});

console.log(result.text); // Model-formatted response with search results

// ============================================================================
// Multiple Tools (model chooses which to use)
// ============================================================================

const multiToolResult = await generateText({
  model: anthropic('claude-sonnet-4-5-20250929'),
  tools: {
    search: youSearch(),
    agent: youExpress(),
    extract: youContents(),
  },
  prompt: 'Your prompt here',
});

console.log(multiToolResult.text);

// ============================================================================
// INTEGRATION OPTION B: Pass API Key Directly
// ============================================================================
// Override environment variable per tool if needed

const customKeyResult = await generateText({
  model: anthropic('claude-sonnet-4-5-20250929'),
  tools: {
    search: youSearch({ apiKey: 'your-key-here' }),
  },
  prompt: 'Your prompt here',
});

console.log(customKeyResult.text);
