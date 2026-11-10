// MINIMAL: Biome (root biome.json) lints and formats this package like every
// other. ESLint runs only the type-aware rules Biome cannot express: the
// Convex component rules and floating-promise detection. Drop this file if
// Biome gains equivalents.
import convexPlugin from '@convex-dev/eslint-plugin'
import tseslint from 'typescript-eslint'

export default [
  { ignores: ['dist/**', 'example/dist/**', '**/_generated/', '**/*.config.{js,ts}'] },
  {
    files: ['src/**/*.ts', 'example/convex/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json', './example/convex/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { '@convex-dev': convexPlugin, '@typescript-eslint': tseslint.plugin },
    rules: {
      ...convexPlugin.configs.recommended[0].rules,
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
]
