/**
 * Plugin type definitions for the UI automation framework.
 * Re-exports plugin types from the main types module.
 *
 * @module plugins/plugin.types
 * @requirements 14.2
 */
export type { Plugin, PluginConfig, PluginManager, TestStatus, StepInfo, ErrorContext, TestMetrics, LocatorMetric, WaitMetric, SuiteMetrics, VisualCheckResult, } from '../types/plugin.types.js';
/**
 * Step execution status type.
 * Alias for TestStatus used in step context.
 */
export type StepStatus = 'passed' | 'failed' | 'skipped' | 'pending';
//# sourceMappingURL=plugin.types.d.ts.map