import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

type CopySkillsOptions = {
  sourceSkillsDir: string
  targetSkillsDir: string
}

const repoRoot = resolve(import.meta.dir, '../../..')
const sourceSkillsDir = join(repoRoot, 'skills')
const targetSkillsDir = resolve(import.meta.dir, '..', 'skills')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isDirectory = async (path: string) =>
  await stat(path)
    .then((stats) => stats.isDirectory())
    .catch(() => false)

const readMetadata = (value: unknown): Record<string, unknown> => {
  if (isRecord(value)) {
    return { ...value }
  }

  if (typeof value !== 'string') {
    return {}
  }

  try {
    const parsed = JSON.parse(value)
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

const parseSkillFrontmatter = (skill: string) => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(skill)
  if (!match) {
    return undefined
  }

  const frontmatterText = match[1]
  if (frontmatterText === undefined) {
    return undefined
  }

  const parsed = Bun.YAML.parse(frontmatterText)
  if (!isRecord(parsed)) {
    return undefined
  }

  return {
    frontmatter: parsed,
    body: skill.slice(match[0].length),
  }
}

const serializeFrontmatterValue = (value: unknown) => {
  if (typeof value === 'string') {
    return JSON.stringify(value)
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return JSON.stringify(value)
}

const serializeSkillFrontmatter = (frontmatter: Record<string, unknown>) =>
  Object.entries(frontmatter)
    .map(([key, value]) =>
      key === 'metadata' ? `${key}: ${JSON.stringify(value)}` : `${key}: ${serializeFrontmatterValue(value)}`,
    )
    .join('\n')

const withOpenClawMetadata = (skill: string) => {
  const parsed = parseSkillFrontmatter(skill)
  if (!parsed) {
    return skill
  }

  const metadata = readMetadata(parsed.frontmatter.metadata)
  const existingOpenClaw = metadata.openclaw
  delete metadata.openclaw
  parsed.frontmatter.metadata = {
    openclaw: {
      ...(isRecord(existingOpenClaw) ? existingOpenClaw : {}),
      emoji: '🔍',
      primaryEnv: 'YDC_API_KEY',
    },
    ...metadata,
  }

  return `---\n${serializeSkillFrontmatter(parsed.frontmatter)}\n---\n${parsed.body}`
}

export const copySkills = async ({ sourceSkillsDir, targetSkillsDir }: CopySkillsOptions) => {
  if (!(await isDirectory(sourceSkillsDir))) {
    throw new Error(`Missing source skills directory: ${sourceSkillsDir}`)
  }

  await mkdir(targetSkillsDir, { recursive: true })

  for (const entry of await readdir(targetSkillsDir, { withFileTypes: true })) {
    if (entry.name !== '.gitkeep') {
      await rm(join(targetSkillsDir, entry.name), { force: true, recursive: true })
    }
  }

  let copied = 0
  for (const entry of await readdir(sourceSkillsDir, { withFileTypes: true })) {
    const sourceSkillDir = join(sourceSkillsDir, entry.name)
    const sourceSkillFile = join(sourceSkillDir, 'SKILL.md')
    const targetSkillDir = join(targetSkillsDir, entry.name)
    const targetSkillFile = join(targetSkillDir, 'SKILL.md')
    if (entry.isDirectory() && (await Bun.file(sourceSkillFile).exists())) {
      await cp(sourceSkillDir, targetSkillDir, { recursive: true })
      await Bun.write(targetSkillFile, withOpenClawMetadata(await Bun.file(targetSkillFile).text()))
      copied += 1
    }
  }

  if (copied === 0) {
    throw new Error(`No skills found in ${sourceSkillsDir}`)
  }

  return copied
}

if (import.meta.main) {
  const copied = await copySkills({ sourceSkillsDir, targetSkillsDir })
  process.stdout.write(`Copied ${copied} skills to ${targetSkillsDir}\n`)
}
