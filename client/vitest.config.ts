import { defineConfig } from 'vitest/config'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/__tests__/setup.ts'],
    globals: true,
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'src/__tests__/', '**/*.d.ts', 'dist/', 'coverage/'],
    },
  },
  resolve: {
    conditions: ['development', 'browser'],
  },
})
