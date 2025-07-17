import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';
export class InputSanitizer {
    static sanitizeSearchQuery(query) {
        if (!query || typeof query !== 'string') {
            return '';
        }
        let sanitized = query.replace(/\0/g, '');
        sanitized = sanitized.substring(0, 500);
        sanitized = sanitized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        sanitized = sanitized.trim();
        return sanitized;
    }
    static sanitizeHtml(input) {
        if (!input || typeof input !== 'string') {
            return '';
        }
        return DOMPurify.sanitize(input, {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: [],
        });
    }
    static sanitizeFilename(filename) {
        if (!filename || typeof filename !== 'string') {
            return 'unknown_file';
        }
        let sanitized = validator.escape(filename);
        if (sanitized.length > 255) {
            const ext = sanitized.substring(sanitized.lastIndexOf('.'));
            sanitized = sanitized.substring(0, 255 - ext.length) + '...' + ext;
        }
        return sanitized;
    }
    static sanitizePagination(page, limit) {
        const defaultPage = 1;
        const defaultLimit = 10;
        const maxLimit = 100;
        let sanitizedPage = defaultPage;
        let sanitizedLimit = defaultLimit;
        if (page && validator.isInt(page, { min: 1, max: 10000 })) {
            sanitizedPage = parseInt(page, 10);
        }
        if (limit && validator.isInt(limit, { min: 1, max: maxLimit })) {
            sanitizedLimit = parseInt(limit, 10);
        }
        return { page: sanitizedPage, limit: sanitizedLimit };
    }
    static validateUUID(id) {
        return validator.isUUID(id, 4);
    }
    static sanitizeFileMetadata(metadata) {
        if (!metadata || typeof metadata !== 'object') {
            return {};
        }
        const sanitized = {};
        for (const [key, value] of Object.entries(metadata)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeHtml(value);
            }
            else if (typeof value === 'number') {
                sanitized[key] = value;
            }
            else if (Array.isArray(value)) {
                sanitized[key] = value.map(v => (typeof v === 'string' ? this.sanitizeHtml(v) : v));
            }
        }
        return sanitized;
    }
    static generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }
    static validateOrigin(origin, allowedOrigins) {
        return allowedOrigins.includes(origin);
    }
}
