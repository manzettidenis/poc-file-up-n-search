import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger.js';
import { CacheManager } from './cache.js';
import { QueueManager } from './asyncQueue.js';
export class HealthChecker {
    startTime;
    version;
    environment;
    constructor() {
        this.startTime = Date.now();
        this.version = process.env.npm_package_version || '1.0.0';
        this.environment = process.env.NODE_ENV || 'development';
    }
    async performHealthCheck() {
        const startTime = Date.now();
        const checks = {};
        const checkPromises = [
            this.checkMemory(),
            this.checkDiskSpace(),
            this.checkFileSystem(),
            this.checkCache(),
            this.checkQueues(),
            this.checkExtractedTextAccess(),
        ];
        const checkResults = await Promise.allSettled(checkPromises);
        const checkNames = ['memory', 'disk', 'filesystem', 'cache', 'queues', 'text_extraction'];
        for (let i = 0; i < checkResults.length; i++) {
            const result = checkResults[i];
            const name = checkNames[i];
            if (result && name) {
                if (result.status === 'fulfilled') {
                    checks[name] = result.value;
                }
                else {
                    checks[name] = {
                        status: 'fail',
                        message: `Health check failed: ${result.reason}`,
                    };
                }
            }
        }
        const overallStatus = this.determineOverallStatus(checks);
        const duration = Date.now() - startTime;
        const healthResult = {
            status: overallStatus,
            checks,
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.startTime,
            version: this.version,
            environment: this.environment,
        };
        logger.info('Health check completed', {
            status: overallStatus,
            duration: `${duration}ms`,
            category: 'health',
        });
        return healthResult;
    }
    async checkMemory() {
        const usage = process.memoryUsage();
        const totalMB = Math.round(usage.rss / 1024 / 1024);
        const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
        const WARNING_THRESHOLD = 512;
        const CRITICAL_THRESHOLD = 1024;
        let status = 'pass';
        let message = `Memory usage: ${totalMB}MB RSS, ${heapUsedMB}MB/${heapTotalMB}MB heap`;
        if (totalMB > CRITICAL_THRESHOLD) {
            status = 'fail';
            message += ' - CRITICAL: Very high memory usage';
        }
        else if (totalMB > WARNING_THRESHOLD) {
            status = 'warn';
            message += ' - WARNING: High memory usage';
        }
        return {
            status,
            message,
            metadata: {
                rss: totalMB,
                heapUsed: heapUsedMB,
                heapTotal: heapTotalMB,
                external: Math.round(usage.external / 1024 / 1024),
            },
        };
    }
    async checkDiskSpace() {
        try {
            const uploadsDir = path.join(process.cwd(), 'uploads');
            try {
                const stats = await fs.statfs(uploadsDir);
                const totalGB = Math.round((stats.blocks * stats.bsize) / (1024 * 1024 * 1024));
                const availableGB = Math.round((stats.bavail * stats.bsize) / (1024 * 1024 * 1024));
                const usedPercentage = Math.round(((totalGB - availableGB) / totalGB) * 100);
                let status = 'pass';
                let message = `Disk usage: ${usedPercentage}% (${availableGB}GB available of ${totalGB}GB)`;
                if (usedPercentage > 95) {
                    status = 'fail';
                    message += ' - CRITICAL: Very low disk space';
                }
                else if (usedPercentage > 85) {
                    status = 'warn';
                    message += ' - WARNING: Low disk space';
                }
                return {
                    status,
                    message,
                    metadata: {
                        totalGB,
                        availableGB,
                        usedPercentage,
                    },
                };
            }
            catch (statfsError) {
                return {
                    status: 'warn',
                    message: 'Disk space check not available on this system',
                    metadata: { error: 'statfs not supported' },
                };
            }
        }
        catch (error) {
            return {
                status: 'fail',
                message: `Disk space check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    async checkFileSystem() {
        try {
            const uploadsDir = path.join(process.cwd(), 'uploads');
            const dataDir = path.join(process.cwd(), 'data');
            await fs.access(uploadsDir, fs.constants.R_OK | fs.constants.W_OK);
            await fs.access(dataDir, fs.constants.R_OK | fs.constants.W_OK);
            const testFile = path.join(uploadsDir, '.health-check');
            const testData = `health-check-${Date.now()}`;
            await fs.writeFile(testFile, testData);
            const readData = await fs.readFile(testFile, 'utf-8');
            await fs.unlink(testFile);
            if (readData !== testData) {
                throw new Error('File system integrity check failed');
            }
            return {
                status: 'pass',
                message: 'File system is accessible and functioning',
                metadata: {
                    uploadsDir,
                    dataDir,
                },
            };
        }
        catch (error) {
            return {
                status: 'fail',
                message: `File system check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    async checkCache() {
        try {
            const stats = CacheManager.getAllStats();
            let status = 'pass';
            let message = 'Cache systems are operational';
            let lowHitRates = 0;
            for (const [cacheType, stat] of Object.entries(stats)) {
                if (stat.hitRate < 50 && stat.hits + stat.misses > 10) {
                    lowHitRates++;
                }
            }
            if (lowHitRates > 0) {
                status = 'warn';
                message = `${lowHitRates} cache(s) have low hit rates`;
            }
            return {
                status,
                message,
                metadata: stats,
            };
        }
        catch (error) {
            return {
                status: 'fail',
                message: `Cache check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    async checkQueues() {
        try {
            const queueManager = QueueManager.getInstance();
            const stats = queueManager.getAllStats();
            let status = 'pass';
            let message = 'All queues are operational';
            let totalQueueLength = 0;
            for (const [queueName, queueStats] of Object.entries(stats)) {
                totalQueueLength += queueStats.queueLength;
                if (queueStats.queueLength > 50 && queueStats.runningJobs === 0) {
                    status = 'fail';
                    message = `Queue ${queueName} appears to be stuck`;
                    break;
                }
                else if (queueStats.queueLength > 20) {
                    status = 'warn';
                    message = `Queue ${queueName} has high backlog`;
                }
            }
            return {
                status,
                message,
                metadata: {
                    ...stats,
                    totalQueueLength,
                },
            };
        }
        catch (error) {
            return {
                status: 'fail',
                message: `Queue check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    async checkExtractedTextAccess() {
        try {
            const { TextExtractionService } = await import('../infrastructure/services/TextExtractionService.js');
            const service = new TextExtractionService();
            const supportedTypes = service.supportedMimeTypes();
            const ocrLanguages = service.getAvailableOCRLanguages();
            let ocrStatus = 'available';
            try {
                await import('node-tesseract-ocr');
            }
            catch (error) {
                ocrStatus = 'unavailable';
            }
            return {
                status: ocrStatus === 'available' ? 'pass' : 'warn',
                message: `Text extraction service available for ${supportedTypes.length} file types, OCR: ${ocrStatus}`,
                metadata: {
                    supportedTypes,
                    ocrLanguages,
                    ocrStatus,
                    imageTypesSupported: supportedTypes.filter(type => type.startsWith('image/')).length,
                },
            };
        }
        catch (error) {
            return {
                status: 'fail',
                message: `Text extraction check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    determineOverallStatus(checks) {
        const statuses = Object.values(checks).map(check => check.status);
        if (statuses.includes('fail')) {
            return 'unhealthy';
        }
        else if (statuses.includes('warn')) {
            return 'degraded';
        }
        else {
            return 'healthy';
        }
    }
    async livenessProbe() {
        try {
            const memUsage = process.memoryUsage();
            const memUsageMB = memUsage.rss / 1024 / 1024;
            if (memUsageMB > 2048) {
                throw new Error('Memory usage critically high');
            }
            return {
                status: 'ok',
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            logger.error('Liveness probe failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                category: 'health',
            });
            return {
                status: 'error',
                timestamp: new Date().toISOString(),
            };
        }
    }
    async readinessProbe() {
        try {
            const checks = await Promise.all([this.checkFileSystem(), this.checkCache()]);
            const hasFailures = checks.some(check => check.status === 'fail');
            return {
                status: hasFailures ? 'not_ready' : 'ready',
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            logger.error('Readiness probe failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                category: 'health',
            });
            return {
                status: 'not_ready',
                timestamp: new Date().toISOString(),
            };
        }
    }
}
export const healthChecker = new HealthChecker();
export const healthCheckHandler = async (req, res) => {
    try {
        const result = await healthChecker.performHealthCheck();
        let statusCode = 200;
        if (result.status === 'degraded') {
            statusCode = 200;
        }
        else if (result.status === 'unhealthy') {
            statusCode = 503;
        }
        res.status(statusCode).json(result);
    }
    catch (error) {
        logger.error('Health check handler failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            category: 'health',
        });
        res.status(500).json({
            status: 'unhealthy',
            error: 'Health check failed',
            timestamp: new Date().toISOString(),
        });
    }
};
export const livenessHandler = async (req, res) => {
    const result = await healthChecker.livenessProbe();
    const statusCode = result.status === 'ok' ? 200 : 500;
    res.status(statusCode).json(result);
};
export const readinessHandler = async (req, res) => {
    const result = await healthChecker.readinessProbe();
    const statusCode = result.status === 'ready' ? 200 : 503;
    res.status(statusCode).json(result);
};
