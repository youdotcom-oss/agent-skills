import { $ } from 'bun'

const examples = {
  search: 'examples/basic-search.ts',
  agent: 'examples/agent-response.ts',
  extract: 'examples/content-extraction.ts',
  stream: 'examples/streaming-text.ts',
  error: 'examples/error-handling.ts',
} as const

const showUsage = () => {}

const main = async () => {
  const exampleName = process.argv[2] || 'search'

  if (exampleName === 'help' || exampleName === '--help' || exampleName === '-h') {
    showUsage()
    process.exit(0)
  }

  if (!(exampleName in examples)) {
    showUsage()
    process.exit(1)
  }

  const examplePath = examples[exampleName as keyof typeof examples]
  const fullPath = Bun.resolveSync(`../${examplePath}`, import.meta.dir)

  try {
    await $`bun ${fullPath}`
  } catch (error) {
    if (error instanceof Error) {
    }
    process.exit(1)
  }
}

main()
