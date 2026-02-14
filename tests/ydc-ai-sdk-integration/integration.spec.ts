import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const GENERATED_DIR = join(import.meta.dir, 'generated')

describe('YDC AI SDK Integration', () => {
  describe('Path A: generateText() with youSearch', () => {
    const generatedFile = join(GENERATED_DIR, 'path-a-generate.ts')

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
        'runtime: executes query with youSearch tool',
        async () => {
          expect(existsSync(generatedFile)).toBe(true)
          expect(process.env.YDC_API_KEY).toBeDefined()
          expect(process.env.ANTHROPIC_API_KEY).toBeDefined()

          const module = await import(generatedFile)
          expect(module.main).toBeDefined()

          // Execute main function (should return result)
          const result = await module.main()

          expect(result.text).toBeDefined()
          expect(result.text.length).toBeGreaterThan(0)
        },
        { timeout: 30_000 },
      )

      test(
        'handles realistic web search query',
        async () => {
          expect(existsSync(generatedFile)).toBe(true)
          expect(process.env.YDC_API_KEY).toBeDefined()
          expect(process.env.ANTHROPIC_API_KEY).toBeDefined()

          const module = await import(generatedFile)

          // Test with factual query requiring web search
          const result = await module.main('Search for the latest quantum computing news and summarize the findings')

          expect(result.text).toBeDefined()
          expect(result.text.length).toBeGreaterThan(50)
          expect(result.text.toLowerCase()).toMatch(/quantum|computing|qubit|research/)
        },
        { timeout: 30_000 },
      )
    })

    describe('edge cases', () => {
      test('validates required environment variables', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        const code = await Bun.file(generatedFile).text()

        expect(code).toContain('YDC_API_KEY')
        expect(code).toContain('ANTHROPIC_API_KEY')
      })

      test('includes youSearch tool', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        const code = await Bun.file(generatedFile).text()

        expect(code).toContain('youSearch')
        expect(code).toContain('generateText')
      })
    })

    describe('errors', () => {
      test('handles missing YDC_API_KEY gracefully', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        const originalKey = process.env.YDC_API_KEY
        delete process.env.YDC_API_KEY

        try {
          const module = await import(generatedFile)
          await module.main()
        } catch (error) {
          expect(error).toBeDefined()
        } finally {
          process.env.YDC_API_KEY = originalKey
        }
      })
    })
  })

  describe('Path B: streamText() with youSearch and stopWhen', () => {
    const generatedFile = join(GENERATED_DIR, 'path-b-stream.ts')

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
        'runtime: streams text with tool calling',
        async () => {
          expect(existsSync(generatedFile)).toBe(true)
          expect(process.env.YDC_API_KEY).toBeDefined()
          expect(process.env.ANTHROPIC_API_KEY).toBeDefined()

          const module = await import(generatedFile)
          expect(module.main).toBeDefined()

          // Capture streamed text - pass undefined for prompt to use default
          let streamedText = ''
          await module.main(undefined, (chunk: string) => {
            streamedText += chunk
          })

          expect(streamedText.length).toBeGreaterThan(0)
        },
        { timeout: 60_000 },
      )

      test(
        'handles realistic streaming query',
        async () => {
          expect(existsSync(generatedFile)).toBe(true)
          expect(process.env.YDC_API_KEY).toBeDefined()
          expect(process.env.ANTHROPIC_API_KEY).toBeDefined()

          const module = await import(generatedFile)

          let streamedText = ''
          await module.main('Search for the latest AI developments', (chunk: string) => {
            streamedText += chunk
          })

          expect(streamedText.length).toBeGreaterThan(100)
          expect(streamedText.toLowerCase()).toMatch(/ai|artificial intelligence|development/)
        },
        { timeout: 60_000 },
      )
    })

    describe('edge cases', () => {
      test('includes stopWhen pattern', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        const code = await Bun.file(generatedFile).text()

        expect(code).toContain('stopWhen')
        expect(code).toContain('stepCountIs')
        expect(code).toContain('StepResult')
      })

      test('destructures textStream', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        const code = await Bun.file(generatedFile).text()

        expect(code).toContain('textStream')
        expect(code).toContain('streamText')
      })
    })

    describe('errors', () => {
      test('handles missing ANTHROPIC_API_KEY gracefully', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        const originalKey = process.env.ANTHROPIC_API_KEY
        delete process.env.ANTHROPIC_API_KEY

        try {
          const module = await import(generatedFile)
          await module.main()
        } catch (error) {
          expect(error).toBeDefined()
        } finally {
          process.env.ANTHROPIC_API_KEY = originalKey
        }
      })
    })
  })

  describe('Path C: generateText() with Multiple Tools', () => {
    const generatedFile = join(GENERATED_DIR, 'path-c-multi-tool.ts')

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
        'runtime: executes with multiple tools',
        async () => {
          expect(existsSync(generatedFile)).toBe(true)
          expect(process.env.YDC_API_KEY).toBeDefined()
          expect(process.env.ANTHROPIC_API_KEY).toBeDefined()

          const module = await import(generatedFile)
          const result = await module.main()

          expect(result.text).toBeDefined()
          expect(result.text.length).toBeGreaterThan(0)
        },
        { timeout: 60_000 },
      )
    })

    describe('edge cases', () => {
      test('includes both youSearch and youContents', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        const code = await Bun.file(generatedFile).text()

        expect(code).toContain('youSearch')
        expect(code).toContain('youContents')
      })
    })
  })

  describe('Path D: Custom API Key', () => {
    const generatedFile = join(GENERATED_DIR, 'path-d-custom-key.ts')

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
        'runtime: uses custom API key',
        async () => {
          expect(existsSync(generatedFile)).toBe(true)

          // Set custom env var
          process.env.CUSTOM_YDC_KEY = process.env.YDC_API_KEY
          expect(process.env.ANTHROPIC_API_KEY).toBeDefined()

          try {
            const module = await import(generatedFile)
            const result = await module.main()

            expect(result.text).toBeDefined()
            expect(result.text.length).toBeGreaterThan(0)
          } finally {
            delete process.env.CUSTOM_YDC_KEY
          }
        },
        { timeout: 30_000 },
      )
    })

    describe('edge cases', () => {
      test('references custom environment variable', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        const code = await Bun.file(generatedFile).text()

        expect(code).toContain('CUSTOM_YDC_KEY')
        expect(code).toContain('apiKey')
      })

      test('passes apiKey to tool', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        const code = await Bun.file(generatedFile).text()

        expect(code).toMatch(/youSearch\(\s*{\s*apiKey/)
      })
    })

    describe('errors', () => {
      test('handles missing custom API key gracefully', async () => {
        expect(existsSync(generatedFile)).toBe(true)

        try {
          const module = await import(generatedFile)
          await module.main()
        } catch (error) {
          expect(error).toBeDefined()
        }
      })
    })
  })
})
