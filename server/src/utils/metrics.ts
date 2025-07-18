import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client'

// Enable default system metrics collection
collectDefaultMetrics({ register })

// HTTP request metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
})

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
})

// File upload metrics
export const fileUploadsTotal = new Counter({
  name: 'file_uploads_total',
  help: 'Total number of file uploads',
  labelNames: ['status', 'file_type'],
  registers: [register],
})

export const fileUploadSize = new Histogram({
  name: 'file_upload_size_bytes',
  help: 'Size of uploaded files in bytes',
  labelNames: ['file_type'],
  buckets: [1024, 10240, 102400, 1048576, 10485760, 52428800], // 1KB to 50MB
  registers: [register],
})

export const fileUploadDuration = new Histogram({
  name: 'file_upload_duration_seconds',
  help: 'Time taken to process file uploads',
  labelNames: ['file_type'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
})

// Text extraction metrics
export const textExtractionTotal = new Counter({
  name: 'text_extraction_total',
  help: 'Total number of text extractions',
  labelNames: ['status', 'file_type', 'extraction_type'], // Added extraction_type for OCR/PDF/text
  registers: [register],
})

export const textExtractionDuration = new Histogram({
  name: 'text_extraction_duration_seconds',
  help: 'Time taken for text extraction',
  labelNames: ['file_type', 'extraction_type'], // Added extraction_type
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60], // Extended for OCR operations
  registers: [register],
})

// OCR-specific metrics
export const ocrProcessingTotal = new Counter({
  name: 'ocr_processing_total',
  help: 'Total number of OCR operations',
  labelNames: ['status', 'language', 'image_type'],
  registers: [register],
})

export const ocrProcessingDuration = new Histogram({
  name: 'ocr_processing_duration_seconds',
  help: 'Time taken for OCR processing',
  labelNames: ['language', 'image_type'],
  buckets: [1, 5, 10, 30, 60, 120], // OCR can take longer
  registers: [register],
})

export const ocrCharactersExtracted = new Histogram({
  name: 'ocr_characters_extracted',
  help: 'Number of characters extracted via OCR',
  labelNames: ['language'],
  buckets: [0, 10, 50, 100, 500, 1000, 5000, 10000],
  registers: [register],
})

export const ocrWordsExtracted = new Histogram({
  name: 'ocr_words_extracted',
  help: 'Number of words extracted via OCR',
  labelNames: ['language'],
  buckets: [0, 5, 10, 50, 100, 500, 1000, 2000],
  registers: [register],
})

export const imageProcessingDuration = new Histogram({
  name: 'image_processing_duration_seconds',
  help: 'Time taken for image preprocessing before OCR',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
})

// Search metrics
export const searchQueriesTotal = new Counter({
  name: 'search_queries_total',
  help: 'Total number of search queries',
  labelNames: ['status'],
  registers: [register],
})

export const searchDuration = new Histogram({
  name: 'search_duration_seconds',
  help: 'Time taken to execute search queries',
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [register],
})

export const searchResultsCount = new Histogram({
  name: 'search_results_count',
  help: 'Number of results returned by search queries',
  buckets: [0, 1, 5, 10, 25, 50, 100, 500],
  registers: [register],
})

// Application state metrics
export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
})

export const filesInStorage = new Gauge({
  name: 'files_in_storage_total',
  help: 'Total number of files in storage',
  registers: [register],
})

export const totalStorageUsed = new Gauge({
  name: 'storage_used_bytes',
  help: 'Total storage space used in bytes',
  registers: [register],
})

export const cacheHitRate = new Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate percentage',
  labelNames: ['cache_type'],
  registers: [register],
})

// Error metrics
export const errorsTotal = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'category'],
  registers: [register],
})

// Rate limiting metrics
export const rateLimitHits = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint'],
  registers: [register],
})

// Memory usage metrics
export const memoryUsageBytes = new Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type'], // heap_used, heap_total, rss, external
  registers: [register],
})

// Business metrics
export const searchIndexSize = new Gauge({
  name: 'search_index_size',
  help: 'Number of documents in search index',
  registers: [register],
})

export const indexingDuration = new Histogram({
  name: 'indexing_duration_seconds',
  help: 'Time taken to update search index',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
})

// Metrics collection utilities
export class MetricsCollector {
  static recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    httpRequestsTotal.inc({ method, route, status_code: statusCode })
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration / 1000)
  }

  static recordFileUpload(status: 'success' | 'failure', fileType: string, size: number, duration: number): void {
    fileUploadsTotal.inc({ status, file_type: fileType })
    if (status === 'success') {
      fileUploadSize.observe({ file_type: fileType }, size)
      fileUploadDuration.observe({ file_type: fileType }, duration / 1000)
    }
  }

  static recordTextExtraction(
    status: 'success' | 'failure',
    fileType: string,
    duration: number,
    extractionType?: string,
  ): void {
    const type = extractionType || 'unknown'
    textExtractionTotal.inc({ status, file_type: fileType, extraction_type: type })
    if (status === 'success') {
      textExtractionDuration.observe({ file_type: fileType, extraction_type: type }, duration / 1000)
    }
  }

  static recordOCRProcessing(
    status: 'success' | 'failure',
    language: string,
    imageType: string,
    duration: number,
    charactersExtracted?: number,
    wordsExtracted?: number,
  ): void {
    ocrProcessingTotal.inc({ status, language, image_type: imageType })

    if (status === 'success') {
      ocrProcessingDuration.observe({ language, image_type: imageType }, duration / 1000)

      if (charactersExtracted !== undefined) {
        ocrCharactersExtracted.observe({ language }, charactersExtracted)
      }

      if (wordsExtracted !== undefined) {
        ocrWordsExtracted.observe({ language }, wordsExtracted)
      }
    }
  }

  static recordImageProcessing(duration: number): void {
    imageProcessingDuration.observe(duration / 1000)
  }

  static recordSearch(status: 'success' | 'failure', duration: number, resultCount?: number): void {
    searchQueriesTotal.inc({ status })
    if (status === 'success') {
      searchDuration.observe(duration / 1000)
      if (resultCount !== undefined) {
        searchResultsCount.observe(resultCount)
      }
    }
  }

  static recordError(type: string, category: string): void {
    errorsTotal.inc({ type, category })
  }

  static updateMemoryMetrics(): void {
    const usage = process.memoryUsage()
    memoryUsageBytes.set({ type: 'heap_used' }, usage.heapUsed)
    memoryUsageBytes.set({ type: 'heap_total' }, usage.heapTotal)
    memoryUsageBytes.set({ type: 'rss' }, usage.rss)
    memoryUsageBytes.set({ type: 'external' }, usage.external)
  }

  static updateStorageMetrics(fileCount: number, totalSize: number): void {
    filesInStorage.set(fileCount)
    totalStorageUsed.set(totalSize)
  }

  static updateCacheMetrics(cacheType: string, hitRate: number): void {
    cacheHitRate.set({ cache_type: cacheType }, hitRate)
  }

  static updateSearchIndexMetrics(documentCount: number, indexingTime: number): void {
    searchIndexSize.set(documentCount)
    indexingDuration.observe(indexingTime / 1000)
  }
}

// Middleware for automatic HTTP metrics collection
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const route = req.route?.path || req.path || 'unknown'
    MetricsCollector.recordHttpRequest(req.method, route, res.statusCode, duration)
  })

  next()
}

// Memory monitoring
setInterval(() => {
  MetricsCollector.updateMemoryMetrics()
}, 30000) // Update every 30 seconds

// Export the registry for /metrics endpoint
export { register }
