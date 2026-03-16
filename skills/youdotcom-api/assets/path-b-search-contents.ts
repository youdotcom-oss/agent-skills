const YDC_API_KEY = process.env.YDC_API_KEY
if (!YDC_API_KEY) throw new Error('YDC_API_KEY environment variable is required')

type WebResult = {
  url: string
  title: string
  description: string
  snippets: string[]
  thumbnail_url?: string
  page_age?: string
  authors?: string[]
  favicon_url?: string
  contents?: { html?: string; markdown?: string }
}

type NewsResult = {
  url: string
  title: string
  description: string
  thumbnail_url?: string
  page_age?: string
  contents?: { html?: string; markdown?: string }
}

type SearchResponse = {
  results: { web?: WebResult[]; news?: NewsResult[] }
  metadata: { search_uuid: string; query: string; latency: number }
}

type ContentsResult = {
  url: string
  title: string | null
  markdown: string | null
}

const search = async (query: string): Promise<SearchResponse> => {
  const url = new URL('https://ydc-index.io/v1/search')
  url.searchParams.set('query', query)
  const resp = await fetch(url, {
    headers: { 'X-API-Key': YDC_API_KEY },
  })
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`Search API error ${resp.status}: ${body}`)
  }
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
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`Contents API error ${resp.status}: ${body}`)
  }
  return resp.json() as Promise<ContentsResult[]>
}

export const run = async (prompt: string): Promise<string> => {
  const searchData = await search(prompt)
  const webUrls = (searchData.results.web ?? []).map((r) => r.url)
  const newsUrls = (searchData.results.news ?? []).map((r) => r.url)
  const urls = [...webUrls, ...newsUrls].slice(0, 3)
  if (urls.length === 0) return 'No results found'
  const contents = await getContents(urls)
  return contents.map((c) => `# ${c.title ?? 'Untitled'}\n${c.markdown ?? 'No content'}`).join('\n\n---\n\n')
}

if (import.meta.main) {
  console.log(await run('Search the web for the three branches of the US government'))
}
