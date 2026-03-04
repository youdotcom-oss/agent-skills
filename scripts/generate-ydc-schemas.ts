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
    const result = await Bun.$`bun ${CLI} ${cmd} --schema ${dir}`.quiet()
    const json = result.text()
    // Pretty-print for readability
    const formatted = JSON.stringify(JSON.parse(json), null, 2)
    const outPath = join(ASSETS, `${cmd}.${dir}.schema.json`)
    await Bun.write(outPath, `${formatted}\n`)
    console.log(`  ${cmd}.${dir}.schema.json`)
  }
}

console.log(`\n✓ Generated ${COMMANDS.length * DIRECTIONS.length} schemas in ${ASSETS}`)
