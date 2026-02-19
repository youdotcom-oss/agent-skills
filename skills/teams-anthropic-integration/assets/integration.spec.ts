import { describe, expect, test } from 'bun:test'

describe('Path A: Basic Setup', () => {
  test(
    'calls Claude API and returns a response with expected content',
    async () => {
      expect(process.env.ANTHROPIC_API_KEY).toBeDefined()
      const { model } = await import('./integration-a.ts')
      const response = await model.send({
        role: 'user',
        content: 'What are the three branches of the US government?',
      })
      const text = response.content.toLowerCase()
      expect(text).toContain('legislative')
      expect(text).toContain('executive')
      expect(text).toContain('judicial')
    },
    { timeout: 30_000 },
  )
})

describe('Path B: With You.com MCP', () => {
  test(
    'MCP makes a live web search and returns expected content',
    async () => {
      expect(process.env.ANTHROPIC_API_KEY).toBeDefined()
      expect(process.env.YDC_API_KEY).toBeDefined()
      const { prompt } = await import('./integration-b.ts')
      const result = await prompt.send(
        'Search the web for the three branches of the US government',
      )
      const text = result.content.toLowerCase()
      expect(text).toContain('legislative')
      expect(text).toContain('executive')
      expect(text).toContain('judicial')
    },
    { timeout: 60_000 },
  )
})
