import NodeCache from 'node-cache'
import { logger } from './logger.js'
import { MetricsCollector } from './metrics.js'

// Cache configurations for different use cases
const CACHE_CONFIGS = {
  // File content cache - longer TTL since files don't change often
  fileContent: {
    stdTTL: 3600, // 1 hour
    checkperiod: 300, // Check for expired keys every 5 minutes
    maxKeys: 1000, // Limit memory usage
  },

  // Search results cache - shorter TTL for fresher results
  searchResults: {
    stdTTL: 300, // 5 minutes
    checkperiod: 60, // Check every minute
    maxKeys: 500,
  },

  // File metadata cache - medium TTL
  fileMetadata: {
    stdTTL: 1800, // 30 minutes
    checkperiod: 120, // Check every 2 minutes
    maxKeys: 2000,
  },

  // Text extraction cache - long TTL since extraction is expensive
  textExtraction: {
    stdTTL: 7200, // 2 hours
    checkperiod: 600, // Check every 10 minutes
    maxKeys: 500,
  },
}

// Create cache instances
export const fileContentCache = new NodeCache(CACHE_CONFIGS.fileContent)
export const searchResultsCache = new NodeCache(CACHE_CONFIGS.searchResults)
export const fileMetadataCache = new NodeCache(CACHE_CONFIGS.fileMetadata)
export const textExtractionCache = new NodeCache(CACHE_CONFIGS.textExtraction)

// Cache statistics tracking
class CacheStats {
  private hits = new Map<string, number>()
  private misses = new Map<string, number>()

  recordHit(cacheType: string): void {
    this.hits.set(cacheType, (this.hits.get(cacheType) || 0) + 1)
    this.updateMetrics(cacheType)
  }

  recordMiss(cacheType: string): void {
    this.misses.set(cacheType, (this.misses.get(cacheType) || 0) + 1)
    this.updateMetrics(cacheType)
  }

  private updateMetrics(cacheType: string): void {
    const hits = this.hits.get(cacheType) || 0
    const misses = this.misses.get(cacheType) || 0
    const total = hits + misses
    const hitRate = total > 0 ? (hits / total) * 100 : 0

    MetricsCollector.updateCacheMetrics(cacheType, hitRate)
  }

  getStats(cacheType: string): { hits: number; misses: number; hitRate: number } {
    const hits = this.hits.get(cacheType) || 0
    const misses = this.misses.get(cacheType) || 0
    const total = hits + misses
    const hitRate = total > 0 ? (hits / total) * 100 : 0

    return { hits, misses, hitRate }
  }
}

const cacheStats = new CacheStats()

// Enhanced cache wrapper with statistics and logging
export class CacheManager {
  private static getCacheInstance(cacheType: string): NodeCache {
    switch (cacheType) {
      case 'fileContent':
        return fileContentCache
      case 'searchResults':
        return searchResultsCache
      case 'fileMetadata':
        return fileMetadataCache
      case 'textExtraction':
        return textExtractionCache
      default:
        throw new Error(`Unknown cache type: ${cacheType}`)
    }
  }

  static get<T>(cacheType: string, key: string): T | undefined {
    const cache = this.getCacheInstance(cacheType)
    const value = cache.get<T>(key)

    if (value !== undefined) {
      cacheStats.recordHit(cacheType)
      logger.debug('Cache hit', { cacheType, key, category: 'cache' })
    } else {
      cacheStats.recordMiss(cacheType)
      logger.debug('Cache miss', { cacheType, key, category: 'cache' })
    }

    return value
  }

  static set<T>(cacheType: string, key: string, value: T, ttl?: number): boolean {
    const cache = this.getCacheInstance(cacheType)
    const success = ttl !== undefined ? cache.set(key, value, ttl) : cache.set(key, value)

    if (success) {
      logger.debug('Cache set', { cacheType, key, ttl, category: 'cache' })
    } else {
      logger.warn('Cache set failed', { cacheType, key, category: 'cache' })
    }

    return success
  }

  static del(cacheType: string, key: string): number {
    const cache = this.getCacheInstance(cacheType)
    const deleted = cache.del(key)

    if (deleted > 0) {
      logger.debug('Cache delete', { cacheType, key, category: 'cache' })
    }

    return deleted
  }

  static flush(cacheType: string): void {
    const cache = this.getCacheInstance(cacheType)
    cache.flushAll()
    logger.info('Cache flushed', { cacheType, category: 'cache' })
  }

  static flushAll(): void {
    fileContentCache.flushAll()
    searchResultsCache.flushAll()
    fileMetadataCache.flushAll()
    textExtractionCache.flushAll()
    logger.info('All caches flushed', { category: 'cache' })
  }

