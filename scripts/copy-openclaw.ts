/**
 * Copy youdotcom-cli skill to youdotcom-cli-openclaw with OpenClaw-compatible metadata.
 *
 * @remarks
 * Resolves OpenClaw registry audit issues by declaring required prerequisites
 * that were missing from the original youdotcom-cli SKILL.md:
 * - `requires.bins` — `curl` and `jq` must be installed as system binaries
 * - `primaryEnv` — `YDC_API_KEY` is the optional auth env var (required for Research/Contents)
 *
 * Also reformats `metadata` from a YAML mapping to a single-line JSON string
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

const OPENCLAW_METADATA = {
  openclaw: {
    emoji: '🔍',
    primaryEnv: 'YDC_API_KEY',
    requires: {
      bins: ['curl', 'jq'],
    },
  },
  author: 'youdotcom-oss',
  version: '2.0.7',
  category: 'web-search-tools',
  keywords:
    'you.com,bash,cli,ai-agents,web-search,content-extraction,livecrawl,openclaw',
}

const transformSkillMd = (source: string): string => {
  const match = source.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/)
  if (!match) throw new Error('Invalid SKILL.md: no frontmatter found')

  const [, frontmatterRaw, body] = match

  // Strip the trailing multi-line metadata: block — it is always the last key
  const frontmatterWithoutMetadata = frontmatterRaw.replace(/\nmetadata:[\s\S]*$/, '')

  const newFrontmatter = [
    frontmatterWithoutMetadata,
    'user-invocable: true',
    `metadata: ${JSON.stringify(OPENCLAW_METADATA)}`,
  ].join('\n')

  return `---\n${newFrontmatter}\n---\n${body}`
}

const source = await Bun.file(SOURCE).text()
const transformed = transformSkillMd(source)

await Bun.$`mkdir -p ${DEST_DIR}`.quiet()
await Bun.write(DEST, transformed)

console.log(`✓ Written to ${DEST}`)
