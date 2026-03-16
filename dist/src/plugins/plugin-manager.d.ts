/**
 * PluginManager implementation for the UI automation framework.
 * Manages plugin lifecycle and broadcasts events to all registered plugins.
 *
 * Key features:
 * - Plugin registration and retrieval
 * - Event broadcasting to all plugins
 * - Error isolation - one plugin's error doesn't affect others
 * - Structured logging for debugging
 *
 * @module plugins/plugin-manager
 * @requirements 14.2
 */
import type { Plugin, PluginManager as IPluginManager, TestStatus, StepInfo, ErrorContext } from './plugin.types.js';
import type { StructuredLogger } from '../types/context.types.js';
/**
 * Step status type for step execution events.
 */
export type StepStatus = 'passed' | 'failed' | 'skipped' | 'pending';
/**
 * PluginManager implementation that manages plugin lifecycle and event broadcasting.
 *
 * This implementation ensures:
 * - Plugin errors are isolated and don't affect other plugins
 * - All lifecycle methods are called in the correct order
 * - Structured logging for debugging plugin issues
 *
 * @requirements 14.2
 */
export declare class PluginManagerImpl implements IPluginManager {
    private readonly plugins;
    private readonly logger;
    /**
     * Create a new PluginManager instance.
     *
     * @param logger - Structured logger for debugging
     */
    constructor(logger: StructuredLogger);
    /**
     * Register a plugin with the manager.
     * If a plugin with the same name is already registered, it will be replaced.
     *
     * @param plugin - Plugin instance to register
     */
    register(plugin: Plugin): void;
    /**
     * Get a registered plugin by name.
     *
     * @param name - Plugin name to retrieve
     * @returns Plugin instance or undefined if not found
     */
    get<T extends Plugin>(name: string): T | undefined;
    /**
     * Notify all plugins that a test has started.
     * Plugin errors are caught and logged but don't affect other plugins.
     *
     * @param testId - Unique test identifier
     * @param testName - Human-readable test name
     */
    notifyTestStart(testId: string, testName: string): Promise<void>;
    /**
     * Notify all plugins that a test has ended.
     * Plugin errors are caught and logged but don't affect other plugins.
     *
     * @param testId - Unique test identifier
     * @param status - Test execution status
     * @param duration - Test execution duration in milliseconds
     */
    notifyTestEnd(testId: string, status: TestStatus, duration: number): Promise<void>;
    /**
     * Notify all plugins that a step has been executed.
     * Plugin errors are caught and logged but don't affect other plugins.
     *
     * @param step - Step execution information
     */
    notifyStepExecuted(step: StepInfo): Promise<void>;
    /**
     * Notify all plugins that an error has occurred.
     * Plugin errors are caught and logged but don't affect other plugins.
     *
     * @param error - The error that occurred
     * @param context - Error context information
     */
    notifyError(error: Error, context: ErrorContext): Promise<void>;
    /**
     * Flush all plugins' buffered data.
     * Plugin errors are caught and logged but don't affect other plugins.
     */
    flushAll(): Promise<void>;
    /**
     * Dispose all plugins and clean up resources.
     * Plugin errors are caught and logged but don't affect other plugins.
     */
    disposeAll(): Promise<void>;
    /**
     * Get the number of registered plugins.
     *
     * @returns Number of registered plugins
     */
    get size(): number;
    /**
     * Get all registered plugin names.
     *
     * @returns Array of plugin names
     */
    getPluginNames(): string[];
    /**
     * Broadcast an action to all registered plugins.
     * Each plugin is called independently, and errors are caught and logged
     * without affecting other plugins.
     *
     * @param action - Action to perform on each plugin
     * @param actionName - Name of the action for logging
     */
    private broadcast;
}
/**
 * Factory function to create a PluginManager instance.
 *
 * @param logger - Structured logger for debugging
 * @returns New PluginManager instance
 */
export declare function createPluginManager(logger: StructuredLogger): PluginManagerImpl;
//# sourceMappingURL=plugin-manager.d.ts.map