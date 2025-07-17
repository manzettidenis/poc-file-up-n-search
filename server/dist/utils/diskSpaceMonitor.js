import fs from 'fs/promises';
import path from 'path';
export class DiskSpaceMonitor {
    static MIN_FREE_SPACE_MB = 100;
    static MAX_USAGE_PERCENTAGE = 95;
    static async getDiskSpace(dirPath) {
        try {
            const stats = await fs.statfs(dirPath);
            const blockSize = stats.bavail > 0 ? stats.bavail : stats.bsize;
            const available = stats.bavail * blockSize;
            const total = stats.blocks * blockSize;
            const used = total - available;
            const usagePercentage = (used / total) * 100;
            return {
                available: Math.floor(available / (1024 * 1024)),
                total: Math.floor(total / (1024 * 1024)),
                used: Math.floor(used / (1024 * 1024)),
                usagePercentage: Math.round(usagePercentage * 100) / 100,
            };
        }
        catch (error) {
            console.warn('Could not get disk space info, using defaults');
            return {
                available: 1000,
                total: 10000,
                used: 9000,
                usagePercentage: 90,
            };
        }
    }
    static async hasEnoughSpace(dirPath, fileSizeBytes) {
        try {
            const diskInfo = await this.getDiskSpace(dirPath);
            const fileSizeMB = fileSizeBytes / (1024 * 1024);
            const requiredSpace = fileSizeMB + this.MIN_FREE_SPACE_MB;
            return diskInfo.available > requiredSpace && diskInfo.usagePercentage < this.MAX_USAGE_PERCENTAGE;
        }
        catch (error) {
            console.error('Error checking disk space:', error);
            return false;
        }
    }
    static async getUploadsDirSize(uploadsDir) {
        try {
            const files = await fs.readdir(uploadsDir);
            let totalSize = 0;
            for (const file of files) {
                try {
                    const filePath = path.join(uploadsDir, file);
                    const stats = await fs.stat(filePath);
                    if (stats.isFile()) {
                        totalSize += stats.size;
                    }
                }
                catch (error) {
                    continue;
                }
            }
            return totalSize;
        }
        catch (error) {
            console.error('Error calculating uploads directory size:', error);
            return 0;
        }
    }
    static async cleanupOldFilesIfNeeded(uploadsDir, maxUsagePercentage = 90) {
        try {
            const diskInfo = await this.getDiskSpace(uploadsDir);
            if (diskInfo.usagePercentage > maxUsagePercentage) {
                console.warn(`Disk usage at ${diskInfo.usagePercentage}%, cleaning up old files`);
                const files = await fs.readdir(uploadsDir);
                const fileStats = [];
                for (const file of files) {
                    try {
                        const filePath = path.join(uploadsDir, file);
                        const stats = await fs.stat(filePath);
                        if (stats.isFile()) {
                            fileStats.push({
                                path: filePath,
                                name: file,
                                size: stats.size,
                                mtime: stats.mtime,
                            });
                        }
                    }
                    catch (error) {
                        continue;
                    }
                }
                fileStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());
                let deletedCount = 0;
                for (const fileInfo of fileStats) {
                    try {
                        await fs.unlink(fileInfo.path);
                        deletedCount++;
                        const newDiskInfo = await this.getDiskSpace(uploadsDir);
                        if (newDiskInfo.usagePercentage < maxUsagePercentage - 5) {
                            break;
                        }
                    }
                    catch (error) {
                        console.error(`Failed to delete file ${fileInfo.name}:`, error);
                    }
                }
                console.info(`Cleaned up ${deletedCount} old files`);
            }
        }
        catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}
