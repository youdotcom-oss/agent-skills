import { describe, expect, test } from 'bun:test'

describe('LangChain agent with youSearch and youContents', () => {
  test(
    'searches and returns structured response',
    async () => {
      expect(process.env.YDC_API_KEY).toBeDefined()
      expect(process.env.ANTHROPIC_API_KEY).toBeDefined()
      const { result } = await import('./reference.ts')

      expect(result.structuredResponse).toBeDefined()
      expect(result.structuredResponse.summary.length).toBeGreaterThan(50)
      expect(result.structuredResponse.key_points.length).toBeGreaterThan(0)
      expect(result.structuredResponse.urls.length).toBeGreaterThan(0)

      const toolMessages = result.messages.filter((m: any) => m._getType() === 'tool')
      expect(toolMessages.length).toBeGreaterThan(0)
    },
    { timeout: 120_000 },
  )
})
