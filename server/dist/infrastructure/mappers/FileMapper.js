import { File } from '../../domain/entities/File.js';
export class FileMapper {
    static toDomain(external) {
        return File.fromData({
            id: external.id,
            filename: external.filename,
            originalName: external.originalName,
            mimetype: external.mimetype,
            size: external.size,
            path: external.path,
            extractedText: external.extractedText,
            metadata: external.metadata,
            uploadedAt: new Date(external.uploadedAt),
            lastModified: new Date(external.lastModified),
        });
    }
    static toExternal(domain) {
        const data = domain.toData();
        return {
            id: data.id,
            filename: data.filename,
            originalName: data.originalName,
            mimetype: data.mimetype,
            size: data.size,
            path: data.path,
            extractedText: data.extractedText,
            metadata: data.metadata,
            uploadedAt: data.uploadedAt,
            lastModified: data.lastModified,
        };
    }
    static toExternalArray(domains) {
        return domains.map(domain => this.toExternal(domain));
    }
    static toDomainArray(externals) {
        return externals.map(external => this.toDomain(external));
    }
}
