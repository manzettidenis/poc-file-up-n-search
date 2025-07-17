import { Request, Response } from 'express';
export interface HealthCheckResult {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, ComponentHealth>;
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
}
export interface ComponentHealth {
    status: 'pass' | 'warn' | 'fail';
    message?: string;
    duration?: number;
    metadata?: Record<string, any>;
}
export declare class HealthChecker {
    private startTime;
    private version;
    private environment;
    constructor();
    performHealthCheck(): Promise<HealthCheckResult>;
    private checkMemory;
    private checkDiskSpace;
    private checkFileSystem;
    private checkCache;
    private checkQueues;
    private checkExtractedTextAccess;
    private determineOverallStatus;
    livenessProbe(): Promise<{
        status: 'ok' | 'error';
        timestamp: string;
    }>;
    readinessProbe(): Promise<{
        status: 'ready' | 'not_ready';
        timestamp: string;
    }>;
}
export declare const healthChecker: HealthChecker;
export declare const healthCheckHandler: (req: Request, res: Response) => Promise<void>;
export declare const livenessHandler: (req: Request, res: Response) => Promise<void>;
export declare const readinessHandler: (req: Request, res: Response) => Promise<void>;
