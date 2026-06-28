import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config([
  {
    ignores: ['dist', 'dev-dist', 'node_modules'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactRefresh.configs.vite,
    ],
    // react-hooks v7's preset still ships `plugins` as a legacy array, which
    // ESLint 10 flat config rejects — register the plugin by hand and pull in
    // only its rules.
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      // AGENTS.md: no `any` without an inline comment explaining why.
      // The recommended set warns; we hold it as an error so it can't
      // slip in silently — opt out per-line with a reasoned comment.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
])
