/**
 * Metrics plugin module exports.
 * 
 * @module plugins/metrics
 * @requirements 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.8
 */

export { MetricsPlugin, type MetricsPluginConfig } from './metrics-plugin.js';
export { 
  SQLiteStore, 
  type SQLiteStoreConfig,
  type TestMetricRecord,
  type SuiteMetricRecord,
  type BaselineRecord,
  type LocatorMetricData,
  type WaitMetricData,
} from './sqlite-store.js';
