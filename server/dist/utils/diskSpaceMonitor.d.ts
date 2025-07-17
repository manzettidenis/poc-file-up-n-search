interface DiskSpaceInfo {
    available: number;
    total: number;
    used: number;
    usagePercentage: number;
}
export declare class DiskSpaceMonitor {
    private static readonly MIN_FREE_SPACE_MB;
    private static readonly MAX_USAGE_PERCENTAGE;
    static getDiskSpace(dirPath: string): Promise<DiskSpaceInfo>;
    static hasEnoughSpace(dirPath: string, fileSizeBytes: number): Promise<boolean>;
    static getUploadsDirSize(uploadsDir: string): Promise<number>;
    static cleanupOldFilesIfNeeded(uploadsDir: string, maxUsagePercentage?: number): Promise<void>;
}
export {};
