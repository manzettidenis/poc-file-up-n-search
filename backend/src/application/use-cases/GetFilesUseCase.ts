import { IFileRepository } from '../../domain/repositories/IFileRepository.js'
import { File } from '../../domain/entities/File.js'

export interface GetFilesRequest {
  limit?: number
  offset?: number
}

export interface GetFilesResponse {
  files: File[]
  totalCount: number
  hasMore: boolean
}

export class GetFilesUseCase {
  constructor(private fileRepository: IFileRepository) {}

  async execute(request: GetFilesRequest = {}): Promise<GetFilesResponse> {
    try {
      const limit = Math.min(request.limit || 50, 100) // Max 100 files per request
      const offset = Math.max(request.offset || 0, 0)

      // Get files and total count
      const [files, totalCount] = await Promise.all([
        this.fileRepository.findAll(limit, offset),
        this.fileRepository.count(),
      ])

      const hasMore = offset + files.length < totalCount

      console.log(`GetFilesUseCase: Retrieved ${files.length} files (total: ${totalCount})`)

      return {
        files,
        totalCount,
        hasMore,
      }
    } catch (error) {
      console.error('GetFilesUseCase error:', error)
      return {
        files: [],
        totalCount: 0,
        hasMore: false,
      }
    }
  }
}
