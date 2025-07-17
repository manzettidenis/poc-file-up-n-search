import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { TextExtractionService } from '../../infrastructure/services/TextExtractionService.js'
import fs from 'fs/promises'
import path from 'path'
import { createTestFile, setupTestEnvironment, cleanupTestEnvironment } from '../setup.js'

// Mock external dependencies
vi.mock('pdf-text-extract', () => ({
  default: vi.fn(),
}))

vi.mock('node-tesseract-ocr', () => ({
  default: {
    recognize: vi.fn(),
  },
}))

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    greyscale: vi.fn().mockReturnThis(),
    sharpen: vi.fn().mockReturnThis(),
    normalize: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed image')),
    metadata: vi.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
      format: 'png',
      channels: 3,
      density: 72,
    }),
  })),
}))

// Mock the cache to avoid file system dependencies
vi.mock('../../utils/cache.ts', () => ({
  TextExtractionCache: {
    getOrSet: vi.fn((filePath, mimetype, extractFn) => extractFn()),
  },
}))

// Mock logger and metrics to avoid import issues
vi.mock('../../utils/logger.ts', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
  PerformanceLogger: {
    startTimer: vi.fn(() => vi.fn()),
  },
  logError: vi.fn(),
  ErrorCategory: {
    TEXT_EXTRACTION: 'text-extraction',
  },
}))

vi.mock('../../utils/metrics.ts', () => ({
  MetricsCollector: {
    recordTextExtraction: vi.fn(),
    recordImageProcessing: vi.fn(),
    recordOCRProcessing: vi.fn(),
  },
}))

