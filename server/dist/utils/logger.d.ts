import winston from 'winston';
export declare const logger: winston.Logger;
export declare class PerformanceLogger {
    static startTimer(operation: string, requestId?: string): () => void;
    static logMemoryUsage(context: string, requestId?: string): void;
}
export declare const requestLogger: (req: any, res: any, next: any) => void;
export declare enum ErrorCategory {
    VALIDATION = "validation",
    AUTHENTICATION = "authentication",
    AUTHORIZATION = "authorization",
    NOT_FOUND = "not_found",
    RATE_LIMIT = "rate_limit",
    FILE_UPLOAD = "file_upload",
    TEXT_EXTRACTION = "text_extraction",
    SEARCH = "search",
    DATABASE = "database",
    EXTERNAL_SERVICE = "external_service",
    SYSTEM = "system",
    UNKNOWN = "unknown"
}
export declare const logError: (error: Error, category?: ErrorCategory, context?: any, requestId?: string) => void;
export declare const logBusinessMetric: (metric: string, value: number, unit: string, tags?: Record<string, string>, requestId?: string) => void;
