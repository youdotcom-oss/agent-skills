import { cronJobs } from 'convex/server'
import { internal } from './_generated/api.js'

const crons = cronJobs()

// Delete expired cache rows so the table does not grow without bound.
crons.interval('delete expired You.com search cache rows', { hours: 1 }, internal.lib.deleteExpired, {})

export default crons
