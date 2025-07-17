import { File } from '../entities/File.js';
import { SearchQuery, SearchResult } from '../../types/index.js';
export interface IFileRepository {
    save(file: File): Promise<File>;
    findById(id: string): Promise<File | null>;
    findByFilename(filename: string): Promise<File | null>;
    findAll(limit?: number, offset?: number): Promise<File[]>;
    search(query: SearchQuery): Promise<SearchResult>;
    delete(id: string): Promise<boolean>;
    update(file: File): Promise<File>;
    count(): Promise<number>;
    exists(id: string): Promise<boolean>;
}
