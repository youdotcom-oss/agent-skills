import { dirname, resolve } from 'node:path'
import { $ } from 'bun'

type Bump = 'none' | 'patch' | 'minor' | 'major'

type ReleaseUnit = {
  bump: Bump
  paths: string[]
  rationale: string[]
}

type ReleasePlan = {
  schemaVersion: 1
  baseRef: string
  headRef: string
  generatedAt: string
  changes: string[]
  units: {
    skills: Record<string, ReleaseUnit>
    plugins: Record<string, ReleaseUnit>
    npm: Record<string, ReleaseUnit>
    pypi: Record<string, ReleaseUnit>
    clawhub: Record<string, ReleaseUnit>
  }
}

const repoRoot = resolve(import.meta.dir, '..')
const pluginManifests = [
  '.plugin/plugin.json',
  '.claude-plugin/plugin.json',
  '.codex-plugin/plugin.json',
  '.cursor-plugin/plugin.json',
  '.kimi-plugin/plugin.json',
]
const npmPackages = {
  '@youdotcom-oss/opencode': 'packages/opencode/package.json',
  '@youdotcom-oss/pi-plugin': 'packages/pi/package.json',
  '@youdotcom-oss/openclaw': 'packages/openclaw/package.json',
} as const
const pypiPackages = {
  'youdotcom-hermes-plugin': 'packages/hermes/pyproject.toml',
} as const
const packageBuildDirectories = ['packages/hermes', 'packages/opencode', 'packages/openclaw', 'packages/pi']
const bumpOrder: Bump[] = ['none', 'patch', 'minor', 'major']

const maxBump = (left: Bump, right: Bump): Bump => (bumpOrder.indexOf(left) > bumpOrder.indexOf(right) ? left : right)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isBump = (value: unknown): value is Bump =>
  value === 'none' || value === 'patch' || value === 'minor' || value === 'major'

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const unique = (values: string[]) => Array.from(new Set(values)).sort()

const bumpVersion = (version: string, bump: Bump) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!match) {
    throw new Error(`Invalid semver: ${version}`)
  }

  const major = Number(match[1])
  const minor = Number(match[2])
  const patch = Number(match[3])

  if (bump === 'major') {
    return `${major + 1}.0.0`
  }

  if (bump === 'minor') {
    return `${major}.${minor + 1}.0`
  }

  if (bump === 'patch') {
    return `${major}.${minor}.${patch + 1}`
  }

  return version
}

const updateReleaseUnit = (
  unit: ReleaseUnit | undefined,
  bump: Bump,
  path: string,
  rationale: string,
): ReleaseUnit => ({
  bump: maxBump(unit?.bump ?? 'none', bump),
  paths: unique([...(unit?.paths ?? []), path]),
  rationale: unique([...(unit?.rationale ?? []), rationale]),
})

const readChangedPaths = async (baseRef: string) => {
  const names = await $`git -C ${repoRoot} diff --name-only ${baseRef}`.text()
  return names
    .split('\n')
    .map((path) => path.trim())
    .filter(Boolean)
}

const readChangedStatuses = async (baseRef: string) => {
  const names = await $`git -C ${repoRoot} diff --name-status ${baseRef}`.text()
  return names
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 2)
    .map(([status, path]) => ({ status: status ?? '', path: path ?? '' }))
}

const changedSkillBump = async ({ baseRef, path, isAdded }: { baseRef: string; path: string; isAdded: boolean }) => {
  if (isAdded) {
    return { bump: 'minor' as const, rationale: 'new skill' }
  }

  if (!path.endsWith('/SKILL.md')) {
    return { bump: 'patch' as const, rationale: 'skill resource change' }
  }

  const diff = await $`git -C ${repoRoot} diff ${baseRef} -- ${path}`.text()
  if (/^[+-](name|description):/m.test(diff) || diff.includes('mcp_servers')) {
    return { bump: 'minor' as const, rationale: 'skill activation or MCP contract changed' }
  }

  return { bump: 'patch' as const, rationale: 'skill instructions changed' }
}

