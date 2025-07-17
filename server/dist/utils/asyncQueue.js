import { EventEmitter } from 'events';
import { logger, PerformanceLogger } from './logger.js';
import { MetricsCollector } from './metrics.js';
export class AsyncQueue extends EventEmitter {
    name;
    queue = [];
    running = new Map();
    workers = 0;
    options;
    constructor(name, options = {}) {
        super();
        this.name = name;
        this.options = {
            concurrency: options.concurrency || 3,
            maxRetries: options.maxRetries || 3,
            timeout: options.timeout || 30000,
            retryDelay: options.retryDelay || 1000,
        };
        logger.info(`Queue initialized: ${this.name}`, {
            options: this.options,
            category: 'queue',
        });
    }
    async add(type, data, options = {}) {
        const job = {
            id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            data,
            priority: options.priority || 0,
            timestamp: Date.now(),
            retries: 0,
            maxRetries: options.maxRetries || this.options.maxRetries,
            timeout: options.timeout || this.options.timeout,
            requestId: options.requestId,
        };
        return new Promise((resolve, reject) => {
            ;
            job.resolve = resolve;
            job.reject = reject;
            this.queue.push(job);
            this.queue.sort((a, b) => b.priority - a.priority);
            logger.debug(`Job added to queue: ${this.name}`, {
                jobId: job.id,
                type: job.type,
                priority: job.priority,
                queueLength: this.queue.length,
                requestId: job.requestId,
                category: 'queue',
            });
            this.emit('job:added', job);
            this.processQueue();
        });
    }
    async processQueue() {
        if (this.workers >= this.options.concurrency || this.queue.length === 0) {
            return;
        }
        const job = this.queue.shift();
        if (!job)
            return;
        this.workers++;
        const jobPromise = this.executeJob(job);
        this.running.set(job.id, jobPromise);
        try {
            const result = await jobPromise;
            job.resolve?.(result);
            this.emit('job:completed', job, result);
        }
        catch (error) {
            if (job.retries < job.maxRetries) {
                job.retries++;
                logger.warn(`Job retry ${job.retries}/${job.maxRetries}: ${this.name}`, {
                    jobId: job.id,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    requestId: job.requestId,
                    category: 'queue',
                });
                setTimeout(() => {
                    this.queue.unshift(job);
                    this.processQueue();
                }, this.options.retryDelay * job.retries);
            }
            else {
                job.reject?.(error);
                this.emit('job:failed', job, error);
            }
        }
        finally {
            this.workers--;
            this.running.delete(job.id);
            setImmediate(() => this.processQueue());
        }
    }
    async executeJob(job) {
        const stopTimer = PerformanceLogger.startTimer(`queue_job_${job.type}`, job.requestId);
        logger.debug(`Job started: ${this.name}`, {
            jobId: job.id,
            type: job.type,
            attempt: job.retries + 1,
            requestId: job.requestId,
            category: 'queue',
        });
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Job timeout after ${job.timeout}ms`));
                }, job.timeout);
            });
            const jobPromise = this.handleJob(job);
            const result = await Promise.race([jobPromise, timeoutPromise]);
            stopTimer();
            logger.debug(`Job completed: ${this.name}`, {
                jobId: job.id,
                type: job.type,
                requestId: job.requestId,
                category: 'queue',
            });
            return result;
        }
        catch (error) {
            stopTimer();
            logger.error(`Job failed: ${this.name}`, {
                jobId: job.id,
                type: job.type,
                error: error instanceof Error ? error.message : 'Unknown error',
                requestId: job.requestId,
                category: 'queue',
            });
            throw error;
        }
    }
    async handleJob(job) {
        throw new Error('handleJob must be implemented by subclass');
    }
    getStats() {
        return {
            name: this.name,
            queueLength: this.queue.length,
            runningJobs: this.running.size,
            workers: this.workers,
            maxWorkers: this.options.concurrency,
        };
    }
    async shutdown(timeout = 30000) {
        logger.info(`Shutting down queue: ${this.name}`, { category: 'queue' });
        this.queue.length = 0;
        const runningJobs = Array.from(this.running.values());
        if (runningJobs.length > 0) {
            logger.info(`Waiting for ${runningJobs.length} running jobs to complete`, {
                queueName: this.name,
                category: 'queue',
            });
            try {
                await Promise.race([
                    Promise.all(runningJobs),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Shutdown timeout')), timeout)),
                ]);
            }
            catch (error) {
                logger.warn(`Queue shutdown timeout: ${this.name}`, {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    category: 'queue',
                });
            }
        }
        logger.info(`Queue shut down: ${this.name}`, { category: 'queue' });
    }
}
export class TextExtractionQueue extends AsyncQueue {
    constructor() {
        super('text-extraction', {
            concurrency: 2,
            maxRetries: 2,
            timeout: 60000,
        });
    }
    async handleJob(job) {
        const { filePath, mimetype, fileId } = job.data;
        const { TextExtractionService } = await import('../infrastructure/services/TextExtractionService.js');
        const textExtractionService = new TextExtractionService();
        const start = Date.now();
        try {
            const result = await textExtractionService.extractText(filePath, mimetype);
            const duration = Date.now() - start;
            MetricsCollector.recordTextExtraction('success', mimetype, duration);
            return result;
        }
        catch (error) {
            const duration = Date.now() - start;
            MetricsCollector.recordTextExtraction('failure', mimetype, duration);
            throw error;
        }
    }
}
export class SearchIndexQueue extends AsyncQueue {
    constructor() {
        super('search-indexing', {
            concurrency: 1,
            maxRetries: 3,
            timeout: 10000,
        });
    }
    async handleJob(job) {
        const { fileId, action, fileData } = job.data;
        logger.debug(`Processing search index job`, {
            fileId,
            action,
            category: 'search-index',
        });
        const start = Date.now();
        try {
            const RepositoryContainer = (await import('../infrastructure/repositories/RepositoryContainer.js')).default;
            const repositoryContainer = RepositoryContainer.getInstance();
            const fileRepository = repositoryContainer.fileRepository;
            switch (action) {
                case 'add':
                case 'update':
                    if (fileData) {
                        await fileRepository.updateSearchIndex?.();
                    }
                    break;
                case 'remove':
                    await fileRepository.removeFromIndex?.(fileId);
                    break;
                default:
                    throw new Error(`Unknown search index action: ${action}`);
            }
            const duration = Date.now() - start;
            MetricsCollector.updateSearchIndexMetrics(await fileRepository.count(), duration);
            return { success: true };
        }
        catch (error) {
            logger.error('Search index job failed', {
                fileId,
                action,
                error: error instanceof Error ? error.message : 'Unknown error',
                category: 'search-index',
            });
            throw error;
        }
    }
}
export class QueueManager {
    static instance;
    queues = new Map();
    constructor() { }
    static getInstance() {
        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager();
        }
        return QueueManager.instance;
    }
    registerQueue(name, queue) {
        this.queues.set(name, queue);
        logger.info(`Queue registered: ${name}`, { category: 'queue' });
    }
    getQueue(name) {
        return this.queues.get(name);
    }
    getAllStats() {
        const stats = {};
        for (const [name, queue] of this.queues) {
            stats[name] = queue.getStats();
        }
        return stats;
    }
    async shutdownAll(timeout = 30000) {
        logger.info('Shutting down all queues', { category: 'queue' });
        const shutdownPromises = Array.from(this.queues.values()).map(queue => queue.shutdown(timeout));
        await Promise.all(shutdownPromises);
        logger.info('All queues shut down', { category: 'queue' });
    }
}
export const textExtractionQueue = new TextExtractionQueue();
export const searchIndexQueue = new SearchIndexQueue();
const queueManager = QueueManager.getInstance();
queueManager.registerQueue('text-extraction', textExtractionQueue);
queueManager.registerQueue('search-indexing', searchIndexQueue);
