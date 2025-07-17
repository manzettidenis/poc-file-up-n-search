import { Router } from 'express';
import { Container } from '../infrastructure/di/Container.js';
import { FileMapper } from '../infrastructure/mappers/FileMapper.js';
import { logger, logError, ErrorCategory } from '../utils/logger.js';
import { MetricsCollector } from '../utils/metrics.js';
const router = Router();
const container = Container.getInstance();
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        logger.info('Fetching files', { limit, offset, category: 'api' });
        const useCase = container.getFilesUseCase;
        const result = await useCase.execute({ limit, offset });
        const filesJson = result.files.map(f => FileMapper.toExternal(f));
        const response = {
            success: true,
            data: {
                files: filesJson,
                totalCount: result.totalCount,
                limit,
                offset,
                hasMore: result.hasMore,
            },
        };
        return res.json(response);
    }
    catch (error) {
        logError(error instanceof Error ? error : new Error('Unknown error'), ErrorCategory.SYSTEM);
        MetricsCollector.recordError('api_error', 'files_get');
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'File ID is required',
            });
        }
        logger.info('Fetching file by ID', { id, category: 'api' });
        const fileRepository = container.fileRepository;
        const file = await fileRepository.findById(id);
        if (!file) {
            return res.status(404).json({
                success: false,
                error: 'File not found',
            });
        }
        const fileJson = FileMapper.toExternal(file);
        return res.json({
            success: true,
            data: fileJson,
        });
    }
    catch (error) {
        logError(error instanceof Error ? error : new Error('Unknown error'), ErrorCategory.SYSTEM);
        MetricsCollector.recordError('api_error', 'files_get_by_id');
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const fileId = req.params.id;
        if (!fileId) {
            return res.status(400).json({
                success: false,
                error: 'File ID is required',
            });
        }
        logger.info('Deleting file', { fileId, category: 'api' });
        const useCase = container.deleteFileUseCase;
        const result = await useCase.execute({ fileId });
        if (!result.success) {
            return res.status(404).json({
                success: false,
                error: result.error || 'File not found',
            });
        }
        return res.json({
            success: true,
            message: 'File deleted successfully',
        });
    }
    catch (error) {
        logError(error instanceof Error ? error : new Error('Unknown error'), ErrorCategory.SYSTEM);
        MetricsCollector.recordError('api_error', 'files_delete');
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});
export default router;
