import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
const logColors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
};
winston.addColors(logColors);
const logFormat = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.errors({ stack: true }), winston.format.json(), winston.format.prettyPrint());
const consoleFormat = winston.format.combine(winston.format.timestamp({ format: 'HH:mm:ss' }), winston.format.colorize({ all: true }), winston.format.printf(({ timestamp, level, message, service, requestId, ...meta }) => {
    let log = `${timestamp} [${level}]`;
    if (service)
        log += ` [${service}]`;
    if (requestId)
        log += ` [${requestId}]`;
    log += `: ${message}`;
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return log + metaStr;
}));
export const logger = winston.createLogger({
    levels: logLevels,
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'file-upload-api' },
    transports: [
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/combined.log'),
            maxsize: 5242880,
            maxFiles: 10,
        }),
        new winston.transports.Console({
            format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
        }),
    ],
});
export class PerformanceLogger {
    static startTimer(operation, requestId) {
        const start = process.hrtime.bigint();
        return () => {
            const end = process.hrtime.bigint();
            const duration = Number(end - start) / 1_000_000;
            logger.info('Operation completed', {
                operation,
                duration: `${duration.toFixed(2)}ms`,
                requestId,
                category: 'performance',
            });
        };
    }
    static logMemoryUsage(context, requestId) {
        const usage = process.memoryUsage();
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
        });
    }
}
export const requestLogger = (req, res, next) => {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    req.requestId = requestId;
    req.startTime = start;
    logger.http('Request started', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId,
        category: 'http',
    });
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.http('Request completed', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            contentLength: res.get('Content-Length'),
            duration: `${duration}ms`,
            requestId,
            category: 'http',
        });
    });
    next();
};
export var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["VALIDATION"] = "validation";
    ErrorCategory["AUTHENTICATION"] = "authentication";
    ErrorCategory["AUTHORIZATION"] = "authorization";
    ErrorCategory["NOT_FOUND"] = "not_found";
    ErrorCategory["RATE_LIMIT"] = "rate_limit";
    ErrorCategory["FILE_UPLOAD"] = "file_upload";
    ErrorCategory["TEXT_EXTRACTION"] = "text_extraction";
    ErrorCategory["SEARCH"] = "search";
    ErrorCategory["DATABASE"] = "database";
    ErrorCategory["EXTERNAL_SERVICE"] = "external_service";
    ErrorCategory["SYSTEM"] = "system";
    ErrorCategory["UNKNOWN"] = "unknown";
})(ErrorCategory || (ErrorCategory = {}));
export const logError = (error, category = ErrorCategory.UNKNOWN, context, requestId) => {
    logger.error('Error occurred', {
        message: error.message,
        stack: error.stack,
        category,
        context,
        requestId,
        timestamp: new Date().toISOString(),
    });
};
export const logBusinessMetric = (metric, value, unit, tags, requestId) => {
    logger.info('Business metric', {
        metric,
        value,
        unit,
        tags,
        requestId,
        category: 'metrics',
    });
};
import fs from 'fs';
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}
