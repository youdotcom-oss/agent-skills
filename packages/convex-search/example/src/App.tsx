import './App.css'
import { useAction, useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '../convex/_generated/api'

type Freshness = 'day' | 'week' | 'month' | 'year' | undefined

function App() {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [freshness, setFreshness] = useState<Freshness>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const search = useAction(api.example.search)
  // Reactive: updates as soon as the action stores results in the cache.
  const cached = useQuery(api.example.cached, query ? { query, freshness } : 'skip')
  const recent = useQuery(api.example.recent)

  const run = async (q: string, force = false) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setQuery(trimmed)
    setError(null)
    setLoading(true)
    try {
      await search({ query: trimmed, freshness, force })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h1>You.com search for Convex</h1>
      <div className="card">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void run(input)
          }}
          style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search the web"
            style={{ padding: '0.5rem', width: '60%' }}
          />
          <select value={freshness ?? ''} onChange={(e) => setFreshness((e.target.value || undefined) as Freshness)}>
            <option value="">Any time</option>
            <option value="day">Past day</option>
            <option value="week">Past week</option>
            <option value="month">Past month</option>
            <option value="year">Past year</option>
          </select>
          <button type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
        {error && <p style={{ color: '#c62828' }}>{error}</p>}
        {cached && (
          <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>
            {cached.results.length} results from the {cached.source} API, fetched{' '}
            {new Date(cached.fetchedAt).toLocaleTimeString()}, cached until{' '}
            {new Date(cached.expiresAt).toLocaleTimeString()}.{' '}
            <button type="button" onClick={() => void run(query, true)}>
              Refresh
            </button>
          </p>
        )}
        <ol style={{ textAlign: 'left' }}>
          {cached?.results.map((r) => (
            <li key={r.url} style={{ marginBottom: '1rem' }}>
              <a href={r.url} target="_blank" rel="noopener noreferrer">
                {r.title}
              </a>
              <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                {r.url}
                {r.pageAge ? ` (${r.pageAge.slice(0, 10)})` : ''}
              </div>
              <div style={{ fontSize: '0.9rem' }}>{(r.highlights ?? r.snippets)?.[0] ?? r.description}</div>
            </li>
          ))}
        </ol>
        {recent && recent.length > 0 && (
          <>
            <h3>Recent searches</h3>
            <ul style={{ textAlign: 'left' }}>
              {recent.map((r) => (
                <li key={`${r.query}-${r.fetchedAt}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setInput(r.query)
                      void run(r.query)
                    }}
                  >
                    {r.query}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  )
}

export default App
