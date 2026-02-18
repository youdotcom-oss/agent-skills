/**
 * Test OpenAI Agents SDK integration with You.com MCP
 * Validates Hosted MCP and Streamable HTTP integration patterns for TypeScript
 */

import { describe, test, expect } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const GENERATED_DIR = join(import.meta.dir, 'generated');

describe('YDC OpenAI Agents SDK Integration (TypeScript)', () => {
  describe('Path A: Hosted MCP', () => {
    const generatedFile = join(GENERATED_DIR, 'path-a-hosted.ts');

    describe('happy path', () => {
      test('generated code exists', () => {
        expect(existsSync(generatedFile)).toBe(true);
      });

      test('has required imports', async () => {
        expect(existsSync(generatedFile)).toBe(true);
        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('from \'@openai/agents\'');
        expect(code).toContain('Agent');
        expect(code).toContain('run');
        expect(code).toContain('hostedMcpTool');
      });

      test('validates environment variables', async () => {
        expect(existsSync(generatedFile)).toBe(true);
        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('YDC_API_KEY');
        expect(code).toContain('OPENAI_API_KEY');
        expect(code).toContain('process.env');
      });

      test('configures hosted MCP', async () => {
        expect(existsSync(generatedFile)).toBe(true);
        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('https://api.you.com/mcp');
        expect(code).toContain('hostedMcpTool');
        expect(code).toContain('Authorization');
        expect(code).toContain('Bearer');
        expect(code).toContain('serverLabel');
        expect(code).toContain('serverUrl');
      });

      test('uses tools parameter', async () => {
        expect(existsSync(generatedFile)).toBe(true);
        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('tools:');
        expect(code).toContain('new Agent');
      });

      test('generated code compiles', async () => {
        expect(existsSync(generatedFile)).toBe(true);

        const result = await Bun.build({
          entrypoints: [generatedFile],
          target: 'bun',
          outdir: join(GENERATED_DIR, '.build-test'),
        });

        expect(result.success).toBe(true);
        expect(result.logs.length).toBe(0);
      });
    });

    describe('runtime', () => {
      test('executes end-to-end search', async () => {
        expect(process.env.YDC_API_KEY).toBeDefined();
        expect(process.env.OPENAI_API_KEY).toBeDefined();

        expect(existsSync(generatedFile)).toBe(true);
        const module = await import(generatedFile);
        expect(module.main).toBeDefined();

        const result = await module.main('What are the latest developments in artificial intelligence?');

        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        expect(result.toLowerCase()).toMatch(/ai|artificial|intelligence|model|development|research/);
      }, { timeout: 60_000 });
    });
  });

  describe('Path B: Streamable HTTP', () => {
    const generatedFile = join(GENERATED_DIR, 'path-b-streamable.ts');

    describe('happy path', () => {
      test('generated code exists', () => {
        expect(existsSync(generatedFile)).toBe(true);
      });

      test('imports MCPServerStreamableHttp', async () => {
        expect(existsSync(generatedFile)).toBe(true);
        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('MCPServerStreamableHttp');
        expect(code).toContain('from \'@openai/agents\'');
      });

      test('configures streamable HTTP server', async () => {
        expect(existsSync(generatedFile)).toBe(true);
        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('new MCPServerStreamableHttp');
        expect(code).toContain('https://api.you.com/mcp');
        expect(code).toContain('url:');
        expect(code).toContain('Authorization');
      });

      test('includes connection management', async () => {
        expect(existsSync(generatedFile)).toBe(true);
        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('mcpServer.connect()');
        expect(code).toContain('mcpServer.close()');
        expect(code).toContain('try');
        expect(code).toContain('finally');
      });

      test('uses mcpServers parameter', async () => {
        expect(existsSync(generatedFile)).toBe(true);
        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('mcpServers:');
        expect(code).toContain('new Agent');
      });

      test('generated code compiles', async () => {
        expect(existsSync(generatedFile)).toBe(true);

        const result = await Bun.build({
          entrypoints: [generatedFile],
          target: 'bun',
          outdir: join(GENERATED_DIR, '.build-test'),
        });

        expect(result.success).toBe(true);
        expect(result.logs.length).toBe(0);
      });
    });

    describe('runtime', () => {
      test('executes end-to-end search', async () => {
        expect(process.env.YDC_API_KEY).toBeDefined();
        expect(process.env.OPENAI_API_KEY).toBeDefined();

        expect(existsSync(generatedFile)).toBe(true);
        const module = await import(generatedFile);
        expect(module.main).toBeDefined();

        const result = await module.main('What are the latest developments in artificial intelligence?');

        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        expect(result.toLowerCase()).toMatch(/ai|artificial|intelligence|model|development|research/);
      }, { timeout: 60_000 });
    });
  });

  describe('Path C: Custom Environment Variables', () => {
    const generatedFile = join(GENERATED_DIR, 'path-c-custom-keys.ts');

    describe('happy path', () => {
      test('generated code exists', () => {
        expect(existsSync(generatedFile)).toBe(true);
      });

      test('uses custom environment variables', async () => {
        expect(existsSync(generatedFile)).toBe(true);
        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('CUSTOM_YDC_KEY');
        expect(code).toContain('CUSTOM_OPENAI_KEY');
        expect(code).toContain('process.env');
      });

      test('does not use standard env var names in getenv', async () => {
        expect(existsSync(generatedFile)).toBe(true);
        const code = await Bun.file(generatedFile).text();

        // Should use custom keys
        expect(code).toContain('CUSTOM_YDC_KEY');
        expect(code).toContain('CUSTOM_OPENAI_KEY');

        // Check that standard names aren't used in process.env calls
        const lines = code.split('\n').filter(
          (line) =>
            line.includes('process.env') &&
            !line.trim().startsWith('//') &&
            !line.trim().startsWith('*')
        );

        for (const line of lines) {
          if (line.includes('process.env')) {
            if (line.includes('YDC_API_KEY')) {
              expect(line).toContain('CUSTOM');
            }
            if (line.includes('OPENAI_API_KEY')) {
              expect(line).toContain('CUSTOM');
            }
          }
        }
      });

      test('validates custom environment variables', async () => {
        expect(existsSync(generatedFile)).toBe(true);
        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('CUSTOM_YDC_KEY');
        expect(code).toContain('CUSTOM_OPENAI_KEY');
        // Should have validation logic
        expect(
          code.includes('throw new Error') ||
            code.includes('if (!') ||
            code.includes('!ydcApiKey') ||
            code.includes('!openaiApiKey')
        ).toBe(true);
      });

      test('generated code compiles', async () => {
        expect(existsSync(generatedFile)).toBe(true);

        const result = await Bun.build({
          entrypoints: [generatedFile],
          target: 'bun',
          outdir: join(GENERATED_DIR, '.build-test'),
        });

        expect(result.success).toBe(true);
        expect(result.logs.length).toBe(0);
      });
    });

    describe('runtime', () => {
      test('executes end-to-end search with custom keys', async () => {
        expect(process.env.YDC_API_KEY).toBeDefined();
        expect(process.env.OPENAI_API_KEY).toBeDefined();

        expect(existsSync(generatedFile)).toBe(true);

        // Set custom env vars
        const originalCustomYdc = process.env.CUSTOM_YDC_KEY;
        const originalCustomOpenai = process.env.CUSTOM_OPENAI_KEY;

        process.env.CUSTOM_YDC_KEY = process.env.YDC_API_KEY;
        process.env.CUSTOM_OPENAI_KEY = process.env.OPENAI_API_KEY;

        try {
          const module = await import(generatedFile);
          expect(module.main).toBeDefined();

          const result = await module.main('What are the latest developments in artificial intelligence?');

          expect(result).toBeDefined();
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
          expect(result.toLowerCase()).toMatch(/ai|artificial|intelligence|model|development|research/);
        } finally {
          // Cleanup
          if (originalCustomYdc !== undefined) {
            process.env.CUSTOM_YDC_KEY = originalCustomYdc;
          } else {
            delete process.env.CUSTOM_YDC_KEY;
          }
          if (originalCustomOpenai !== undefined) {
            process.env.CUSTOM_OPENAI_KEY = originalCustomOpenai;
          } else {
            delete process.env.CUSTOM_OPENAI_KEY;
          }
        }
      }, { timeout: 60_000 });
    });
  });

  describe('Path D: Streamable HTTP with Advanced Configuration', () => {
    const generatedFile = join(GENERATED_DIR, 'path-d-streamable-config.ts');

    describe('happy path', () => {
      test('generated code exists', () => {
        expect(existsSync(generatedFile)).toBe(true);
      });

      test('includes timeout configuration', async () => {
        expect(existsSync(generatedFile)).toBe(true);
        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('timeout');
        expect(code).toContain('AbortSignal');
      });

      test('uses MCPServerStreamableHttp', async () => {
        expect(existsSync(generatedFile)).toBe(true);
        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('new MCPServerStreamableHttp');
        expect(code).toContain('requestInit');
      });

      test('includes connection management', async () => {
        expect(existsSync(generatedFile)).toBe(true);
        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('mcpServer.connect()');
        expect(code).toContain('mcpServer.close()');
        expect(code).toContain('try');
        expect(code).toContain('finally');
      });

      test('generated code compiles', async () => {
        expect(existsSync(generatedFile)).toBe(true);

        const result = await Bun.build({
          entrypoints: [generatedFile],
          target: 'bun',
          outdir: join(GENERATED_DIR, '.build-test'),
        });

        expect(result.success).toBe(true);
        expect(result.logs.length).toBe(0);
      });
    });

    describe('runtime', () => {
      test('executes end-to-end search', async () => {
        expect(process.env.YDC_API_KEY).toBeDefined();
        expect(process.env.OPENAI_API_KEY).toBeDefined();

        expect(existsSync(generatedFile)).toBe(true);
        const module = await import(generatedFile);
        expect(module.main).toBeDefined();

        const result = await module.main('What are the latest developments in artificial intelligence?');

        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        expect(result.toLowerCase()).toMatch(/ai|artificial|intelligence|model|development|research/);
      }, { timeout: 60_000 });
    });
  });
});
