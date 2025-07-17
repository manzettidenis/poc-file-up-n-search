import { File } from '../../domain/entities/File.js';
import { IFileRepository } from '../../domain/repositories/IFileRepository.js';
import { SearchQuery, SearchResult } from '../../types/index.js';
export declare class FileSystemFileRepository implements IFileRepository {
    private files;
    private fuse;
    private dataPath;
    private indexDirty;
    private indexingInProgress;
    constructor();
    private ensureDataDirectory;
    private loadFromDisk;
    private saveToDisk;
    private updateSearchIndexOptimized;
    save(file: File): Promise<File>;
    findById(id: string): Promise<File | null>;
    findByFilename(filename: string): Promise<File | null>;
    findAll(limit?: number, offset?: number): Promise<File[]>;
    search(query: SearchQuery): Promise<SearchResult>;
    delete(id: string): Promise<boolean>;
    update(file: File): Promise<File>;
    count(): Promise<number>;
    exists(id: string): Promise<boolean>;
    getStats(): Promise<{
        totalFiles: number;
        cacheStats: any;
        indexStatus: {
            documentsIndexed: number;
            indexingInProgress: boolean;
            indexDirty: boolean;
        };
    }>;
    rebuildIndex(): Promise<void>;
}
