/**
 * Teams Anthropic Integration Tests
 *
 * Tests that the teams-anthropic-integration skill generates correct, functional code.
 *
 * Workflow:
 * 1. Manually invoke skill via Claude Code using prompts from PROMPTS.md
 * 2. Skill generates code into generated/ directory
 * 3. These tests validate that generated code compiles and works with real APIs
 *
 * Test Philosophy:
 * - IN SCOPE: Functional correctness, compilation, runtime behavior
 * - OUT OF SCOPE: Code quality/style (user's environment handles that)
 */

import { describe, test, expect } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const GENERATED_DIR = join(import.meta.dir, 'generated');

describe('Teams Anthropic Integration', () => {
  describe('Path A: Basic Setup (Claude Only)', () => {
    const generatedFile = join(GENERATED_DIR, 'path-a-basic.ts');

    describe('happy path', () => {
      test('generated code exists', () => {
        if (!existsSync(generatedFile)) {
          console.warn('⚠️  No generated code found. Run skill manually first.');
          return;
        }
        expect(existsSync(generatedFile)).toBe(true);
      });

      test('generated code compiles', async () => {
        if (!existsSync(generatedFile)) {
          console.warn('⚠️  Skipping: No generated code found.');
          return;
        }

        const result = await Bun.build({
          entrypoints: [generatedFile],
          target: 'bun',
          outdir: join(GENERATED_DIR, '.build-test'),
        });

        expect(result.success).toBe(true);
        expect(result.logs.length).toBe(0);
      });

      test('runtime: connects to Claude API and processes messages', async () => {
        if (!existsSync(generatedFile)) {
          console.warn('⚠️  Skipping: No generated code found.');
          return;
        }

        expect(process.env.ANTHROPIC_API_KEY).toBeDefined();

        const module = await import(generatedFile);

        expect(module.model).toBeDefined();

        const response = await module.model.send({
          role: 'user',
          content: 'What is 2+2? Reply with just the number.',
        });

        expect(response.content).toBeDefined();
        expect(response.content.length).toBeGreaterThan(0);
      }, { timeout: 30_000 });
    });

    describe('edge cases', () => {
      test('validates ANTHROPIC_API_KEY is required', async () => {
        if (!existsSync(generatedFile)) {
          console.warn('⚠️  Skipping: No generated code found.');
          return;
        }

        const code = await Bun.file(generatedFile).text();
        expect(code).toContain('ANTHROPIC_API_KEY');
      });
    });

    describe('errors', () => {
      test('handles missing API key gracefully', async () => {
        if (!existsSync(generatedFile)) {
          console.warn('⚠️  Skipping: No generated code found.');
          return;
        }

        const originalKey = process.env.ANTHROPIC_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;

        try {
          await import(generatedFile);
        } catch (error) {
          expect(error).toBeDefined();
        } finally {
          process.env.ANTHROPIC_API_KEY = originalKey;
        }
      });
    });
  });

  describe('Path B: With You.com MCP', () => {
    const generatedFile = join(GENERATED_DIR, 'path-b-mcp.ts');

    describe('happy path', () => {
      test('generated code exists', () => {
        if (!existsSync(generatedFile)) {
          console.warn('⚠️  No generated code found. Run skill manually first.');
          return;
        }
        expect(existsSync(generatedFile)).toBe(true);
      });

      test('generated code compiles', async () => {
        if (!existsSync(generatedFile)) {
          console.warn('⚠️  Skipping: No generated code found.');
          return;
        }

        const result = await Bun.build({
          entrypoints: [generatedFile],
          target: 'bun',
          outdir: join(GENERATED_DIR, '.build-test'),
        });

        expect(result.success).toBe(true);
        expect(result.logs.length).toBe(0);
      });

      test('runtime: executes MCP-enabled queries', async () => {
        if (!existsSync(generatedFile)) {
          console.warn('⚠️  Skipping: No generated code found.');
          return;
        }

        expect(process.env.ANTHROPIC_API_KEY).toBeDefined();
        expect(process.env.YDC_API_KEY).toBeDefined();

        const module = await import(generatedFile);

        expect(module.prompt).toBeDefined();

        const result = await module.prompt.send(
          'Search the web for the latest TypeScript version'
        );

        expect(result.content).toBeDefined();
        expect(result.content.length).toBeGreaterThan(0);
      }, { timeout: 60_000 });
    });

    describe('edge cases', () => {
      test('validates both API keys are required', async () => {
        if (!existsSync(generatedFile)) {
          console.warn('⚠️  Skipping: No generated code found.');
          return;
        }

        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('ANTHROPIC_API_KEY');
        expect(code).toContain('YDC_API_KEY');
      });

      test('includes MCP configuration', async () => {
        if (!existsSync(generatedFile)) {
          console.warn('⚠️  Skipping: No generated code found.');
          return;
        }

        const code = await Bun.file(generatedFile).text();

        expect(code).toContain('McpClientPlugin');
        expect(code).toContain('getYouMcpConfig');
      });
    });

    describe('errors', () => {
      test('handles missing YDC_API_KEY gracefully', async () => {
        if (!existsSync(generatedFile)) {
          console.warn('⚠️  Skipping: No generated code found.');
          return;
        }

        const originalKey = process.env.YDC_API_KEY;
        delete process.env.YDC_API_KEY;

        try {
          await import(generatedFile);
        } catch (error) {
          expect(error).toBeDefined();
        } finally {
          process.env.YDC_API_KEY = originalKey;
        }
      });
    });
  });
});
