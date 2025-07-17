import { IFileRepository } from '../../domain/repositories/IFileRepository.js'
import { ITextExtractionService } from '../../domain/services/ITextExtractionService.js'
import { FileService } from '../../domain/services/FileService.js'
import { FileSystemFileRepository } from '../repositories/FileSystemFileRepository.js'
import { TextExtractionService } from '../services/TextExtractionService.js'
import {
  UploadFileUseCase,
  SearchFilesUseCase,
  GetFilesUseCase,
  DeleteFileUseCase,
} from '../../application/use-cases/index.js'

export class Container {
  private static instance: Container
  private _fileRepository: IFileRepository
  private _textExtractionService: ITextExtractionService
  private _fileService: FileService

  // Use cases
  private _uploadFileUseCase: UploadFileUseCase
  private _searchFilesUseCase: SearchFilesUseCase
  private _getFilesUseCase: GetFilesUseCase
  private _deleteFileUseCase: DeleteFileUseCase

  private constructor() {
    // Infrastructure layer
    this._fileRepository = new FileSystemFileRepository()
    this._textExtractionService = new TextExtractionService()

    // Domain services
    this._fileService = new FileService(this._textExtractionService)

    // Application layer use cases
    this._uploadFileUseCase = new UploadFileUseCase(this._fileRepository, this._textExtractionService)
    this._searchFilesUseCase = new SearchFilesUseCase(this._fileRepository)
    this._getFilesUseCase = new GetFilesUseCase(this._fileRepository)
    this._deleteFileUseCase = new DeleteFileUseCase(this._fileRepository)
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container()
    }
    return Container.instance
  }

  // Repository access
  get fileRepository(): IFileRepository {
    return this._fileRepository
  }

  get textExtractionService(): ITextExtractionService {
    return this._textExtractionService
  }

  get fileService(): FileService {
    return this._fileService
  }

  // Use case access
  get uploadFileUseCase(): UploadFileUseCase {
    return this._uploadFileUseCase
  }

  get searchFilesUseCase(): SearchFilesUseCase {
    return this._searchFilesUseCase
  }

  get getFilesUseCase(): GetFilesUseCase {
    return this._getFilesUseCase
  }

  get deleteFileUseCase(): DeleteFileUseCase {
    return this._deleteFileUseCase
  }
}
