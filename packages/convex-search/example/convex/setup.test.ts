/// <reference types="vite/client" />

import youSearch from '@youdotcom-oss/convex-search/test'
import { convexTest } from 'convex-test'
import { test } from 'vitest'
import schema from './schema.js'

const modules = import.meta.glob('./**/*.*s')

// Apps that use the component register it with its schema and modules.
export function initConvexTest() {
  const t = convexTest(schema, modules)
  youSearch.register(t)
  return t
}

test('setup', () => {})
