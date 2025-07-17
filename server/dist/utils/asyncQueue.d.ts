import { EventEmitter } from 'events';
interface QueueJob<T = any> {
    id: string;
    type: string;
    data: T;
    priority: number;
    timestamp: number;
    retries: number;
    maxRetries: number;
    timeout: number;
    requestId?: string;
    resolve?: (value: any) => void;
    reject?: (reason?: any) => void;
}
interface QueueOptions {
    concurrency: number;
    maxRetries: number;
    timeout: number;
    retryDelay: number;
}
export declare class AsyncQueue<T = any> extends EventEmitter {
    private name;
    private queue;
    private running;
    private workers;
    private options;
    constructor(name: string, options?: Partial<QueueOptions>);
    add<R>(type: string, data: T, options?: {
        priority?: number;
        maxRetries?: number;
        timeout?: number;
        requestId?: string;
    }): Promise<R>;
    private processQueue;
    private executeJob;
    protected handleJob(job: QueueJob<T>): Promise<any>;
    getStats(): {
        name: string;
        queueLength: number;
        runningJobs: number;
        workers: number;
        maxWorkers: number;
    };
    shutdown(timeout?: number): Promise<void>;
}
export interface TextExtractionJob {
    filePath: string;
    mimetype: string;
    fileId: string;
}
export declare class TextExtractionQueue extends AsyncQueue<TextExtractionJob> {
    constructor();
    protected handleJob(job: QueueJob<TextExtractionJob>): Promise<any>;
}
export interface SearchIndexJob {
    fileId: string;
    action: 'add' | 'update' | 'remove';
    fileData?: any;
}
export declare class SearchIndexQueue extends AsyncQueue<SearchIndexJob> {
    constructor();
    protected handleJob(job: QueueJob<SearchIndexJob>): Promise<any>;
}
export declare class QueueManager {
    private static instance;
    private queues;
    private constructor();
    static getInstance(): QueueManager;
    registerQueue(name: string, queue: AsyncQueue): void;
    getQueue(name: string): AsyncQueue | undefined;
    getAllStats(): Record<string, any>;
    shutdownAll(timeout?: number): Promise<void>;
}
export declare const textExtractionQueue: TextExtractionQueue;
export declare const searchIndexQueue: SearchIndexQueue;
export {};
