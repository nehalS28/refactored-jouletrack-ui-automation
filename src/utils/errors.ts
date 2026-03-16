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
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
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
  constructor(
    message: string,
    public readonly browserName: string,
    public readonly attempts: number,
    context?: Record<string, unknown>
  ) {
    super(
      `Browser initialization failed after ${attempts} attempts: ${message}`,
      { browserName, attempts, ...context }
    );
    this.name = 'BrowserInitializationError';
  }
}

/**
 * Error thrown when an action fails.
 * 
 * @requirements 4.4
 */
export class ActionFailedError extends FrameworkError {
  constructor(
    public readonly action: string,
    public readonly locatorDescription: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(
      `Action "${action}" failed on element "${locatorDescription}": ${message}`,
      { action, locatorDescription, ...context }
    );
    this.name = 'ActionFailedError';
  }
}

/**
 * Error thrown when a wait operation times out.
 * 
 * @requirements 5.5
 */
export class WaitTimeoutError extends FrameworkError {
  constructor(
    public readonly condition: string,
    public readonly timeoutMs: number,
    public readonly locatorDescription?: string,
    context?: Record<string, unknown>
  ) {
    const elementInfo = locatorDescription 
      ? ` for element "${locatorDescription}"` 
      : '';
    super(
      `Wait timeout: condition "${condition}"${elementInfo} not met within ${timeoutMs}ms`,
      { condition, timeoutMs, locatorDescription, ...context }
    );
    this.name = 'WaitTimeoutError';
  }
}

/**
 * Error thrown when test data is not found.
 * 
 * @requirements 6.6
 */
export class TestDataNotFoundError extends FrameworkError {
  constructor(
    public readonly dataKey: string,
    context?: Record<string, unknown>
  ) {
    super(
      `Test data not found: "${dataKey}"`,
      { dataKey, ...context }
    );
    this.name = 'TestDataNotFoundError';
  }
}

/**
 * Error thrown when step definition patterns conflict.
 * 
 * @requirements 9.6
 */
export class StepConflictError extends FrameworkError {
  constructor(
    public readonly pattern: string,
    public readonly existingFile: string,
    public readonly newFile: string,
    context?: Record<string, unknown>
  ) {
    super(
      `Step pattern conflict: "${pattern}" already defined in "${existingFile}", cannot add in "${newFile}"`,
      { pattern, existingFile, newFile, ...context }
    );
    this.name = 'StepConflictError';
  }
}

/**
 * Error thrown when a plugin operation fails.
 */
export class PluginError extends FrameworkError {
  constructor(
    public readonly pluginName: string,
    public readonly operation: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(
      `Plugin "${pluginName}" failed during "${operation}": ${message}`,
      { pluginName, operation, ...context }
    );
    this.name = 'PluginError';
  }
}

// Re-export errors from types for convenience
export { LocatorNotFoundError } from '../types/locator.types.js';
export { ConfigurationError } from '../types/config.types.js';
