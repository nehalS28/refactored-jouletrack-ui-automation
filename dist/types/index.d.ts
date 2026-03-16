/**
 * Type definitions for the UI automation framework.
 *
 * @module types
 * @requirements 14.1, 14.2, 14.5
 */
export type { LocatorStrategy, Locator, LocatorEntry, YamlLocatorDefinition, YamlComponentDefinition, YamlPageDefinition, YamlRegistryDefinition, } from './locator.types.js';
export { LocatorNotFoundError } from './locator.types.js';
export type { Environment, BrowserName, LogLevel, BrowserConfig, TimeoutConfig, RetryConfig, ParallelConfig, LoggingConfig, MetricsPluginConfig, AllurePluginConfig, ZephyrPluginConfig, VisualPluginConfig, ApiMockPluginConfig, MorpheusPluginConfig, PluginsConfig, FrameworkConfig, } from './config.types.js';
export { ConfigurationError } from './config.types.js';
export type { StructuredLogger, ActionHelper, WaitStrategy, TestContext, TestContextFactory, } from './context.types.js';
export type { TestStatus, StepInfo, ErrorContext, PluginConfig, Plugin, PluginManager, TestMetrics, LocatorMetric, WaitMetric, SuiteMetrics, VisualCheckResult, } from './plugin.types.js';
//# sourceMappingURL=index.d.ts.map