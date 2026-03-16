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

import type {
  Plugin,
  PluginManager as IPluginManager,
  TestStatus,
  StepInfo,
  ErrorContext,
} from './plugin.types.js';
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
export class PluginManagerImpl implements IPluginManager {
  private readonly plugins: Map<string, Plugin> = new Map();
  private readonly logger: StructuredLogger;

  /**
   * Create a new PluginManager instance.
   * 
   * @param logger - Structured logger for debugging
   */
  constructor(logger: StructuredLogger) {
    this.logger = logger;
  }

  /**
   * Register a plugin with the manager.
   * If a plugin with the same name is already registered, it will be replaced.
   * 
   * @param plugin - Plugin instance to register
   */
  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      this.logger.warn('Plugin already registered, replacing', {
        pluginName: plugin.name,
      });
    }

    this.plugins.set(plugin.name, plugin);
    this.logger.debug('Plugin registered', {
      pluginName: plugin.name,
      version: plugin.version,
    });
  }

  /**
   * Get a registered plugin by name.
   * 
   * @param name - Plugin name to retrieve
   * @returns Plugin instance or undefined if not found
   */
  get<T extends Plugin>(name: string): T | undefined {
    return this.plugins.get(name) as T | undefined;
  }

  /**
   * Notify all plugins that a test has started.
   * Plugin errors are caught and logged but don't affect other plugins.
   * 
   * @param testId - Unique test identifier
   * @param testName - Human-readable test name
   */
  async notifyTestStart(testId: string, testName: string): Promise<void> {
    await this.broadcast(
      (plugin) => plugin.onTestStart(testId, testName),
      'onTestStart'
    );
  }

  /**
   * Notify all plugins that a test has ended.
   * Plugin errors are caught and logged but don't affect other plugins.
   * 
   * @param testId - Unique test identifier
   * @param status - Test execution status
   * @param duration - Test execution duration in milliseconds
   */
  async notifyTestEnd(
    testId: string,
    status: TestStatus,
    duration: number
  ): Promise<void> {
    await this.broadcast(
      (plugin) => plugin.onTestEnd(testId, status, duration),
      'onTestEnd'
    );
  }

  /**
   * Notify all plugins that a step has been executed.
   * Plugin errors are caught and logged but don't affect other plugins.
   * 
   * @param step - Step execution information
   */
  async notifyStepExecuted(step: StepInfo): Promise<void> {
    await this.broadcast(
      (plugin) => plugin.onStepExecuted(step),
      'onStepExecuted'
    );
  }

  /**
   * Notify all plugins that an error has occurred.
   * Plugin errors are caught and logged but don't affect other plugins.
   * 
   * @param error - The error that occurred
   * @param context - Error context information
   */
  async notifyError(error: Error, context: ErrorContext): Promise<void> {
    await this.broadcast(
      (plugin) => plugin.onError(error, context),
      'onError'
    );
  }

  /**
   * Flush all plugins' buffered data.
   * Plugin errors are caught and logged but don't affect other plugins.
   */
  async flushAll(): Promise<void> {
    await this.broadcast((plugin) => plugin.flush(), 'flush');
  }

  /**
   * Dispose all plugins and clean up resources.
   * Plugin errors are caught and logged but don't affect other plugins.
   */
  async disposeAll(): Promise<void> {
    await this.broadcast((plugin) => plugin.dispose(), 'dispose');
    this.plugins.clear();
    this.logger.debug('All plugins disposed');
  }

  /**
   * Get the number of registered plugins.
   * 
   * @returns Number of registered plugins
   */
  get size(): number {
    return this.plugins.size;
  }

  /**
   * Get all registered plugin names.
   * 
   * @returns Array of plugin names
   */
  getPluginNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Broadcast an action to all registered plugins.
   * Each plugin is called independently, and errors are caught and logged
   * without affecting other plugins.
   * 
   * @param action - Action to perform on each plugin
   * @param actionName - Name of the action for logging
   */
  private async broadcast(
    action: (plugin: Plugin) => Promise<void>,
    actionName: string
  ): Promise<void> {
    const promises = Array.from(this.plugins.values()).map(async (plugin) => {
      try {
        await action(plugin);
      } catch (error) {
        this.logger.warn(`Plugin ${actionName} failed`, {
          pluginName: plugin.name,
          action: actionName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    await Promise.all(promises);
  }
}

/**
 * Factory function to create a PluginManager instance.
 * 
 * @param logger - Structured logger for debugging
 * @returns New PluginManager instance
 */
export function createPluginManager(logger: StructuredLogger): PluginManagerImpl {
  return new PluginManagerImpl(logger);
}
