/**
 * Structured Logger implementation for the UI automation framework.
 * Provides consistent logging with correlation IDs, worker IDs, and sensitive data masking.
 *
 * @module core/logger
 * @requirements 10.1, 10.2, 10.3, 10.6
 */
import type { StructuredLogger } from '../types/context.types.js';
import type { LogLevel } from '../types/config.types.js';
/**
 * Configuration for creating a StructuredLogger instance.
 */
export interface LoggerConfig {
    /** Worker identifier for parallel execution tracking */
    readonly workerId: string;
    /** Correlation ID for tracing test execution flow */
    readonly correlationId: string;
    /** Minimum log level to output */
    readonly level: LogLevel;
}
/**
 * Structured log entry format for JSON output.
 *
 * @requirements 10.1
 */
export interface StructuredLogEntry {
    /** ISO 8601 timestamp */
    readonly timestamp: string;
    /** Log level */
    readonly level: string;
    /** Log message */
    readonly message: string;
    /** Worker identifier */
    readonly workerId: string;
    /** Correlation ID for tracing */
    readonly correlationId: string;
    /** Optional test identifier */
    readonly testId?: string;
    /** Additional data fields */
    readonly [key: string]: unknown;
}
/**
 * StructuredLogger implementation with correlation IDs, worker IDs, and sensitive data masking.
 *
 * @requirements 10.1, 10.2, 10.3, 10.6
 */
export declare class StructuredLoggerImpl implements StructuredLogger {
    private readonly config;
    private testId;
    constructor(config: LoggerConfig);
    /**
     * Log a debug level message.
     *
     * @param message - The log message
     * @param data - Optional additional data to include
     * @requirements 10.2
     */
    debug(message: string, data?: Record<string, unknown>): void;
    /**
     * Log an info level message.
     *
     * @param message - The log message
     * @param data - Optional additional data to include
     * @requirements 10.2
     */
    info(message: string, data?: Record<string, unknown>): void;
    /**
     * Log a warning level message.
     *
     * @param message - The log message
     * @param data - Optional additional data to include
     * @requirements 10.2
     */
    warn(message: string, data?: Record<string, unknown>): void;
    /**
     * Log an error level message.
     * Error level messages are always logged regardless of configured level.
     *
     * @param message - The log message
     * @param data - Optional additional data to include
     * @requirements 10.2
     */
    error(message: string, data?: Record<string, unknown>): void;
    /**
     * Set the current test ID for correlation.
     *
     * @param testId - The test identifier
     * @requirements 10.3
     */
    setTestId(testId: string): void;
    /**
     * Clear the current test ID.
     *
     * @requirements 10.3
     */
    clearTestId(): void;
    /**
     * Check if a message at the given level should be logged.
     *
     * @param level - The log level to check
     * @returns true if the message should be logged
     * @requirements 10.2
     */
    private shouldLog;
    /**
     * Create and output a structured log entry.
     *
     * @param level - The log level
     * @param message - The log message
     * @param data - Optional additional data
     * @requirements 10.1, 10.3, 10.6
     */
    private log;
}
/**
 * Recursively mask sensitive data in an object.
 *
 * @param data - The data object to sanitize
 * @returns A new object with sensitive values masked
 * @requirements 10.6
 */
export declare function maskSensitiveData(data: Record<string, unknown>): Record<string, unknown>;
/**
 * Factory function to create a StructuredLogger instance.
 *
 * @param config - Logger configuration
 * @returns A new StructuredLogger instance
 */
export declare function createStructuredLogger(config: LoggerConfig): StructuredLogger;
//# sourceMappingURL=logger.d.ts.map