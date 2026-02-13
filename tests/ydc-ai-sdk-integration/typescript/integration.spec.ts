/**
 * Test Vercel AI SDK integration with You.com tools
 * Bun automatically loads .env from parent directories
 */
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { youSearch } from '@youdotcom-oss/ai-sdk-plugin';

const main = async () => {
  const ydcKey = process.env.YDC_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!ydcKey) {
    console.error('✗ YDC_API_KEY not found');
    process.exit(1);
  }

  if (!anthropicKey) {
    console.error('✗ ANTHROPIC_API_KEY not found');
    process.exit(1);
  }

  console.log('✓ Environment variables loaded');

  try {
    console.log('→ Testing Vercel AI SDK with You.com tools...');

    const result = await generateText({
      model: anthropic('claude-sonnet-4-5-20250929'),
      tools: {
        search: youSearch(),
      },
      maxSteps: 3,
      prompt: 'What is 2+2? Reply with just the number.',
    });

    console.log('✓ AI SDK tools configured');
    console.log(`✓ Query response: ${result.text.slice(0, 100)}...`);
    console.log('\n✅ All tests passed');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  }
};

main();
