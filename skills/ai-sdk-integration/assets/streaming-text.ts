/**
 * AI SDK Integration Template - streamText()
 *
 * Shows how to integrate You.com tools with Vercel AI SDK's streamText().
 *
 * Key Integration Points:
 * 1. Import tools: youSearch(), youExpress(), youContents()
 * 2. Add to tools object
 * 3. IMPORTANT: Use stopWhen with stepCountIs(2 + number_of_tools) minimum
 * 4. Consume textStream for real-time UI updates
 * 5. Model handles formatting - you just render the stream
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { youContents, youExpress, youSearch } from '@youdotcom-oss/ai-sdk-plugin';
import { stepCountIs, streamText } from 'ai';

// ============================================================================
// INTEGRATION STEP 1: Environment Variables
// ============================================================================

if (!process.env.YDC_API_KEY) {
  throw new Error('YDC_API_KEY environment variable is required');
}

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required');
}

// ============================================================================
// INTEGRATION STEP 2: Add Tools + Configure stopWhen
// ============================================================================
// Use stopWhen: stepCountIs(3) - works for any number of tools with Anthropic

const anthropic = createAnthropic();

const result = streamText({
  model: anthropic('claude-sonnet-4-5-20250929'),
  tools: {
    search: youSearch(),
  },
  stopWhen: stepCountIs(3), // 3 steps works regardless of tool count (Anthropic)
  prompt: 'Your dynamic prompt here', // Replace with actual prompt
});

// ============================================================================
// INTEGRATION STEP 3: Consume the Stream
// ============================================================================
// Stream text to your UI in real-time

for await (const chunk of result.textStream) {
  process.stdout.write(chunk); // Or update your UI component
}

// ============================================================================
// Multiple Tools Example
// ============================================================================
// stepCountIs(3) works with any number of tools when using Anthropic

const multiToolStream = streamText({
  model: anthropic('claude-sonnet-4-5-20250929'),
  tools: {
    search: youSearch(),
    agent: youExpress(),
    extract: youContents(),
  },
  stopWhen: stepCountIs(3), // 3 steps works for 1, 2, or 3+ tools (Anthropic)
  prompt: 'Your prompt here',
});

for await (const chunk of multiToolStream.textStream) {
  process.stdout.write(chunk);
}

// ============================================================================
// Web Framework Integration Examples
// ============================================================================

// Next.js App Router (Route Handler)
// export async function POST(req: Request) {
//   const { messages } = await req.json();
//
//   const result = streamText({
//     model: anthropic('claude-sonnet-4-5-20250929'),
//     tools: { search: youSearch() },
//     stopWhen: stepCountIs(3),
//     messages,
//   });
//
//   return result.toDataStreamResponse();
// }

// Express.js
// app.post('/api/chat', async (req, res) => {
//   const { prompt } = req.body;
//
//   const result = streamText({
//     model: anthropic('claude-sonnet-4-5-20250929'),
//     tools: { search: youSearch() },
//     stopWhen: stepCountIs(3),
//     prompt,
//   });
//
//   result.pipeDataStreamToResponse(res);
// });

// React Component (using useChat hook)
// import { useChat } from 'ai/react';
//
// function ChatComponent() {
//   const { messages, input, handleInputChange, handleSubmit } = useChat({
//     api: '/api/chat', // Your endpoint with You.com tools
//   });
//
//   return (
//     <div>
//       {messages.map(m => <div key={m.id}>{m.content}</div>)}
//       <form onSubmit={handleSubmit}>
//         <input value={input} onChange={handleInputChange} />
//       </form>
//     </div>
//   );
// }
