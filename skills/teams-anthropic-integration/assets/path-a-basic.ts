import { AnthropicChatModel, AnthropicModel } from '@youdotcom-oss/teams-anthropic'

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required')
}

/**
 * Claude Sonnet 4.5 model configured for Teams message handling.
 *
 * @remarks
 * Validates the required API key at module load time so failures surface
 * immediately rather than on the first message. Use `model.send()` to
 * interact with Claude from Teams.ai message handlers.
 *
 * @public
 */
export const model = new AnthropicChatModel({
  model: AnthropicModel.CLAUDE_SONNET_4_5,
  apiKey: process.env.ANTHROPIC_API_KEY,
  requestOptions: {
    max_tokens: 2048,
    temperature: 0.7,
  },
})
