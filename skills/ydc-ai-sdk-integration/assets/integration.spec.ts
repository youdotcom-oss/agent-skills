import { describe, expect, test } from 'bun:test'

describe('Path A: generateText with youSearch', () => {
  test(
    'generates text using You.com web search',
    async () => {
      expect(process.env.YDC_API_KEY).toBeDefined()
      expect(process.env.ANTHROPIC_API_KEY).toBeDefined()
      const { result } = await import('./path-a-generate.ts')
      const text = result.text.toLowerCase()
      expect(text).toContain('legislative')
      expect(text).toContain('executive')
      expect(text).toContain('judicial')
      expect(result.steps.some((s: { toolCalls: unknown[] }) => s.toolCalls.length > 0)).toBe(true)
    },
    { timeout: 60_000 },
  )
})

describe('Path B: streamText with youSearch', () => {
  test(
    'streams text using You.com web search',
    async () => {
      expect(process.env.YDC_API_KEY).toBeDefined()
      expect(process.env.ANTHROPIC_API_KEY).toBeDefined()
      const { stream } = await import('./path-b-stream.ts')
      const text = (await stream.text).toLowerCase()
      expect(text).toContain('legislative')
      expect(text).toContain('executive')
      expect(text).toContain('judicial')
    },
    { timeout: 60_000 },
  )
})
