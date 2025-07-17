import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.PORT = '3001'
process.env.UPLOAD_SIZE_LIMIT = '50'

// Create test uploads directory
const testUploadsDir = path.join(__dirname, '../../test-uploads')

export const setupTestEnvironment = async () => {
  // Ensure test uploads directory exists
  try {
    await fs.access(testUploadsDir)
  } catch {
    await fs.mkdir(testUploadsDir, { recursive: true })
  }
}

export const cleanupTestEnvironment = async () => {
  // Clean up test uploads
  try {
    await fs.rm(testUploadsDir, { recursive: true, force: true })
  } catch {
    // Directory might not exist
  }
}

export const createTestFile = async (filename: string, content: string): Promise<string> => {
  const filePath = path.join(testUploadsDir, filename)
  await fs.writeFile(filePath, content)
  return filePath
}
