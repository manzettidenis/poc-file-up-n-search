import winston from 'winston'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Custom log levels with colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
}

winston.addColors(logColors)

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint(),
)

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, service, requestId, ...meta }) => {
    let log = `${timestamp} [${level}]`
    if (service) log += ` [${service}]`
    if (requestId) log += ` [${requestId}]`
    log += `: ${message}`

    // Add metadata if present
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
    return log + metaStr
  }),
)

// Create logger instance
export const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'file-upload-api' },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Combined log file
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),

    // Console output for development
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    }),
  ],
})

// Performance logging utilities
export class PerformanceLogger {
  static startTimer(operation: string, requestId?: string): () => void {
    const start = process.hrtime.bigint()

    return () => {
      const end = process.hrtime.bigint()
      const duration = Number(end - start) / 1_000_000 // Convert to milliseconds

      logger.info('Operation completed', {
        operation,
        duration: `${duration.toFixed(2)}ms`,
        requestId,
        category: 'performance',
      })
    }
  }

  static logMemoryUsage(context: string, requestId?: string): void {
    const usage = process.memoryUsage()
    logger.info('Memory usage', {
      context,
      memory: {
        rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`,
      },
      requestId,
      category: 'performance',
    })
  }
}

// Request logging middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now()
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  req.requestId = requestId
  req.startTime = start

  // Log request
  logger.http('Request started', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId,
    category: 'http',
  })

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.http('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      contentLength: res.get('Content-Length'),
      duration: `${duration}ms`,
      requestId,
      category: 'http',
    })
  })

  next()
}

// Error categorization
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  FILE_UPLOAD = 'file_upload',
  TEXT_EXTRACTION = 'text_extraction',
  SEARCH = 'search',
  DATABASE = 'database',
  EXTERNAL_SERVICE = 'external_service',
  SYSTEM = 'system',
  UNKNOWN = 'unknown',
}

// Structured error logging
export const logError = (
  error: Error,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  context?: any,
  requestId?: string,
) => {
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    category,
    context,
    requestId,
    timestamp: new Date().toISOString(),
  })
}

// Business metrics logging
export const logBusinessMetric = (
  metric: string,
  value: number,
  unit: string,
  tags?: Record<string, string>,
  requestId?: string,
) => {
  logger.info('Business metric', {
    metric,
    value,
    unit,
    tags,
    requestId,
    category: 'metrics',
  })
}

// Create logs directory if it doesn't exist
import fs from 'fs'
const logsDir = path.join(__dirname, '../../logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}
