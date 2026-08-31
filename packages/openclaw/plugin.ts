import { buildJsonPluginConfigSchema, definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry'
import manifest from './openclaw.plugin.json' with { type: 'json' }
import { describeYouSettings, hasUsableCredential, resolveYouSettings, YOU_API_KEY_ENV_VAR } from './settings.ts'

/**
 * `buildJsonPluginConfigSchema` types its input as the host's TypeBox schema alias.
 * The manifest is plain JSON Schema, so widen it once here instead of duplicating
 * the schema in TypeScript.
 */
type HostJsonSchema = Parameters<typeof buildJsonPluginConfigSchema>[0]

export default definePluginEntry({
  id: manifest.id,
  name: manifest.name,
  description: manifest.description,
  configSchema: () =>
    buildJsonPluginConfigSchema(manifest.configSchema as unknown as HostJsonSchema, {
      cacheKey: `${manifest.id}:config@${manifest.version}`,
    }),
  register: (api) => {
    const settings = resolveYouSettings(api.pluginConfig)

    if (!hasUsableCredential(settings)) {
      api.logger.warn(
        settings.credentialSource === 'secret-ref'
          ? `You.com API key is a SecretRef that is not resolved yet (${settings.apiKeyRef?.source}:${settings.apiKeyRef?.provider}); authenticated You.com capabilities stay unavailable.`
          : `No You.com API key configured. Set ${YOU_API_KEY_ENV_VAR} or plugins.entries.${manifest.id}.config.apiKey to enable authenticated You.com capabilities.`,
      )
    }

    api.logger.debug?.(`You.com settings ${describeYouSettings(settings)}`)

    // Web search (`you`, `you-free`) and web fetch (`you`) providers are declared in
    // `openclaw.plugin.json#contracts` and registered here by DX-806 / DX-807.
  },
})
