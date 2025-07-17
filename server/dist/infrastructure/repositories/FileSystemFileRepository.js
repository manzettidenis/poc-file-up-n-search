import { File } from '../../domain/entities/File.js';
import Fuse from 'fuse.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { CacheManager, SearchCache, FileContentCache } from '../../utils/cache.js';
import { logger, PerformanceLogger, logError, ErrorCategory } from '../../utils/logger.js';
import { MetricsCollector } from '../../utils/metrics.js';
import { FileMapper } from '../mappers/FileMapper.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class FileSystemFileRepository {
    files = new Map();
    fuse;
    dataPath;
    indexDirty = false;
    indexingInProgress = false;
    constructor() {
        this.dataPath = path.join(__dirname, '../../../data/files.json');
        this.fuse = new Fuse([], {
            keys: [
                { name: 'extractedText', weight: 0.7 },
                { name: 'originalName', weight: 0.2 },
                { name: 'metadata.title', weight: 0.05 },
                { name: 'metadata.author', weight: 0.05 },
            ],
            threshold: 0.3,
            includeScore: true,
            includeMatches: true,
            minMatchCharLength: 2,
            findAllMatches: true,
            ignoreLocation: true,
            isCaseSensitive: false,
        });
        this.loadFromDisk();
    }
    async ensureDataDirectory() {
        const dataDir = path.dirname(this.dataPath);
        try {
            await fs.access(dataDir);
        }
        catch {
            await fs.mkdir(dataDir, { recursive: true });
            logger.info('Created data directory', { dataDir, category: 'repository' });
        }
    }
    async loadFromDisk() {
        const stopTimer = PerformanceLogger.startTimer('repository_load');
        try {
            await this.ensureDataDirectory();
            const data = await fs.readFile(this.dataPath, 'utf-8');
            const filesData = JSON.parse(data);
            this.files.clear();
            for (const fileData of filesData) {
                const file = File.fromData({
                    id: fileData.id,
                    filename: fileData.filename,
                    originalName: fileData.originalName,
                    mimetype: fileData.mimetype,
                    size: fileData.size,
                    path: fileData.path,
                    extractedText: fileData.extractedText,
                    metadata: fileData.metadata,
                    uploadedAt: new Date(fileData.uploadedAt),
                    lastModified: new Date(fileData.lastModified),
                });
                this.files.set(file.id.value, file);
            }
            await this.updateSearchIndexOptimized();
            logger.info('Files loaded from disk', {
                count: this.files.size,
                dataPath: this.dataPath,
                category: 'repository',
            });
        }
        catch (error) {
            logger.info('No existing files data found, starting fresh', {
                dataPath: this.dataPath,
                category: 'repository',
            });
        }
        stopTimer();
    }
    async saveToDisk() {
        const stopTimer = PerformanceLogger.startTimer('repository_save');
        try {
            await this.ensureDataDirectory();
            const filesArray = Array.from(this.files.values()).map(f => f.toData());
            await fs.writeFile(this.dataPath, JSON.stringify(filesArray, null, 2));
            logger.debug('Files saved to disk', {
                count: this.files.size,
                category: 'repository',
            });
        }
        catch (error) {
            logError(error instanceof Error ? error : new Error('Failed to save files'), ErrorCategory.DATABASE, {
                dataPath: this.dataPath,
            });
            throw error;
        }
        stopTimer();
    }
    async updateSearchIndexOptimized() {
        if (this.indexingInProgress) {
            this.indexDirty = true;
            return;
        }
        this.indexingInProgress = true;
        const start = Date.now();
        try {
            const files = Array.from(this.files.values());
            this.fuse.setCollection(files);
            const duration = Date.now() - start;
            MetricsCollector.updateSearchIndexMetrics(files.length, duration);
            logger.debug('Search index updated', {
                documentCount: files.length,
                duration: `${duration}ms`,
                category: 'search-index',
            });
            if (this.indexDirty) {
                this.indexDirty = false;
                setImmediate(() => this.updateSearchIndexOptimized());
            }
        }
        finally {
            this.indexingInProgress = false;
        }
    }
    async save(file) {
        const stopTimer = PerformanceLogger.startTimer('repository_save_file');
        try {
            this.files.set(file.id.value, file);
            FileContentCache.set(file.id.value, file.toData());
            setImmediate(() => this.updateSearchIndexOptimized());
            CacheManager.invalidateSearchResults();
            setImmediate(() => this.saveToDisk());
            logger.info('File saved', {
                fileId: file.id.value,
                originalName: file.originalName,
                category: 'repository',
            });
            return file;
        }
        catch (error) {
            logError(error instanceof Error ? error : new Error('Failed to save file'), ErrorCategory.DATABASE, {
                fileId: file.id.value,
            });
            throw error;
        }
        finally {
            stopTimer();
        }
    }
    async findById(id) {
        const stopTimer = PerformanceLogger.startTimer('repository_find_by_id');
        try {
            const cached = FileContentCache.get(id);
            if (cached) {
                const file = File.fromData(cached);
                return file;
            }
            const file = this.files.get(id) || null;
            if (file) {
                FileContentCache.set(id, file.toData());
            }
            return file;
        }
        finally {
            stopTimer();
        }
    }
    async findByFilename(filename) {
        const stopTimer = PerformanceLogger.startTimer('repository_find_by_filename');
        try {
            for (const file of this.files.values()) {
                if (file.filename === filename) {
                    return file;
                }
            }
            return null;
        }
        finally {
            stopTimer();
        }
    }
    async findAll(limit = 50, offset = 0) {
        const stopTimer = PerformanceLogger.startTimer('repository_find_all');
        try {
            const allFiles = Array.from(this.files.values());
            allFiles.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
            return allFiles.slice(offset, offset + limit);
        }
        finally {
            stopTimer();
        }
    }
    async search(query) {
        const stopTimer = PerformanceLogger.startTimer('repository_search');
        const start = Date.now();
        try {
            return await SearchCache.getOrSet(query.term, async () => {
                logger.debug('Performing search', {
                    term: query.term,
                    availableFiles: this.files.size,
                    category: 'search',
                });
                const results = this.fuse.search(query.term);
                if (results.length === 0) {
                    logger.debug('No fuzzy matches, trying substring search', {
                        term: query.term,
                        category: 'search',
                    });
                    const exactMatches = [];
                    const searchTerm = query.term.toLowerCase();
                    for (const file of this.files.values()) {
                        if (file.extractedText.toLowerCase().includes(searchTerm) ||
                            file.originalName.toLowerCase().includes(searchTerm)) {
                            exactMatches.push({
                                item: file,
                                score: 0.1,
                                matches: [
                                    {
                                        key: 'extractedText',
                                        value: file.extractedText,
                                    },
                                ],
                            });
                        }
                    }
                    if (exactMatches.length > 0) {
                        results.push(...exactMatches);
                    }
                }
                const files = results.map(result => ({
                    file: FileMapper.toExternal(result.item),
                    score: result.score || 0,
                    highlights: result.matches?.map(match => ({
                        text: typeof match.value === 'string' ? match.value : '',
                        startIndex: 0,
                        endIndex: 0,
                    })) || [],
                }));
                const page = query.pagination?.page || 1;
                const limit = query.pagination?.limit || 10;
                const startIndex = (page - 1) * limit;
                const endIndex = startIndex + limit;
                const paginatedFiles = files.slice(startIndex, endIndex);
                const searchResult = {
                    files: paginatedFiles,
                    totalCount: results.length,
                    page,
                    totalPages: Math.ceil(results.length / limit),
                };
                logger.info('Search completed', {
                    term: query.term,
                    totalResults: results.length,
                    returnedResults: paginatedFiles.length,
                    page,
                    category: 'search',
                });
                return searchResult;
            }, query.pagination, 300);
        }
        catch (error) {
            logError(error instanceof Error ? error : new Error('Search failed'), ErrorCategory.SEARCH, { query: query.term });
            throw error;
        }
        finally {
            const duration = Date.now() - start;
            MetricsCollector.recordSearch('success', duration, undefined);
            stopTimer();
        }
    }
    async delete(id) {
        const stopTimer = PerformanceLogger.startTimer('repository_delete');
        try {
            const deleted = this.files.delete(id);
            if (deleted) {
                CacheManager.invalidateFileRelated(id);
                setImmediate(() => this.updateSearchIndexOptimized());
                setImmediate(() => this.saveToDisk());
                logger.info('File deleted', { fileId: id, category: 'repository' });
            }
            return deleted;
        }
        finally {
            stopTimer();
        }
    }
    async update(file) {
        const stopTimer = PerformanceLogger.startTimer('repository_update');
        try {
            this.files.set(file.id.value, file);
            CacheManager.invalidateFileRelated(file.id.value);
            setImmediate(() => this.updateSearchIndexOptimized());
            setImmediate(() => this.saveToDisk());
            logger.info('File updated', {
                fileId: file.id.value,
                originalName: file.originalName,
                category: 'repository',
            });
            return file;
        }
        finally {
            stopTimer();
        }
    }
    async count() {
        return this.files.size;
    }
    async exists(id) {
        return this.files.has(id);
    }
    async getStats() {
        return {
            totalFiles: this.files.size,
            cacheStats: CacheManager.getAllStats(),
            indexStatus: {
                documentsIndexed: this.files.size,
                indexingInProgress: this.indexingInProgress,
                indexDirty: this.indexDirty,
            },
        };
    }
    async rebuildIndex() {
        logger.info('Rebuilding search index', { category: 'search-index' });
        this.indexDirty = false;
        await this.updateSearchIndexOptimized();
    }
}
