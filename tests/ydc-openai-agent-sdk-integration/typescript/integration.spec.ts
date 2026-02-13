/**
 * Test OpenAI Agents SDK TypeScript integration with You.com MCP (Hosted MCP)
 * Bun automatically loads .env from parent directories
 */
import { Agent, run, hostedMcpTool } from '@openai/agents';

const main = async () => {
  const ydcKey = process.env.YDC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!ydcKey) {
    console.error('✗ YDC_API_KEY not found');
    process.exit(1);
  }

  if (!openaiKey) {
    console.error('✗ OPENAI_API_KEY not found');
    process.exit(1);
  }

  console.log('✓ Environment variables loaded');

  try {
    console.log('→ Testing OpenAI Agents SDK with Hosted MCP...');

    const agent = new Agent({
      name: 'Test Assistant',
      instructions: 'You are a helpful assistant.',
      tools: [
        hostedMcpTool({
          serverLabel: 'ydc',
          serverUrl: 'https://api.you.com/mcp',
          headers: {
            Authorization: `Bearer ${ydcKey}`,
          },
        }),
      ],
    });

    console.log('✓ Agent initialized with Hosted MCP');

    const result = await run(agent, 'What is 2+2? Reply with just the number.');

    console.log('✓ MCP connection successful');
    console.log(`✓ Query response: ${result.finalOutput.slice(0, 100)}...`);
    console.log('\n✅ All tests passed');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  }
};

main();
