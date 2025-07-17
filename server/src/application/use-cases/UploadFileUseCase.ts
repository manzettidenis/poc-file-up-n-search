import { File, DomainFileMetadata } from '../../domain/entities/File.js'
import { IFileRepository } from '../../domain/repositories/IFileRepository.js'
import { ITextExtractionService } from '../../domain/services/ITextExtractionService.js'
import { FileService } from '../../domain/services/FileService.js'
import { UploadResult } from '../../types/index.js'

export interface UploadFileRequest {
  filename: string
  originalName: string
  mimetype: string
  size: number
  path: string
}

export class UploadFileUseCase {
  private fileService: FileService

  constructor(
    private fileRepository: IFileRepository,
    private textExtractionService: ITextExtractionService,
  ) {
    this.fileService = new FileService(textExtractionService)
  }

  async execute(request: UploadFileRequest): Promise<UploadResult> {
    try {
      // Create file domain entity with minimal metadata
      const file = File.create({
        filename: request.filename,
        originalName: request.originalName,
        mimetype: request.mimetype,
        size: request.size,
        path: request.path,
        extractedText: '',
        metadata: {} as DomainFileMetadata,
      })

      // Validate file using domain service
      const validation = this.fileService.validateFileForUpload(file)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        }
      }

      // Process file text extraction using domain service
      const processedFile = await this.fileService.processFileText(file)

      // Save to repository
      const savedFile = await this.fileRepository.save(processedFile)

      return {
        success: true,
        file: savedFile.toData(), // Convert domain object to data transfer format
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
