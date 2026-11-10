import agent from '@convex-dev/agent/convex.config'
import youSearch from '@youdotcom-oss/convex-search/convex.config.js'
import { defineApp } from 'convex/server'

const app = defineApp()
app.use(youSearch)
app.use(agent)

export default app
