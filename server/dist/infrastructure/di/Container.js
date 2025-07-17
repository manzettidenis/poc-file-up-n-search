import { FileService } from '../../domain/services/FileService.js';
import { FileSystemFileRepository } from '../repositories/FileSystemFileRepository.js';
import { TextExtractionService } from '../services/TextExtractionService.js';
import { UploadFileUseCase, SearchFilesUseCase, GetFilesUseCase, DeleteFileUseCase, } from '../../application/use-cases/index.js';
export class Container {
    static instance;
    _fileRepository;
    _textExtractionService;
    _fileService;
    _uploadFileUseCase;
    _searchFilesUseCase;
    _getFilesUseCase;
    _deleteFileUseCase;
    constructor() {
        this._fileRepository = new FileSystemFileRepository();
        this._textExtractionService = new TextExtractionService();
        this._fileService = new FileService(this._textExtractionService);
        this._uploadFileUseCase = new UploadFileUseCase(this._fileRepository, this._textExtractionService);
        this._searchFilesUseCase = new SearchFilesUseCase(this._fileRepository);
        this._getFilesUseCase = new GetFilesUseCase(this._fileRepository);
        this._deleteFileUseCase = new DeleteFileUseCase(this._fileRepository);
    }
    static getInstance() {
        if (!Container.instance) {
            Container.instance = new Container();
        }
        return Container.instance;
    }
    get fileRepository() {
        return this._fileRepository;
    }
    get textExtractionService() {
        return this._textExtractionService;
    }
    get fileService() {
        return this._fileService;
    }
    get uploadFileUseCase() {
        return this._uploadFileUseCase;
    }
    get searchFilesUseCase() {
        return this._searchFilesUseCase;
    }
    get getFilesUseCase() {
        return this._getFilesUseCase;
    }
    get deleteFileUseCase() {
        return this._deleteFileUseCase;
    }
}
