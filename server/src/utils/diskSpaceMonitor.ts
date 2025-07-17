import fs from 'fs/promises'
import path from 'path'

interface DiskSpaceInfo {
  available: number
  total: number
  used: number
  usagePercentage: number
}

export class DiskSpaceMonitor {
  private static readonly MIN_FREE_SPACE_MB = 100 // Minimum 100MB free space
  private static readonly MAX_USAGE_PERCENTAGE = 95 // Maximum 95% disk usage

  /**
   * Gets disk space information for a given path
   */
  static async getDiskSpace(dirPath: string): Promise<DiskSpaceInfo> {
    try {
      const stats = await fs.statfs(dirPath)

      const blockSize = stats.bavail > 0 ? stats.bavail : stats.bsize
      const available = stats.bavail * blockSize
      const total = stats.blocks * blockSize
      const used = total - available
      const usagePercentage = (used / total) * 100

      return {
        available: Math.floor(available / (1024 * 1024)), // Convert to MB
        total: Math.floor(total / (1024 * 1024)),
        used: Math.floor(used / (1024 * 1024)),
        usagePercentage: Math.round(usagePercentage * 100) / 100,
      }
    } catch (error) {
      // Fallback for systems that don't support statfs
      console.warn('Could not get disk space info, using defaults')
      return {
        available: 1000,
        total: 10000,
        used: 9000,
        usagePercentage: 90,
      }
    }
  }

  /**
   * Checks if there's enough space for file upload
   */
  static async hasEnoughSpace(dirPath: string, fileSizeBytes: number): Promise<boolean> {
    try {
      const diskInfo = await this.getDiskSpace(dirPath)
      const fileSizeMB = fileSizeBytes / (1024 * 1024)

      // Check if file size + buffer exceeds available space
      const requiredSpace = fileSizeMB + this.MIN_FREE_SPACE_MB

      return diskInfo.available > requiredSpace && diskInfo.usagePercentage < this.MAX_USAGE_PERCENTAGE
    } catch (error) {
      console.error('Error checking disk space:', error)
      return false // Fail safe
    }
  }

  /**
   * Gets storage usage for uploads directory
   */
  static async getUploadsDirSize(uploadsDir: string): Promise<number> {
    try {
      const files = await fs.readdir(uploadsDir)
      let totalSize = 0

      for (const file of files) {
        try {
          const filePath = path.join(uploadsDir, file)
          const stats = await fs.stat(filePath)
          if (stats.isFile()) {
            totalSize += stats.size
          }
        } catch (error) {
          // Skip inaccessible files
          continue
        }
      }

      return totalSize
    } catch (error) {
      console.error('Error calculating uploads directory size:', error)
      return 0
    }
  }

  /**
   * Cleanup old files if disk space is low
   */
  static async cleanupOldFilesIfNeeded(uploadsDir: string, maxUsagePercentage: number = 90): Promise<void> {
    try {
      const diskInfo = await this.getDiskSpace(uploadsDir)

      if (diskInfo.usagePercentage > maxUsagePercentage) {
        console.warn(`Disk usage at ${diskInfo.usagePercentage}%, cleaning up old files`)

        const files = await fs.readdir(uploadsDir)
        const fileStats = []

        // Get file stats for sorting by age
        for (const file of files) {
          try {
            const filePath = path.join(uploadsDir, file)
            const stats = await fs.stat(filePath)
            if (stats.isFile()) {
              fileStats.push({
                path: filePath,
                name: file,
                size: stats.size,
                mtime: stats.mtime,
              })
            }
          } catch (error) {
            continue
          }
        }

        // Sort by modification time (oldest first)
        fileStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime())

        // Delete oldest files until usage is below threshold
        let deletedCount = 0
        for (const fileInfo of fileStats) {
          try {
            await fs.unlink(fileInfo.path)
            deletedCount++

            // Check if we've freed enough space
            const newDiskInfo = await this.getDiskSpace(uploadsDir)
            if (newDiskInfo.usagePercentage < maxUsagePercentage - 5) {
              break
            }
          } catch (error) {
            console.error(`Failed to delete file ${fileInfo.name}:`, error)
          }
        }

        console.info(`Cleaned up ${deletedCount} old files`)
      }
    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }
}
