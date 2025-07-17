import { EventEmitter } from 'events'
import { logger, PerformanceLogger } from './logger.js'
import { MetricsCollector } from './metrics.js'

interface QueueJob<T = any> {
  id: string
  type: string
  data: T
  priority: number
  timestamp: number
  retries: number
  maxRetries: number
  timeout: number
  requestId?: string
  resolve?: (value: any) => void
  reject?: (reason?: any) => void
}

interface QueueOptions {
  concurrency: number
  maxRetries: number
  timeout: number
  retryDelay: number
}

export class AsyncQueue<T = any> extends EventEmitter {
  private queue: QueueJob<T>[] = []
  private running: Map<string, Promise<any>> = new Map()
  private workers = 0
  private options: QueueOptions

  constructor(
    private name: string,
    options: Partial<QueueOptions> = {},
  ) {
    super()

    this.options = {
      concurrency: options.concurrency || 3,
      maxRetries: options.maxRetries || 3,
      timeout: options.timeout || 30000, // 30 seconds
      retryDelay: options.retryDelay || 1000, // 1 second
    }

    logger.info(`Queue initialized: ${this.name}`, {
      options: this.options,
      category: 'queue',
    })
  }

  async add<R>(
    type: string,
    data: T,
    options: {
      priority?: number
      maxRetries?: number
      timeout?: number
      requestId?: string
    } = {},
  ): Promise<R> {
    const job: QueueJob<T> = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      priority: options.priority || 0,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: options.maxRetries || this.options.maxRetries,
      timeout: options.timeout || this.options.timeout,
      requestId: options.requestId,
    }

    return new Promise((resolve, reject) => {
      // Store resolve/reject handlers
      ;(job as any).resolve = resolve
      ;(job as any).reject = reject

      // Add to queue with priority sorting
      this.queue.push(job)
      this.queue.sort((a, b) => b.priority - a.priority)

      logger.debug(`Job added to queue: ${this.name}`, {
        jobId: job.id,
        type: job.type,
        priority: job.priority,
        queueLength: this.queue.length,
        requestId: job.requestId,
        category: 'queue',
      })

      this.emit('job:added', job)
      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.workers >= this.options.concurrency || this.queue.length === 0) {
      return
    }

    const job = this.queue.shift()
    if (!job) return

    this.workers++
    const jobPromise = this.executeJob(job)
    this.running.set(job.id, jobPromise)

    try {
      const result = await jobPromise
      job.resolve?.(result)
      this.emit('job:completed', job, result)
    } catch (error) {
      if (job.retries < job.maxRetries) {
        job.retries++
        logger.warn(`Job retry ${job.retries}/${job.maxRetries}: ${this.name}`, {
          jobId: job.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          requestId: job.requestId,
          category: 'queue',
        })

        // Add back to queue with retry delay
        setTimeout(() => {
          this.queue.unshift(job)
          this.processQueue()
        }, this.options.retryDelay * job.retries)
      } else {
        job.reject?.(error)
        this.emit('job:failed', job, error)
      }
    } finally {
      this.workers--
      this.running.delete(job.id)

      // Process next job
      setImmediate(() => this.processQueue())
    }
  }

  private async executeJob(job: QueueJob<T>): Promise<any> {
    const stopTimer = PerformanceLogger.startTimer(`queue_job_${job.type}`, job.requestId)

    logger.debug(`Job started: ${this.name}`, {
      jobId: job.id,
      type: job.type,
      attempt: job.retries + 1,
      requestId: job.requestId,
      category: 'queue',
    })

    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Job timeout after ${job.timeout}ms`))
        }, job.timeout)
      })

      // Execute job with timeout
      const jobPromise = this.handleJob(job)
      const result = await Promise.race([jobPromise, timeoutPromise])

      stopTimer()

      logger.debug(`Job completed: ${this.name}`, {
        jobId: job.id,
        type: job.type,
        requestId: job.requestId,
        category: 'queue',
      })

      return result
    } catch (error) {
      stopTimer()

      logger.error(`Job failed: ${this.name}`, {
        jobId: job.id,
        type: job.type,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: job.requestId,
        category: 'queue',
      })

      throw error
    }
  }

  protected async handleJob(job: QueueJob<T>): Promise<any> {
    // Override in subclasses to implement specific job handling
    throw new Error('handleJob must be implemented by subclass')
  }

  getStats(): {
    name: string
    queueLength: number
    runningJobs: number
    workers: number
    maxWorkers: number
  } {
    return {
      name: this.name,
      queueLength: this.queue.length,
      runningJobs: this.running.size,
      workers: this.workers,
      maxWorkers: this.options.concurrency,
    }
  }

  // Graceful shutdown
  async shutdown(timeout: number = 30000): Promise<void> {
    logger.info(`Shutting down queue: ${this.name}`, { category: 'queue' })

    // Stop accepting new jobs
    this.queue.length = 0

    // Wait for running jobs to complete
    const runningJobs = Array.from(this.running.values())
    if (runningJobs.length > 0) {
      logger.info(`Waiting for ${runningJobs.length} running jobs to complete`, {
        queueName: this.name,
        category: 'queue',
      })

      try {
        await Promise.race([
          Promise.all(runningJobs),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Shutdown timeout')), timeout)),
        ])
      } catch (error) {
        logger.warn(`Queue shutdown timeout: ${this.name}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          category: 'queue',
        })
      }
    }

    logger.info(`Queue shut down: ${this.name}`, { category: 'queue' })
  }
}

