import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const repoRoot = resolve(import.meta.dir, '../../..')
const sourceSkillsDir = join(repoRoot, 'skills')
const targetSkillsDir = resolve(import.meta.dir, '..', 'skills')

export const copySkills = async ({
  sourceSkillsDir,
  targetSkillsDir,
}: {
  sourceSkillsDir: string
  targetSkillsDir: string
}) => {
  if (
    !(await stat(sourceSkillsDir)
      .then((stats) => stats.isDirectory())
      .catch(() => false))
  ) {
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
  await copySkills({ sourceSkillsDir, targetSkillsDir })
}
