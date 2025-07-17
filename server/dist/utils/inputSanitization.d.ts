export declare class InputSanitizer {
    static sanitizeSearchQuery(query: string): string;
    static sanitizeHtml(input: string): string;
    static sanitizeFilename(filename: string): string;
    static sanitizePagination(page?: string, limit?: string): {
        page: number;
        limit: number;
    };
    static validateUUID(id: string): boolean;
    static sanitizeFileMetadata(metadata: any): any;
    static generateRequestId(): string;
    static validateOrigin(origin: string, allowedOrigins: string[]): boolean;
}
