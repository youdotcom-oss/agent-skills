/**
 * Build the `X-Client-Info` attribution header value for outbound You.com API
 * requests:
 *
 *     plugin; client=dsh-plugin/<version>; ua=node/<version>
 *
 * The runtime version segment reports the actual Node.js runtime version. The
 * plugin version is read from `package.json` at module load.
 * @module @youdotcom-oss/dsh-plugin/web/attribution
 */

/** Leading literal that identifies the traffic source (the channel). */
const SOURCE_TOKEN = 'plugin'

/** This package's name, used in the `client=` segment. */
const PLUGIN_NAME = 'dsh-plugin'

/**
 * Build the `X-Client-Info` header value for an outbound API request.
 *
 * @param pluginVersion - this package's version, emitted as `client=dsh-plugin/<version>`.
 * @returns the header value to send over the wire.
 */
export function buildClientInfoHeader(pluginVersion: string): string {
  return [SOURCE_TOKEN, `client=${PLUGIN_NAME}/${pluginVersion}`, `ua=node/${process.version}`].join('; ')
}