const createReleasePlan = async (baseRef: string): Promise<ReleasePlan> => {
  const changes = await readChangedPaths(baseRef)
  const statuses = await readChangedStatuses(baseRef)
  const addedPaths = new Set(statuses.filter((item) => item.status.startsWith('A')).map((item) => item.path))
  const headRef = (await $`git -C ${repoRoot} rev-parse --short HEAD`.text()).trim()
  const plan: ReleasePlan = {
    schemaVersion: 1,
    baseRef,
    headRef,
    generatedAt: new Date().toISOString(),
    changes,
    units: {
      skills: {},
      plugins: {},
      npm: {},
      pypi: {},
      clawhub: {},
    },
  }

  for (const path of changes) {
    const skillMatch = /^skills\/([^/]+)\//.exec(path)
    if (skillMatch?.[1]) {
      const { bump, rationale } = await changedSkillBump({ baseRef, path, isAdded: addedPaths.has(path) })
      plan.units.skills[skillMatch[1]] = updateReleaseUnit(plan.units.skills[skillMatch[1]], bump, path, rationale)
      plan.units.plugins.you = updateReleaseUnit(plan.units.plugins.you, bump, path, `skill ${skillMatch[1]} changed`)
      plan.units.npm['@youdotcom-oss/opencode'] = updateReleaseUnit(
        plan.units.npm['@youdotcom-oss/opencode'],
        bump,
        path,
        `bundled skill ${skillMatch[1]} changed`,
      )
      plan.units.npm['@youdotcom-oss/pi-plugin'] = updateReleaseUnit(
        plan.units.npm['@youdotcom-oss/pi-plugin'],
        bump,
        path,
        `bundled skill ${skillMatch[1]} changed`,
      )
      plan.units.npm['@youdotcom-oss/openclaw'] = updateReleaseUnit(
        plan.units.npm['@youdotcom-oss/openclaw'],
        bump,
        path,
        `bundled skill ${skillMatch[1]} changed`,
      )
      plan.units.pypi['youdotcom-hermes-plugin'] = updateReleaseUnit(
        plan.units.pypi['youdotcom-hermes-plugin'],
        bump,
        path,
        `bundled skill ${skillMatch[1]} changed`,
      )
      plan.units.clawhub.you = updateReleaseUnit(
        plan.units.clawhub.you,
        bump,
        path,
        `bundled skill ${skillMatch[1]} changed`,
      )
      continue
    }

    if (pluginManifests.some((manifest) => path === manifest || path.startsWith(dirname(manifest)))) {
      plan.units.plugins.you = updateReleaseUnit(plan.units.plugins.you, 'patch', path, 'plugin manifest changed')
      continue
    }

    for (const [name, packagePath] of Object.entries(npmPackages)) {
      if (path.startsWith(dirname(packagePath))) {
        plan.units.npm[name] = updateReleaseUnit(plan.units.npm[name], 'patch', path, 'package implementation changed')
        if (name === '@youdotcom-oss/openclaw') {
          plan.units.clawhub.you = updateReleaseUnit(plan.units.clawhub.you, 'patch', path, 'OpenClaw package changed')
        }
      }
    }

    if (path.startsWith('packages/hermes/')) {
      plan.units.pypi['youdotcom-hermes-plugin'] = updateReleaseUnit(
        plan.units.pypi['youdotcom-hermes-plugin'],
        'patch',
        path,
        'Hermes package changed',
      )
    }
  }

  return plan
}

const validateReleaseUnit = (value: unknown, path: string): ReleaseUnit => {
  if (!isRecord(value) || !isBump(value.bump) || !isStringArray(value.paths) || !isStringArray(value.rationale)) {
    throw new TypeError(`${path} must be a release unit`)
  }

  return {
    bump: value.bump,
    paths: value.paths,
    rationale: value.rationale,
  }
}

const validateReleaseUnitGroup = (value: unknown, path: string) => {
  if (!isRecord(value)) {
    throw new TypeError(`${path} must be an object`)
  }

  return Object.fromEntries(
    Object.entries(value).map(([name, unit]) => [name, validateReleaseUnit(unit, `${path}.${name}`)]),
  )
}

const readReleasePlan = async (path: string): Promise<ReleasePlan> => {
  const parsed: unknown = await Bun.file(resolve(repoRoot, path)).json()
  if (!isRecord(parsed) || parsed.schemaVersion !== 1 || !isRecord(parsed.units)) {
    throw new TypeError(`${path} must be a release plan`)
  }

  return {
    schemaVersion: 1,
    baseRef: typeof parsed.baseRef === 'string' ? parsed.baseRef : '',
    headRef: typeof parsed.headRef === 'string' ? parsed.headRef : '',
    generatedAt: typeof parsed.generatedAt === 'string' ? parsed.generatedAt : '',
    changes: isStringArray(parsed.changes) ? parsed.changes : [],
    units: {
      skills: validateReleaseUnitGroup(parsed.units.skills, 'units.skills'),
      plugins: validateReleaseUnitGroup(parsed.units.plugins, 'units.plugins'),
      npm: validateReleaseUnitGroup(parsed.units.npm, 'units.npm'),
      pypi: validateReleaseUnitGroup(parsed.units.pypi, 'units.pypi'),
      clawhub: validateReleaseUnitGroup(parsed.units.clawhub, 'units.clawhub'),
    },
  }
}

const readJson = async (path: string): Promise<Record<string, unknown>> => {
  const parsed: unknown = await Bun.file(resolve(repoRoot, path)).json()
  if (!isRecord(parsed)) {
    throw new TypeError(`${path} must contain a JSON object`)
  }

  return parsed
}

