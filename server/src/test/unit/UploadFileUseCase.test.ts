import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UploadFileUseCase, UploadFileRequest } from '../../application/use-cases/UploadFileUseCase.js'
import { IFileRepository } from '../../domain/repositories/IFileRepository.js'
import { ITextExtractionService } from '../../domain/services/ITextExtractionService.js'
import { File } from '../../domain/entities/File.js'
import { TextExtractionResult, SearchQuery, SearchResult } from '../../types/index.js'

// Mock implementations
class MockFileRepository implements IFileRepository {
  save = vi.fn()
  findById = vi.fn()
  findByFilename = vi.fn()
  findAll = vi.fn()
  delete = vi.fn()
  search = vi.fn()
  update = vi.fn()
  count = vi.fn()
  exists = vi.fn()
}

class MockTextExtractionService implements ITextExtractionService {
  extractText = vi.fn()
  supportedMimeTypes = vi.fn(() => ['text/plain', 'application/pdf', 'image/png', 'image/jpeg'])
  canExtract = vi.fn((mimetype: string) => this.supportedMimeTypes().includes(mimetype))
}

describe('UploadFileUseCase', () => {
  let uploadFileUseCase: UploadFileUseCase
  let mockFileRepository: MockFileRepository
  let mockTextExtractionService: MockTextExtractionService

  beforeEach(() => {
    mockFileRepository = new MockFileRepository()
    mockTextExtractionService = new MockTextExtractionService()
    uploadFileUseCase = new UploadFileUseCase(mockFileRepository, mockTextExtractionService)
  })

  const validUploadRequest: UploadFileRequest = {
    filename: 'test-file-123.txt',
    originalName: 'test.txt',
    mimetype: 'text/plain',
    size: 1024,
    path: '/uploads/test-file-123.txt',
  }

  describe('Successful Upload', () => {
    it('should upload a valid text file successfully', async () => {
      // Arrange
      const extractionResult: TextExtractionResult = {
        text: 'This is test content',
        metadata: { wordCount: 4 },
      }

      mockTextExtractionService.extractText.mockResolvedValue(extractionResult)

      const savedFile = File.create({
        filename: validUploadRequest.filename,
        originalName: validUploadRequest.originalName,
        mimetype: validUploadRequest.mimetype,
        size: validUploadRequest.size,
        path: validUploadRequest.path,
        extractedText: extractionResult.text,
        metadata: extractionResult.metadata,
      })

      mockFileRepository.save.mockResolvedValue(savedFile)

      // Act
      const result = await uploadFileUseCase.execute(validUploadRequest)

      // Assert
      expect(result.success).toBe(true)
      expect(result.file).toBeDefined()
      expect(result.file?.originalName).toBe('test.txt')
      expect(result.file?.extractedText).toBe('This is test content')
      expect(mockTextExtractionService.extractText).toHaveBeenCalledWith(
        validUploadRequest.path,
        validUploadRequest.mimetype,
      )
      expect(mockFileRepository.save).toHaveBeenCalled()
    })

    it('should handle empty filename gracefully', async () => {
      // Arrange
      const emptyNameRequest: UploadFileRequest = {
        ...validUploadRequest,
        filename: '',
        originalName: '',
      }

      // Act
      const result = await uploadFileUseCase.execute(emptyNameRequest)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('Filename cannot be empty')
      expect(mockTextExtractionService.extractText).not.toHaveBeenCalled()
      expect(mockFileRepository.save).not.toHaveBeenCalled()
    })

    it('should handle PDF files correctly', async () => {
      // Arrange
      const pdfRequest: UploadFileRequest = {
        ...validUploadRequest,
        filename: 'document-123.pdf',
        originalName: 'document.pdf',
        mimetype: 'application/pdf',
      }

      const extractionResult: TextExtractionResult = {
        text: 'PDF content extracted successfully',
        metadata: {
          wordCount: 4,
          pageCount: 2,
          author: 'Test Author',
        },
      }

      mockTextExtractionService.extractText.mockResolvedValue(extractionResult)
      mockFileRepository.save.mockResolvedValue(
        File.create({
          filename: pdfRequest.filename,
          originalName: pdfRequest.originalName,
          mimetype: pdfRequest.mimetype,
          size: pdfRequest.size,
          path: pdfRequest.path,
          extractedText: extractionResult.text,
          metadata: extractionResult.metadata,
        }),
      )

      // Act
      const result = await uploadFileUseCase.execute(pdfRequest)

      // Assert
      expect(result.success).toBe(true)
      expect(mockTextExtractionService.extractText).toHaveBeenCalledWith(pdfRequest.path, 'application/pdf')
    })

    it('should handle image files with OCR', async () => {
      // Arrange
      const imageRequest: UploadFileRequest = {
        ...validUploadRequest,
        filename: 'screenshot-123.png',
        originalName: 'screenshot.png',
        mimetype: 'image/png',
      }

      const extractionResult: TextExtractionResult = {
        text: 'Text extracted from image via OCR',
        metadata: {
          wordCount: 6,
          ocrLanguage: 'eng',
          imageWidth: 1920,
          imageHeight: 1080,
        },
      }

      mockTextExtractionService.extractText.mockResolvedValue(extractionResult)
      mockFileRepository.save.mockResolvedValue(
        File.create({
          filename: imageRequest.filename,
          originalName: imageRequest.originalName,
          mimetype: imageRequest.mimetype,
          size: imageRequest.size,
          path: imageRequest.path,
          extractedText: extractionResult.text,
          metadata: extractionResult.metadata,
        }),
      )

      // Act
      const result = await uploadFileUseCase.execute(imageRequest)

      // Assert
      expect(result.success).toBe(true)
      expect(mockTextExtractionService.extractText).toHaveBeenCalledWith(imageRequest.path, 'image/png')
    })
  })

  describe('File Validation', () => {
    it('should reject files that are too large', async () => {
      // Arrange
      const largeFileRequest: UploadFileRequest = {
        ...validUploadRequest,
        size: 100 * 1024 * 1024, // 100MB (exceeds typical limit)
      }

      // Act
      const result = await uploadFileUseCase.execute(largeFileRequest)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('size')
      expect(mockTextExtractionService.extractText).not.toHaveBeenCalled()
      expect(mockFileRepository.save).not.toHaveBeenCalled()
    })

    it('should reject files with invalid file types', async () => {
      // Arrange
      const invalidFileRequest: UploadFileRequest = {
        ...validUploadRequest,
        filename: 'virus.exe',
        originalName: 'virus.exe',
        mimetype: 'application/x-executable',
      }

      // Act
      const result = await uploadFileUseCase.execute(invalidFileRequest)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('type') // Should mention file type issue
      expect(mockTextExtractionService.extractText).not.toHaveBeenCalled()
      expect(mockFileRepository.save).not.toHaveBeenCalled()
    })

    it('should reject files with empty or invalid names', async () => {
      // Arrange
      const invalidNameRequest: UploadFileRequest = {
        ...validUploadRequest,
        filename: '',
        originalName: '',
      }

      // Act
      const result = await uploadFileUseCase.execute(invalidNameRequest)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(mockTextExtractionService.extractText).not.toHaveBeenCalled()
      expect(mockFileRepository.save).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle text extraction errors gracefully', async () => {
      // Arrange
      mockTextExtractionService.extractText.mockRejectedValue(new Error('Text extraction failed'))

      // Act
      const result = await uploadFileUseCase.execute(validUploadRequest)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      // Implementation may save a file with extraction error metadata (graceful degradation)
      // So we allow save to be called
    })

    it('should handle repository save errors gracefully', async () => {
      // Arrange
      const extractionResult: TextExtractionResult = {
        text: 'Test content',
        metadata: { wordCount: 2 },
      }

      mockTextExtractionService.extractText.mockResolvedValue(extractionResult)
      mockFileRepository.save.mockRejectedValue(new Error('Database connection failed'))

      // Act
      const result = await uploadFileUseCase.execute(validUploadRequest)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('Database connection failed')
    })

    it('should handle text extraction returning empty result', async () => {
      // Arrange
      const emptyExtractionResult: TextExtractionResult = {
        text: '',
        metadata: { extractionError: true, errorMessage: 'Unsupported format' },
      }

      mockTextExtractionService.extractText.mockResolvedValue(emptyExtractionResult)
      mockFileRepository.save.mockResolvedValue(
        File.create({
          filename: validUploadRequest.filename,
          originalName: validUploadRequest.originalName,
          mimetype: validUploadRequest.mimetype,
          size: validUploadRequest.size,
          path: validUploadRequest.path,
          extractedText: emptyExtractionResult.text,
          metadata: emptyExtractionResult.metadata,
        }),
      )

      // Act
      const result = await uploadFileUseCase.execute(validUploadRequest)

      // Assert
      // Should still succeed but with empty text (graceful degradation)
      expect(result.success).toBe(true)
      expect(result.file?.extractedText).toBe('')
      expect(mockFileRepository.save).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero-byte files', async () => {
      // Arrange
      const emptyFileRequest: UploadFileRequest = {
        ...validUploadRequest,
        size: 0,
      }

      // Act
      const result = await uploadFileUseCase.execute(emptyFileRequest)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle files with special characters in names', async () => {
      // Arrange
      const specialCharRequest: UploadFileRequest = {
        ...validUploadRequest,
        filename: 'test-file-with-émojis-🚀-123.txt',
        originalName: 'test file with émojis 🚀.txt',
      }

      const extractionResult: TextExtractionResult = {
        text: 'Content with special chars',
        metadata: { wordCount: 4 },
      }

      mockTextExtractionService.extractText.mockResolvedValue(extractionResult)
      mockFileRepository.save.mockResolvedValue(
        File.create({
          filename: specialCharRequest.filename,
          originalName: specialCharRequest.originalName,
          mimetype: specialCharRequest.mimetype,
          size: specialCharRequest.size,
          path: specialCharRequest.path,
          extractedText: extractionResult.text,
          metadata: extractionResult.metadata,
        }),
      )

      // Act
      const result = await uploadFileUseCase.execute(specialCharRequest)

      // Assert
      expect(result.success).toBe(true)
      expect(result.file?.originalName).toBe('test file with émojis 🚀.txt')
    })

    it('should handle concurrent uploads correctly', async () => {
      // Arrange
      const extractionResult: TextExtractionResult = {
        text: 'Concurrent upload content',
        metadata: { wordCount: 3 },
      }

      mockTextExtractionService.extractText.mockResolvedValue(extractionResult)

      // Mock save to return different files for each call
      let callCount = 0
      mockFileRepository.save.mockImplementation(file => {
        callCount++
        const savedFile = File.create({
          filename: `file${callCount}-${callCount * 123}.txt`,
          originalName: `file${callCount}-${callCount * 123}.txt`,
          mimetype: 'text/plain',
          size: 1024,
          path: `/uploads/file${callCount}-${callCount * 123}.txt`,
          extractedText: extractionResult.text,
          metadata: extractionResult.metadata,
        })
        return Promise.resolve(savedFile)
      })

      const request1 = { ...validUploadRequest, filename: 'file1-123.txt' }
      const request2 = { ...validUploadRequest, filename: 'file2-456.txt' }

      // Act
      const [result1, result2] = await Promise.all([
        uploadFileUseCase.execute(request1),
        uploadFileUseCase.execute(request2),
      ])

      // Assert
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(mockTextExtractionService.extractText).toHaveBeenCalledTimes(2)
      expect(mockFileRepository.save).toHaveBeenCalledTimes(2)
    })
  })
})