// Text extraction queue implementation
export interface TextExtractionJob {
  filePath: string
  mimetype: string
  fileId: string
}

export class TextExtractionQueue extends AsyncQueue<TextExtractionJob> {
  constructor() {
    super('text-extraction', {
      concurrency: 2, // Limit to 2 concurrent text extractions
      maxRetries: 2,
      timeout: 60000, // 1 minute timeout for text extraction
    })
  }

  protected async handleJob(job: QueueJob<TextExtractionJob>): Promise<any> {
    const { filePath, mimetype, fileId } = job.data

    // Import text extraction service here to avoid circular dependencies
    const { TextExtractionService } = await import('../infrastructure/services/TextExtractionService.js')
    const textExtractionService = new TextExtractionService()

    const start = Date.now()

    try {
      const result = await textExtractionService.extractText(filePath, mimetype)
      const duration = Date.now() - start

      MetricsCollector.recordTextExtraction('success', mimetype, duration)

      return result
    } catch (error) {
      const duration = Date.now() - start
      MetricsCollector.recordTextExtraction('failure', mimetype, duration)
      throw error
    }
  }
}

// Search indexing queue implementation
export interface SearchIndexJob {
  fileId: string
  action: 'add' | 'update' | 'remove'
  fileData?: any
}

export class SearchIndexQueue extends AsyncQueue<SearchIndexJob> {
  constructor() {
    super('search-indexing', {
      concurrency: 1, // Single worker to maintain index consistency
      maxRetries: 3,
      timeout: 10000, // 10 seconds
    })
  }

  protected async handleJob(job: QueueJob<SearchIndexJob>): Promise<any> {
    const { fileId, action, fileData } = job.data

    logger.debug(`Processing search index job`, {
      fileId,
      action,
      category: 'search-index',
    })

    const start = Date.now()

    try {
      // Import repository container to avoid circular dependencies
      const RepositoryContainer = (await import('../infrastructure/repositories/RepositoryContainer.js')).default
      const repositoryContainer = RepositoryContainer.getInstance()
      const fileRepository = repositoryContainer.fileRepository

      // Handle different indexing actions
      switch (action) {
        case 'add':
        case 'update':
          if (fileData) {
            // Update search index with new/updated file
            await (fileRepository as any).updateSearchIndex?.()
          }
          break
        case 'remove':
          // Remove from search index
          await (fileRepository as any).removeFromIndex?.(fileId)
          break
        default:
          throw new Error(`Unknown search index action: ${action}`)
      }

      const duration = Date.now() - start
      MetricsCollector.updateSearchIndexMetrics(await fileRepository.count(), duration)

      return { success: true }
    } catch (error) {
      logger.error('Search index job failed', {
        fileId,
        action,
        error: error instanceof Error ? error.message : 'Unknown error',
        category: 'search-index',
      })
      throw error
    }
  }
}

// Queue manager for coordinating multiple queues
export class QueueManager {
  private static instance: QueueManager
  private queues: Map<string, AsyncQueue> = new Map()

  private constructor() {}

  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager()
    }
    return QueueManager.instance
  }

  registerQueue(name: string, queue: AsyncQueue): void {
    this.queues.set(name, queue)
    logger.info(`Queue registered: ${name}`, { category: 'queue' })
  }

  getQueue(name: string): AsyncQueue | undefined {
    return this.queues.get(name)
  }

  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {}
    for (const [name, queue] of this.queues) {
      stats[name] = queue.getStats()
    }
    return stats
  }

  async shutdownAll(timeout: number = 30000): Promise<void> {
    logger.info('Shutting down all queues', { category: 'queue' })

    const shutdownPromises = Array.from(this.queues.values()).map(queue => queue.shutdown(timeout))

    await Promise.all(shutdownPromises)
    logger.info('All queues shut down', { category: 'queue' })
  }
}

// Initialize global queues
export const textExtractionQueue = new TextExtractionQueue()
export const searchIndexQueue = new SearchIndexQueue()

// Register queues with manager
const queueManager = QueueManager.getInstance()
queueManager.registerQueue('text-extraction', textExtractionQueue)
queueManager.registerQueue('search-indexing', searchIndexQueue)
