import { IFileRepository } from '../../domain/repositories/IFileRepository.js';
import { ITextExtractionService } from '../../domain/services/ITextExtractionService.js';
import { FileService } from '../../domain/services/FileService.js';
import { UploadFileUseCase, SearchFilesUseCase, GetFilesUseCase, DeleteFileUseCase } from '../../application/use-cases/index.js';
export declare class Container {
    private static instance;
    private _fileRepository;
    private _textExtractionService;
    private _fileService;
    private _uploadFileUseCase;
    private _searchFilesUseCase;
    private _getFilesUseCase;
    private _deleteFileUseCase;
    private constructor();
    static getInstance(): Container;
    get fileRepository(): IFileRepository;
    get textExtractionService(): ITextExtractionService;
    get fileService(): FileService;
    get uploadFileUseCase(): UploadFileUseCase;
    get searchFilesUseCase(): SearchFilesUseCase;
    get getFilesUseCase(): GetFilesUseCase;
    get deleteFileUseCase(): DeleteFileUseCase;
}
