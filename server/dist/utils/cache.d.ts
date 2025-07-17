import NodeCache from 'node-cache';
export declare const fileContentCache: NodeCache;
export declare const searchResultsCache: NodeCache;
export declare const fileMetadataCache: NodeCache;
export declare const textExtractionCache: NodeCache;
export declare class CacheManager {
    private static getCacheInstance;
    static get<T>(cacheType: string, key: string): T | undefined;
    static set<T>(cacheType: string, key: string, value: T, ttl?: number): boolean;
    static del(cacheType: string, key: string): number;
    static flush(cacheType: string): void;
    static flushAll(): void;
    static getStats(cacheType: string): any;
    static getAllStats(): Record<string, any>;
    static invalidateFileRelated(fileId: string): void;
    static invalidateSearchResults(): void;
}
export declare class FileContentCache {
    static getOrSet<T>(fileId: string, generator: () => Promise<T>, ttl?: number): Promise<T>;
    static set(fileId: string, content: any, ttl?: number): void;
    static get(fileId: string): any;
    static invalidate(fileId: string): void;
}
export declare class SearchCache {
    static generateKey(query: string, filters?: any): string;
    static getOrSet(query: string, generator: () => Promise<any>, filters?: any, ttl?: number): Promise<any>;
    static set(query: string, results: any, filters?: any, ttl?: number): void;
    static invalidateQuery(query: string, filters?: any): void;
    static invalidateAll(): void;
}
export declare class TextExtractionCache {
    static getOrSet(filePath: string, mimetype: string, generator: () => Promise<any>, ttl?: number): Promise<any>;
    static invalidate(filePath: string, mimetype: string): void;
}
