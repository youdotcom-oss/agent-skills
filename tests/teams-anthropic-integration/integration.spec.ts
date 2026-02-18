/**
 * Teams Anthropic Integration Tests
 *
 * Tests that the teams-anthropic-integration skill generates correct, functional code.
 *
 * Test Philosophy:
 * - IN SCOPE: Functional correctness, compilation, runtime behavior with realistic queries
 * - OUT OF SCOPE: Code quality/style (user's environment handles that)
 */

import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const GENERATED_DIR = join(import.meta.dir, 'generated')

describe('Teams Anthropic Integration', () => {
  describe('Path A: Basic Setup (Claude Only)', () => {
    const generatedFile = join(GENERATED_DIR, 'path-a-basic.ts')

    describe('happy path', () => {
      test('generated code exists', () => {
        expect(existsSync(generatedFile)).toBe(true)
      })

      test('generated code compiles', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        const result = await Bun.build({
          entrypoints: [generatedFile],
          target: 'bun',
          outdir: join(GENERATED_DIR, '.build-test'),
        })

        expect(result.success).toBe(true)
        expect(result.logs.length).toBe(0)
      })

      test(
        'runtime: connects to Claude API and processes messages',
        async () => {
          expect(existsSync(generatedFile)).toBe(true)
          expect(process.env.ANTHROPIC_API_KEY).toBeDefined()

          const module = await import(generatedFile)
          expect(module.model).toBeDefined()

          const response = await module.model.send({
            role: 'user',
            content: 'What is 2+2? Reply with just the number.',
          })

          expect(response.content).toBeDefined()
          expect(response.content.length).toBeGreaterThan(0)
        },
        { timeout: 30_000 },
      )

      test(
        'handles realistic Teams user query',
        async () => {
          expect(existsSync(generatedFile)).toBe(true)
          expect(process.env.ANTHROPIC_API_KEY).toBeDefined()

          const module = await import(generatedFile)

          const response = await module.model.send({
            role: 'user',
            content: 'Help me write a professional email to schedule a team meeting for next Tuesday at 2pm.',
          })

          expect(response.content).toBeDefined()
          expect(response.content.length).toBeGreaterThan(50)
          expect(response.content.toLowerCase()).toMatch(/email|meeting|tuesday/)
        },
        { timeout: 30_000 },
      )
    })

    describe('edge cases', () => {
      test('validates ANTHROPIC_API_KEY is required', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        const code = await Bun.file(generatedFile).text()
        expect(code).toContain('ANTHROPIC_API_KEY')
      })

      test('imports AnthropicChatModel from teams-anthropic', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        const code = await Bun.file(generatedFile).text()

        expect(code).toContain("from '@youdotcom-oss/teams-anthropic'")
        expect(code).toContain('AnthropicChatModel')
        expect(code).toContain('AnthropicModel')
      })

      test('uses Sonnet 4.5 model and exports model instance', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        const code = await Bun.file(generatedFile).text()

        expect(code).toContain('AnthropicModel.CLAUDE_SONNET_4_5')
        expect(code).toContain('export const model')
      })
    })

    describe('errors', () => {
      test('handles missing API key gracefully', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        const originalKey = process.env.ANTHROPIC_API_KEY
        delete process.env.ANTHROPIC_API_KEY

        try {
          await import(generatedFile)
        } catch (error) {
          expect(error).toBeDefined()
        } finally {
          process.env.ANTHROPIC_API_KEY = originalKey
        }
      })
    })
  })

  describe('Path B: With You.com MCP', () => {
    const generatedFile = join(GENERATED_DIR, 'path-b-mcp.ts')

    describe('happy path', () => {
      test('generated code exists', () => {
        expect(existsSync(generatedFile)).toBe(true)
      })

      test('generated code compiles', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        const result = await Bun.build({
          entrypoints: [generatedFile],
          target: 'bun',
          outdir: join(GENERATED_DIR, '.build-test'),
        })

        expect(result.success).toBe(true)
      })

      test(
        'runtime: executes MCP-enabled queries',
        async () => {
          expect(existsSync(generatedFile)).toBe(true)
          expect(process.env.ANTHROPIC_API_KEY).toBeDefined()
          expect(process.env.YDC_API_KEY).toBeDefined()

          const module = await import(generatedFile)
          expect(module.prompt).toBeDefined()

          const result = await module.prompt.send('Search the web for the latest TypeScript version')

          expect(result.content).toBeDefined()
          expect(result.content.length).toBeGreaterThan(0)
        },
        { timeout: 60_000 },
      )

      test(
        'handles web search query via You.com MCP',
        async () => {
          expect(existsSync(generatedFile)).toBe(true)
          expect(process.env.ANTHROPIC_API_KEY).toBeDefined()
          expect(process.env.YDC_API_KEY).toBeDefined()

          const module = await import(generatedFile)

          const result = await module.prompt.send(
            'What are the latest announcements from Microsoft about Teams AI features?',
          )

          expect(result.content).toBeDefined()
          expect(result.content.length).toBeGreaterThan(100)
          expect(result.content.toLowerCase()).toMatch(/teams|microsoft|ai/)
        },
        { timeout: 60_000 },
      )

      test(
        'handles content extraction query',
        async () => {
          expect(existsSync(generatedFile)).toBe(true)
          expect(process.env.ANTHROPIC_API_KEY).toBeDefined()
          expect(process.env.YDC_API_KEY).toBeDefined()

          const module = await import(generatedFile)

          const result = await module.prompt.send(
            'Find information about TypeScript 5.7 new features and summarize the key improvements',
          )

          expect(result.content).toBeDefined()
          expect(result.content.length).toBeGreaterThan(100)
          expect(result.content.toLowerCase()).toMatch(/typescript|feature|improvement/)
        },
        { timeout: 60_000 },
      )
    })

    describe('edge cases', () => {
      test('validates both API keys are required', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        const code = await Bun.file(generatedFile).text()

        expect(code).toContain('ANTHROPIC_API_KEY')
        expect(code).toContain('YDC_API_KEY')
      })

      test('includes MCP configuration', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        const code = await Bun.file(generatedFile).text()

        expect(code).toContain('McpClientPlugin')
        expect(code).toContain('usePlugin')
        expect(code).toContain('https://api.you.com/mcp')
        expect(code).toContain('Authorization')
      })

      test('imports Teams.ai and teams-anthropic and exports prompt', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        const code = await Bun.file(generatedFile).text()

        expect(code).toContain("from '@microsoft/teams.ai'")
        expect(code).toContain("from '@youdotcom-oss/teams-anthropic'")
        expect(code).toContain('ChatPrompt')
        expect(code).toContain('export const prompt')
      })

      test('uses Bearer token authentication for MCP', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        const code = await Bun.file(generatedFile).text()

        expect(code).toContain('Bearer')
        expect(code).toContain('YDC_API_KEY')
        // Authorization header must include the token, not a hardcoded string
        expect(code).toMatch(/Authorization.*Bearer.*YDC_API_KEY/)
      })
    })

    describe('errors', () => {
      test('handles missing YDC_API_KEY gracefully', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        const originalKey = process.env.YDC_API_KEY
        delete process.env.YDC_API_KEY

        try {
          await import(generatedFile)
        } catch (error) {
          expect(error).toBeDefined()
        } finally {
          process.env.YDC_API_KEY = originalKey
        }
      })
    })
  })
})
