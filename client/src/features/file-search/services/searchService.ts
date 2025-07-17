import { apiClient } from '../../../core/api/client'
import { SearchResponse, FilesResponse } from '../../../core/types/api'

// Internal cache state - module-scoped
const searchCache = new Map<string, SearchResponse>()
const cacheTimeout = 5 * 60 * 1000 // 5 minutes

/**
 * Search files by query with caching
 */
export const searchFiles = async (query: string): Promise<SearchResponse> => {
  if (!query.trim()) {
    return { files: [], totalCount: 0, query: '' }
  }

  // Check cache first
  const cacheKey = query.toLowerCase().trim()
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!
  }

  try {
    const response = await apiClient.get<SearchResponse>(`/search?q=${encodeURIComponent(query)}`)

    // Cache the result
    searchCache.set(cacheKey, response)

    // Clear cache after timeout
    setTimeout(() => {
      searchCache.delete(cacheKey)
    }, cacheTimeout)

    return response
  } catch (error) {
    console.error('Search failed:', error)
    throw error
  }
}

/**
 * Get all files
 */
export const getAllFiles = async (): Promise<FilesResponse> => {
  try {
    return await apiClient.get<FilesResponse>('/files')
  } catch (error) {
    console.error('Failed to fetch files:', error)
    throw error
  }
}

/**
 * Clear search cache
 */
export const clearCache = (): void => {
  searchCache.clear()
}

/**
 * Validate search query
 */
export const validateQuery = (query: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (query.length > 1000) {
    errors.push('Search query cannot exceed 1000 characters')
  }

  if (query.trim().length === 0) {
    errors.push('Search query cannot be empty')
  }

  // Check for potential injection patterns
  const dangerousPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i]

  if (dangerousPatterns.some(pattern => pattern.test(query))) {
    errors.push('Search query contains invalid characters')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Format search query
 */
export const formatSearchQuery = (query: string): string => {
  return query.trim().replace(/\s+/g, ' ')
}

/**
 * Get cache statistics
 */
export const getCacheStats = () => ({
  size: searchCache.size,
  keys: Array.from(searchCache.keys()),
})

// Export all functions as a service object for compatibility
export const searchService = {
  searchFiles,
  getAllFiles,
  clearCache,
  validateQuery,
  formatSearchQuery,
  getCacheStats,
} as const