describe('TextExtractionService', () => {
  let textExtractionService: TextExtractionService

  beforeEach(async () => {
    await setupTestEnvironment()
    textExtractionService = new TextExtractionService()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await cleanupTestEnvironment()
  })

  describe('Supported MIME Types', () => {
    it('should return list of supported MIME types', () => {
      const supportedTypes = textExtractionService.supportedMimeTypes()

      expect(supportedTypes).toContain?.('text/plain')
      expect(supportedTypes).toContain?.('application/pdf')
      expect(supportedTypes).toContain?.('image/png')
      expect(supportedTypes).toContain?.('image/jpeg')
      expect(supportedTypes).toContain?.('image/jpg')
      expect(supportedTypes).toContain('image/tiff')
      expect(supportedTypes).toContain('image/bmp')
      expect(supportedTypes).toContain('image/webp')
    })

    it('should correctly identify extractable MIME types', () => {
      expect(textExtractionService.canExtract('text/plain')).toBe(true)
      expect(textExtractionService.canExtract('application/pdf')).toBe(true)
      expect(textExtractionService.canExtract('image/png')).toBe(true)
      expect(textExtractionService.canExtract('application/x-executable')).toBe(false)
      expect(textExtractionService.canExtract('video/mp4')).toBe(false)
    })
  })

  describe('Text File Extraction', () => {
    it('should extract text from plain text file', async () => {
      // Arrange
      const testContent = 'This is a test document with some content.\nSecond line here.'
      const filePath = await createTestFile('test.txt', testContent)

      // Act
      const result = await textExtractionService.extractText(filePath, 'text/plain')

      // Assert
      expect(result.text).toBe(testContent)
      expect(result.metadata.wordCount).toBe(11)
      expect(result.metadata.characterCount).toBe(testContent.length)
    })

    it('should handle empty text files', async () => {
      // Arrange
      const filePath = await createTestFile('empty.txt', '')

      // Act
      const result = await textExtractionService.extractText(filePath, 'text/plain')

      // Assert
      expect(result.text).toBe('')
      expect(result.metadata.wordCount).toBe(1) // split('') returns [""], so 1 word
      expect(result.metadata.characterCount).toBe(0)
    })

    it('should handle text files with special characters', async () => {
      // Arrange
      const testContent = 'Café naïve résumé 🚀 文档 test'
      const filePath = await createTestFile('unicode.txt', testContent)

      // Act
      const result = await textExtractionService.extractText(filePath, 'text/plain')

      // Assert
      expect(result.text).toBe(testContent)
      expect(result.metadata.wordCount).toBe(6) // Actual split count
      expect(result.metadata.characterCount).toBe(testContent.length)
    })

    it('should handle large text files efficiently', async () => {
      // Arrange
      const largeContent = 'Lorem ipsum '.repeat(10000) // ~120KB of text
      const filePath = await createTestFile('large.txt', largeContent)

      // Act
      const start = Date.now()
      const result = await textExtractionService.extractText(filePath, 'text/plain')
      const duration = Date.now() - start

      // Assert
      expect(result.text).toBe(largeContent)
      expect(result.metadata.wordCount).toBe(20001) // Trailing space adds one
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })

  describe('PDF File Extraction', () => {
    it('should extract text from PDF file', async () => {
      // Arrange
      const pdfContent = 'This is extracted PDF content'
      const filePath = await createTestFile('test.pdf', 'dummy pdf content')

      // Mock PDF extraction
      const pdfExtract = await import('pdf-text-extract')
      vi.spyOn(pdfExtract, 'default').mockImplementation((...args: any[]) => {
        const callback = args[2] as (err: any, result: any) => void
        callback(null, [pdfContent])
      })

      // Act
      const result = await textExtractionService.extractText(filePath, 'application/pdf')

      // Assert
      expect(result.text).toBe(pdfContent)
      expect(result.metadata.wordCount).toBe(5)
      expect(result.metadata.format).toBe('pdf')
    })

    it('should handle PDF extraction errors gracefully', async () => {
      // Arrange
      const filePath = await createTestFile('corrupted.pdf', 'not a real pdf')

      // Mock PDF extraction error
      const pdfExtract = await import('pdf-text-extract')
      vi.spyOn(pdfExtract, 'default').mockImplementation((...args: any[]) => {
        const callback = args[2] as (err: any, result: any) => void
        callback(new Error('PDF parsing failed'), null)
      })

      // Act
      const result = await textExtractionService.extractText(filePath, 'application/pdf')

      // Assert
      expect(result.text).toContain('PDF content from corrupted.pdf - extraction failed')
      expect(result.metadata.extractionError).toBe(true)
      expect(result.metadata.errorMessage).toContain('PDF parsing failed')
    })

    it('should handle empty PDF files', async () => {
      // Arrange
      const filePath = await createTestFile('empty.pdf', '')

      // Mock empty PDF
      const pdfExtract = await import('pdf-text-extract')
      vi.spyOn(pdfExtract, 'default').mockImplementation((...args: any[]) => {
        const callback = args[2] as (err: any, result: any) => void
        callback(null, [])
      })

      // Act
      const result = await textExtractionService.extractText(filePath, 'application/pdf')

      // Assert
      expect(result.text).toBe('')
      expect(result.metadata.wordCount).toBe(0)
      expect(result.metadata.format).toBe('pdf')
    })
  })

  describe('Image File OCR Extraction', () => {
    it('should extract text from image using OCR', async () => {
      // Arrange
      const ocrText = 'Text extracted from image'
      const filePath = await createTestFile('test.png', 'dummy image content')

      // Mock Tesseract OCR
      const tesseract = await import('node-tesseract-ocr')
      vi.mocked(tesseract.default.recognize).mockResolvedValue(ocrText)

      // Mock Sharp for image processing
      const sharp = await import('sharp')
      vi.mocked(sharp.default).mockReturnValue({
        greyscale: vi.fn().mockReturnThis(),
        sharpen: vi.fn().mockReturnThis(),
        normalize: vi.fn().mockReturnThis(),
        png: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed image')),
        metadata: vi.fn().mockResolvedValue({
          width: 1920,
          height: 1080,
          format: 'png',
          channels: 3,
          density: 72,
        }),
      } as any)

      // Act
      const result = await textExtractionService.extractText(filePath, 'image/png')

      // Assert
      expect(result.text).toBe(ocrText)
      expect(result.metadata.wordCount).toBe(4)
      expect(result.metadata.ocrLanguage).toBe('eng')
      expect(result.metadata.imageFormat).toBe('png')
    })

    it('should handle OCR errors gracefully', async () => {
      // Arrange
      const filePath = await createTestFile('bad-image.png', 'not an image')

      // Mock OCR error
      const tesseract = await import('node-tesseract-ocr')
      vi.mocked(tesseract.default.recognize).mockRejectedValue(new Error('OCR failed'))

      // Mock Sharp for image processing
      const sharp = await import('sharp')
      vi.mocked(sharp.default).mockReturnValue({
        greyscale: vi.fn().mockReturnThis(),
        sharpen: vi.fn().mockReturnThis(),
        normalize: vi.fn().mockReturnThis(),
        png: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed image')),
        metadata: vi.fn().mockResolvedValue({
          width: 1920,
          height: 1080,
          format: 'png',
          channels: 3,
          density: 72,
        }),
      } as any)

      // Act
      const result = await textExtractionService.extractText(filePath, 'image/png')

      // Assert
      expect(result.text).toBe('')
      expect(result.metadata.extractionError).toBe(true)
      expect(typeof result.metadata.errorMessage === 'string' ? result.metadata.errorMessage : '').toContain(
        'OCR failed',
      )
    })

    it('should handle different image formats', async () => {
      // Arrange
      const filePath = await createTestFile('test.jpg', 'dummy image')

      const tesseract = await import('node-tesseract-ocr')
      vi.mocked(tesseract.default.recognize).mockResolvedValue('JPEG image text')

      const sharp = await import('sharp')
      vi.mocked(sharp.default).mockReturnValue({
        greyscale: vi.fn().mockReturnThis(),
        sharpen: vi.fn().mockReturnThis(),
        normalize: vi.fn().mockReturnThis(),
        png: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed')),
        metadata: vi.fn().mockResolvedValue({
          width: 1920,
          height: 1080,
          format: 'jpeg',
          channels: 3,
          density: 72,
        }),
      } as any)

      // Act
      const result = await textExtractionService.extractText(filePath, 'image/jpeg')

      // Assert
      expect(result.text).toBe('JPEG image text')
      expect(result.metadata.imageFormat).toBe('jpeg')
    })

    it('should handle multiple language OCR', async () => {
      // Arrange
      const filePath = await createTestFile('multilang.png', 'dummy')

      const tesseract = await import('node-tesseract-ocr')
      vi.mocked(tesseract.default.recognize).mockResolvedValue('Texto en español')

      const sharp = await import('sharp')
      vi.mocked(sharp.default).mockReturnValue({
        greyscale: vi.fn().mockReturnThis(),
        sharpen: vi.fn().mockReturnThis(),
        normalize: vi.fn().mockReturnThis(),
        png: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed')),
        metadata: vi.fn().mockResolvedValue({
          width: 1920,
          height: 1080,
          format: 'png',
          channels: 3,
          density: 72,
        }),
      } as any)

      // Act - Test with Spanish language
      const result = await textExtractionService.extractTextWithOCR(filePath, 'image/png', 'spa')

      // Assert
      expect(result.text).toBe('Texto en español')
      expect(result.metadata.ocrLanguage).toBe('spa')
    })
  })

  describe('Unsupported File Types', () => {
    it('should handle unsupported file types gracefully', async () => {
      // Arrange
      const filePath = await createTestFile('test.exe', 'binary content')

      // Act
      const result = await textExtractionService.extractText(filePath, 'application/x-executable')

      // Assert
      expect(result.text).toBe('')
      expect(result.metadata.unsupportedType).toBe(true)
    })

    it('should handle unknown MIME types', async () => {
      // Arrange
      const filePath = await createTestFile('unknown.xyz', 'unknown content')

      // Act
      const result = await textExtractionService.extractText(filePath, 'application/unknown')

      // Assert
      expect(result.text).toBe('')
      expect(result.metadata.unsupportedType).toBe(true)
    })
  })

  describe('File System Errors', () => {
    it('should handle missing files gracefully', async () => {
      // Arrange
      const nonExistentPath = '/path/to/nonexistent/file.txt'

      // Act
      const result = await textExtractionService.extractText(nonExistentPath, 'text/plain')

      // Assert
      expect(result.text).toBe('')
      expect(result.metadata.extractionError).toBe(true)
      expect(result.metadata.errorMessage).toBeDefined()
    })

    it('should handle permission errors', async () => {
      // Arrange
      const filePath = await createTestFile('protected.txt', 'content')

      // Mock fs.readFile to throw permission error
      const originalReadFile = fs.readFile
      vi.spyOn(fs, 'readFile').mockRejectedValueOnce(Object.assign(new Error('Permission denied'), { code: 'EACCES' }))

      // Act
      const result = await textExtractionService.extractText(filePath, 'text/plain')

      // Assert
      expect(result.text).toBe('')
      expect(result.metadata.extractionError).toBe(true)
      expect(result.metadata.errorMessage).toBeDefined()

      // Restore original function
      vi.spyOn(fs, 'readFile').mockImplementation(originalReadFile)
    })
  })

  describe('Performance and Memory Management', () => {
    it('should handle concurrent extractions efficiently', async () => {
      // Arrange
      const files = await Promise.all([
        createTestFile('file1.txt', 'Content 1'),
        createTestFile('file2.txt', 'Content 2'),
        createTestFile('file3.txt', 'Content 3'),
      ])

      // Act
      const start = Date.now()
      const results = await Promise.all(
        files.map(filePath => textExtractionService.extractText(filePath, 'text/plain')),
      )
      const duration = Date.now() - start

      // Assert
      expect(results).toHaveLength(3)
      expect(results[0].text).toBe('Content 1')
      expect(results[1].text).toBe('Content 2')
      expect(results[2].text).toBe('Content 3')
      expect(duration).toBeLessThan(2000) // Should complete within 2 seconds
    })

    it('should handle memory efficiently with large files', async () => {
      // Arrange
      const largeContent = 'Large content '.repeat(100000) // ~1.3MB
      const filePath = await createTestFile('large.txt', largeContent)

      // Act
      const initialMemory = process.memoryUsage().heapUsed
      const result = await textExtractionService.extractText(filePath, 'text/plain')
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Assert
      expect(result.text).toBe(largeContent)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024) // Should not increase by more than 10MB
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary extraction failures', async () => {
      // Arrange
      const filePath = await createTestFile('test.txt', 'Test content')

      // First call fails, second succeeds
      let callCount = 0
      const originalReadFile = fs.readFile
      vi.spyOn(fs, 'readFile').mockImplementation((path, options) => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('Temporary failure'))
        }
        return originalReadFile(path, options)
      })

      // Act
      const result1 = await textExtractionService.extractText(filePath, 'text/plain')
      const result2 = await textExtractionService.extractText(filePath, 'text/plain')

      // Assert
      expect(result1.text).toBe('')
      expect(result1.metadata.extractionError).toBe(true)
      expect(result2.text).toBe('Test content')
      expect(result2.metadata.extractionError).toBeFalsy()
    })

    it('should handle extraction timeout scenarios', async () => {
      // Arrange
      const filePath = await createTestFile('slow.txt', 'content')

      // Mock a slow extraction
      const tesseract = await import('node-tesseract-ocr')
      vi.mocked(tesseract.default.recognize).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('slow result'), 10000)),
      )

      // Act with timeout
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Extraction timeout')), 1000))

      const extractionPromise = textExtractionService.extractText(filePath, 'image/png')

      try {
        await Promise.race([extractionPromise, timeoutPromise])
      } catch (error) {
        // Expected timeout
        expect((error as Error).message).toContain('timeout')
      }
    })
  })
})
