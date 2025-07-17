export class FileService {
    textExtractionService;
    constructor(textExtractionService) {
        this.textExtractionService = textExtractionService;
    }
    async processFileText(file) {
        if (!this.textExtractionService.canExtract(file.mimetype)) {
            file.updateMetadata({
                unsupportedType: true,
                extractionError: false,
            });
            return file;
        }
        try {
            const extractionResult = await this.textExtractionService.extractText(file.path, file.mimetype);
            file.updateExtractedText(extractionResult.text);
            file.updateMetadata(extractionResult.metadata);
            return file;
        }
        catch (error) {
            file.updateMetadata({
                extractionError: true,
                errorMessage: error instanceof Error ? error.message : 'Unknown extraction error',
            });
            return file;
        }
    }
    validateFileForUpload(file) {
        const errors = [];
        if (file.size.value === 0) {
            errors.push('File cannot be empty');
        }
        if (file.size.value > 50 * 1024 * 1024) {
            errors.push('File size cannot exceed 50MB');
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
        ];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            errors.push(`File type ${file.mimetype} is not supported`);
        }
        const extension = file.getFileExtension();
        if (!this.isExtensionValidForMimeType(extension, file.mimetype)) {
            errors.push('File extension does not match file type');
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    isExtensionValidForMimeType(extension, mimetype) {
        const validMappings = {
            'text/plain': ['txt', 'text'],
            'application/pdf': ['pdf'],
            'image/jpeg': ['jpg', 'jpeg'],
            'image/png': ['png'],
            'image/tiff': ['tiff', 'tif'],
            'image/bmp': ['bmp'],
            'image/webp': ['webp'],
        };
        const validExtensions = validMappings[mimetype];
        return validExtensions ? validExtensions.includes(extension) : false;
    }
    canBeSearched(file) {
        return file.isSearchable() && !file.hasError();
    }
    getFileCategory(file) {
        if (file.isTextFile())
            return 'text';
        if (file.isImage())
            return 'image';
        if (file.isDocument() || file.isPdf())
            return 'document';
        return 'other';
    }
}
