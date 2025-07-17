import NodeCache from 'node-cache';
import { logger } from './logger.js';
import { MetricsCollector } from './metrics.js';
const CACHE_CONFIGS = {
    fileContent: {
        stdTTL: 3600,
        checkperiod: 300,
        maxKeys: 1000,
    },
    searchResults: {
        stdTTL: 300,
        checkperiod: 60,
        maxKeys: 500,
    },
    fileMetadata: {
        stdTTL: 1800,
        checkperiod: 120,
        maxKeys: 2000,
    },
    textExtraction: {
        stdTTL: 7200,
        checkperiod: 600,
        maxKeys: 500,
    },
};
export const fileContentCache = new NodeCache(CACHE_CONFIGS.fileContent);
export const searchResultsCache = new NodeCache(CACHE_CONFIGS.searchResults);
export const fileMetadataCache = new NodeCache(CACHE_CONFIGS.fileMetadata);
export const textExtractionCache = new NodeCache(CACHE_CONFIGS.textExtraction);
class CacheStats {
    hits = new Map();
    misses = new Map();
    recordHit(cacheType) {
        this.hits.set(cacheType, (this.hits.get(cacheType) || 0) + 1);
        this.updateMetrics(cacheType);
    }
    recordMiss(cacheType) {
        this.misses.set(cacheType, (this.misses.get(cacheType) || 0) + 1);
        this.updateMetrics(cacheType);
    }
    updateMetrics(cacheType) {
        const hits = this.hits.get(cacheType) || 0;
        const misses = this.misses.get(cacheType) || 0;
        const total = hits + misses;
        const hitRate = total > 0 ? (hits / total) * 100 : 0;
        MetricsCollector.updateCacheMetrics(cacheType, hitRate);
    }
    getStats(cacheType) {
        const hits = this.hits.get(cacheType) || 0;
        const misses = this.misses.get(cacheType) || 0;
        const total = hits + misses;
        const hitRate = total > 0 ? (hits / total) * 100 : 0;
        return { hits, misses, hitRate };
    }
}
const cacheStats = new CacheStats();
export class CacheManager {
    static getCacheInstance(cacheType) {
        switch (cacheType) {
            case 'fileContent':
                return fileContentCache;
            case 'searchResults':
                return searchResultsCache;
            case 'fileMetadata':
                return fileMetadataCache;
            case 'textExtraction':
                return textExtractionCache;
            default:
                throw new Error(`Unknown cache type: ${cacheType}`);
        }
    }
    static get(cacheType, key) {
        const cache = this.getCacheInstance(cacheType);
        const value = cache.get(key);
        if (value !== undefined) {
            cacheStats.recordHit(cacheType);
            logger.debug('Cache hit', { cacheType, key, category: 'cache' });
        }
        else {
            cacheStats.recordMiss(cacheType);
            logger.debug('Cache miss', { cacheType, key, category: 'cache' });
        }
        return value;
    }
    static set(cacheType, key, value, ttl) {
        const cache = this.getCacheInstance(cacheType);
        const success = ttl !== undefined ? cache.set(key, value, ttl) : cache.set(key, value);
        if (success) {
            logger.debug('Cache set', { cacheType, key, ttl, category: 'cache' });
        }
        else {
            logger.warn('Cache set failed', { cacheType, key, category: 'cache' });
        }
        return success;
    }
    static del(cacheType, key) {
        const cache = this.getCacheInstance(cacheType);
        const deleted = cache.del(key);
        if (deleted > 0) {
            logger.debug('Cache delete', { cacheType, key, category: 'cache' });
        }
        return deleted;
    }
    static flush(cacheType) {
        const cache = this.getCacheInstance(cacheType);
        cache.flushAll();
        logger.info('Cache flushed', { cacheType, category: 'cache' });
    }
    static flushAll() {
        fileContentCache.flushAll();
        searchResultsCache.flushAll();
        fileMetadataCache.flushAll();
        textExtractionCache.flushAll();
        logger.info('All caches flushed', { category: 'cache' });
    }
    static getStats(cacheType) {
        const cache = this.getCacheInstance(cacheType);
        const stats = cacheStats.getStats(cacheType);
        return {
            ...stats,
            keys: cache.keys().length,
            size: cache.getStats().keys,
            memoryUsage: cache.getStats().hits + cache.getStats().misses,
        };
    }
    static getAllStats() {
        return {
            fileContent: this.getStats('fileContent'),
            searchResults: this.getStats('searchResults'),
            fileMetadata: this.getStats('fileMetadata'),
            textExtraction: this.getStats('textExtraction'),
        };
    }
    static invalidateFileRelated(fileId) {
        this.del('fileContent', fileId);
        this.del('fileMetadata', fileId);
        this.del('textExtraction', fileId);
        this.flush('searchResults');
        logger.info('File-related cache invalidated', { fileId, category: 'cache' });
    }
    static invalidateSearchResults() {
        this.flush('searchResults');
        logger.info('Search results cache invalidated', { category: 'cache' });
    }
}
export class FileContentCache {
    static async getOrSet(fileId, generator, ttl) {
        const cached = CacheManager.get('fileContent', fileId);
        if (cached !== undefined) {
            return cached;
        }
        const content = await generator();
        CacheManager.set('fileContent', fileId, content, ttl);
        return content;
    }
    static set(fileId, content, ttl) {
        CacheManager.set('fileContent', fileId, content, ttl);
    }
    static get(fileId) {
        return CacheManager.get('fileContent', fileId);
    }
    static invalidate(fileId) {
        CacheManager.del('fileContent', fileId);
    }
}
export class SearchCache {
    static generateKey(query, filters) {
        const filterStr = filters ? JSON.stringify(filters) : '';
        return `search_${Buffer.from(query + filterStr).toString('base64')}`;
    }
    static async getOrSet(query, generator, filters, ttl) {
        const key = this.generateKey(query, filters);
        const cached = CacheManager.get('searchResults', key);
        if (cached !== undefined) {
            return cached;
        }
        const results = await generator();
        CacheManager.set('searchResults', key, results, ttl);
        return results;
    }
    static set(query, results, filters, ttl) {
        const key = this.generateKey(query, filters);
        CacheManager.set('searchResults', key, results, ttl);
    }
    static invalidateQuery(query, filters) {
        const key = this.generateKey(query, filters);
        CacheManager.del('searchResults', key);
    }
    static invalidateAll() {
        CacheManager.flush('searchResults');
    }
}
export class TextExtractionCache {
    static async getOrSet(filePath, mimetype, generator, ttl) {
        const key = `${filePath}_${mimetype}`;
        const cached = CacheManager.get('textExtraction', key);
        if (cached !== undefined) {
            return cached;
        }
        const result = await generator();
        CacheManager.set('textExtraction', key, result, ttl);
        return result;
    }
    static invalidate(filePath, mimetype) {
        const key = `${filePath}_${mimetype}`;
        CacheManager.del('textExtraction', key);
    }
}
const setupCacheLogging = (cache, name) => {
    cache.on('set', (key, value) => {
        logger.debug(`Cache set: ${name}`, { key, category: 'cache' });
    });
    cache.on('del', (key, value) => {
        logger.debug(`Cache delete: ${name}`, { key, category: 'cache' });
    });
    cache.on('expired', (key, value) => {
        logger.debug(`Cache expired: ${name}`, { key, category: 'cache' });
    });
    cache.on('flush', () => {
        logger.info(`Cache flushed: ${name}`, { category: 'cache' });
    });
};
setupCacheLogging(fileContentCache, 'fileContent');
setupCacheLogging(searchResultsCache, 'searchResults');
setupCacheLogging(fileMetadataCache, 'fileMetadata');
setupCacheLogging(textExtractionCache, 'textExtraction');
setInterval(() => {
    const stats = CacheManager.getAllStats();
    logger.info('Cache statistics', { stats, category: 'metrics' });
}, 60000);
