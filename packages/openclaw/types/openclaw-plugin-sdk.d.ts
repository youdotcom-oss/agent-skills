/**
 * Ambient type shim for OpenClaw's web-search provider SDK subpaths.
 *
 * `openclaw@2026.9.7` ships `plugin-sdk/provider-web-search` and
 * `plugin-sdk/provider-web-search-contract` as JavaScript only: their `.d.ts`
 * files are excluded from the published `files` list, so `tsc` reports TS7016
 * and every imported value (and its callback parameters) degrades to `any`.
 *
 * This declares only the surface `plugin.ts` and its tests import. Signatures
 * mirror the runtime implementations and the last release that shipped the
 * declarations (2026.7.1-2).
 *
 * MINIMAL: delete this file once OpenClaw publishes declarations for these two
 * subpaths (track with the `openclaw` peer dependency / `pluginApi` floor).
 */

declare module 'openclaw/plugin-sdk/provider-web-search' {
  export const DEFAULT_SEARCH_COUNT: number
  export const MAX_SEARCH_COUNT: number

  export function readPositiveIntegerParam(
    params: Record<string, unknown>,
    key: string,
    options?: { message?: string; max?: number },
  ): number | undefined

  export function readStringParam(
    params: Record<string, unknown>,
    key: string,
    options: { required: true; trim?: boolean; label?: string; allowEmpty?: boolean },
  ): string
  export function readStringParam(
    params: Record<string, unknown>,
    key: string,
    options?: { required?: boolean; trim?: boolean; label?: string; allowEmpty?: boolean },
  ): string | undefined

  export function resolveSearchTimeoutSeconds(searchConfig?: Record<string, unknown>): number

  export function resolveSiteName(url: string | undefined): string | undefined

  export function resolveWebSearchProviderCredential(params: {
    credentialValue: unknown
    path: string
    envVars: string[]
  }): string | undefined

  export function throwWebSearchApiError(res: Response, providerLabel: string): Promise<never>

  export function withTrustedWebSearchEndpoint<T>(
    params: { url: string; timeoutSeconds: number; init: RequestInit; signal?: AbortSignal },
    run: (response: Response) => Promise<T>,
  ): Promise<T>

  export function wrapWebContent(content: string, source?: 'web_search' | 'web_fetch'): string
}

declare module 'openclaw/plugin-sdk/provider-web-search-contract' {
  import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry'

  /** Mirrors OpenClaw's `WebSearchProviderPlugin`, the value `registerWebSearchProvider` takes. */
  export type WebSearchProviderPlugin = Parameters<OpenClawPluginApi['registerWebSearchProvider']>[0]

  export type WebSearchProviderContractFields = Pick<
    WebSearchProviderPlugin,
    'inactiveSecretPaths' | 'getCredentialValue' | 'setCredentialValue'
  > &
    Partial<
      Pick<
        WebSearchProviderPlugin,
        'applySelectionConfig' | 'getConfiguredCredentialValue' | 'setConfiguredCredentialValue'
      >
    >

  export function createWebSearchProviderContractFields(options: {
    credentialPath?: string
    inactiveSecretPaths?: string[]
    searchCredential: { type: 'top-level' } | { type: 'scoped'; scopeId: string } | { type: 'none' }
    configuredCredential?: { pluginId: string; field?: string }
    selectionPluginId?: string
  }): WebSearchProviderContractFields
}
