/**
 * Generate JSON Schema files from the @youdotcom-oss/api ydc CLI.
 *
 * @remarks
 * Shells out to the installed `ydc` binary from @youdotcom-oss/api to extract
 * Zod v4 JSON Schemas for each command's input and output shapes.
 * Writes 6 files to `skills/youdotcom-api/assets/`.
 *
 * @public
 */

import { join } from 'node:path'

const YDC = Bun.which('ydc')
if (!YDC) {
  console.error('ydc binary not found — install @youdotcom-oss/api first')
  process.exit(1)
}
const ROOT = import.meta.dir.replace(/\/scripts$/, '')
const ASSETS = join(ROOT, 'skills/youdotcom-api/assets')

const COMMANDS = ['search', 'research', 'contents'] as const
const DIRECTIONS = ['input', 'output'] as const

await Bun.$`mkdir -p ${ASSETS}`.quiet()

type JsonSchema = {
  required?: string[]
  properties?: Record<string, { default?: unknown }>
  [key: string]: unknown
}

for (const cmd of COMMANDS) {
  for (const dir of DIRECTIONS) {
    let schema: JsonSchema
    try {
      const result = await Bun.$`${YDC} ${cmd} --schema ${dir}`.quiet()
      schema = JSON.parse(result.text()) as JsonSchema
    } catch (e) {
      console.error(`  Failed ${cmd}.${dir}: ${e}`)
      continue
    }
    // Zod v4's toJSONSchema marks .default() fields as required even when
    // .optional() — strip them from required since defaults make them optional
    if (dir === 'input' && schema.required && schema.properties) {
      const props = schema.properties
      schema.required = schema.required.filter((field) => {
        const prop = props[field]
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
