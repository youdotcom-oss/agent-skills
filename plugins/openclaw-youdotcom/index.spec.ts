/**
 * Tests for You.com OpenClaw Plugin
 *
 * @public
 */

import { beforeEach, describe, expect, test } from 'bun:test'
import { formatToolError, resolveApiKey } from './index.ts'

describe('resolveApiKey', () => {
  const originalEnv = process.env.YDC_API_KEY

  beforeEach(() => {
    delete process.env.YDC_API_KEY
  })

  test('returns apiKey from webSearch.apiKey in plugin config', () => {
    const key = resolveApiKey({ webSearch: { apiKey: 'config-key-123' } })
    expect(key).toBe('config-key-123')
  })

  test('falls back to top-level apiKey when webSearch is absent', () => {
    const key = resolveApiKey({ apiKey: 'top-level-key' })
    expect(key).toBe('top-level-key')
  })

  test('falls back to YDC_API_KEY env var when config is empty', () => {
    process.env.YDC_API_KEY = 'env-key-456'
    const key = resolveApiKey({})
    expect(key).toBe('env-key-456')
    delete process.env.YDC_API_KEY
  })

  test('prefers webSearch.apiKey over env var', () => {
    process.env.YDC_API_KEY = 'env-key'
    const key = resolveApiKey({ webSearch: { apiKey: 'config-key' } })
    expect(key).toBe('config-key')
    delete process.env.YDC_API_KEY
  })

  test('returns empty string when no key is available', () => {
    const key = resolveApiKey({})
    expect(key).toBe('')
  })

  test('ignores non-string apiKey values', () => {
    const key = resolveApiKey({ webSearch: { apiKey: 123 } })
    expect(key).toBe('')
  })

  test('ignores empty string apiKey', () => {
    process.env.YDC_API_KEY = 'env-fallback'
    const key = resolveApiKey({ webSearch: { apiKey: '' } })
    expect(key).toBe('env-fallback')
    delete process.env.YDC_API_KEY
  })

  if (originalEnv) process.env.YDC_API_KEY = originalEnv
})

describe('formatToolError', () => {
  test('formats Error instances with message', () => {
    const result = formatToolError(new Error('rate limited'), 'Search')
    expect(result.content).toHaveLength(1)
    expect(result.content[0]?.type).toBe('text')
    expect(result.content[0]?.text).toBe('Search failed: rate limited')
  })

  test('formats non-Error values', () => {
    const result = formatToolError('string error', 'Research')
    expect(result.content[0]?.text).toBe('Research failed: Unknown error')
  })

  test('formats null/undefined errors', () => {
    const result = formatToolError(null, 'Contents')
    expect(result.content[0]?.text).toBe('Contents failed: Unknown error')
  })
})
