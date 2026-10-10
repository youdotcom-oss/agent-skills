/**
 * Stage the shared You.com assets from the repo root into the Python package
 * (gitignored build inputs): repo-root skills/ + mcp.json ->
 * src/strands_you/{skills/,mcp.json}. Run before `uv build` and
 * before tests — the plugin loads the shipped assets via importlib.resources,
 * so tests exercise exactly what the wheel will contain.
 *
 * MINIMAL: staging logic duplicated per package instead of a shared root
 * helper — the house pattern is self-contained package builds. Upgrade path:
 * extract a shared scripts/copy-skills.ts when a sixth consumer appears.
 */
import { cpSync, readdirSync, rmSync, statSync } from 'node:fs'

const repoRoot = new URL('../../../../', import.meta.url)
const packageAssetsDir = new URL('../src/strands_you/', import.meta.url)

const isDirectory = (path: URL) => statSync(path, { throwIfNoEntry: false })?.isDirectory()

if (!isDirectory(new URL('skills/', repoRoot))) throw new Error(`Missing source skills directory: ${repoRoot}skills/`)

rmSync(new URL('skills/', packageAssetsDir), { recursive: true, force: true })
rmSync(new URL('mcp.json', packageAssetsDir), { force: true })

let staged = 0
for (const entry of readdirSync(new URL('skills/', repoRoot))) {
  const sourceSkillDir = new URL(`skills/${entry}/`, repoRoot)
  if (isDirectory(sourceSkillDir) && statSync(new URL('SKILL.md', sourceSkillDir), { throwIfNoEntry: false })) {
    cpSync(sourceSkillDir, new URL(`skills/${entry}/`, packageAssetsDir), { recursive: true })
    staged += 1
  }
}
if (staged === 0) throw new Error(`No skills found in ${repoRoot}skills/`)
cpSync(new URL('mcp.json', repoRoot), new URL('mcp.json', packageAssetsDir), { force: true })

console.log(`staged ${staged} skills + mcp.json -> src/strands_you/`)
