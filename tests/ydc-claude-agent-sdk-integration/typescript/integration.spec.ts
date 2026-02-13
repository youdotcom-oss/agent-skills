/**
 * Test Claude Agent SDK TypeScript v1 integration with You.com MCP
 * Bun automatically loads .env from parent directories
 */
import { describe, test, expect } from 'bun:test';
import { query } from '@anthropic-ai/claude-agent-sdk';

describe('Claude Agent SDK integration', () => {
  describe('happy path', () => {
    test('connects to MCP server and executes query', async () => {
      // Validate environment
      expect(process.env.YDC_API_KEY).toBeDefined();
      expect(process.env.ANTHROPIC_API_KEY).toBeDefined();

      const ydcKey = process.env.YDC_API_KEY!;

      // Test TypeScript v1 generator pattern
      const result = query({
        prompt: 'What is 2+2? Reply with just the number.',
        options: {
          mcpServers: {
            ydc: {
              type: 'http' as const,
              url: 'https://api.you.com/mcp',
              headers: {
                Authorization: `Bearer ${ydcKey}`,
              },
            },
          },
          allowedTools: ['mcp__ydc__you_search', 'mcp__ydc__you_contents'],
          model: 'claude-sonnet-4-5-20250929',
        },
      });

      let gotResult = false;
      for await (const msg of result) {
        if ('result' in msg) {
          expect(msg.result).toBeTruthy();
          gotResult = true;
          break;
        }
      }

      expect(gotResult).toBe(true);
    }, { timeout: 60_000 });
  });

  describe('edge cases', () => {
    test('validates environment variables', () => {
      expect(process.env.YDC_API_KEY).toBeDefined();
      expect(process.env.ANTHROPIC_API_KEY).toBeDefined();
    });
  });
});
