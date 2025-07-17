export class EnvValidator {
    static getEnvVar(name, defaultValue) {
        const value = process.env[name] || defaultValue;
        if (!value) {
            throw new Error(`Environment variable ${name} is required`);
        }
        return value;
    }
    static getEnvNumber(name, defaultValue) {
        const value = process.env[name];
        if (!value) {
            if (defaultValue !== undefined) {
                return defaultValue;
            }
            throw new Error(`Environment variable ${name} is required`);
        }
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
            throw new Error(`Environment variable ${name} must be a valid number`);
        }
        return parsed;
    }
    static validateNodeEnv(env) {
        const validEnvs = ['development', 'production', 'test'];
        if (!validEnvs.includes(env)) {
            throw new Error(`NODE_ENV must be one of: ${validEnvs.join(', ')}`);
        }
    }
    static validateUrl(url) {
        try {
            new URL(url);
        }
        catch {
            throw new Error(`Invalid URL format: ${url}`);
        }
    }
    static validateAndLoadConfig() {
        try {
            const nodeEnv = this.getEnvVar('NODE_ENV', 'development');
            this.validateNodeEnv(nodeEnv);
            const frontendUrl = this.getEnvVar('FRONTEND_URL', 'http://localhost:3000');
            this.validateUrl(frontendUrl);
            const port = this.getEnvNumber('PORT', 3001);
            if (port < 1 || port > 65535) {
                throw new Error('PORT must be between 1 and 65535');
            }
            const maxFileSize = this.getEnvNumber('MAX_FILE_SIZE', 50 * 1024 * 1024);
            if (maxFileSize < 1024 || maxFileSize > 100 * 1024 * 1024) {
                throw new Error('MAX_FILE_SIZE must be between 1KB and 100MB');
            }
            const uploadDir = this.getEnvVar('UPLOAD_DIR', 'uploads');
            if (!uploadDir.match(/^[a-zA-Z0-9_\-/]+$/)) {
                throw new Error('UPLOAD_DIR contains invalid characters');
            }
            const config = {
                PORT: port,
                NODE_ENV: nodeEnv,
                FRONTEND_URL: frontendUrl,
                MAX_FILE_SIZE: maxFileSize,
                UPLOAD_DIR: uploadDir,
            };
            console.log('✅ Environment configuration validated successfully');
            return config;
        }
        catch (error) {
            console.error('❌ Environment validation failed:', error instanceof Error ? error.message : 'Unknown error');
            process.exit(1);
        }
    }
    static logConfiguration(config) {
        console.log('📋 Current Configuration:');
        console.log(`   PORT: ${config.PORT}`);
        console.log(`   NODE_ENV: ${config.NODE_ENV}`);
        console.log(`   FRONTEND_URL: ${config.FRONTEND_URL}`);
        console.log(`   MAX_FILE_SIZE: ${Math.round(config.MAX_FILE_SIZE / 1024 / 1024)}MB`);
        console.log(`   UPLOAD_DIR: ${config.UPLOAD_DIR}`);
    }
}
