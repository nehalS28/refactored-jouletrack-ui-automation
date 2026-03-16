/**
 * Error hierarchy for the UI automation framework.
 * Provides specific error types with context for debugging.
 *
 * @module utils/errors
 * @requirements 10.1, 10.4
 */
/**
 * Base error class for all framework errors.
 */
export declare class FrameworkError extends Error {
    readonly context?: Record<string, unknown> | undefined;
    constructor(message: string, context?: Record<string, unknown> | undefined);
}
/**
 * Error thrown when browser initialization fails.
 *
 * @requirements 3.6
 */
export declare class BrowserInitializationError extends FrameworkError {
    readonly browserName: string;
    readonly attempts: number;
    constructor(message: string, browserName: string, attempts: number, context?: Record<string, unknown>);
}
/**
 * Error thrown when an action fails.
 *
 * @requirements 4.4
 */
export declare class ActionFailedError extends FrameworkError {
    readonly action: string;
    readonly locatorDescription: string;
    constructor(action: string, locatorDescription: string, message: string, context?: Record<string, unknown>);
}
/**
 * Error thrown when a wait operation times out.
 *
 * @requirements 5.5
 */
export declare class WaitTimeoutError extends FrameworkError {
    readonly condition: string;
    readonly timeoutMs: number;
    readonly locatorDescription?: string | undefined;
    constructor(condition: string, timeoutMs: number, locatorDescription?: string | undefined, context?: Record<string, unknown>);
}
/**
 * Error thrown when test data is not found.
 *
 * @requirements 6.6
 */
export declare class TestDataNotFoundError extends FrameworkError {
    readonly dataKey: string;
    constructor(dataKey: string, context?: Record<string, unknown>);
}
/**
 * Error thrown when step definition patterns conflict.
 *
 * @requirements 9.6
 */
export declare class StepConflictError extends FrameworkError {
    readonly pattern: string;
    readonly existingFile: string;
    readonly newFile: string;
    constructor(pattern: string, existingFile: string, newFile: string, context?: Record<string, unknown>);
}
/**
 * Error thrown when a plugin operation fails.
 */
export declare class PluginError extends FrameworkError {
    readonly pluginName: string;
    readonly operation: string;
    constructor(pluginName: string, operation: string, message: string, context?: Record<string, unknown>);
}
export { LocatorNotFoundError } from '../types/locator.types.js';
export { ConfigurationError } from '../types/config.types.js';
//# sourceMappingURL=errors.d.ts.map