import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const repoRoot = resolve(import.meta.dir, '../../..')
const sourceSkillsDir = join(repoRoot, 'skills')
const targetSkillsDir = resolve(import.meta.dir, '..', 'skills')

type CopySkillsOptions = {
  sourceSkillsDir: string
  targetSkillsDir: string
  /** Skill directory names to skip from the shared source (e.g. skills this package replaces with an override). */
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

/**
 * Apply per-package skill overrides on top of the shared tree: each override
 * directory replaces the same-named shared skill (overrides never ADD a skill
 * the shared copy doesn't already provide — use `exclude` to drop one).
 * A missing overrides directory is a no-op.
 */
export const overlaySkills = async ({ skillsDir, overridesDir }: { skillsDir: string; overridesDir: string }) => {
  if (!(await isDirectory(overridesDir))) return 0

  let overlaid = 0
  for (const entry of await readdir(overridesDir, { withFileTypes: true })) {
    const overrideSkillFile = join(overridesDir, entry.name, 'SKILL.md')
    const sharedSkillDir = join(skillsDir, entry.name)
    if (entry.isDirectory() && (await isDirectory(sharedSkillDir)) && (await Bun.file(overrideSkillFile).exists())) {
      await rm(sharedSkillDir, { force: true, recursive: true })
      await cp(join(overridesDir, entry.name), sharedSkillDir, { recursive: true })
      overlaid += 1
    }
  }
  return overlaid
}

if (import.meta.main) {
  const overridesDir = resolve(import.meta.dir, '..', 'skills-overrides')
  const copied = await copySkills({ sourceSkillsDir, targetSkillsDir, exclude: ['you-free'] })
  const overridden = await overlaySkills({ skillsDir: targetSkillsDir, overridesDir })
  process.stdout.write(`Copied ${copied} skills (plus ${overridden} overrides) to ${targetSkillsDir}\n`)
}
