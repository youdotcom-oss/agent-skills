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

// omp discovers a package-level mcp.json inside extension packages but has
// no pi.registerMcpServer, so the build generates packages/pi/mcp.json from
// the repo-root mcp.json — the single source of truth for the server set.
// omp deltas vs the root file: the `http` transport keyword, an injected
// `you-free` entry (root consumers cannot hide the duplicate you-discover
// tool it exposes; upstream Pi hides it via toolExposure), and `!command`
// Authorization headers — omp sends unresolved ${...} placeholders literally,
// so the key must be resolved by shell at connect time; an omitted header
// falls back to Pi's OAuth flow.
const KEYED_SERVERS = new Set(['you', 'you-finance', 'you-research'])
const KEYLESS_SERVERS = new Set(['you-free', 'you-discover', 'you-docs'])
const MCP_URL = 'https://api.you.com/mcp'
const AUTH_COMMAND = '!if [ -n "$YDC_API_KEY" ]; then printf \'Bearer %s\' "$YDC_API_KEY"; fi'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const ompMcpJson = (source: unknown) => {
  if (!isRecord(source) || !isRecord(source.mcpServers)) {
    throw new Error('Root mcp.json must contain an object mcpServers field')
  }

  const servers: Record<string, unknown> = {}
  for (const [name, entry] of Object.entries(source.mcpServers)) {
    if (!isRecord(entry) || typeof entry.url !== 'string') {
      throw new Error(`Root mcp.json server "${name}" must have a string url`)
    }
    if (!KEYED_SERVERS.has(name) && !KEYLESS_SERVERS.has(name)) {
      throw new Error(
        `Unclassified root mcp.json server "${name}": add it to KEYED_SERVERS or KEYLESS_SERVERS in scripts/build.ts`,
      )
    }
    if (entry.headers !== undefined) {
      throw new Error(`Root mcp.json server "${name}" has headers; omp auth is managed here`)
    }
    const { type, ...rest } = entry
    if (type !== undefined && type !== 'streamable-http' && type !== 'http') {
      throw new Error(`Root mcp.json server "${name}" has unsupported type ${JSON.stringify(type)}`)
    }
    servers[name] = {
      type: 'http',
      ...rest,
      ...(KEYED_SERVERS.has(name) ? { headers: { Authorization: AUTH_COMMAND } } : {}),
    }
  }

  if (!('you-free' in servers)) {
    servers['you-free'] = { type: 'http', url: `${MCP_URL}?profile=free` }
  }

  return { mcpServers: servers }
}

export const writeOmpMcpJson = async ({
  sourceMcpJson,
  targetMcpJson,
}: {
  sourceMcpJson: string
  targetMcpJson: string
}) => {
  const omp = ompMcpJson(await Bun.file(sourceMcpJson).json())
  await Bun.write(targetMcpJson, `${JSON.stringify(omp, null, 2)}\n`)
}

if (import.meta.main) {
  await copySkills({ sourceSkillsDir, targetSkillsDir })
  await writeOmpMcpJson({
    sourceMcpJson: join(repoRoot, 'mcp.json'),
    targetMcpJson: resolve(import.meta.dir, '..', 'mcp.json'),
  })
}
