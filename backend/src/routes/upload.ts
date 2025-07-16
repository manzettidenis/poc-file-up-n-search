import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import RepositoryContainer from '../infrastructure/repositories/RepositoryContainer.js'
import { TextExtractionService } from '../infrastructure/services/TextExtractionService.js'
import { UploadFileUseCase } from '../application/use-cases/index.js'
import { FileValidator } from '../utils/fileValidation.js'
import { DiskSpaceMonitor } from '../utils/diskSpaceMonitor.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()
const repositoryContainer = RepositoryContainer.getInstance()
const fileRepository = repositoryContainer.fileRepository
const textExtractionService = new TextExtractionService()

// Initialize use case
const uploadFileUseCase = new UploadFileUseCase(fileRepository, textExtractionService)

// Ensure uploads directory exists and is secure
const uploadsDir = path.join(__dirname, '../../uploads')

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  try {
    await fs.access(uploadsDir)
  } catch {
    await fs.mkdir(uploadsDir, {
      recursive: true,
      mode: 0o755, // Secure permissions
    })
  }
}

ensureUploadsDir()

// Enhanced multer configuration with security checks
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    // Generate secure filename
    const sanitizedName = FileValidator.sanitizeFilename(file.originalname)
    const ext = path.extname(sanitizedName)
    const baseName = path.basename(sanitizedName, ext)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const secureFilename = `${baseName}-${uniqueSuffix}${ext}`

    cb(null, secureFilename)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1, // Only one file at a time
    fields: 10, // Limit form fields
    parts: 20, // Limit total parts
  },
  fileFilter: async (req, file, cb) => {
    try {
      // Pre-validation checks
      if (!FileValidator.validateExtension(file.originalname)) {
        return cb(new Error('File type not supported or potentially dangerous'))
      }

      if (!FileValidator.validateMimeType(file.mimetype)) {
        return cb(new Error('MIME type not supported'))
      }

      // Check disk space before accepting file
      const hasSpace = await DiskSpaceMonitor.hasEnoughSpace(
        uploadsDir,
        req.headers['content-length'] ? parseInt(req.headers['content-length']) : 50 * 1024 * 1024,
      )
      if (!hasSpace) {
        return cb(new Error('Insufficient disk space for upload'))
      }

      cb(null, true)
    } catch (error) {
      cb(new Error('File validation failed'))
    }
  },
})

interface MulterRequest extends Request {
  file?: Express.Multer.File
}

router.post('/', upload.single('file') as any, async (req: Request, res: Response) => {
  let tempFilePath: string | null = null

  try {
    const multerReq = req as MulterRequest
    if (!multerReq.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    tempFilePath = multerReq.file.path

    console.log('File uploaded for validation:', {
      originalName: multerReq.file.originalname,
      filename: multerReq.file.filename,
      size: multerReq.file.size,
      mimetype: multerReq.file.mimetype,
    })

    // Comprehensive file validation
    const validationResult = await FileValidator.validateFile(
      multerReq.file.path,
      multerReq.file.originalname,
      multerReq.file.mimetype,
      multerReq.file.size,
    )

    if (!validationResult.isValid) {
      // Clean up invalid file
      try {
        await fs.unlink(multerReq.file.path)
      } catch (cleanupError) {
        console.error('Failed to cleanup invalid file:', cleanupError)
      }

      return res.status(400).json({
        success: false,
        error: validationResult.error || 'File validation failed',
      })
    }

    // Check disk space again before processing
    const hasSpace = await DiskSpaceMonitor.hasEnoughSpace(uploadsDir, multerReq.file.size)
    if (!hasSpace) {
      await fs.unlink(multerReq.file.path)
      return res.status(507).json({
        success: false,
        error: 'Insufficient storage space',
      })
    }

    // Use the use case to handle business logic
    const result = await uploadFileUseCase.execute({
      filename: multerReq.file.filename,
      originalName: validationResult.sanitizedName || multerReq.file.originalname,
      mimetype: multerReq.file.mimetype,
      size: multerReq.file.size,
      path: multerReq.file.path,
    })

    if (result.success && result.file) {
      console.log('File processed successfully:', result.file.id)

      // Cleanup old files if disk usage is high
      DiskSpaceMonitor.cleanupOldFilesIfNeeded(uploadsDir, 85).catch(err => {
        console.error('Background cleanup failed:', err)
      })

      res.json({
        success: true,
        data: result.file,
        message: 'File uploaded successfully',
      })
    } else {
      // Clean up file if use case failed
      try {
        await fs.unlink(multerReq.file.path)
      } catch (cleanupError) {
        console.error('Failed to cleanup failed upload:', cleanupError)
      }

      res.status(500).json({
        success: false,
        error: result.error || 'Failed to upload file',
      })
    }
  } catch (error) {
    console.error('Upload route error:', error)

    // Clean up any temporary file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath)
      } catch (cleanupError) {
        console.error('Failed to cleanup temp file:', cleanupError)
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload file',
    })
  }
})

// Enhanced error handling middleware for multer errors
router.use((error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    console.error('Multer error:', error)

    let errorMessage = 'File upload failed'
    let statusCode = 400

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        errorMessage = 'File size exceeds maximum allowed size (50MB)'
        statusCode = 413
        break
      case 'LIMIT_FILE_COUNT':
        errorMessage = 'Too many files uploaded'
        break
      case 'LIMIT_UNEXPECTED_FILE':
        errorMessage = 'Unexpected file field'
        break
      case 'LIMIT_PART_COUNT':
        errorMessage = 'Too many parts in upload'
        break
      case 'LIMIT_FIELD_COUNT':
        errorMessage = 'Too many fields in upload'
        break
      default:
        errorMessage = `Upload error: ${error.message}`
    }

    return res.status(statusCode).json({ success: false, error: errorMessage })
  }

  if (error.message) {
    return res.status(400).json({ success: false, error: error.message })
  }

  next(error)
})

router.get('/progress/:id', (req: Request, res: Response) => {
  // Simple progress endpoint for PoC
  res.json({ progress: 100, status: 'complete' })
})

export default router
