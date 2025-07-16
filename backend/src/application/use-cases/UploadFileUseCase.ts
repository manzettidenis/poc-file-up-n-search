import { File } from '../../domain/entities/File.js'
import { IFileRepository } from '../../domain/repositories/IFileRepository.js'
import { ITextExtractionService } from '../../domain/services/ITextExtractionService.js'
import { UploadResult } from '../../types/index.js'

export interface UploadFileRequest {
  filename: string
  originalName: string
  mimetype: string
  size: number
  path: string
}

export class UploadFileUseCase {
  constructor(
    private fileRepository: IFileRepository,
    private textExtractionService: ITextExtractionService,
  ) {}

  async execute(request: UploadFileRequest): Promise<UploadResult> {
    try {
      // Extract text content from the file
      const extractionResult = await this.textExtractionService.extractText(request.path, request.mimetype)

      // Create file domain entity
      const file = File.create({
        filename: request.filename,
        originalName: request.originalName,
        mimetype: request.mimetype,
        size: request.size,
        path: request.path,
        extractedText: extractionResult.text,
        metadata: extractionResult.metadata,
      })

      // Save to repository
      const savedFile = await this.fileRepository.save(file)

      return {
        success: true,
        file: savedFile.toJSON(),
      }
    } catch (error) {
      console.error('UploadFileUseCase error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file',
      }
    }
  }
}
