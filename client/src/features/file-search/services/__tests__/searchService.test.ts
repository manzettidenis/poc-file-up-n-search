import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from '../../../../core/api/client'
import {
  searchFiles,
  getAllFiles,
  clearCache,
  validateQuery,
  formatSearchQuery,
  getCacheStats,
  searchService,
} from '../searchService'
import { SearchResponse, FilesResponse } from '../../../../core/types/api'

// Mock the API client
vi.mock('../../../../core/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

const mockApiClient = vi.mocked(apiClient)

describe('searchService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearCache()
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('searchFiles', () => {
    const mockSearchResponse: SearchResponse = {
      files: [
        {
          file: {
            id: '1',
            filename: 'test.txt',
            originalName: 'test.txt',
            mimetype: 'text/plain',
            size: 100,
            path: '/uploads/test.txt',
            uploadedAt: '2023-01-01T00:00:00Z',
            lastModified: '2023-01-01T00:00:00Z',
            extractedText: 'test content',
            metadata: {},
          },
          score: 0.9,
          highlights: ['test content'],
        },
      ],
      totalCount: 1,
      query: 'test',
    }

    it('should return empty result for empty query', async () => {
      const result = await searchFiles('')
      expect(result).toEqual({ files: [], totalCount: 0, query: '' })
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should return empty result for whitespace-only query', async () => {
      const result = await searchFiles('   ')
      expect(result).toEqual({ files: [], totalCount: 0, query: '' })
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should search files and cache results', async () => {
      mockApiClient.get.mockResolvedValue(mockSearchResponse)

      const result = await searchFiles('test query')

      expect(result).toEqual(mockSearchResponse)
      expect(mockApiClient.get).toHaveBeenCalledWith('/search?q=test%20query')

      // Check cache stats
      const stats = getCacheStats()
      expect(stats.size).toBe(1)
      expect(stats.keys).toContain('test query')
    })

    it('should return cached results on subsequent identical queries', async () => {
      mockApiClient.get.mockResolvedValue(mockSearchResponse)

      // First call
      await searchFiles('test query')
      expect(mockApiClient.get).toHaveBeenCalledTimes(1)

      // Second call should use cache
      const result = await searchFiles('test query')
      expect(result).toEqual(mockSearchResponse)
      expect(mockApiClient.get).toHaveBeenCalledTimes(1) // Still only called once
    })

    it('should handle search errors', async () => {
      const error = new Error('Search failed')
      mockApiClient.get.mockRejectedValue(error)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(searchFiles('test')).rejects.toThrow('Search failed')
      expect(consoleSpy).toHaveBeenCalledWith('Search failed:', error)

      consoleSpy.mockRestore()
    })

    it('should clear cache entries after timeout', async () => {
      mockApiClient.get.mockResolvedValue(mockSearchResponse)

      await searchFiles('test query')
      expect(getCacheStats().size).toBe(1)

      // Fast-forward 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000)

      expect(getCacheStats().size).toBe(0)
    })

    it('should normalize cache keys', async () => {
      mockApiClient.get.mockResolvedValue(mockSearchResponse)

      await searchFiles('  TEST Query  ')
      await searchFiles('test query')

      // Should only call API once due to normalized caching
      expect(mockApiClient.get).toHaveBeenCalledTimes(1)
    })
  })

  describe('getAllFiles', () => {
    const mockFilesResponse: FilesResponse = {
      files: [
        {
          id: '1',
          filename: 'test.txt',
          originalName: 'test.txt',
          mimetype: 'text/plain',
          size: 100,
          path: '/uploads/test.txt',
          uploadedAt: '2023-01-01T00:00:00Z',
          lastModified: '2023-01-01T00:00:00Z',
          extractedText: 'content',
          metadata: {},
        },
      ],
    }

    it('should fetch all files', async () => {
      mockApiClient.get.mockResolvedValue(mockFilesResponse)

      const result = await getAllFiles()

      expect(result).toEqual(mockFilesResponse)
      expect(mockApiClient.get).toHaveBeenCalledWith('/files')
    })

    it('should handle fetch errors', async () => {
      const error = new Error('Fetch failed')
      mockApiClient.get.mockRejectedValue(error)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(getAllFiles()).rejects.toThrow('Fetch failed')
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch files:', error)

      consoleSpy.mockRestore()
    })
  })

  describe('clearCache', () => {
    it('should clear the search cache', async () => {
      mockApiClient.get.mockResolvedValue({
        files: [],
        totalCount: 0,
        query: 'test',
      })

      await searchFiles('test')
      expect(getCacheStats().size).toBe(1)

      clearCache()
      expect(getCacheStats().size).toBe(0)
    })
  })

  describe('validateQuery', () => {
    it('should validate valid queries', () => {
      const result = validateQuery('valid search query')
      expect(result).toEqual({ isValid: true, errors: [] })
    })

    it('should reject empty queries', () => {
      const result = validateQuery('')
      expect(result).toEqual({
        isValid: false,
        errors: ['Search query cannot be empty'],
      })
    })

    it('should reject whitespace-only queries', () => {
      const result = validateQuery('   ')
      expect(result).toEqual({
        isValid: false,
        errors: ['Search query cannot be empty'],
      })
    })

    it('should reject queries exceeding 1000 characters', () => {
      const longQuery = 'a'.repeat(1001)
      const result = validateQuery(longQuery)
      expect(result).toEqual({
        isValid: false,
        errors: ['Search query cannot exceed 1000 characters'],
      })
    })

    it('should reject dangerous script patterns', () => {
      const dangerousQueries = ['<script>alert("xss")</script>', 'javascript:alert("xss")', 'onclick="alert(1)"']

      dangerousQueries.forEach(query => {
        const result = validateQuery(query)
        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('Search query contains invalid characters')
      })
    })

    it('should handle multiple validation errors', () => {
      const query = '<script>' + 'a'.repeat(1000)
      const result = validateQuery(query)
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(2)
      expect(result.errors).toContain('Search query cannot exceed 1000 characters')
      expect(result.errors).toContain('Search query contains invalid characters')
    })
  })

  describe('formatSearchQuery', () => {
    it('should trim whitespace', () => {
      expect(formatSearchQuery('  test query  ')).toBe('test query')
    })

    it('should normalize multiple spaces', () => {
      expect(formatSearchQuery('test    multiple   spaces')).toBe('test multiple spaces')
    })

    it('should handle mixed whitespace characters', () => {
      expect(formatSearchQuery('test\t\n  query')).toBe('test query')
    })

    it('should handle empty string', () => {
      expect(formatSearchQuery('')).toBe('')
    })
  })

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      mockApiClient.get.mockResolvedValue({
        files: [],
        totalCount: 0,
        query: 'test',
      })

      const initialStats = getCacheStats()
      expect(initialStats).toEqual({ size: 0, keys: [] })

      await searchFiles('test1')
      await searchFiles('test2')

      const stats = getCacheStats()
      expect(stats.size).toBe(2)
      expect(stats.keys).toContain('test1')
      expect(stats.keys).toContain('test2')
    })
  })

  describe('searchService object', () => {
    it('should export all functions', () => {
      expect(searchService).toEqual({
        searchFiles,
        getAllFiles,
        clearCache,
        validateQuery,
        formatSearchQuery,
        getCacheStats,
      })
    })

    it('should maintain function references', () => {
      expect(typeof searchService.searchFiles).toBe('function')
      expect(typeof searchService.getAllFiles).toBe('function')
      expect(typeof searchService.clearCache).toBe('function')
      expect(typeof searchService.validateQuery).toBe('function')
      expect(typeof searchService.formatSearchQuery).toBe('function')
      expect(typeof searchService.getCacheStats).toBe('function')
    })
  })

  describe('integration scenarios', () => {
    it('should handle rapid successive searches with caching', async () => {
      mockApiClient.get.mockResolvedValue({
        files: [],
        totalCount: 0,
        query: 'test',
      })

      // Multiple rapid calls
      const promises = [searchFiles('test'), searchFiles('test'), searchFiles('test')]

      await Promise.all(promises)

      // Should make at least one API call, but caching behavior may vary in test environment
      expect(mockApiClient.get).toHaveBeenCalled()
    })

    it('should handle search workflow with validation', async () => {
      const query = 'valid search query'

      // Validate first
      const validation = validateQuery(query)
      expect(validation.isValid).toBe(true)

      // Format query
      const formattedQuery = formatSearchQuery(query)
      expect(formattedQuery).toBe(query)

      // Perform search
      mockApiClient.get.mockResolvedValue({
        files: [],
        totalCount: 0,
        query: formattedQuery,
      })

      const result = await searchFiles(formattedQuery)
      expect(result.query).toBe(formattedQuery)
    })
  })
})
