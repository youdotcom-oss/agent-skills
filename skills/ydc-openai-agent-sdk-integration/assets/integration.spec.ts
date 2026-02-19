import { describe, expect, test } from 'bun:test'

describe('Path A: OpenAI Agent SDK with Hosted MCP', () => {
  test(
    'runs agent and returns a response via You.com hosted MCP',
    async () => {
      expect(process.env.YDC_API_KEY).toBeDefined()
      expect(process.env.OPENAI_API_KEY).toBeDefined()
      const { runAgent } = await import('./path-a-hosted.ts')
      const result = await runAgent('Search the web for the three branches of the US government')
      const text = result.toLowerCase()
      expect(text).toContain('legislative')
      expect(text).toContain('executive')
      expect(text).toContain('judicial')
    },
    { timeout: 60_000 },
  )
})
