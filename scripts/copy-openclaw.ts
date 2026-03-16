/**
 * Copy youdotcom-cli skill to youdotcom-cli-openclaw with OpenClaw-compatible metadata.
 *
 * @remarks
 * Adds OpenClaw-compatible metadata to the youdotcom-cli skill:
 * - `requires.bins` — `curl` and `jq` must be installed as system binaries
 * - `primaryEnv` — `YDC_API_KEY` is the optional auth env var (required for Research/Contents)
 *
 * Reformats `metadata` from a YAML mapping to a single-line JSON string
 * as required by OpenClaw's frontmatter parser, and adds `user-invocable: true`.
 *
 * The output directory is gitignored; upload SKILL.md to OpenClaw manually.
 *
 * Usage:
 *   bun scripts/copy-openclaw.ts
 *
 * @public
 */

import { join } from 'node:path'

const ROOT = import.meta.dir.replace(/\/scripts$/, '')
const SOURCE = join(ROOT, 'skills/youdotcom-cli/SKILL.md')
const DEST_DIR = join(ROOT, 'skills/youdotcom-cli-openclaw')
const DEST = join(DEST_DIR, 'SKILL.md')

/** OpenClaw-specific fields nested under metadata.openclaw */
const OPENCLAW_FIELDS = {
  emoji: '🔍',
  primaryEnv: 'YDC_API_KEY',
  requires: {
    bins: ['curl', 'jq'],
  },
}

const extractMetadataField = (frontmatter: string, field: string) => {
  const match = frontmatter.match(new RegExp(`^\\s+${field}:\\s*(.+)$`, 'm'))
  return match?.[1]?.trim()
}

const transformSkillMd = (source: string): string => {
  const match = source.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/)
  if (!match) throw new Error('Invalid SKILL.md: no frontmatter found')

  const [, frontmatterRaw, body] = match

  // Pull standard metadata fields from source
  const author = extractMetadataField(frontmatterRaw, 'author')
  const version = extractMetadataField(frontmatterRaw, 'version')
  const category = extractMetadataField(frontmatterRaw, 'category')
  const keywords = extractMetadataField(frontmatterRaw, 'keywords')

  // Strip the trailing multi-line metadata: block — it is always the last key
  const frontmatterWithoutMetadata = frontmatterRaw.replace(/\nmetadata:[\s\S]*$/, '')

  const metadata = {
    openclaw: OPENCLAW_FIELDS,
    author: author ?? 'youdotcom-oss',
    version: version ?? '0.0.0',
    category: category ?? 'web-search-tools',
    keywords,
  }

  const newFrontmatter = [
    frontmatterWithoutMetadata,
    'user-invocable: true',
    `metadata: ${JSON.stringify(metadata)}`,
  ].join('\n')

  return `---\n${newFrontmatter}\n---\n${body}`
}

const source = await Bun.file(SOURCE).text()
const transformed = transformSkillMd(source)

await Bun.$`mkdir -p ${DEST_DIR}`.quiet()
await Bun.write(DEST, transformed)
console.log(`  ${DEST}`)

// Copy assets directory if it exists (rm first to avoid nested copies)
const SOURCE_DIR = join(ROOT, 'skills/youdotcom-cli')
await Bun.$`rm -rf ${DEST_DIR}/assets && test -d ${SOURCE_DIR}/assets && cp -r ${SOURCE_DIR}/assets ${DEST_DIR}/assets`
  .quiet()
  .nothrow()
console.log(`  ${DEST_DIR}/assets/`)

console.log('✓ Done')
