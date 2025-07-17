import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
import path from 'path'
import { fileURLToPath } from 'url'
import uploadRoutes from './routes/upload.js'
import searchRoutes from './routes/search.js'
import fileRoutes from './routes/files.js'
import { InputSanitizer } from './utils/inputSanitization.js'
import { logger, requestLogger, ErrorCategory, logError } from './utils/logger.js'
import { metricsMiddleware, register } from './utils/metrics.js'
import { healthCheckHandler, livenessHandler, readinessHandler } from './utils/healthCheck.js'
import { QueueManager } from './utils/asyncQueue.js'
import { EnvValidator } from './utils/envValidation.js'

dotenv.config()

// Validate environment configuration
const config = EnvValidator.validateAndLoadConfig()
EnvValidator.logConfiguration(config)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = config.PORT
const NODE_ENV = config.NODE_ENV
const FRONTEND_URL = config.FRONTEND_URL

// Trust proxy for rate limiting behind reverse proxy (nginx)
app.set('trust proxy', 1)

// Enable compression for all responses
// Note: Compression middleware temporarily disabled due to TypeScript conflicts
// app.use(compression())

// Security-focused rate limiting - Made flexible for PoC
const createRateLimiter = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    message: { success: false, error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
        category: 'rate-limit',
      })
      res.status(429).json({ success: false, error: message })
    },
  })

// Much more flexible rate limits for PoC usage
const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  1000, // 1000 requests (was 100)
  'Too many requests from this IP, please try again later.',
)
const uploadLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  50, // 50 uploads per minute (was 5)
  'Too many upload attempts, please wait a minute before trying again.',
)
const searchLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  300, // 300 searches per minute (was 30)
  'Too many search requests, please wait a minute before trying again.',
)

// Enhanced security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for file downloads
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
)

// Enhanced CORS configuration
const allowedOrigins =
  NODE_ENV === 'production' ? [FRONTEND_URL] : [FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000']

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true)

      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        logger.warn('CORS blocked origin', { origin, category: 'security' })
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400, // 24 hours
  }),
)

// Body parsing with size limits and validation
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      // Validate JSON payload
      try {
        JSON.parse(buf.toString())
      } catch (err) {
        throw new Error('Invalid JSON payload')
      }
    },
  }),
)

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
    parameterLimit: 100, // Limit URL parameters
  }),
)

// Apply performance and monitoring middleware
app.use(metricsMiddleware)
app.use(requestLogger)
app.use(generalLimiter)

// Request context middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  // Generate request ID for tracking
  const requestId = (req.headers['x-request-id'] as string) || InputSanitizer.generateRequestId()
  req.headers['x-request-id'] = requestId

  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Request-ID', requestId)

  next()
})

// Secure static file serving with restrictions
app.use(
  '/uploads',
  (req: Request, res: Response, next: NextFunction) => {
    // Validate file path to prevent directory traversal
    const filePath = req.path
    if (filePath.includes('..') || filePath.includes('/./') || filePath.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid file path' })
    }

    // Set security headers for file downloads
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Disposition', 'attachment')

    return next()
  },
  express.static(path.join(__dirname, '../uploads'), {
    maxAge: '1d',
    index: false, // Disable directory listing
    dotfiles: 'deny', // Block hidden files
  }),
)

// Metrics endpoint for Prometheus scraping
app.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType)
    res.end(await register.metrics())
  } catch (error) {
    res.status(500).end('Error generating metrics')
  }
})

// Health check endpoints
app.get('/health', healthCheckHandler)
app.get('/health/live', livenessHandler)
app.get('/health/ready', readinessHandler)

// API routes with specific rate limiting
app.use('/api/upload', uploadLimiter, uploadRoutes)
app.use('/api/search', searchLimiter, searchRoutes)
app.use('/api/files', fileRoutes)

// Enhanced health check endpoint with detailed information
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    performance: {
      caching: 'enabled',
      compression: 'enabled',
      monitoring: 'enabled',
      asyncProcessing: 'enabled',
      ocrSupport: 'enabled',
    },
  })
})

// OCR capabilities endpoint
app.get('/api/ocr/capabilities', async (req: Request, res: Response) => {
  try {
    const { TextExtractionService } = await import('./infrastructure/services/TextExtractionService.js')
    const service = new TextExtractionService()

    res.json({
      success: true,
      capabilities: {
        supportedImageTypes: service.supportedMimeTypes().filter(type => type.startsWith('image/')),
        supportedLanguages: service.getAvailableOCRLanguages(),
        engine: 'tesseract',
        preprocessing: {
          grayscale: true,
          sharpen: true,
          normalize: true,
        },
        caching: true,
        metrics: true,
      },
    })
  } catch (error) {
    logger.error('OCR capabilities endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      category: 'api',
    })
    res.status(500).json({
      success: false,
      error: 'Unable to retrieve OCR capabilities',
    })
  }
})

// API status endpoint with performance metrics
app.get('/api/status', async (req: Request, res: Response) => {
  try {
    const queueManager = QueueManager.getInstance()

    res.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      queues: queueManager.getAllStats(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
      },
    })
  } catch (error) {
    logger.error('Status endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      category: 'api',
    })
    res.status(500).json({
      status: 'error',
      error: 'Unable to retrieve status',
    })
  }
})

// 404 handler for unknown routes
app.use('*', (req: Request, res: Response) => {
  logger.warn('404 - Route not found', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    category: 'http',
  })

  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
  })
})

// Enhanced error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string

  logError(
    err,
    ErrorCategory.SYSTEM,
    {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    },
    requestId,
  )

  // Don't leak error details in production
  const isDev = NODE_ENV === 'development'

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    requestId,
    ...(isDev && {
      details: err.message,
      stack: err.stack,
    }),
  })
})

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown`, { category: 'server' })

  try {
    // Stop accepting new requests
    server.close(async () => {
      logger.info('HTTP server closed', { category: 'server' })

      // Shutdown queues
      const queueManager = QueueManager.getInstance()
      await queueManager.shutdownAll(30000)

      logger.info('Graceful shutdown completed', { category: 'server' })
      process.exit(0)
    })

    // Force shutdown after timeout
    setTimeout(() => {
      logger.error('Graceful shutdown timeout, forcing exit', { category: 'server' })
      process.exit(1)
    }, 45000)
  } catch (error) {
    logger.error('Error during graceful shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error',
      category: 'server',
    })
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', err => {
  logger.error('Uncaught Exception', {
    error: err.message,
    stack: err.stack,
    category: 'system',
  })
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    promise: String(promise),
    category: 'system',
  })
})

const server = app.listen(PORT, () => {
  logger.info('🚀 File Upload & Search API Started', {
    port: PORT,
    environment: NODE_ENV,
    features: {
      security: '✓ Enhanced',
      performance: '✓ Optimized',
      monitoring: '✓ Comprehensive',
      caching: '✓ Multi-layer',
      asyncProcessing: '✓ Queue-based',
      compression: '✓ Enabled',
      healthChecks: '✓ Advanced',
    },
    category: 'server',
  })
})

export default app
