import { resolveSecretInputString, type SecretInput } from 'openclaw/plugin-sdk/secret-input'

/** Structured half of the host's secret-bearing config input (`string | SecretRef`). */
type SecretRef = Exclude<SecretInput, string>

/** Config path used in host-facing secret diagnostics. */
const API_KEY_CONFIG_PATH = 'plugins.entries.you.config.apiKey'

/** Env var OpenClaw already advertises for You.com through `setup.providers[].envVars`. */
export const YOU_API_KEY_ENV_VAR = 'YDC_API_KEY'

/**
 * Runtime fallbacks for every optional config key.
 *
 * These mirror the `default` values in `openclaw.plugin.json#configSchema`;
 * `tests/plugin.spec.ts` fails if the two drift.
 */
export const YOU_SETTINGS_DEFAULTS = {
  baseUrl: 'https://api.you.com',
  timeoutMs: 30_000,
  crawlTimeoutSeconds: 10,
  count: 10,
  safesearch: 'moderate',
  extractionMode: 'none',
} as const

export const YOU_SAFESEARCH_MODES = ['off', 'moderate', 'strict'] as const
export const YOU_EXTRACTION_MODES = ['none', 'highlights', 'full_page'] as const

export type YouSafesearchMode = (typeof YOU_SAFESEARCH_MODES)[number]
export type YouExtractionMode = (typeof YOU_EXTRACTION_MODES)[number]

/** How the You.com credential was supplied, without exposing the credential itself. */
export type YouCredentialSource = 'config' | 'secret-ref' | 'env' | 'none'

export type YouSettings = {
  baseUrl: string
  timeoutMs: number
  crawlTimeoutSeconds: number
  count: number
  safesearch: YouSafesearchMode
  country?: string
  freshness?: string
  extractionMode: YouExtractionMode
  /** Resolved literal credential. Absent when config still points at an unresolved SecretRef. */
  apiKey?: string
  /** Configured-but-unresolved SecretRef, kept so callers can report why auth is unavailable. */
  apiKeyRef?: SecretRef
  credentialSource: YouCredentialSource
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readString = (value: unknown) => {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

const readInteger = ({ value, min, max }: { value: unknown; min: number; max: number }) => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    return undefined
  }
  return value
}

const readEnum = <T extends string>(value: unknown, allowed: readonly T[]) =>
  allowed.find((candidate) => candidate === value)

/**
 * Reject non-HTTP(S) base URLs instead of falling back silently.
 *
 * Every other key degrades to its default, but the base URL is where the You.com
 * credential is sent, so a bad value fails plugin load and shows up in
 * `openclaw plugins doctor` rather than redirecting the key somewhere else.
 */
const readBaseUrl = (value: unknown) => {
  const raw = readString(value)
  if (raw === undefined) {
    return YOU_SETTINGS_DEFAULTS.baseUrl
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error(`You.com plugin config: baseUrl must be an absolute http(s) URL, received "${raw}"`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`You.com plugin config: baseUrl must use http or https, received "${raw}"`)
  }

  return raw.replace(/\/+$/, '')
}

const readCredential = (value: unknown, env: NodeJS.ProcessEnv) => {
  // `inspect` reports a configured-but-unresolved SecretRef instead of throwing,
  // so a plugin load never fails just because the secret provider is not ready.
  const resolution = resolveSecretInputString({ value, path: API_KEY_CONFIG_PATH, mode: 'inspect' })

  if (resolution.status === 'available') {
    return { apiKey: resolution.value, credentialSource: 'config' as const }
  }

  if (resolution.status === 'configured_unavailable') {
    return { apiKeyRef: resolution.ref, credentialSource: 'secret-ref' as const }
  }

  const fromEnv = readString(env[YOU_API_KEY_ENV_VAR])
  if (fromEnv !== undefined) {
    return { apiKey: fromEnv, credentialSource: 'env' as const }
  }

  return { credentialSource: 'none' as const }
}

/**
 * Normalize `plugins.entries.you.config` into the settings the You.com capability
 * surfaces consume.
 *
 * The manifest JSON Schema is the validator; this reader treats any unusable value
 * as absent and applies {@link YOU_SETTINGS_DEFAULTS}, so it stays safe when called
 * with config that never went through the host.
 */
export const resolveYouSettings = (pluginConfig: unknown, env: NodeJS.ProcessEnv = process.env): YouSettings => {
  const config = isRecord(pluginConfig) ? pluginConfig : {}

  return {
    baseUrl: readBaseUrl(config.baseUrl),
    timeoutMs: readInteger({ value: config.timeoutMs, min: 1_000, max: 300_000 }) ?? YOU_SETTINGS_DEFAULTS.timeoutMs,
    crawlTimeoutSeconds:
      readInteger({ value: config.crawlTimeoutSeconds, min: 1, max: 60 }) ?? YOU_SETTINGS_DEFAULTS.crawlTimeoutSeconds,
    count: readInteger({ value: config.count, min: 1, max: 100 }) ?? YOU_SETTINGS_DEFAULTS.count,
    safesearch: readEnum(config.safesearch, YOU_SAFESEARCH_MODES) ?? YOU_SETTINGS_DEFAULTS.safesearch,
    ...(readString(config.country) ? { country: readString(config.country) } : {}),
    ...(readString(config.freshness) ? { freshness: readString(config.freshness) } : {}),
    extractionMode: readEnum(config.extractionMode, YOU_EXTRACTION_MODES) ?? YOU_SETTINGS_DEFAULTS.extractionMode,
    ...readCredential(config.apiKey, env),
  }
}

/** True when a request can be authenticated now; a configured-but-unresolved ref is not usable. */
export const hasUsableCredential = (settings: YouSettings) => settings.apiKey !== undefined

/** Redacted one-line summary safe to log. Never includes the credential. */
export const describeYouSettings = (settings: YouSettings) =>
  [
    `baseUrl=${settings.baseUrl}`,
    `timeoutMs=${settings.timeoutMs}`,
    `crawlTimeoutSeconds=${settings.crawlTimeoutSeconds}`,
    `count=${settings.count}`,
    `safesearch=${settings.safesearch}`,
    `extractionMode=${settings.extractionMode}`,
    `country=${settings.country ?? '-'}`,
    `freshness=${settings.freshness ?? '-'}`,
    `credential=${settings.credentialSource}`,
  ].join(' ')
