// Test setup and global configurations
import { beforeEach, afterEach, vi } from 'vitest'

// Mock fetch globally
global.fetch = vi.fn()

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'localhost',
    port: '3000',
  },
  writable: true,
})

// Mock console methods in tests
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks()

  // Mock console methods to avoid noise in test output
  console.error = vi.fn()
  console.warn = vi.fn()
})

afterEach(() => {
  // Restore console methods
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})
