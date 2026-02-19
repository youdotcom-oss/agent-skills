import { MySdk } from 'my-sdk'

if (!process.env.MY_API_KEY) {
  throw new Error('MY_API_KEY environment variable is required')
}

export const run = async (prompt: string): Promise<string> => {
  const client = new MySdk({
    apiKey: process.env.MY_API_KEY,
  })

  const result = await client.query(prompt)
  return result.text
}

if (import.meta.main) {
  console.log(await run('What are the three branches of the US government?'))
}
