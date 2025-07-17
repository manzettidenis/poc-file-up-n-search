import { File } from '../../domain/entities/File.js';
import { FileEntity } from '../../types/index.js';
export declare class FileMapper {
    static toDomain(external: FileEntity): File;
    static toExternal(domain: File): FileEntity;
    static toExternalArray(domains: File[]): FileEntity[];
    static toDomainArray(externals: FileEntity[]): File[];
}
