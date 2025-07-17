export class FileSize {
    bytes;
    constructor(bytes) {
        this.bytes = bytes;
        if (bytes < 0) {
            throw new Error('File size cannot be negative');
        }
    }
    get value() {
        return this.bytes;
    }
    toMB() {
        return Math.round((this.bytes / 1024 / 1024) * 100) / 100;
    }
    isLarge() {
        return this.bytes > 10 * 1024 * 1024;
    }
}
export class FileIdentifier {
    id;
    constructor(id) {
        this.id = id;
        if (!id || id.trim().length === 0) {
            throw new Error('File identifier cannot be empty');
        }
    }
    get value() {
        return this.id;
    }
    equals(other) {
        return this.id === other.value;
    }
}
export class File {
    _id;
    filename;
    originalName;
    mimetype;
    _size;
    path;
    _extractedText;
    _metadata;
    uploadedAt;
    _lastModified;
    constructor(_id, filename, originalName, mimetype, _size, path, _extractedText, _metadata, uploadedAt, _lastModified) {
        this._id = _id;
        this.filename = filename;
        this.originalName = originalName;
        this.mimetype = mimetype;
        this._size = _size;
        this.path = path;
        this._extractedText = _extractedText;
        this._metadata = _metadata;
        this.uploadedAt = uploadedAt;
        this._lastModified = _lastModified;
        this.validateInvariants();
    }
    static create(data) {
        const now = new Date();
        return new File(new FileIdentifier(crypto.randomUUID()), data.filename, data.originalName, data.mimetype, new FileSize(data.size), data.path, data.extractedText, data.metadata, now, now);
    }
    get id() {
        return this._id;
    }
    get size() {
        return this._size;
    }
    get extractedText() {
        return this._extractedText;
    }
    get metadata() {
        return { ...this._metadata };
    }
    get lastModified() {
        return this._lastModified;
    }
    updateExtractedText(text) {
        if (text === null || text === undefined) {
            throw new Error('Extracted text cannot be null or undefined');
        }
        this._extractedText = text;
        this._lastModified = new Date();
    }
    updateMetadata(metadata) {
        this._metadata = { ...this._metadata, ...metadata };
        this._lastModified = new Date();
    }
    isTextFile() {
        return this.mimetype.startsWith('text/');
    }
    isPdf() {
        return this.mimetype === 'application/pdf';
    }
    isImage() {
        return this.mimetype.startsWith('image/');
    }
    isDocument() {
        const docTypes = [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ];
        return docTypes.includes(this.mimetype);
    }
    getFileExtension() {
        return this.originalName.split('.').pop()?.toLowerCase() || '';
    }
    isSearchable() {
        return this._extractedText.length > 0 && !this._metadata.extractionError;
    }
    getDisplayName() {
        return this.originalName || this.filename;
    }
    hasError() {
        return !!this._metadata.extractionError;
    }
    getErrorMessage() {
        return this._metadata.errorMessage || null;
    }
    validateInvariants() {
        if (!this.filename || this.filename.trim().length === 0) {
            throw new Error('Filename cannot be empty');
        }
        if (!this.originalName || this.originalName.trim().length === 0) {
            throw new Error('Original name cannot be empty');
        }
        if (!this.mimetype || this.mimetype.trim().length === 0) {
            throw new Error('MIME type cannot be empty');
        }
        if (!this.path || this.path.trim().length === 0) {
            throw new Error('File path cannot be empty');
        }
    }
    toData() {
        return {
            id: this._id.value,
            filename: this.filename,
            originalName: this.originalName,
            mimetype: this.mimetype,
            size: this._size.value,
            path: this.path,
            extractedText: this._extractedText,
            metadata: this._metadata,
            uploadedAt: this.uploadedAt,
            lastModified: this._lastModified,
        };
    }
    static fromData(data) {
        return new File(new FileIdentifier(data.id), data.filename, data.originalName, data.mimetype, new FileSize(data.size), data.path, data.extractedText, data.metadata, data.uploadedAt, data.lastModified);
    }
}
