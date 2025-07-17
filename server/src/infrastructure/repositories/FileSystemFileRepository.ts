import { File } from '../../domain/entities/File.js'
import { IFileRepository } from '../../domain/repositories/IFileRepository.js'
import { SearchQuery, SearchResult, FileEntity } from '../../types/index.js'
import Fuse from 'fuse.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { CacheManager, SearchCache, FileContentCache } from '../../utils/cache.js'
import { logger, PerformanceLogger, logError, ErrorCategory } from '../../utils/logger.js'
import { MetricsCollector } from '../../utils/metrics.js'
import { FileMapper } from '../mappers/FileMapper.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class FileSystemFileRepository implements IFileRepository {
  private files: Map<string, File> = new Map()
  private fuse: Fuse<File>
  private dataPath: string
  private indexDirty: boolean = false
  private indexingInProgress: boolean = false

  constructor() {
    this.dataPath = path.join(__dirname, '../../../data/files.json')
    this.fuse = new Fuse([], {
      keys: [
        { name: 'extractedText', weight: 0.7 },
        { name: 'originalName', weight: 0.2 },
        { name: 'metadata.title', weight: 0.05 },
        { name: 'metadata.author', weight: 0.05 },
      ],
      threshold: 0.3, // More selective matching
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
      findAllMatches: true,
      ignoreLocation: true,
      isCaseSensitive: false,
    })
    this.loadFromDisk()
  }

  private async ensureDataDirectory(): Promise<void> {
    const dataDir = path.dirname(this.dataPath)
    try {
      await fs.access(dataDir)
    } catch {
      await fs.mkdir(dataDir, { recursive: true })
      logger.info('Created data directory', { dataDir, category: 'repository' })
    }
  }

  private async loadFromDisk(): Promise<void> {
    const stopTimer = PerformanceLogger.startTimer('repository_load')

    try {
      await this.ensureDataDirectory()
      const data = await fs.readFile(this.dataPath, 'utf-8')
      const filesData: FileEntity[] = JSON.parse(data)

      this.files.clear()
      for (const fileData of filesData) {
        // Convert external data format to domain entity
        const file = File.fromData({
          id: fileData.id,
          filename: fileData.filename,
          originalName: fileData.originalName,
          mimetype: fileData.mimetype,
          size: fileData.size,
          path: fileData.path,
          extractedText: fileData.extractedText,
          metadata: fileData.metadata,
          uploadedAt: new Date(fileData.uploadedAt),
          lastModified: new Date(fileData.lastModified),
        })
        this.files.set(file.id.value, file)
      }

      await this.updateSearchIndexOptimized()

      logger.info('Files loaded from disk', {
        count: this.files.size,
        dataPath: this.dataPath,
        category: 'repository',
      })
    } catch (error) {
      logger.info('No existing files data found, starting fresh', {
        dataPath: this.dataPath,
        category: 'repository',
      })
    }

    stopTimer()
  }

  private async saveToDisk(): Promise<void> {
    const stopTimer = PerformanceLogger.startTimer('repository_save')

    try {
      await this.ensureDataDirectory()
      // Convert domain entities to external data format
      const filesArray = Array.from(this.files.values()).map(f => f.toData())
      await fs.writeFile(this.dataPath, JSON.stringify(filesArray, null, 2))

      logger.debug('Files saved to disk', {
        count: this.files.size,
        category: 'repository',
      })
    } catch (error) {
      logError(error instanceof Error ? error : new Error('Failed to save files'), ErrorCategory.DATABASE, {
        dataPath: this.dataPath,
      })
      throw error
    }

    stopTimer()
  }

  private async updateSearchIndexOptimized(): Promise<void> {
    if (this.indexingInProgress) {
      this.indexDirty = true
      return
    }

    this.indexingInProgress = true
    const start = Date.now()

    try {
      const files = Array.from(this.files.values())
      this.fuse.setCollection(files)

      const duration = Date.now() - start
      MetricsCollector.updateSearchIndexMetrics(files.length, duration)

      logger.debug('Search index updated', {
        documentCount: files.length,
        duration: `${duration}ms`,
        category: 'search-index',
      })

      // If index became dirty during update, schedule another update
      if (this.indexDirty) {
        this.indexDirty = false
        setImmediate(() => this.updateSearchIndexOptimized())
      }
    } finally {
      this.indexingInProgress = false
    }
  }

  async save(file: File): Promise<File> {
    const stopTimer = PerformanceLogger.startTimer('repository_save_file')

    try {
      this.files.set(file.id.value, file)

      // Cache file content
      FileContentCache.set(file.id.value, file.toData())

      // Update search index asynchronously
      setImmediate(() => this.updateSearchIndexOptimized())

      // Invalidate search results cache since content changed
      CacheManager.invalidateSearchResults()

      // Save to disk asynchronously
      setImmediate(() => this.saveToDisk())

      logger.info('File saved', {
        fileId: file.id.value,
        originalName: file.originalName,
        category: 'repository',
      })

      return file
    } catch (error) {
      logError(error instanceof Error ? error : new Error('Failed to save file'), ErrorCategory.DATABASE, {
        fileId: file.id.value,
      })
      throw error
    } finally {
      stopTimer()
    }
  }

  async findById(id: string): Promise<File | null> {
    const stopTimer = PerformanceLogger.startTimer('repository_find_by_id')

    try {
      // Check cache first
      const cached = FileContentCache.get(id)
      if (cached) {
        const file = File.fromData(cached)
        return file
      }

      const file = this.files.get(id) || null

      // Cache the result
      if (file) {
        FileContentCache.set(id, file.toData())
      }

      return file
    } finally {
      stopTimer()
    }
  }

  async findByFilename(filename: string): Promise<File | null> {
    const stopTimer = PerformanceLogger.startTimer('repository_find_by_filename')

    try {
      for (const file of this.files.values()) {
        if (file.filename === filename) {
          return file
        }
      }
      return null
    } finally {
      stopTimer()
    }
  }

  async findAll(limit = 50, offset = 0): Promise<File[]> {
    const stopTimer = PerformanceLogger.startTimer('repository_find_all')

    try {
      const allFiles = Array.from(this.files.values())

      // Sort by upload date (newest first)
      allFiles.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())

      return allFiles.slice(offset, offset + limit)
    } finally {
      stopTimer()
    }
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const stopTimer = PerformanceLogger.startTimer('repository_search')
    const start = Date.now()

    try {
      // Use cached results if available
      return await SearchCache.getOrSet(
        query.term,
        async () => {
          logger.debug('Performing search', {
            term: query.term,
            availableFiles: this.files.size,
            category: 'search',
          })

          const results = this.fuse.search(query.term)

          // Fallback to substring search if no fuzzy matches
          if (results.length === 0) {
            logger.debug('No fuzzy matches, trying substring search', {
              term: query.term,
              category: 'search',
            })

            const exactMatches: any[] = []
            const searchTerm = query.term.toLowerCase()

            for (const file of this.files.values()) {
              if (
                file.extractedText.toLowerCase().includes(searchTerm) ||
                file.originalName.toLowerCase().includes(searchTerm)
              ) {
                exactMatches.push({
                  item: file,
                  score: 0.1,
                  matches: [
                    {
                      key: 'extractedText',
                      value: file.extractedText,
                    },
                  ],
                })
              }
            }

            if (exactMatches.length > 0) {
              results.push(...exactMatches)
            }
          }

          const files = results.map(result => ({
            file: FileMapper.toExternal(result.item),
            score: result.score || 0,
            highlights:
              result.matches?.map(match => ({
                text: typeof match.value === 'string' ? match.value : '',
                startIndex: 0,
                endIndex: 0,
              })) || [],
          }))

          // Apply pagination
          const page = query.pagination?.page || 1
          const limit = query.pagination?.limit || 10
          const startIndex = (page - 1) * limit
          const endIndex = startIndex + limit

          const paginatedFiles = files.slice(startIndex, endIndex)

          const searchResult = {
            files: paginatedFiles,
            totalCount: results.length,
            page,
            totalPages: Math.ceil(results.length / limit),
          }

          logger.info('Search completed', {
            term: query.term,
            totalResults: results.length,
            returnedResults: paginatedFiles.length,
            page,
            category: 'search',
          })

          return searchResult
        },
        query.pagination, // Include pagination in cache key
        300, // Cache for 5 minutes
      )
    } catch (error) {
      logError(error instanceof Error ? error : new Error('Search failed'), ErrorCategory.SEARCH, { query: query.term })
      throw error
    } finally {
      const duration = Date.now() - start
      MetricsCollector.recordSearch('success', duration, undefined)
      stopTimer()
    }
  }

  async delete(id: string): Promise<boolean> {
    const stopTimer = PerformanceLogger.startTimer('repository_delete')

    try {
      const deleted = this.files.delete(id)

      if (deleted) {
        // Invalidate caches
        CacheManager.invalidateFileRelated(id)

        // Update search index
        setImmediate(() => this.updateSearchIndexOptimized())

        // Save to disk
        setImmediate(() => this.saveToDisk())

        logger.info('File deleted', { fileId: id, category: 'repository' })
      }

      return deleted
    } finally {
      stopTimer()
    }
  }

  async update(file: File): Promise<File> {
    const stopTimer = PerformanceLogger.startTimer('repository_update')

    try {
      this.files.set(file.id.value, file)

      // Invalidate caches
      CacheManager.invalidateFileRelated(file.id.value)

      // Update search index
      setImmediate(() => this.updateSearchIndexOptimized())

      // Save to disk
      setImmediate(() => this.saveToDisk())

      logger.info('File updated', {
        fileId: file.id.value,
        originalName: file.originalName,
        category: 'repository',
      })

      return file
    } finally {
      stopTimer()
    }
  }

  async count(): Promise<number> {
    return this.files.size
  }

  async exists(id: string): Promise<boolean> {
    return this.files.has(id)
  }

  // Performance optimization methods
  async getStats(): Promise<{
    totalFiles: number
    cacheStats: any
    indexStatus: {
      documentsIndexed: number
      indexingInProgress: boolean
      indexDirty: boolean
    }
  }> {
    return {
      totalFiles: this.files.size,
      cacheStats: CacheManager.getAllStats(),
      indexStatus: {
        documentsIndexed: this.files.size,
        indexingInProgress: this.indexingInProgress,
        indexDirty: this.indexDirty,
      },
    }
  }

  // Force index rebuild
  async rebuildIndex(): Promise<void> {
    logger.info('Rebuilding search index', { category: 'search-index' })
    this.indexDirty = false
    await this.updateSearchIndexOptimized()
  }
}
