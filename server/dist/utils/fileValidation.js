import fs from 'fs/promises';
import path from 'path';
const FILE_SIGNATURES = {
    'text/plain': [],
    'application/pdf': [0x25, 0x50, 0x44, 0x46],
    'image/jpeg': [0xff, 0xd8, 0xff],
    'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    'application/msword': [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4b, 0x03, 0x04],
};
const ALLOWED_EXTENSIONS = ['.txt', '.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
const ALLOWED_MIME_TYPES = [
    'text/plain',
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const DANGEROUS_EXTENSIONS = [
    '.exe',
    '.bat',
    '.cmd',
    '.com',
    '.pif',
    '.scr',
    '.vbs',
    '.js',
    '.jar',
    '.sh',
    '.py',
    '.pl',
    '.php',
    '.asp',
    '.aspx',
    '.jsp',
    '.ps1',
];
export class FileValidator {
    static validateExtension(filename) {
        const ext = path.extname(filename).toLowerCase();
        return ALLOWED_EXTENSIONS.includes(ext) && !DANGEROUS_EXTENSIONS.includes(ext);
    }
    static validateMimeType(mimetype) {
        return ALLOWED_MIME_TYPES.includes(mimetype);
    }
    static async validateMagicBytes(filePath, expectedMimeType) {
        try {
            const expectedSignature = FILE_SIGNATURES[expectedMimeType];
            if (expectedMimeType === 'text/plain') {
                return await this.validateTextFile(filePath);
            }
            if (!expectedSignature || expectedSignature.length === 0) {
                return true;
            }
            const buffer = await fs.readFile(filePath);
            const fileSignature = Array.from(buffer.slice(0, expectedSignature.length));
            return expectedSignature.every((byte, index) => byte === fileSignature[index]);
        }
        catch (error) {
            console.error('Error validating magic bytes:', error);
            return false;
        }
    }
    static async validateTextFile(filePath) {
        try {
            const buffer = await fs.readFile(filePath);
            const sample = buffer.slice(0, 1024);
            for (let i = 0; i < sample.length; i++) {
                if (sample[i] === 0) {
                    return false;
                }
            }
            const text = sample.toString('utf-8');
            const reEncoded = Buffer.from(text, 'utf-8');
            return sample.equals(reEncoded.slice(0, sample.length));
        }
        catch (error) {
            return false;
        }
    }
    static sanitizeFilename(filename) {
        let sanitized = filename.replace(/[/\\:*?"<>|]/g, '_');
        sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '');
        sanitized = sanitized.replace(/\0/g, '');
        const ext = path.extname(sanitized);
        const name = path.basename(sanitized, ext);
        const maxNameLength = 100;
        if (name.length > maxNameLength) {
            sanitized = name.substring(0, maxNameLength) + ext;
        }
        if (!sanitized || sanitized === ext) {
            sanitized = `file_${Date.now()}${ext}`;
        }
        return sanitized;
    }
    static validateFileSize(size, maxSize = 50 * 1024 * 1024) {
        return size > 0 && size <= maxSize;
    }
    static async validateFile(filePath, originalName, mimetype, size) {
        if (!this.validateFileSize(size)) {
            return {
                isValid: false,
                error: 'File size exceeds maximum allowed size (50MB)',
            };
        }
        const sanitizedName = this.sanitizeFilename(originalName);
        if (!this.validateExtension(sanitizedName)) {
            return {
                isValid: false,
                error: 'File type not supported or potentially dangerous',
            };
        }
        if (!this.validateMimeType(mimetype)) {
            return {
                isValid: false,
                error: 'MIME type not supported',
            };
        }
        const magicBytesValid = await this.validateMagicBytes(filePath, mimetype);
        if (!magicBytesValid) {
            return {
                isValid: false,
                error: 'File content does not match declared type',
            };
        }
        return {
            isValid: true,
            sanitizedName,
        };
    }
}
