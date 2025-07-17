import { IFileRepository } from '../../domain/repositories/IFileRepository.js'
import fs from 'fs/promises'

export interface DeleteFileRequest {
  fileId: string
}

export interface DeleteFileResponse {
  success: boolean
  error?: string
}

export class DeleteFileUseCase {
  constructor(private fileRepository: IFileRepository) {}

  async execute(request: DeleteFileRequest): Promise<DeleteFileResponse> {
    try {
      // Find the file first to get its path
      const file = await this.fileRepository.findById(request.fileId)

      if (!file) {
        return {
          success: false,
          error: 'File not found',
        }
      }

      // Delete from repository first
      const deleted = await this.fileRepository.delete(request.fileId)

      if (!deleted) {
        return {
          success: false,
          error: 'Failed to delete file from repository',
        }
      }

      // Try to delete the physical file (best effort)
      try {
        await fs.unlink(file.path)
        console.log(`DeleteFileUseCase: Physical file deleted: ${file.path}`)
      } catch (fsError) {
        console.warn(`DeleteFileUseCase: Could not delete physical file: ${file.path}`, fsError)
        // Continue anyway - the database record is deleted
      }

      console.log(`DeleteFileUseCase: File deleted successfully: ${request.fileId}`)

      return {
        success: true,
      }
    } catch (error) {
      console.error('DeleteFileUseCase error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete file',
      }
    }
  }
}
