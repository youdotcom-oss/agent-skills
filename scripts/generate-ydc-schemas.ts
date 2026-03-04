/**
 * Generate JSON Schema files from dx-toolkit's ydc CLI.
 *
 * @remarks
 * Shells out to the locally-checked-out dx-toolkit CLI to extract
 * Zod v4 JSON Schemas for each command's input and output shapes.
 * Writes 6 files to `skills/youdotcom-cli/assets/`.
 *
 * @public
 */

import { join } from 'node:path'

const ROOT = import.meta.dir.replace(/\/scripts$/, '')
const CLI = join(ROOT, '../dx-toolkit/packages/api/src/cli.ts')
const ASSETS = join(ROOT, 'skills/youdotcom-cli/assets')

const COMMANDS = ['search', 'research', 'contents'] as const
const DIRECTIONS = ['input', 'output'] as const

await Bun.$`mkdir -p ${ASSETS}`.quiet()

for (const cmd of COMMANDS) {
  for (const dir of DIRECTIONS) {
    let schema: Record<string, unknown>
    try {
      const result = await Bun.$`bun ${CLI} ${cmd} --schema ${dir}`.quiet()
      schema = JSON.parse(result.text())
    } catch (e) {
      console.error(`  Failed ${cmd}.${dir}: ${e}`)
      continue
    }
    // Zod v4's toJSONSchema marks .default() fields as required even when
    // .optional() — strip them from required since defaults make them optional
    if (dir === 'input' && schema.required && schema.properties) {
      schema.required = schema.required.filter((field: string) => {
        const prop = schema.properties[field]
        return prop?.default === undefined
      })
      if (schema.required.length === 0) delete schema.required
    }
    const formatted = JSON.stringify(schema, null, 2)
    const outPath = join(ASSETS, `${cmd}.${dir}.schema.json`)
    await Bun.write(outPath, `${formatted}\n`)
    console.log(`  ${cmd}.${dir}.schema.json`)
  }
}

console.log(`\n✓ Generated ${COMMANDS.length * DIRECTIONS.length} schemas in ${ASSETS}`)