const bumpJsonVersion = async (path: string, bump: Bump) => {
  const json = await readJson(path)
  if (typeof json.version !== 'string') {
    throw new TypeError(`${path} must contain a version string`)
  }

  json.version = bumpVersion(json.version, bump)
  return { path, content: `${JSON.stringify(json, null, 2)}\n` }
}

const bumpSkillVersion = async (skillName: string, bump: Bump) => {
  const path = `skills/${skillName}/SKILL.md`
  const content = await Bun.file(resolve(repoRoot, path)).text()
  const match = /^---\n([\s\S]*?)\n---/.exec(content)
  if (!match?.[1]) {
    throw new Error(`${path} must contain frontmatter`)
  }

  const frontmatter: unknown = Bun.YAML.parse(match[1])
  if (!isRecord(frontmatter) || !isRecord(frontmatter.metadata) || typeof frontmatter.metadata.version !== 'string') {
    throw new TypeError(`${path} must contain metadata.version`)
  }

  const version = bumpVersion(frontmatter.metadata.version, bump)
  const updated = content.replace(
    /^---\n([\s\S]*?\n {2}version: )\d+\.\d+\.\d+(\n[\s\S]*?\n---)/,
    `---\n$1${version}$2`,
  )
  if (updated === content) {
    throw new Error(`${path} metadata.version could not be updated`)
  }

  return { path, content: updated }
}

const bumpPyprojectVersion = async (path: string, bump: Bump) => {
  const content = await Bun.file(resolve(repoRoot, path)).text()
  const current = /^version = "(\d+\.\d+\.\d+)"/m.exec(content)?.[1]
  if (!current) {
    throw new TypeError(`${path} must contain a project version`)
  }

  return {
    path,
    content: content.replace(/^version = "\d+\.\d+\.\d+"/m, `version = "${bumpVersion(current, bump)}"`),
  }
}

const writeUpdates = async (updates: { path: string; content: string }[]) => {
  for (const update of updates) {
    await Bun.write(resolve(repoRoot, update.path), update.content)
  }
}

const buildPackages = async () => {
  for (const directory of packageBuildDirectories) {
    await $`bun run build`.cwd(resolve(repoRoot, directory))
  }
}

const applyReleasePlan = async (planPath: string) => {
  const plan = await readReleasePlan(planPath)
  const updates: { path: string; content: string }[] = []

  for (const [skillName, unit] of Object.entries(plan.units.skills)) {
    if (unit.bump !== 'none') {
      updates.push(await bumpSkillVersion(skillName, unit.bump))
    }
  }

  const pluginUnit = plan.units.plugins.you
  if (pluginUnit?.bump && pluginUnit.bump !== 'none') {
    for (const manifest of pluginManifests) {
      updates.push(await bumpJsonVersion(manifest, pluginUnit.bump))
    }
  }

  for (const [name, unit] of Object.entries(plan.units.npm)) {
    const path = npmPackages[name as keyof typeof npmPackages]
    if (path && unit.bump !== 'none') {
      updates.push(await bumpJsonVersion(path, unit.bump))
      if (name === '@youdotcom-oss/openclaw') {
        updates.push(await bumpJsonVersion('packages/openclaw/openclaw.plugin.json', unit.bump))
      }
    }
  }

  for (const [name, unit] of Object.entries(plan.units.pypi)) {
    const path = pypiPackages[name as keyof typeof pypiPackages]
    if (path && unit.bump !== 'none') {
      updates.push(await bumpPyprojectVersion(path, unit.bump))
      updates.push(await bumpJsonVersion('packages/hermes/package.json', unit.bump))
    }
  }

  await writeUpdates(updates)
  await buildPackages()
}

const printUsage = () => {
  process.stderr.write(
    'Usage: bun scripts/semver-release.ts plan [--base HEAD~1] [--out /tmp/release-plan.json] | apply [--plan /tmp/release-plan.json]\n',
  )
}

const readArg = (name: string, fallback: string) => {
  const index = Bun.argv.indexOf(name)
  return index === -1 ? fallback : (Bun.argv[index + 1] ?? fallback)
}

const main = async () => {
  const command = Bun.argv[2]
  if (command === 'plan') {
    const baseRef = readArg('--base', process.env.RELEASE_BASE_REF ?? 'HEAD~1')
    const out = readArg('--out', '/tmp/agent-skills-release-plan.json')
    const plan = await createReleasePlan(baseRef)
    await Bun.write(resolve(repoRoot, out), `${JSON.stringify(plan, null, 2)}\n`)
    await Bun.write(Bun.stdout, `${JSON.stringify(plan, null, 2)}\n`)
    return
  }

  if (command === 'apply') {
    await applyReleasePlan(readArg('--plan', '/tmp/agent-skills-release-plan.json'))
    return
  }

  printUsage()
  process.exit(1)
}

await main()
