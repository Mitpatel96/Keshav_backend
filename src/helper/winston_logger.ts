// Simple logger mock to replace winston
export const logger = {
    info: (message: string, meta?: any) => {
        console.log(`[INFO] ${message}`, meta || '');
    },
    error: (message: string, meta?: any) => {
        console.error(`[ERROR] ${message}`, meta || '');
    },
    warn: (message: string, meta?: any) => {
        console.warn(`[WARN] ${message}`, meta || '');
    }
};

export const reqInfo = (req: any) => {
    logger.info(`Request: ${req.method} ${req.url}`);
};