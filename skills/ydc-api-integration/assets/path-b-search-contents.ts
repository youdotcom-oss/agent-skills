const YDC_API_KEY = process.env.YDC_API_KEY
if (!YDC_API_KEY) throw new Error('YDC_API_KEY environment variable is required')

type WebResult = {
  url: string
  title: string
  description: string
  snippets: string[]
}

type SearchResponse = {
  results: { web: WebResult[] }
}

type ContentsResult = {
  url: string
  title: string
  markdown: string | null
}

const search = async (query: string): Promise<SearchResponse> => {
  const url = new URL('https://ydc-index.io/v1/search')
  url.searchParams.set('query', query)
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'X-API-Key': YDC_API_KEY },
  })
  if (!resp.ok) throw new Error(`Search API error: ${resp.status}`)
  return resp.json() as Promise<SearchResponse>
}

const getContents = async (urls: string[]): Promise<ContentsResult[]> => {
  const resp = await fetch('https://ydc-index.io/v1/contents', {
    method: 'POST',
    headers: {
      'X-API-Key': YDC_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ urls, formats: ['markdown'] }),
  })
  if (!resp.ok) throw new Error(`Contents API error: ${resp.status}`)
  return resp.json() as Promise<ContentsResult[]>
}

export const run = async (prompt: string): Promise<string> => {
  const searchData = await search(prompt)
  const urls = searchData.results.web.slice(0, 3).map((r) => r.url)
  const contents = await getContents(urls)
  return contents
    .map((c) => `# ${c.title}\n${c.markdown ?? 'No content'}`)
    .join('\n\n---\n\n')
}

if (import.meta.main) {
  console.log(await run('Search the web for the three branches of the US government'))
}
