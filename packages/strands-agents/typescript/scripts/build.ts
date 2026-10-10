/**
 * Package build: stage the shared You.com assets from the repo root into the
 * package (gitignored), bundle src/index.ts for Node with Bun.build, emit the
 * public types with tsc (declaration-only), and copy the staged assets next to
 * the bundle so the plugin's import.meta.url-relative lookups resolve in the
 * published artifact.
 *
 * The bundle targets node and externalizes all package imports, so dist/
 * carries no Bun dependency — consumers load it with plain Node ESM.
 */
import { cpSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'

// MINIMAL: staging logic duplicated per package instead of a shared root
// helper — the house pattern is self-contained package builds (opencode, pi,
// openclaw, dsh-plugin each own a copySkills). Upgrade path: extract a shared
// scripts/copy-skills.ts when a sixth consumer appears.

const repoRoot = new URL('../../../../', import.meta.url)
const packageDir = new URL('../', import.meta.url)
const srcDir = new URL('src/', packageDir)

const isDirectory = (path: URL) => statSync(path, { throwIfNoEntry: false })?.isDirectory()

// Stage 1: repo-root skills/ + mcp.json -> src/ (build inputs, gitignored).
// Stale staged entries are removed (except the tracked .gitkeep) so deletions
// in the source propagate.
if (!isDirectory(new URL('skills/', repoRoot))) throw new Error(`Missing source skills directory: ${repoRoot}skills/`)

const srcSkillsDir = new URL('skills/', srcDir)
mkdirSync(srcSkillsDir, { recursive: true })
for (const entry of readdirSync(srcSkillsDir)) {
  if (entry !== '.gitkeep') rmSync(new URL(entry, srcSkillsDir), { recursive: true, force: true })
}

let staged = 0
for (const entry of readdirSync(new URL('skills/', repoRoot))) {
  const sourceSkillDir = new URL(`skills/${entry}/`, repoRoot)
  if (isDirectory(sourceSkillDir) && statSync(new URL('SKILL.md', sourceSkillDir), { throwIfNoEntry: false })) {
    cpSync(sourceSkillDir, new URL(`skills/${entry}/`, srcSkillsDir), { recursive: true })
    staged += 1
  }
}
if (staged === 0) throw new Error(`No skills found in ${repoRoot}skills/`)
cpSync(new URL('mcp.json', repoRoot), new URL('mcp.json', srcDir), { force: true })

// Stage 2: bundle + types + assets next to the bundle.
const bundle = await Bun.build({
  entrypoints: [new URL('index.ts', srcDir).pathname],
  target: 'node',
  format: 'esm',
  outdir: 'dist',
  sourcemap: 'linked',
  // The SDK and zod resolve from the consumer's node_modules (peer deps) —
  // never bundle them.
  packages: 'external',
})
if (!bundle.success) {
  for (const log of bundle.logs) console.error(log)
  process.exit(1)
}

// Public types. tsc emitDeclarationOnly also type-checks src, which is fine
// here — it mirrors the published surface.
const types = Bun.spawnSync(['bunx', 'tsc', '-p', 'tsconfig.build.json'])
if (types.exitCode !== 0) {
  process.stderr.write(types.stderr)
  process.exit(types.exitCode ?? 1)
}

rmSync('dist/skills', { recursive: true, force: true })
cpSync(new URL('mcp.json', srcDir), 'dist/mcp.json')
cpSync(new URL('skills/', srcDir), 'dist/skills', { recursive: true })
mkdirSync('dist', { recursive: true })
