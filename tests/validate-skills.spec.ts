import { describe, expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import { basename, dirname, join, relative } from 'node:path'
import { Glob, YAML } from 'bun'

const repoRoot = join(import.meta.dir, '..')
const skillsRoot = join(repoRoot, 'skills')
const skillFileGlob = new Glob('*/SKILL.md')
const allowedFrontmatterFields = new Set([
  'name',
  'description',
  'license',
  'compatibility',
  'metadata',
  'allowed-tools',
])
const skillNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const semanticVersionPattern = /^\d+\.\d+\.\d+$/
const mcpServerMetadataOptionalFields = new Set(['auth', 'tools', 'avoidTools', 'resources', 'prompts', 'headers'])

type Frontmatter = Record<string, unknown>

type SkillFile = {
  path: string
  directoryName: string
  frontmatter: Frontmatter
  body: string
  raw: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0)

const validateMcpServersMetadata = ({ skillFilePath, value }: { skillFilePath: string; value: string }) => {
  const parsed: unknown = JSON.parse(value)

  expect(isRecord(parsed)).toBe(true)

  if (!isRecord(parsed)) {
    throw new TypeError(`${skillFilePath} metadata.mcp_servers must be a JSON object`)
  }

  expect(Object.keys(parsed).length).toBeGreaterThan(0)

  for (const [serverName, serverConfig] of Object.entries(parsed)) {
    expect(skillNamePattern.test(serverName)).toBe(true)
    expect(isRecord(serverConfig)).toBe(true)

    if (!isRecord(serverConfig)) {
      throw new TypeError(`${skillFilePath} metadata.mcp_servers.${serverName} must be an object`)
    }

    const url = serverConfig['url']
    const auth = serverConfig['auth']
    const tools = serverConfig['tools']
    const avoidTools = serverConfig['avoidTools']
    const resources = serverConfig['resources']
    const prompts = serverConfig['prompts']
    const headers = serverConfig['headers']

    expect(typeof url).toBe('string')

    if (typeof url !== 'string') {
      throw new TypeError(`${skillFilePath} metadata.mcp_servers.${serverName}.url must be a string`)
    }

    expect(URL.canParse(url)).toBe(true)

    if (auth !== undefined) {
      expect(typeof auth).toBe('string')

      if (typeof auth !== 'string') {
        throw new TypeError(`${skillFilePath} metadata.mcp_servers.${serverName}.auth must be a string`)
      }

      expect(auth.length).toBeGreaterThan(0)
    }

    if (tools !== undefined) {
      expect(isStringArray(tools)).toBe(true)

      if (!isStringArray(tools)) {
        throw new TypeError(`${skillFilePath} metadata.mcp_servers.${serverName}.tools must be a string array`)
      }
    }

    if (avoidTools !== undefined) {
      expect(isStringArray(avoidTools)).toBe(true)

      if (!isStringArray(avoidTools)) {
        throw new TypeError(`${skillFilePath} metadata.mcp_servers.${serverName}.avoidTools must be a string array`)
      }
    }

    if (resources !== undefined) {
      expect(typeof resources).toBe('boolean')
    }

    if (prompts !== undefined) {
      expect(typeof prompts).toBe('boolean')
    }

    if (headers !== undefined) {
      expect(isRecord(headers)).toBe(true)

      if (!isRecord(headers)) {
        throw new TypeError(`${skillFilePath} metadata.mcp_servers.${serverName}.headers must be an object`)
      }

      for (const [headerName, headerValue] of Object.entries(headers)) {
        expect(headerName.length).toBeGreaterThan(0)
        expect(typeof headerValue).toBe('string')
      }
    }

    for (const field of Object.keys(serverConfig)) {
      expect(field === 'url' || mcpServerMetadataOptionalFields.has(field)).toBe(true)
    }
  }
}

const extractFrontmatter = (content: string) => {
  expect(content.startsWith('---\n')).toBe(true)

  const closingDelimiter = '\n---\n'
  const closingDelimiterIndex = content.indexOf(closingDelimiter, 4)

  expect(closingDelimiterIndex).toBeGreaterThan(0)

  return {
    yaml: content.slice(4, closingDelimiterIndex),
    body: content.slice(closingDelimiterIndex + closingDelimiter.length).trim(),
  }
}

const loadSkillFiles = async (): Promise<SkillFile[]> => {
  const paths = Array.from(
    skillFileGlob.scanSync({
      cwd: skillsRoot,
      onlyFiles: true,
    }),
  ).sort()

  return await Promise.all(
    paths.map(async (path) => {
      const absolutePath = join(skillsRoot, path)
      const raw = await Bun.file(absolutePath).text()
      const { yaml, body } = extractFrontmatter(raw)
      const parsed = YAML.parse(yaml)

      expect(isRecord(parsed)).toBe(true)

      if (!isRecord(parsed)) {
        throw new TypeError(`${absolutePath} frontmatter must be a YAML mapping`)
      }

      return {
        path: absolutePath,
        directoryName: basename(dirname(absolutePath)),
        frontmatter: parsed,
        body,
        raw,
      }
    }),
  )
}

describe('skills validation', () => {
  test('discovers only skill directories containing SKILL.md files', async () => {
    const skillFiles = await loadSkillFiles()
    const rootEntries = await readdir(skillsRoot, { withFileTypes: true })
    const skillDirectories = rootEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
    const discoveredDirectories = skillFiles.map((skillFile) => skillFile.directoryName).sort()

    expect(discoveredDirectories).toEqual(skillDirectories)
    expect(discoveredDirectories.length).toBeGreaterThan(0)

    for (const skillFile of skillFiles) {
      expect(await Bun.file(join(skillsRoot, skillFile.directoryName, 'SKILL.md')).exists()).toBe(true)
    }
  })

  test('skill directories contain only SKILL.md files and approved support directories', async () => {
    const skillFiles = await loadSkillFiles()

    for (const skillFile of skillFiles) {
      const entries = await readdir(dirname(skillFile.path))
      const expectedEntries = skillFile.directoryName === 'you-research' ? ['SKILL.md', 'references'] : ['SKILL.md']

      expect(entries.sort()).toEqual(expectedEntries)
    }
  })

  test('extracts YAML frontmatter and markdown body from every SKILL.md', async () => {
    const skillFiles = await loadSkillFiles()

    for (const skillFile of skillFiles) {
      const { body } = extractFrontmatter(skillFile.raw)

      expect(skillFile.raw.startsWith('---\n')).toBe(true)
      expect(skillFile.body.length).toBeGreaterThan(0)
      expect(body).toBe(skillFile.body)
    }
  })

  test('frontmatter uses only Agent Skills specification fields', async () => {
    const skillFiles = await loadSkillFiles()

    for (const skillFile of skillFiles) {
      const fields = Object.keys(skillFile.frontmatter).sort()

      expect(fields).toContain('name')
      expect(fields).toContain('description')

      for (const field of fields) {
        expect(allowedFrontmatterFields.has(field)).toBe(true)
      }
    }
  })

  test('name fields satisfy specification constraints', async () => {
    const skillFiles = await loadSkillFiles()
    const names = new Set<string>()

    for (const skillFile of skillFiles) {
      const name = skillFile.frontmatter['name']

      expect(typeof name).toBe('string')

      if (typeof name !== 'string') {
        throw new TypeError(`${skillFile.path} name must be a string`)
      }

      expect(name.length).toBeGreaterThan(0)
      expect(name.length).toBeLessThanOrEqual(64)
      expect(skillNamePattern.test(name)).toBe(true)
      expect(name).toBe(skillFile.directoryName)
      expect(names.has(name)).toBe(false)
      names.add(name)
    }
  })

  test('description fields satisfy specification constraints', async () => {
    const skillFiles = await loadSkillFiles()

    for (const skillFile of skillFiles) {
      const description = skillFile.frontmatter['description']

      expect(typeof description).toBe('string')

      if (typeof description !== 'string') {
        throw new TypeError(`${skillFile.path} description must be a string`)
      }

      expect(description.trim()).toBe(description)
      expect(description.length).toBeGreaterThan(0)
      expect(description.length).toBeLessThanOrEqual(1024)
    }
  })

  test('optional frontmatter fields satisfy specification constraints', async () => {
    const skillFiles = await loadSkillFiles()

    for (const skillFile of skillFiles) {
      const license = skillFile.frontmatter['license']
      const compatibility = skillFile.frontmatter['compatibility']
      const allowedTools = skillFile.frontmatter['allowed-tools']

      if (license !== undefined) {
        expect(typeof license).toBe('string')

        if (typeof license !== 'string') {
          throw new TypeError(`${skillFile.path} license must be a string`)
        }

        expect(license.trim().length).toBeGreaterThan(0)
      }

      if (compatibility !== undefined) {
        expect(typeof compatibility).toBe('string')

        if (typeof compatibility !== 'string') {
          throw new TypeError(`${skillFile.path} compatibility must be a string`)
        }

        expect(compatibility.trim()).toBe(compatibility)
        expect(compatibility.length).toBeGreaterThan(0)
        expect(compatibility.length).toBeLessThanOrEqual(500)
      }

      if (allowedTools !== undefined) {
        expect(typeof allowedTools).toBe('string')

        if (typeof allowedTools !== 'string') {
          throw new TypeError(`${skillFile.path} allowed-tools must be a string`)
        }

        expect(allowedTools.trim()).toBe(allowedTools)
        expect(allowedTools.split(' ').every((tool) => tool.length > 0)).toBe(true)
      }
    }
  })

  test('metadata fields are key-value string mappings when present', async () => {
    const skillFiles = await loadSkillFiles()

    for (const skillFile of skillFiles) {
      const metadata = skillFile.frontmatter['metadata']

      if (metadata !== undefined) {
        expect(isRecord(metadata)).toBe(true)

        if (!isRecord(metadata)) {
          throw new TypeError(`${skillFile.path} metadata must be a YAML mapping`)
        }

        for (const [key, value] of Object.entries(metadata)) {
          expect(key.length).toBeGreaterThan(0)
          expect(typeof value).toBe('string')

          if (typeof value !== 'string') {
            throw new TypeError(`${skillFile.path} metadata.${key} must be a string`)
          }

          expect(value.length).toBeGreaterThan(0)

          if (key === 'version') {
            expect(semanticVersionPattern.test(value)).toBe(true)
          }

          if (key === 'mcp_servers') {
            validateMcpServersMetadata({ skillFilePath: skillFile.path, value })
          }

          if (key.startsWith('mcp_')) {
            expect(key).toBe('mcp_servers')
          }
        }
      }
    }
  })

  test('SKILL.md content follows progressive disclosure recommendations', async () => {
    const skillFiles = await loadSkillFiles()

    for (const skillFile of skillFiles) {
      const lineCount = skillFile.raw.trimEnd().split('\n').length
      const relativePath = relative(repoRoot, skillFile.path)

      expect(relativePath).toBe(`skills/${skillFile.directoryName}/SKILL.md`)
      expect(lineCount).toBeLessThanOrEqual(500)
    }
  })
})
