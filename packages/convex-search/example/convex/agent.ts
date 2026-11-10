import { openai } from '@ai-sdk/openai'
import { Agent } from '@convex-dev/agent'
import { YouSearch } from '@youdotcom-oss/convex-search'
import { youSearchTool } from '@youdotcom-oss/convex-search/agent'
import { v } from 'convex/values'
import { components } from './_generated/api.js'
import { action } from './_generated/server.js'

const youSearch = new YouSearch(components.youSearch)

// Any AI SDK model works here. This example needs OPENAI_API_KEY set on the
// deployment; the search tool itself works keyless.
export const researcher = new Agent(components.agent, {
  name: 'Researcher',
  languageModel: openai.chat('gpt-4o-mini'),
  instructions: 'Answer using the webSearch tool for anything that may have changed recently. Cite the URLs you used.',
  tools: { webSearch: youSearchTool(youSearch, { maxCount: 8 }) },
  maxSteps: 4,
})

export const ask = action({
  args: { prompt: v.string() },
  handler: async (ctx, args) => {
    const { thread } = await researcher.createThread(ctx, {})
    const result = await thread.generateText({ prompt: args.prompt })
    return result.text
  },
})
