import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const repoRoot = resolve(import.meta.dir, '../../..')
const sourceSkillsDir = join(repoRoot, 'skills')
const targetSkillsDir = resolve(import.meta.dir, '..', 'skills')

type CopySkillsOptions = {
  sourceSkillsDir: string
  targetSkillsDir: string
  /** Skill directory names to skip from the shared source. */
  exclude?: readonly string[]
}

const isDirectory = async (path: string) =>
  stat(path)
    .then((stats) => stats.isDirectory())
    .catch(() => false)

export const copySkills = async ({ sourceSkillsDir, targetSkillsDir, exclude = [] }: CopySkillsOptions) => {
  if (!(await isDirectory(sourceSkillsDir))) {
    throw new Error(`Missing source skills directory: ${sourceSkillsDir}`)
  }

  await mkdir(targetSkillsDir, { recursive: true })

  for (const entry of await readdir(targetSkillsDir, { withFileTypes: true })) {
    if (entry.name !== '.gitkeep') {
      await rm(join(targetSkillsDir, entry.name), { force: true, recursive: true })
    }
  }

  const excluded = new Set(exclude)
  let copied = 0
  for (const entry of await readdir(sourceSkillsDir, { withFileTypes: true })) {
    if (exclude !== undefined && excluded.has(entry.name)) continue
    const sourceSkillDir = join(sourceSkillsDir, entry.name)
    const sourceSkillFile = join(sourceSkillDir, 'SKILL.md')
    if (entry.isDirectory() && (await Bun.file(sourceSkillFile).exists())) {
      await cp(sourceSkillDir, join(targetSkillsDir, entry.name), { recursive: true })
      copied += 1
    }
  }

  if (copied === 0) {
    throw new Error(`No skills found in ${sourceSkillsDir}`)
  }

  return copied
}

if (import.meta.main) {
  // `you-web` teaches the MCP tool names `you-search`/`you-contents`; this
  // plugin surfaces search via the native `web_search`/`web_fetch` providers
  // and does not mount the keyed `you` server, so the shared skill's guidance
  // (and its `mcp_servers` metadata) would point at tools that don't exist
  // here. `you-free` duplicates the keyless fallback built into the search
  // provider.
  const copied = await copySkills({ sourceSkillsDir, targetSkillsDir, exclude: ['you-free', 'you-web'] })
  process.stdout.write(`Copied ${copied} skills to ${targetSkillsDir}\n`)
}