  static getStats(cacheType: string): any {
    const cache = this.getCacheInstance(cacheType)
    const stats = cacheStats.getStats(cacheType)

    return {
      ...stats,
      keys: cache.keys().length,
      size: cache.getStats().keys,
      memoryUsage: cache.getStats().hits + cache.getStats().misses,
    }
  }

  static getAllStats(): Record<string, any> {
    return {
      fileContent: this.getStats('fileContent'),
      searchResults: this.getStats('searchResults'),
      fileMetadata: this.getStats('fileMetadata'),
      textExtraction: this.getStats('textExtraction'),
    }
  }

  // Cache invalidation patterns
  static invalidateFileRelated(fileId: string): void {
    // Remove all cache entries related to a specific file
    this.del('fileContent', fileId)
    this.del('fileMetadata', fileId)
    this.del('textExtraction', fileId)

    // Clear search results cache since file content changed
    this.flush('searchResults')

    logger.info('File-related cache invalidated', { fileId, category: 'cache' })
  }

  static invalidateSearchResults(): void {
    this.flush('searchResults')
    logger.info('Search results cache invalidated', { category: 'cache' })
  }
}

// File content caching utilities
export class FileContentCache {
  static async getOrSet<T>(fileId: string, generator: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = CacheManager.get<T>('fileContent', fileId)
    if (cached !== undefined) {
      return cached
    }

    const content = await generator()
    CacheManager.set('fileContent', fileId, content, ttl)
    return content
  }

  static set(fileId: string, content: any, ttl?: number): void {
    CacheManager.set('fileContent', fileId, content, ttl)
  }

  static get(fileId: string): any {
    return CacheManager.get('fileContent', fileId)
  }

  static invalidate(fileId: string): void {
    CacheManager.del('fileContent', fileId)
  }
}

// Search results caching utilities
export class SearchCache {
  static generateKey(query: string, filters?: any): string {
    // Create a deterministic cache key from query and filters
    const filterStr = filters ? JSON.stringify(filters) : ''
    return `search_${Buffer.from(query + filterStr).toString('base64')}`
  }

  static async getOrSet(query: string, generator: () => Promise<any>, filters?: any, ttl?: number): Promise<any> {
    const key = this.generateKey(query, filters)
    const cached = CacheManager.get('searchResults', key)

    if (cached !== undefined) {
      return cached
    }

    const results = await generator()
    CacheManager.set('searchResults', key, results, ttl)
    return results
  }

  static set(query: string, results: any, filters?: any, ttl?: number): void {
    const key = this.generateKey(query, filters)
    CacheManager.set('searchResults', key, results, ttl)
  }

  static invalidateQuery(query: string, filters?: any): void {
    const key = this.generateKey(query, filters)
    CacheManager.del('searchResults', key)
  }

  static invalidateAll(): void {
    CacheManager.flush('searchResults')
  }
}

// Text extraction caching utilities
export class TextExtractionCache {
  static async getOrSet(filePath: string, mimetype: string, generator: () => Promise<any>, ttl?: number): Promise<any> {
    const key = `${filePath}_${mimetype}`
    const cached = CacheManager.get('textExtraction', key)

    if (cached !== undefined) {
      return cached
    }

    const result = await generator()
    CacheManager.set('textExtraction', key, result, ttl)
    return result
  }

  static invalidate(filePath: string, mimetype: string): void {
    const key = `${filePath}_${mimetype}`
    CacheManager.del('textExtraction', key)
  }
}

// Setup cache event listeners for logging
const setupCacheLogging = (cache: NodeCache, name: string) => {
  cache.on('set', (key, value) => {
    logger.debug(`Cache set: ${name}`, { key, category: 'cache' })
  })

  cache.on('del', (key, value) => {
    logger.debug(`Cache delete: ${name}`, { key, category: 'cache' })
  })

  cache.on('expired', (key, value) => {
    logger.debug(`Cache expired: ${name}`, { key, category: 'cache' })
  })

  cache.on('flush', () => {
    logger.info(`Cache flushed: ${name}`, { category: 'cache' })
  })
}

// Setup logging for all caches
setupCacheLogging(fileContentCache, 'fileContent')
setupCacheLogging(searchResultsCache, 'searchResults')
setupCacheLogging(fileMetadataCache, 'fileMetadata')
setupCacheLogging(textExtractionCache, 'textExtraction')

// Periodic cache statistics logging
setInterval(() => {
  const stats = CacheManager.getAllStats()
  logger.info('Cache statistics', { stats, category: 'metrics' })
}, 60000) // Log every minute
