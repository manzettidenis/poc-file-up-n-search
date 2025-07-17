import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SearchFilesUseCase } from '../../application/use-cases/SearchFilesUseCase.js'
import { IFileRepository } from '../../domain/repositories/IFileRepository.js'
import { SearchQuery, SearchResult, FileEntity, TextHighlight } from '../../types/index.js'

// Mock implementation
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

describe('SearchFilesUseCase', () => {
  let searchFilesUseCase: SearchFilesUseCase
  let mockFileRepository: MockFileRepository

  beforeEach(() => {
    mockFileRepository = new MockFileRepository()
    searchFilesUseCase = new SearchFilesUseCase(mockFileRepository)
  })

  describe('Valid Search Queries', () => {
    it('should search files with basic query', async () => {
      // Arrange
      const searchRequest: SearchQuery = {
        term: 'test document',
        pagination: { page: 1, limit: 10 },
      }

      const mockFileEntity: FileEntity = {
        id: '1',
        filename: 'test-file.txt',
        originalName: 'test.txt',
        mimetype: 'text/plain',
        size: 1024,
        path: '/uploads/test-file.txt',
        extractedText: 'This is a test document',
        metadata: { wordCount: 5 },
        uploadedAt: new Date(),
        lastModified: new Date(),
      }

      const mockHighlight: TextHighlight = {
        text: 'test document',
        startIndex: 10,
        endIndex: 23,
      }

      const mockSearchResult: SearchResult = {
        files: [
          {
            file: mockFileEntity,
            score: 0.95,
            highlights: [mockHighlight],
          },
        ],
        totalCount: 1,
        page: 1,
        totalPages: 1,
      }

      mockFileRepository.search.mockResolvedValue(mockSearchResult)

      // Act
      const result = await searchFilesUseCase.execute(searchRequest)

      // Assert
      expect(result.files).toHaveLength(1)
      expect(result.files[0].file.originalName).toBe('test.txt')
      expect(result.files[0].score).toBe(0.95)
      expect(result.totalCount).toBe(1)
      expect(mockFileRepository.search).toHaveBeenCalledWith({
        term: 'test document',
        pagination: { page: 1, limit: 10 },
      })
    })

    it('should handle pagination correctly', async () => {
      // Arrange
      const searchRequest: SearchQuery = {
        term: 'document',
        pagination: { page: 2, limit: 5 },
      }

      const mockSearchResult: SearchResult = {
        files: [],
        totalCount: 15,
        page: 2,
        totalPages: 3,
      }

      mockFileRepository.search.mockResolvedValue(mockSearchResult)

      // Act
      const result = await searchFilesUseCase.execute(searchRequest)

      // Assert
      expect(result.page).toBe(2)
      expect(result.totalCount).toBe(15)
      expect(result.totalPages).toBe(3)
      expect(mockFileRepository.search).toHaveBeenCalledWith({
        term: 'document',
        pagination: { page: 2, limit: 5 },
      })
    })

    it('should handle filters correctly', async () => {
      // Arrange
      const searchRequest: SearchQuery = {
        term: 'test',
        filters: {
          fileTypes: ['application/pdf'],
          dateRange: {
            from: new Date('2023-01-01'),
            to: new Date('2023-12-31'),
          },
        },
        pagination: { page: 1, limit: 10 },
      }

      const mockSearchResult: SearchResult = {
        files: [],
        totalCount: 0,
        page: 1,
        totalPages: 0,
      }

      mockFileRepository.search.mockResolvedValue(mockSearchResult)

      // Act
      const result = await searchFilesUseCase.execute(searchRequest)

      // Assert
      expect(mockFileRepository.search).toHaveBeenCalledWith({
        term: 'test',
        filters: {
          fileTypes: ['application/pdf'],
          dateRange: {
            from: new Date('2023-01-01'),
            to: new Date('2023-12-31'),
          },
        },
        pagination: { page: 1, limit: 10 },
      })
    })
  })

  describe('Empty and Invalid Queries', () => {
    it('should handle empty search term', async () => {
      // Arrange
      const searchRequest: SearchQuery = {
        term: '',
        pagination: { page: 1, limit: 10 },
      }

      const expectedResult: SearchResult = {
        files: [],
        totalCount: 0,
        page: 1,
        totalPages: 0,
      }

      // Act
      const result = await searchFilesUseCase.execute(searchRequest)

      // Assert
      expect(result).toEqual(expectedResult)
      expect(mockFileRepository.search).not.toHaveBeenCalled()
    })

    it('should handle whitespace-only search term', async () => {
      // Arrange
      const searchRequest: SearchQuery = {
        term: '   ',
        pagination: { page: 1, limit: 10 },
      }

      const expectedResult: SearchResult = {
        files: [],
        totalCount: 0,
        page: 1,
        totalPages: 0,
      }

      // Act
      const result = await searchFilesUseCase.execute(searchRequest)

      // Assert
      expect(result).toEqual(expectedResult)
      expect(mockFileRepository.search).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle repository search failures gracefully', async () => {
      // Arrange
      const searchRequest: SearchQuery = {
        term: 'test',
        pagination: { page: 1, limit: 10 },
      }

      mockFileRepository.search.mockRejectedValue(new Error('Database connection failed'))

      // Act
      const result = await searchFilesUseCase.execute(searchRequest)

      // Assert
      expect(result.files).toEqual([])
      expect(result.totalCount).toBe(0)
      expect(result.page).toBe(1)
      expect(result.totalPages).toBe(0)
    })

    it('should handle timeout errors gracefully', async () => {
      // Arrange
      const searchRequest: SearchQuery = {
        term: 'test',
        pagination: { page: 1, limit: 10 },
      }

      mockFileRepository.search.mockRejectedValue(new Error('Search timeout'))

      // Act
      const result = await searchFilesUseCase.execute(searchRequest)

      // Assert
      expect(result.files).toEqual([])
      expect(result.totalCount).toBe(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle special characters in search term', async () => {
      // Arrange
      const searchRequest: SearchQuery = {
        term: 'test@#$%^&*()[]{}|\\:";\'<>?,./`~',
        pagination: { page: 1, limit: 10 },
      }

      const mockSearchResult: SearchResult = {
        files: [],
        totalCount: 0,
        page: 1,
        totalPages: 0,
      }

      mockFileRepository.search.mockResolvedValue(mockSearchResult)

      // Act
      const result = await searchFilesUseCase.execute(searchRequest)

      // Assert
      expect(result.totalCount).toBe(0)
      expect(mockFileRepository.search).toHaveBeenCalled()
    })

    it('should handle Unicode characters in search term', async () => {
      // Arrange
      const searchRequest: SearchQuery = {
        term: 'test 文档 émojis 🚀',
        pagination: { page: 1, limit: 10 },
      }

      const mockSearchResult: SearchResult = {
        files: [],
        totalCount: 0,
        page: 1,
        totalPages: 0,
      }

      mockFileRepository.search.mockResolvedValue(mockSearchResult)

      // Act
      const result = await searchFilesUseCase.execute(searchRequest)

      // Assert
      expect(result.totalCount).toBe(0)
      expect(mockFileRepository.search).toHaveBeenCalled()
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large result sets efficiently', async () => {
      // Arrange
      const searchRequest: SearchQuery = {
        term: 'document',
        pagination: { page: 1, limit: 100 },
      }

      const mockSearchResult: SearchResult = {
        files: Array.from({ length: 100 }, (_, i) => ({
          file: {
            id: `${i + 1}`,
            filename: `file-${i + 1}.txt`,
            originalName: `document-${i + 1}.txt`,
            mimetype: 'text/plain',
            size: 1024,
            path: `/uploads/file-${i + 1}.txt`,
            extractedText: `Document ${i + 1} content`,
            metadata: { wordCount: 3 },
            uploadedAt: new Date(),
            lastModified: new Date(),
          },
          score: 0.8,
          highlights: [{ text: 'document', startIndex: 0, endIndex: 8 }],
        })),
        totalCount: 1000,
        page: 1,
        totalPages: 10,
      }

      mockFileRepository.search.mockResolvedValue(mockSearchResult)

      // Act
      const start = Date.now()
      const result = await searchFilesUseCase.execute(searchRequest)
      const duration = Date.now() - start

      // Assert
      expect(result.files).toHaveLength(100)
      expect(result.totalCount).toBe(1000)
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle concurrent searches correctly', async () => {
      // Arrange
      const searchRequests = Array.from({ length: 5 }, (_, i) => ({
        term: `test${i}`,
        pagination: { page: 1, limit: 10 },
      }))

      mockFileRepository.search.mockImplementation(async query => ({
        files: [],
        totalCount: 0,
        page: 1,
        totalPages: 0,
      }))

      // Act
      const results = await Promise.all(searchRequests.map(request => searchFilesUseCase.execute(request)))

      // Assert
      expect(results).toHaveLength(5)
      expect(mockFileRepository.search).toHaveBeenCalledTimes(5)
      results.forEach(result => {
        expect(result.totalCount).toBe(0)
      })
    })
  })
})
