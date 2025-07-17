import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import uploadRoutes from './routes/upload.js';
import searchRoutes from './routes/search.js';
import fileRoutes from './routes/files.js';
import { InputSanitizer } from './utils/inputSanitization.js';
import { logger, requestLogger, ErrorCategory, logError } from './utils/logger.js';
import { metricsMiddleware, register } from './utils/metrics.js';
import { healthCheckHandler, livenessHandler, readinessHandler } from './utils/healthCheck.js';
import { QueueManager } from './utils/asyncQueue.js';
import { EnvValidator } from './utils/envValidation.js';
dotenv.config();
const config = EnvValidator.validateAndLoadConfig();
EnvValidator.logConfiguration(config);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = config.PORT;
const NODE_ENV = config.NODE_ENV;
const FRONTEND_URL = config.FRONTEND_URL;
const createRateLimiter = (windowMs, max, message) => rateLimit({
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
        });
        res.status(429).json({ success: false, error: message });
    },
});
const generalLimiter = createRateLimiter(15 * 60 * 1000, 1000, 'Too many requests from this IP, please try again later.');
const uploadLimiter = createRateLimiter(60 * 1000, 50, 'Too many upload attempts, please wait a minute before trying again.');
const searchLimiter = createRateLimiter(60 * 1000, 300, 'Too many search requests, please wait a minute before trying again.');
app.use(helmet({
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
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
}));
const allowedOrigins = NODE_ENV === 'production' ? [FRONTEND_URL] : [FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            logger.warn('CORS blocked origin', { origin, category: 'security' });
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400,
}));
app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        try {
            JSON.parse(buf.toString());
        }
        catch (err) {
            throw new Error('Invalid JSON payload');
        }
    },
}));
app.use(express.urlencoded({
    extended: true,
    limit: '10mb',
    parameterLimit: 100,
}));
app.use(metricsMiddleware);
app.use(requestLogger);
app.use(generalLimiter);
app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'] || InputSanitizer.generateRequestId();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Request-ID', requestId);
    next();
});
app.use('/uploads', (req, res, next) => {
    const filePath = req.path;
    if (filePath.includes('..') || filePath.includes('/./') || filePath.includes('\\')) {
        return res.status(400).json({ success: false, error: 'Invalid file path' });
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'attachment');
    return next();
}, express.static(path.join(__dirname, '../uploads'), {
    maxAge: '1d',
    index: false,
    dotfiles: 'deny',
}));
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    }
    catch (error) {
        res.status(500).end('Error generating metrics');
    }
});
app.get('/health', healthCheckHandler);
app.get('/health/live', livenessHandler);
app.get('/health/ready', readinessHandler);
app.use('/api/upload', uploadLimiter, uploadRoutes);
app.use('/api/search', searchLimiter, searchRoutes);
app.use('/api/files', fileRoutes);
app.get('/api/health', (req, res) => {
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
    });
});
app.get('/api/ocr/capabilities', async (req, res) => {
    try {
        const { TextExtractionService } = await import('./infrastructure/services/TextExtractionService.js');
        const service = new TextExtractionService();
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
        });
    }
    catch (error) {
        logger.error('OCR capabilities endpoint error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            category: 'api',
        });
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve OCR capabilities',
        });
    }
});
app.get('/api/status', async (req, res) => {
    try {
        const queueManager = QueueManager.getInstance();
        res.json({
            status: 'operational',
            timestamp: new Date().toISOString(),
            queues: queueManager.getAllStats(),
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                architecture: process.arch,
            },
        });
    }
    catch (error) {
        logger.error('Status endpoint error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            category: 'api',
        });
        res.status(500).json({
            status: 'error',
            error: 'Unable to retrieve status',
        });
    }
});
app.use('*', (req, res) => {
    logger.warn('404 - Route not found', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        category: 'http',
    });
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
    });
});
app.use((err, req, res, next) => {
    const requestId = req.headers['x-request-id'];
    logError(err, ErrorCategory.SYSTEM, {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    }, requestId);
    const isDev = NODE_ENV === 'development';
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        requestId,
        ...(isDev && {
            details: err.message,
            stack: err.stack,
        }),
    });
});
const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received, starting graceful shutdown`, { category: 'server' });
    try {
        server.close(async () => {
            logger.info('HTTP server closed', { category: 'server' });
            const queueManager = QueueManager.getInstance();
            await queueManager.shutdownAll(30000);
            logger.info('Graceful shutdown completed', { category: 'server' });
            process.exit(0);
        });
        setTimeout(() => {
            logger.error('Graceful shutdown timeout, forcing exit', { category: 'server' });
            process.exit(1);
        }, 45000);
    }
    catch (error) {
        logger.error('Error during graceful shutdown', {
            error: error instanceof Error ? error.message : 'Unknown error',
            category: 'server',
        });
        process.exit(1);
    }
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', err => {
    logger.error('Uncaught Exception', {
        error: err.message,
        stack: err.stack,
        category: 'system',
    });
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        promise: String(promise),
        category: 'system',
    });
});
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
    });
});
export default app;
