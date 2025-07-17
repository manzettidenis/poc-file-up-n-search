import fs from 'fs/promises';
export class DeleteFileUseCase {
    fileRepository;
    constructor(fileRepository) {
        this.fileRepository = fileRepository;
    }
    async execute(request) {
        try {
            const file = await this.fileRepository.findById(request.fileId);
            if (!file) {
                return {
                    success: false,
                    error: 'File not found',
                };
            }
            const deleted = await this.fileRepository.delete(request.fileId);
            if (!deleted) {
                return {
                    success: false,
                    error: 'Failed to delete file from repository',
                };
            }
            try {
                await fs.unlink(file.path);
                console.log(`DeleteFileUseCase: Physical file deleted: ${file.path}`);
            }
            catch (fsError) {
                console.warn(`DeleteFileUseCase: Could not delete physical file: ${file.path}`, fsError);
            }
            console.log(`DeleteFileUseCase: File deleted successfully: ${request.fileId}`);
            return {
                success: true,
            };
        }
        catch (error) {
            console.error('DeleteFileUseCase error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete file',
            };
        }
    }
}
