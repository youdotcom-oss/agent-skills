/**
 * Copy You.com skills to OpenClaw-compatible variants with modified metadata.
 *
 * @remarks
 * Produces `-openclaw` variants of each skill with:
 * - `user-invocable: true`
 * - `metadata` reformatted as single-line JSON (OpenClaw frontmatter parser requirement)
 * - `metadata.openclaw` block with emoji, primaryEnv, and optional requires
 *
 * Output directories are gitignored; upload SKILL.md files to OpenClaw manually.
 *
 * Usage:
 *   bun scripts/copy-openclaw.ts
 *
 * @public
 */

import { join } from 'node:path'

const ROOT = import.meta.dir.replace(/\/scripts$/, '')

type SkillConfig = {
  name: string
  openclaw: {
    emoji: string
    primaryEnv: string
    requires?: { bins: string[] }
  }
}

const SKILLS: SkillConfig[] = [
  {
    name: 'youdotcom-cli',
    openclaw: {
      emoji: '🔍',
      primaryEnv: 'YDC_API_KEY',
      requires: { bins: ['curl', 'jq'] },
    },
  },
  {
    name: 'youdotcom-api',
    openclaw: {
      emoji: '🌐',
      primaryEnv: 'YDC_API_KEY',
    },
  },
]

const extractMetadataField = (frontmatter: string, field: string) => {
  const match = frontmatter.match(new RegExp(`^\\s+${field}:\\s*(.+)$`, 'm'))
  return match?.[1]?.trim()
}

const transformSkillMd = (source: string, openclaw: SkillConfig['openclaw']): string => {
  const match = source.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/)
  if (!match?.[1]) throw new Error('Invalid SKILL.md: no frontmatter found')

  const frontmatterRaw = match[1]
  const body = match[2] ?? ''

  const author = extractMetadataField(frontmatterRaw, 'author')
  const version = extractMetadataField(frontmatterRaw, 'version')
  const category = extractMetadataField(frontmatterRaw, 'category')
  const keywords = extractMetadataField(frontmatterRaw, 'keywords')

  const frontmatterWithoutMetadata = frontmatterRaw.replace(/\nmetadata:[\s\S]*$/, '')

  const metadata = {
    openclaw,
    author: author ?? 'youdotcom-oss',
    version: version ?? '0.0.0',
    category: category ?? 'sdk-integration',
    keywords,
  }

  const newFrontmatter = [
    frontmatterWithoutMetadata,
    'user-invocable: true',
    `metadata: ${JSON.stringify(metadata)}`,
  ].join('\n')

  return `---\n${newFrontmatter}\n---\n${body}`
}

for (const skill of SKILLS) {
  const sourceDir = join(ROOT, `skills/${skill.name}`)
  const sourcePath = join(sourceDir, 'SKILL.md')
  const destDir = join(ROOT, `skills/${skill.name}-openclaw`)
  const destPath = join(destDir, 'SKILL.md')

  const source = await Bun.file(sourcePath).text()
  const transformed = transformSkillMd(source, skill.openclaw)

  await Bun.$`mkdir -p ${destDir}`.quiet()
  await Bun.write(destPath, transformed)
  console.log(`  ${destPath}`)

  await Bun.$`rm -rf ${destDir}/assets && test -d ${sourceDir}/assets && cp -r ${sourceDir}/assets ${destDir}/assets`
    .quiet()
    .nothrow()

  const hasAssets = await Bun.file(join(sourceDir, 'assets'))
    .exists()
    .catch(() => false)
  if (hasAssets) console.log(`  ${destDir}/assets/`)
}

console.log(`\n✓ Generated ${SKILLS.length} OpenClaw variants`)
