import { defineConfig } from 'vitest/config'

// Firestore security-rules tests run against the emulator and live outside
// src/ so the default unit-test run (npm test) never touches them. Invoke via
// `npm run test:rules`, which wraps this in `firebase emulators:exec`.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Rules tests share one emulator; run them in a single worker to avoid
    // cross-test interference on clearFirestore().
    fileParallelism: false,
  },
})
