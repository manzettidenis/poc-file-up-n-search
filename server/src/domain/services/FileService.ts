import { File, DomainFileMetadata } from '../entities/File.js'
import { ITextExtractionService } from './ITextExtractionService.js'

export class FileService {
  constructor(private textExtractionService: ITextExtractionService) {}

  async processFileText(file: File): Promise<File> {
    // Business rule: Only extract text if file supports it
    if (!this.textExtractionService.canExtract(file.mimetype)) {
      file.updateMetadata({
        unsupportedType: true,
        extractionError: false,
      })
      return file
    }

    try {
      const extractionResult = await this.textExtractionService.extractText(file.path, file.mimetype)

      // Business rule: Update file with extracted text and metadata
      file.updateExtractedText(extractionResult.text)
      file.updateMetadata(extractionResult.metadata)

      return file
    } catch (error) {
      // Business rule: Handle extraction errors gracefully
      file.updateMetadata({
        extractionError: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown extraction error',
      })

      return file
    }
  }

  validateFileForUpload(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Business rules for file validation
    if (file.size.value === 0) {
      errors.push('File cannot be empty')
    }

    if (file.size.value > 50 * 1024 * 1024) {
      // 50MB limit
      errors.push('File size cannot exceed 50MB')
    }

    const allowedMimeTypes = [
      'text/plain',
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/tiff',
      'image/tif',
      'image/bmp',
      'image/webp',
    ]

    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not supported`)
    }

    // Business rule: Check file extension matches mime type
    const extension = file.getFileExtension()
    if (!this.isExtensionValidForMimeType(extension, file.mimetype)) {
      errors.push('File extension does not match file type')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  private isExtensionValidForMimeType(extension: string, mimetype: string): boolean {
    const validMappings: Record<string, string[]> = {
      'text/plain': ['txt', 'text'],
      'application/pdf': ['pdf'],
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/tiff': ['tiff', 'tif'],
      'image/bmp': ['bmp'],
      'image/webp': ['webp'],
    }

    const validExtensions = validMappings[mimetype]
    return validExtensions ? validExtensions.includes(extension) : false
  }

  canBeSearched(file: File): boolean {
    return file.isSearchable() && !file.hasError()
  }

  getFileCategory(file: File): 'text' | 'image' | 'document' | 'other' {
    if (file.isTextFile()) return 'text'
    if (file.isImage()) return 'image'
    if (file.isDocument() || file.isPdf()) return 'document'
    return 'other'
  }
}
