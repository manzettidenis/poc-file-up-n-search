import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { Container } from '../infrastructure/di/Container.js';
import { FileValidator } from '../utils/fileValidation.js';
import { DiskSpaceMonitor } from '../utils/diskSpaceMonitor.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = Router();
const container = Container.getInstance();
const uploadsDir = path.join(__dirname, '../../uploads');
const ensureUploadsDir = async () => {
    try {
        await fs.access(uploadsDir);
    }
    catch {
        await fs.mkdir(uploadsDir, {
            recursive: true,
            mode: 0o755,
        });
    }
};
ensureUploadsDir();
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const sanitizedName = FileValidator.sanitizeFilename(file.originalname);
        const ext = path.extname(sanitizedName);
        const baseName = path.basename(sanitizedName, ext);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const secureFilename = `${baseName}-${uniqueSuffix}${ext}`;
        cb(null, secureFilename);
    },
});
const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024,
        files: 1,
        fields: 10,
        parts: 20,
    },
    fileFilter: async (req, file, cb) => {
        try {
            if (!FileValidator.validateExtension(file.originalname)) {
                return cb(new Error('File type not supported or potentially dangerous'));
            }
            if (!FileValidator.validateMimeType(file.mimetype)) {
                return cb(new Error('MIME type not supported'));
            }
            const hasSpace = await DiskSpaceMonitor.hasEnoughSpace(uploadsDir, req.headers['content-length'] ? parseInt(req.headers['content-length']) : 50 * 1024 * 1024);
            if (!hasSpace) {
                return cb(new Error('Insufficient disk space for upload'));
            }
            cb(null, true);
        }
        catch (error) {
            cb(new Error('File validation failed'));
        }
    },
});
router.post('/', upload.single('file'), async (req, res) => {
    let tempFilePath = null;
    try {
        const multerReq = req;
        if (!multerReq.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        tempFilePath = multerReq.file.path;
        console.log('File uploaded for validation:', {
            originalName: multerReq.file.originalname,
            filename: multerReq.file.filename,
            size: multerReq.file.size,
            mimetype: multerReq.file.mimetype,
        });
        const validationResult = await FileValidator.validateFile(multerReq.file.path, multerReq.file.originalname, multerReq.file.mimetype, multerReq.file.size);
        if (!validationResult.isValid) {
            try {
                await fs.unlink(multerReq.file.path);
            }
            catch (cleanupError) {
                console.error('Failed to cleanup invalid file:', cleanupError);
            }
            return res.status(400).json({
                success: false,
                error: validationResult.error || 'File validation failed',
            });
        }
        const hasSpace = await DiskSpaceMonitor.hasEnoughSpace(uploadsDir, multerReq.file.size);
        if (!hasSpace) {
            await fs.unlink(multerReq.file.path);
            return res.status(507).json({
                success: false,
                error: 'Insufficient storage space',
            });
        }
        const uploadFileUseCase = container.uploadFileUseCase;
        const result = await uploadFileUseCase.execute({
            filename: multerReq.file.filename,
            originalName: validationResult.sanitizedName || multerReq.file.originalname,
            mimetype: multerReq.file.mimetype,
            size: multerReq.file.size,
            path: multerReq.file.path,
        });
        if (result.success && result.file) {
            console.log('File processed successfully:', result.file.id);
            DiskSpaceMonitor.cleanupOldFilesIfNeeded(uploadsDir, 85).catch(err => {
                console.error('Background cleanup failed:', err);
            });
            return res.json({
                success: true,
                data: result.file,
                message: 'File uploaded successfully',
            });
        }
        else {
            try {
                await fs.unlink(multerReq.file.path);
            }
            catch (cleanupError) {
                console.error('Failed to cleanup failed upload:', cleanupError);
            }
            return res.status(500).json({
                success: false,
                error: result.error || 'Failed to upload file',
            });
        }
    }
    catch (error) {
        console.error('Upload route error:', error);
        if (tempFilePath) {
            try {
                await fs.unlink(tempFilePath);
            }
            catch (cleanupError) {
                console.error('Failed to cleanup temp file:', cleanupError);
            }
        }
        return res.status(500).json({
            success: false,
            error: 'Failed to upload file',
        });
    }
});
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        console.error('Multer error:', error);
        let errorMessage = 'File upload failed';
        let statusCode = 400;
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                errorMessage = 'File size exceeds maximum allowed size (50MB)';
                statusCode = 413;
                break;
            case 'LIMIT_FILE_COUNT':
                errorMessage = 'Too many files uploaded';
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                errorMessage = 'Unexpected file field';
                break;
            case 'LIMIT_PART_COUNT':
                errorMessage = 'Too many parts in upload';
                break;
            case 'LIMIT_FIELD_COUNT':
                errorMessage = 'Too many fields in upload';
                break;
            default:
                errorMessage = `Upload error: ${error.message}`;
        }
        return res.status(statusCode).json({ success: false, error: errorMessage });
    }
    if (error.message) {
        return res.status(400).json({ success: false, error: error.message });
    }
    return next(error);
});
router.get('/progress/:id', (req, res) => {
    res.json({ progress: 100, status: 'complete' });
});
export default router;
