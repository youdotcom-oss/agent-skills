import { describe, expect, test } from 'bun:test'
import {
  describeYouSettings,
  hasUsableCredential,
  resolveYouSettings,
  YOU_API_KEY_ENV_VAR,
  YOU_SETTINGS_DEFAULTS,
} from '../settings.ts'

const emptyEnv: NodeJS.ProcessEnv = {}

describe('resolveYouSettings', () => {
  test('falls back to defaults for missing config', () => {
    expect(resolveYouSettings(undefined, emptyEnv)).toEqual({
      ...YOU_SETTINGS_DEFAULTS,
      credentialSource: 'none',
    })
  })

  test('passes through search knobs', () => {
    expect(
      resolveYouSettings(
        {
          timeoutMs: 5_000,
          crawlTimeoutSeconds: 30,
          count: 25,
          safesearch: 'strict',
          country: 'DE',
          freshness: '2026-01-01to2026-06-30',
          extractionMode: 'full_page',
        },
        emptyEnv,
      ),
    ).toMatchObject({
      timeoutMs: 5_000,
      crawlTimeoutSeconds: 30,
      count: 25,
      safesearch: 'strict',
      country: 'DE',
      freshness: '2026-01-01to2026-06-30',
      extractionMode: 'full_page',
    })
  })

  test('ignores out-of-range and unknown values instead of forwarding them upstream', () => {
    expect(
      resolveYouSettings({ timeoutMs: 5, count: 500, safesearch: 'aggressive', extractionMode: 'pdf' }, emptyEnv),
    ).toMatchObject({
      timeoutMs: YOU_SETTINGS_DEFAULTS.timeoutMs,
      count: YOU_SETTINGS_DEFAULTS.count,
      safesearch: YOU_SETTINGS_DEFAULTS.safesearch,
      extractionMode: YOU_SETTINGS_DEFAULTS.extractionMode,
    })
  })

  test('trims a trailing slash from the base URL', () => {
    expect(resolveYouSettings({ baseUrl: 'https://gateway.example.com/' }, emptyEnv).baseUrl).toBe(
      'https://gateway.example.com',
    )
  })

  test('rejects a base URL that is not http(s)', () => {
    expect(() => resolveYouSettings({ baseUrl: 'ftp://example.com' }, emptyEnv)).toThrow(/http or https/)
    expect(() => resolveYouSettings({ baseUrl: 'api.you.com' }, emptyEnv)).toThrow(/absolute http\(s\) URL/)
  })

  test('prefers a configured key over the environment', () => {
    const settings = resolveYouSettings({ apiKey: 'from-config' }, { [YOU_API_KEY_ENV_VAR]: 'from-env' })
    expect(settings).toMatchObject({ apiKey: 'from-config', credentialSource: 'config' })
    expect(hasUsableCredential(settings)).toBe(true)
  })

  test('falls back to the environment key', () => {
    const settings = resolveYouSettings({}, { [YOU_API_KEY_ENV_VAR]: 'from-env' })
    expect(settings).toMatchObject({ apiKey: 'from-env', credentialSource: 'env' })
  })

  test('keeps an unresolved SecretRef without treating it as usable auth', () => {
    const settings = resolveYouSettings(
      { apiKey: { source: 'env', provider: 'default', id: YOU_API_KEY_ENV_VAR } },
      emptyEnv,
    )
    expect(settings.apiKey).toBeUndefined()
    expect(settings.apiKeyRef).toEqual({ source: 'env', provider: 'default', id: YOU_API_KEY_ENV_VAR })
    expect(settings.credentialSource).toBe('secret-ref')
    expect(hasUsableCredential(settings)).toBe(false)
  })
})

describe('describeYouSettings', () => {
  test('never includes the credential', () => {
    const summary = describeYouSettings(resolveYouSettings({ apiKey: 'ydc-secret-value' }, emptyEnv))
    expect(summary).not.toContain('ydc-secret-value')
    expect(summary).toContain('credential=config')
  })
})
