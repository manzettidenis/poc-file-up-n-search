interface EnvConfig {
    PORT: number;
    NODE_ENV: string;
    FRONTEND_URL: string;
    MAX_FILE_SIZE: number;
    UPLOAD_DIR: string;
}
export declare class EnvValidator {
    private static getEnvVar;
    private static getEnvNumber;
    private static validateNodeEnv;
    private static validateUrl;
    static validateAndLoadConfig(): EnvConfig;
    static logConfiguration(config: EnvConfig): void;
}
export {};
