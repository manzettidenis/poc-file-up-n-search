import { File } from '../../domain/entities/File.js';
import { FileService } from '../../domain/services/FileService.js';
export class UploadFileUseCase {
    fileRepository;
    textExtractionService;
    fileService;
    constructor(fileRepository, textExtractionService) {
        this.fileRepository = fileRepository;
        this.textExtractionService = textExtractionService;
        this.fileService = new FileService(textExtractionService);
    }
    async execute(request) {
        try {
            const file = File.create({
                filename: request.filename,
                originalName: request.originalName,
                mimetype: request.mimetype,
                size: request.size,
                path: request.path,
                extractedText: '',
                metadata: {},
            });
            const validation = this.fileService.validateFileForUpload(file);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: validation.errors.join(', '),
                };
            }
            const processedFile = await this.fileService.processFileText(file);
            const savedFile = await this.fileRepository.save(processedFile);
            return {
                success: true,
                file: savedFile.toData(),
            };
        }
        catch (error) {
            console.error('UploadFileUseCase error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to upload file',
            };
        }
    }
}
