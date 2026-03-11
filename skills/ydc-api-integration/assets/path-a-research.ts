const YDC_API_KEY = process.env.YDC_API_KEY
if (!YDC_API_KEY) throw new Error('YDC_API_KEY environment variable is required')

type Source = {
  url: string
  title?: string
  snippets?: string[]
}

type ResearchResponse = {
  output: {
    content: string
    content_type: string
    sources: Source[]
  }
}

const research = async (input: string, effort = 'standard'): Promise<ResearchResponse> => {
  const resp = await fetch('https://api.you.com/v1/research', {
    method: 'POST',
    headers: {
      'X-API-Key': YDC_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input, research_effort: effort }),
  })
  if (!resp.ok) throw new Error(`Research API error: ${resp.status}`)
  return resp.json() as Promise<ResearchResponse>
}

export const run = async (prompt: string): Promise<string> => {
  const data = await research(prompt)
  return data.output.content
}

if (import.meta.main) {
  console.log(await run('Search the web for the three branches of the US government'))
}
