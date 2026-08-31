import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import pluginEntry from '../plugin.ts'
import { YOU_API_KEY_ENV_VAR, YOU_SETTINGS_DEFAULTS } from '../settings.ts'

const manifestPath = new URL('../openclaw.plugin.json', import.meta.url)
const readManifest = async () => JSON.parse(await Bun.file(manifestPath).text())

type LoggedApi = {
  api: Parameters<typeof pluginEntry.register>[0]
  warnings: string[]
  debugs: string[]
}

const createApi = (pluginConfig: unknown): LoggedApi => {
  const warnings: string[] = []
  const debugs: string[] = []
  const api = {
    id: 'you',
    name: 'You.com',
    pluginConfig,
    logger: {
      debug: (message: string) => debugs.push(message),
      info: () => {},
      warn: (message: string) => warnings.push(message),
      error: () => {},
    },
  } as unknown as Parameters<typeof pluginEntry.register>[0]

  return { api, warnings, debugs }
}

describe('plugin entry', () => {
  // register() reads the ambient credential, so pin the env instead of inheriting the shell's.
  const originalApiKey = process.env[YOU_API_KEY_ENV_VAR]

  beforeEach(() => {
    delete process.env[YOU_API_KEY_ENV_VAR]
  })

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env[YOU_API_KEY_ENV_VAR]
      return
    }
    process.env[YOU_API_KEY_ENV_VAR] = originalApiKey
  })

  test('takes identity from the manifest', async () => {
    const manifest = await readManifest()
    expect(pluginEntry.id).toBe(manifest.id)
    expect(pluginEntry.name).toBe(manifest.name)
    expect(pluginEntry.description).toBe(manifest.description)
  })

  test('exposes the manifest config schema to the runtime', async () => {
    const manifest = await readManifest()
    expect(pluginEntry.configSchema.jsonSchema).toEqual(manifest.configSchema)
    expect(pluginEntry.configSchema.safeParse?.({ count: 5 })).toMatchObject({ success: true })
    expect(pluginEntry.configSchema.safeParse?.({ count: 0 })).toMatchObject({ success: false })
    expect(pluginEntry.configSchema.safeParse?.({ unknownKey: true })).toMatchObject({ success: false })
  })

  test('warns when no You.com credential is reachable', () => {
    const { api, warnings } = createApi({})
    pluginEntry.register(api)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('YDC_API_KEY')
  })

  test('logs redacted settings and stays quiet when a credential is configured', () => {
    const { api, warnings, debugs } = createApi({ apiKey: 'ydc-secret-value', count: 25 })
    pluginEntry.register(api)
    expect(warnings).toEqual([])
    expect(debugs[0]).toContain('count=25')
    expect(debugs[0]).toContain('credential=config')
    expect(debugs[0]).not.toContain('ydc-secret-value')
  })

  test('fails plugin load on a base URL that would redirect the credential', () => {
    const { api } = createApi({ baseUrl: 'ftp://example.com' })
    expect(() => pluginEntry.register(api)).toThrow(/baseUrl must use http or https/)
  })
})

describe('plugin manifest', () => {
  test('declares the web search and web fetch provider ids OpenClaw validates against', async () => {
    const manifest = await readManifest()
    expect(manifest.contracts).toEqual({
      webSearchProviders: ['you', 'you-free'],
      webFetchProviders: ['you'],
    })
  })

  test('stays startup-lazy so the capability contracts are the only load trigger', async () => {
    const manifest = await readManifest()
    expect(manifest.activation).toEqual({ onStartup: false })
  })

  test('keeps the existing skill and YDC_API_KEY setup metadata', async () => {
    const manifest = await readManifest()
    expect(manifest.skills).toEqual(['./skills'])
    expect(manifest.setup).toEqual({
      providers: [
        {
          id: 'you',
          authMethods: ['api-key'],
          envVars: ['YDC_API_KEY'],
        },
      ],
      requiresRuntime: false,
    })
  })

  test('routes the API key through the SecretRef config contract', async () => {
    const manifest = await readManifest()
    expect(manifest.configContracts.secretInputs.paths).toEqual([
      { path: 'apiKey', expected: 'string', ownerKind: 'capability' },
    ])
    expect(manifest.uiHints.apiKey.sensitive).toBe(true)
  })

  test('keeps schema defaults and runtime fallbacks in sync', async () => {
    const manifest = await readManifest()
    const schemaDefaults = Object.fromEntries(
      Object.entries(manifest.configSchema.properties as Record<string, { default?: unknown }>)
        .filter(([, property]) => property.default !== undefined)
        .map(([key, property]) => [key, property.default]),
    )
    expect(schemaDefaults).toEqual({ ...YOU_SETTINGS_DEFAULTS })
  })
})
