import { IFileRepository } from '../../domain/repositories/IFileRepository.js';
import { ITextExtractionService } from '../../domain/services/ITextExtractionService.js';
import { UploadResult } from '../../types/index.js';
export interface UploadFileRequest {
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
}
export declare class UploadFileUseCase {
    private fileRepository;
    private textExtractionService;
    private fileService;
    constructor(fileRepository: IFileRepository, textExtractionService: ITextExtractionService);
    execute(request: UploadFileRequest): Promise<UploadResult>;
}
