/**
 * Structured Logger implementation for the UI automation framework.
 * Provides consistent logging with correlation IDs, worker IDs, and sensitive data masking.
 *
 * @module core/logger
 * @requirements 10.1, 10.2, 10.3, 10.6
 */
/**
 * Sensitive keys that should be masked in log output.
 * Case-insensitive matching is performed.
 *
 * @requirements 10.6
 */
const SENSITIVE_KEYS = [
    'password',
    'token',
    'apikey',
    'api_key',
    'secret',
    'auth',
    'authorization',
    'credential',
    'key',
    'private',
    'bearer',
    'cookie',
    'session',
    'jwt',
    'access_token',
    'refresh_token',
];
/**
 * Mask value used to replace sensitive data.
 */
const MASKED_VALUE = '[REDACTED]';
/**
 * Log level priority for filtering.
 */
const LOG_LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
/**
 * StructuredLogger implementation with correlation IDs, worker IDs, and sensitive data masking.
 *
 * @requirements 10.1, 10.2, 10.3, 10.6
 */
export class StructuredLoggerImpl {
    config;
    testId;
    constructor(config) {
        this.config = config;
    }
    /**
     * Log a debug level message.
     *
     * @param message - The log message
     * @param data - Optional additional data to include
     * @requirements 10.2
     */
    debug(message, data) {
        if (this.shouldLog('debug')) {
            this.log('debug', message, data);
        }
    }
    /**
     * Log an info level message.
     *
     * @param message - The log message
     * @param data - Optional additional data to include
     * @requirements 10.2
     */
    info(message, data) {
        if (this.shouldLog('info')) {
            this.log('info', message, data);
        }
    }
    /**
     * Log a warning level message.
     *
     * @param message - The log message
     * @param data - Optional additional data to include
     * @requirements 10.2
     */
    warn(message, data) {
        if (this.shouldLog('warn')) {
            this.log('warn', message, data);
        }
    }
    /**
     * Log an error level message.
     * Error level messages are always logged regardless of configured level.
     *
     * @param message - The log message
     * @param data - Optional additional data to include
     * @requirements 10.2
     */
    error(message, data) {
        this.log('error', message, data);
    }
    /**
     * Set the current test ID for correlation.
     *
     * @param testId - The test identifier
     * @requirements 10.3
     */
    setTestId(testId) {
        this.testId = testId;
    }
    /**
     * Clear the current test ID.
     *
     * @requirements 10.3
     */
    clearTestId() {
        this.testId = undefined;
    }
    /**
     * Check if a message at the given level should be logged.
     *
     * @param level - The log level to check
     * @returns true if the message should be logged
     * @requirements 10.2
     */
    shouldLog(level) {
        return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.level];
    }
    /**
     * Create and output a structured log entry.
     *
     * @param level - The log level
     * @param message - The log message
     * @param data - Optional additional data
     * @requirements 10.1, 10.3, 10.6
     */
    log(level, message, data) {
        const sanitizedData = data ? maskSensitiveData(data) : undefined;
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            workerId: this.config.workerId,
            correlationId: this.config.correlationId,
            ...(this.testId && { testId: this.testId }),
            ...sanitizedData,
        };
        // Output as JSON for structured logging
        console.log(JSON.stringify(entry));
    }
}
/**
 * Recursively mask sensitive data in an object.
 *
 * @param data - The data object to sanitize
 * @returns A new object with sensitive values masked
 * @requirements 10.6
 */
export function maskSensitiveData(data) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
        // For objects, always recurse to check nested keys
        // Only mask the value directly if it's a primitive and the key is sensitive
        if (isPlainObject(value)) {
            sanitized[key] = maskSensitiveData(value);
        }
        else if (Array.isArray(value)) {
            sanitized[key] = maskSensitiveArray(value);
        }
        else if (isSensitiveKey(key)) {
            sanitized[key] = MASKED_VALUE;
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
/**
 * Check if a key is considered sensitive.
 *
 * @param key - The key to check
 * @returns true if the key matches a sensitive pattern
 * @requirements 10.6
 */
function isSensitiveKey(key) {
    const lowerKey = key.toLowerCase();
    return SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive));
}
/**
 * Check if a value is a plain object (not null, not array).
 *
 * @param value - The value to check
 * @returns true if the value is a plain object
 */
function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * Recursively mask sensitive data in an array.
 *
 * @param arr - The array to sanitize
 * @returns A new array with sensitive values masked
 * @requirements 10.6
 */
function maskSensitiveArray(arr) {
    return arr.map(item => {
        if (isPlainObject(item)) {
            return maskSensitiveData(item);
        }
        else if (Array.isArray(item)) {
            return maskSensitiveArray(item);
        }
        return item;
    });
}
/**
 * Factory function to create a StructuredLogger instance.
 *
 * @param config - Logger configuration
 * @returns A new StructuredLogger instance
 */
export function createStructuredLogger(config) {
    return new StructuredLoggerImpl(config);
}
//# sourceMappingURL=logger.js.map