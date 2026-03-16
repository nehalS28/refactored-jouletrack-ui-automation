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
export class FrameworkError extends Error {
    context;
    constructor(message, context) {
        super(message);
        this.context = context;
        this.name = 'FrameworkError';
        Error.captureStackTrace(this, this.constructor);
    }
}
/**
 * Error thrown when browser initialization fails.
 *
 * @requirements 3.6
 */
export class BrowserInitializationError extends FrameworkError {
    browserName;
    attempts;
    constructor(message, browserName, attempts, context) {
        super(`Browser initialization failed after ${attempts} attempts: ${message}`, { browserName, attempts, ...context });
        this.browserName = browserName;
        this.attempts = attempts;
        this.name = 'BrowserInitializationError';
    }
}
/**
 * Error thrown when an action fails.
 *
 * @requirements 4.4
 */
export class ActionFailedError extends FrameworkError {
    action;
    locatorDescription;
    constructor(action, locatorDescription, message, context) {
        super(`Action "${action}" failed on element "${locatorDescription}": ${message}`, { action, locatorDescription, ...context });
        this.action = action;
        this.locatorDescription = locatorDescription;
        this.name = 'ActionFailedError';
    }
}
/**
 * Error thrown when a wait operation times out.
 *
 * @requirements 5.5
 */
export class WaitTimeoutError extends FrameworkError {
    condition;
    timeoutMs;
    locatorDescription;
    constructor(condition, timeoutMs, locatorDescription, context) {
        const elementInfo = locatorDescription
            ? ` for element "${locatorDescription}"`
            : '';
        super(`Wait timeout: condition "${condition}"${elementInfo} not met within ${timeoutMs}ms`, { condition, timeoutMs, locatorDescription, ...context });
        this.condition = condition;
        this.timeoutMs = timeoutMs;
        this.locatorDescription = locatorDescription;
        this.name = 'WaitTimeoutError';
    }
}
/**
 * Error thrown when test data is not found.
 *
 * @requirements 6.6
 */
export class TestDataNotFoundError extends FrameworkError {
    dataKey;
    constructor(dataKey, context) {
        super(`Test data not found: "${dataKey}"`, { dataKey, ...context });
        this.dataKey = dataKey;
        this.name = 'TestDataNotFoundError';
    }
}
/**
 * Error thrown when step definition patterns conflict.
 *
 * @requirements 9.6
 */
export class StepConflictError extends FrameworkError {
    pattern;
    existingFile;
    newFile;
    constructor(pattern, existingFile, newFile, context) {
        super(`Step pattern conflict: "${pattern}" already defined in "${existingFile}", cannot add in "${newFile}"`, { pattern, existingFile, newFile, ...context });
        this.pattern = pattern;
        this.existingFile = existingFile;
        this.newFile = newFile;
        this.name = 'StepConflictError';
    }
}
/**
 * Error thrown when a plugin operation fails.
 */
export class PluginError extends FrameworkError {
    pluginName;
    operation;
    constructor(pluginName, operation, message, context) {
        super(`Plugin "${pluginName}" failed during "${operation}": ${message}`, { pluginName, operation, ...context });
        this.pluginName = pluginName;
        this.operation = operation;
        this.name = 'PluginError';
    }
}
// Re-export errors from types for convenience
export { LocatorNotFoundError } from '../types/locator.types.js';
export { ConfigurationError } from '../types/config.types.js';
//# sourceMappingURL=errors.js.map