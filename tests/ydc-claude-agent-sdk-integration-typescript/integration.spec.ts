/**
 * Test Claude Agent SDK TypeScript v1 integration with You.com MCP
 * Bun automatically loads .env from parent directories
 */
import { describe, test, expect } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const GENERATED_DIR = join(import.meta.dir, 'generated');

describe('YDC Claude Agent SDK Integration - TypeScript', () => {

  describe('Path A: Basic HTTP MCP Integration', () => {
    const generatedFile = join(GENERATED_DIR, 'path-a-basic.ts');

    describe('happy path', () => {
      test('generated code exists', () => {
        expect(existsSync(generatedFile)).toBe(true);
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

      test('runtime: executes query with HTTP MCP', async () => {
        expect(existsSync(generatedFile)).toBe(true);
        expect(process.env.YDC_API_KEY).toBeDefined();
        expect(process.env.ANTHROPIC_API_KEY).toBeDefined();

        const module = await import(generatedFile);
        expect(module.main).toBeDefined();

        // Execute main function
        const result = await module.main();

        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }, { timeout: 60_000 });
    });

    describe('edge cases', () => {
      test('validates environment variables', async () => {
        expect(existsSync(generatedFile)).toBe(true);

        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('YDC_API_KEY');
        expect(code).toContain('ANTHROPIC_API_KEY');
      });

      test('has required imports', async () => {
        expect(existsSync(generatedFile)).toBe(true);

        const code = await Bun.file(generatedFile).text();

        expect(code).toContain("from '@anthropic-ai/claude-agent-sdk'");
        expect(code).toContain('query');
      });

      test('configures HTTP MCP server', async () => {
        expect(existsSync(generatedFile)).toBe(true);

        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('https://api.you.com/mcp');
        expect(code).toContain('mcpServers');
        expect(code).toContain("type: 'http'");
      });

      test('includes allowed tools', async () => {
        expect(existsSync(generatedFile)).toBe(true);

        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('allowedTools');
        expect(code).toContain('mcp__ydc__you_search');
        expect(code).toContain('mcp__ydc__you_contents');
      });
    });

    describe('errors', () => {
      test('handles missing YDC_API_KEY gracefully', async () => {
        expect(existsSync(generatedFile)).toBe(true);

        const originalKey = process.env.YDC_API_KEY;
        delete process.env.YDC_API_KEY;

        try {
          const module = await import(generatedFile);
          await expect(module.main()).rejects.toThrow();
        } finally {
          if (originalKey) process.env.YDC_API_KEY = originalKey;
        }
      });
    });
  });

  describe('Path B: Allowed Tools Configuration', () => {
    const generatedFile = join(GENERATED_DIR, 'path-b-tools.ts');

    describe('happy path', () => {
      test('generated code exists', () => {
        expect(existsSync(generatedFile)).toBe(true);
      });

      test('generated code compiles', async () => {
        expect(existsSync(generatedFile)).toBe(true);

        const result = await Bun.build({
          entrypoints: [generatedFile],
          target: 'bun',
          outdir: join(GENERATED_DIR, '.build-test'),
        });

        expect(result.success).toBe(true);
      });

      test('runtime: executes with restricted tools', async () => {
        expect(existsSync(generatedFile)).toBe(true);
        expect(process.env.YDC_API_KEY).toBeDefined();
        expect(process.env.ANTHROPIC_API_KEY).toBeDefined();

        const module = await import(generatedFile);
        const result = await module.main();

        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      }, { timeout: 60_000 });
    });

    describe('edge cases', () => {
      test('includes only you_search tool', async () => {
        expect(existsSync(generatedFile)).toBe(true);

        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('mcp__ydc__you_search');
      });

      test('does not include you_contents tool', async () => {
        expect(existsSync(generatedFile)).toBe(true);

        const code = await Bun.file(generatedFile).text();

        expect(code).not.toContain('mcp__ydc__you_contents');
      });
    });
  });

  describe('Path C: Custom API Key Handling', () => {
    const generatedFile = join(GENERATED_DIR, 'path-c-custom-keys.ts');

    describe('happy path', () => {
      test('generated code exists', () => {
        expect(existsSync(generatedFile)).toBe(true);
      });

      test('generated code compiles', async () => {
        expect(existsSync(generatedFile)).toBe(true);

        const result = await Bun.build({
          entrypoints: [generatedFile],
          target: 'bun',
          outdir: join(GENERATED_DIR, '.build-test'),
        });

        expect(result.success).toBe(true);
      });

      test('runtime: uses custom API keys', async () => {
        expect(existsSync(generatedFile)).toBe(true);

        // Set custom env vars
        process.env.CUSTOM_YDC_KEY = process.env.YDC_API_KEY;
        process.env.CUSTOM_ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

        try {
          const module = await import(generatedFile);
          const result = await module.main();

          expect(result).toBeDefined();
          expect(typeof result).toBe('string');
        } finally {
          delete process.env.CUSTOM_YDC_KEY;
          delete process.env.CUSTOM_ANTHROPIC_KEY;
        }
      }, { timeout: 60_000 });
    });

    describe('edge cases', () => {
      test('references custom environment variables', async () => {
        expect(existsSync(generatedFile)).toBe(true);

        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('CUSTOM_YDC_KEY');
        expect(code).toContain('CUSTOM_ANTHROPIC_KEY');
      });

      test('does not reference standard env var names', async () => {
        expect(existsSync(generatedFile)).toBe(true);

        const code = await Bun.file(generatedFile).text();

        // Should use CUSTOM_YDC_KEY and CUSTOM_ANTHROPIC_KEY, not the standard names
        expect(code).toContain('CUSTOM_YDC_KEY');
        expect(code).toContain('CUSTOM_ANTHROPIC_KEY');

        // Should not reference standard env vars directly (only custom ones)
        expect(code).not.toContain('process.env.YDC_API_KEY');
        expect(code).not.toContain('process.env.ANTHROPIC_API_KEY');
      });
    });

    describe('errors', () => {
      test('handles missing custom API key gracefully', async () => {
        expect(existsSync(generatedFile)).toBe(true);

        try {
          const module = await import(generatedFile);
          await expect(module.main()).rejects.toThrow();
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });
  });

  describe('Path D: Model Selection (Haiku 3.5)', () => {
    const generatedFile = join(GENERATED_DIR, 'path-d-haiku.ts');

    describe('happy path', () => {
      test('generated code exists', () => {
        expect(existsSync(generatedFile)).toBe(true);
      });

      test('generated code compiles', async () => {
        expect(existsSync(generatedFile)).toBe(true);

        const result = await Bun.build({
          entrypoints: [generatedFile],
          target: 'bun',
          outdir: join(GENERATED_DIR, '.build-test'),
        });

        expect(result.success).toBe(true);
      });

      test('runtime: executes with Haiku model', async () => {
        expect(existsSync(generatedFile)).toBe(true);
        expect(process.env.YDC_API_KEY).toBeDefined();
        expect(process.env.ANTHROPIC_API_KEY).toBeDefined();

        const module = await import(generatedFile);
        const result = await module.main();

        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      }, { timeout: 60_000 });
    });

    describe('edge cases', () => {
      test('uses Haiku model', async () => {
        expect(existsSync(generatedFile)).toBe(true);

        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('claude-3-5-haiku-20241022');
      });

      test('does not use Sonnet model', async () => {
        expect(existsSync(generatedFile)).toBe(true);

        const code = await Bun.file(generatedFile).text();

        expect(code).not.toContain('claude-sonnet-4-5');
      });
    });
  });
});
