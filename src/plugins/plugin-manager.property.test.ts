/**
 * Property-based tests for Plugin Lifecycle Management.
 * 
 * **Property 52: Plugin Lifecycle Management**
 * **Validates: Plugin Architecture**
 * 
 * Tests that:
 * - Plugin lifecycle methods are called in correct order
 * - Plugin errors don't affect other plugins
 * - Plugin registration is idempotent (re-registration replaces)
 * - All plugins receive all lifecycle events (broadcast completeness)
 * 
 * @module plugins/plugin-manager.property.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { PluginManagerImpl, createPluginManager } from './plugin-manager.js';
import type { Plugin, TestStatus, StepInfo, ErrorContext } from './plugin.types.js';
import type { StructuredLogger } from '../types/context.types.js';

/**
 * Create a mock logger for testing.
 */
function createMockLogger(): StructuredLogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setTestId: vi.fn(),
    clearTestId: vi.fn(),
  };
}

/**
 * Lifecycle event types for tracking call order.
 */
type LifecycleEvent = 
  | { type: 'initialize' }
  | { type: 'onTestStart'; testId: string; testName: string }
  | { type: 'onTestEnd'; testId: string; status: TestStatus; duration: number }
  | { type: 'onStepExecuted'; step: StepInfo }
  | { type: 'onError'; error: Error; context: ErrorContext }
  | { type: 'flush' }
  | { type: 'dispose' };

/**
 * Create a tracking plugin that records all lifecycle events.
 */
function createTrackingPlugin(
  name: string,
  version = '1.0.0',
  options: {
    throwOnMethod?: string;
    throwError?: Error;
  } = {}
): Plugin & { events: LifecycleEvent[] } {
  const events: LifecycleEvent[] = [];
  
  const maybeThrow = (method: string) => {
    if (options.throwOnMethod === method) {
      throw options.throwError ?? new Error(`${name} failed on ${method}`);
    }
  };

  return {
    name,
    version,
    events,
    initialize: vi.fn().mockImplementation(async () => {
      maybeThrow('initialize');
      events.push({ type: 'initialize' });
    }),
    onTestStart: vi.fn().mockImplementation(async (testId: string, testName: string) => {
      maybeThrow('onTestStart');
      events.push({ type: 'onTestStart', testId, testName });
    }),
    onTestEnd: vi.fn().mockImplementation(async (testId: string, status: TestStatus, duration: number) => {
      maybeThrow('onTestEnd');
      events.push({ type: 'onTestEnd', testId, status, duration });
    }),
    onStepExecuted: vi.fn().mockImplementation(async (step: StepInfo) => {
      maybeThrow('onStepExecuted');
      events.push({ type: 'onStepExecuted', step });
    }),
    onError: vi.fn().mockImplementation(async (error: Error, context: ErrorContext) => {
      maybeThrow('onError');
      events.push({ type: 'onError', error, context });
    }),
    flush: vi.fn().mockImplementation(async () => {
      maybeThrow('flush');
      events.push({ type: 'flush' });
    }),
    dispose: vi.fn().mockImplementation(async () => {
      maybeThrow('dispose');
      events.push({ type: 'dispose' });
    }),
  };
}

/**
 * Create a mock StepInfo for testing.
 */
function createMockStepInfo(overrides: Partial<StepInfo> = {}): StepInfo {
  return {
    id: 'step-123',
    text: 'Click login button',
    type: 'When',
    status: 'passed',
    duration: 250,
    ...overrides,
  };
}

/**
 * Create a mock ErrorContext for testing.
 */
function createMockErrorContext(overrides: Partial<ErrorContext> = {}): ErrorContext {
  return {
    testId: 'test-123',
    pageUrl: 'http://example.com',
    ...overrides,
  };
}

/**
 * Arbitrary for generating valid plugin names.
 */
const pluginNameArb = fc.string({ minLength: 1, maxLength: 30 })
  .filter(s => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s));

/**
 * Arbitrary for generating valid plugin versions.
 */
const pluginVersionArb = fc.tuple(
  fc.integer({ min: 0, max: 99 }),
  fc.integer({ min: 0, max: 99 }),
  fc.integer({ min: 0, max: 99 })
).map(([major, minor, patch]) => `${major}.${minor}.${patch}`);

/**
 * Arbitrary for generating unique plugin names.
 */
const uniquePluginNamesArb = (minLength: number, maxLength: number) =>
  fc.array(pluginNameArb, { minLength, maxLength })
    .map(names => [...new Set(names)])
    .filter(names => names.length >= minLength);

/**
 * Arbitrary for generating test IDs.
 */
const testIdArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => /^[a-zA-Z0-9_-]+$/.test(s));

/**
 * Arbitrary for generating test names.
 */
const testNameArb = fc.string({ minLength: 1, maxLength: 100 });

/**
 * Arbitrary for generating test status.
 */
const testStatusArb = fc.constantFrom<TestStatus>('passed', 'failed', 'skipped', 'pending');

/**
 * Arbitrary for generating test duration in milliseconds.
 */
const durationArb = fc.integer({ min: 0, max: 300000 });

/**
 * Arbitrary for generating step types.
 */
const stepTypeArb = fc.constantFrom<StepInfo['type']>('Given', 'When', 'Then', 'And', 'But');

/**
 * Arbitrary for generating step info.
 */
const stepInfoArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  text: fc.string({ minLength: 1, maxLength: 100 }),
  type: stepTypeArb,
  status: testStatusArb,
  duration: durationArb,
});

/**
 * Arbitrary for generating lifecycle methods that can throw.
 */
const lifecycleMethodArb = fc.constantFrom(
  'onTestStart',
  'onTestEnd',
  'onStepExecuted',
  'onError',
  'flush',
  'dispose'
);

/**
 * Arbitrary for generating number of plugins (1-10).
 */
const pluginCountArb = fc.integer({ min: 1, max: 10 });

describe('Property 52: Plugin Lifecycle Management', () => {
  let logger: StructuredLogger;
  let pluginManager: PluginManagerImpl;

  beforeEach(() => {
    logger = createMockLogger();
    pluginManager = new PluginManagerImpl(logger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Lifecycle Order Invariant', () => {
    it('should call onTestStart before onTestEnd for each test', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          testIdArb,
          testNameArb,
          testStatusArb,
          durationArb,
          async (pluginName, testId, testName, status, duration) => {
            const plugin = createTrackingPlugin(pluginName);
            pluginManager.register(plugin);

            // Execute lifecycle in correct order
            await pluginManager.notifyTestStart(testId, testName);
            await pluginManager.notifyTestEnd(testId, status, duration);

            // Verify order
            const events = plugin.events;
            expect(events.length).toBe(2);
            expect(events[0].type).toBe('onTestStart');
            expect(events[1].type).toBe('onTestEnd');

            // Verify data integrity
            const startEvent = events[0] as { type: 'onTestStart'; testId: string; testName: string };
            const endEvent = events[1] as { type: 'onTestEnd'; testId: string; status: TestStatus; duration: number };
            
            expect(startEvent.testId).toBe(testId);
            expect(startEvent.testName).toBe(testName);
            expect(endEvent.testId).toBe(testId);
            expect(endEvent.status).toBe(status);
            expect(endEvent.duration).toBe(duration);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should call onStepExecuted between onTestStart and onTestEnd', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          testIdArb,
          testNameArb,
          fc.array(stepInfoArb, { minLength: 1, maxLength: 10 }),
          testStatusArb,
          durationArb,
          async (pluginName, testId, testName, steps, status, duration) => {
            const plugin = createTrackingPlugin(pluginName);
            pluginManager.register(plugin);

            // Execute lifecycle with steps
            await pluginManager.notifyTestStart(testId, testName);
            for (const step of steps) {
              await pluginManager.notifyStepExecuted(step as StepInfo);
            }
            await pluginManager.notifyTestEnd(testId, status, duration);

            // Verify order
            const events = plugin.events;
            expect(events.length).toBe(2 + steps.length);
            
            // First event should be onTestStart
            expect(events[0].type).toBe('onTestStart');
            
            // Middle events should be onStepExecuted
            for (let i = 1; i <= steps.length; i++) {
              expect(events[i].type).toBe('onStepExecuted');
            }
            
            // Last event should be onTestEnd
            expect(events[events.length - 1].type).toBe('onTestEnd');
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should call flush before dispose during cleanup', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          async (pluginName) => {
            const plugin = createTrackingPlugin(pluginName);
            pluginManager.register(plugin);

            // Execute cleanup lifecycle
            await pluginManager.flushAll();
            await pluginManager.disposeAll();

            // Verify order
            const events = plugin.events;
            expect(events.length).toBe(2);
            expect(events[0].type).toBe('flush');
            expect(events[1].type).toBe('dispose');
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Plugin Error Isolation', () => {
    it('should continue notifying other plugins when one plugin throws on onTestStart', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniquePluginNamesArb(2, 5),
          fc.integer({ min: 0, max: 4 }).chain(failingIndex => 
            fc.constant(failingIndex)
          ),
          testIdArb,
          testNameArb,
          async (pluginNames, failingIndexRaw, testId, testName) => {
            const failingIndex = failingIndexRaw % pluginNames.length;
            
            // Create plugins, one of which will throw
            const plugins = pluginNames.map((name, index) => 
              createTrackingPlugin(name, '1.0.0', 
                index === failingIndex ? { throwOnMethod: 'onTestStart' } : {}
              )
            );

            // Register all plugins
            plugins.forEach(plugin => pluginManager.register(plugin));

            // Should not throw even though one plugin fails
            await expect(
              pluginManager.notifyTestStart(testId, testName)
            ).resolves.not.toThrow();

            // All non-failing plugins should have received the event
            plugins.forEach((plugin, index) => {
              if (index !== failingIndex) {
                expect(plugin.events.some(e => e.type === 'onTestStart')).toBe(true);
              }
            });

            // Logger should have warned about the failure
            expect(logger.warn).toHaveBeenCalled();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should continue notifying other plugins when one plugin throws on onTestEnd', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniquePluginNamesArb(2, 5),
          fc.integer({ min: 0, max: 4 }),
          testIdArb,
          testStatusArb,
          durationArb,
          async (pluginNames, failingIndexRaw, testId, status, duration) => {
            const failingIndex = failingIndexRaw % pluginNames.length;
            
            const plugins = pluginNames.map((name, index) => 
              createTrackingPlugin(name, '1.0.0', 
                index === failingIndex ? { throwOnMethod: 'onTestEnd' } : {}
              )
            );

            plugins.forEach(plugin => pluginManager.register(plugin));

            await expect(
              pluginManager.notifyTestEnd(testId, status, duration)
            ).resolves.not.toThrow();

            plugins.forEach((plugin, index) => {
              if (index !== failingIndex) {
                expect(plugin.events.some(e => e.type === 'onTestEnd')).toBe(true);
              }
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should continue notifying other plugins when one plugin throws on onStepExecuted', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniquePluginNamesArb(2, 5),
          fc.integer({ min: 0, max: 4 }),
          stepInfoArb,
          async (pluginNames, failingIndexRaw, step) => {
            const failingIndex = failingIndexRaw % pluginNames.length;
            
            const plugins = pluginNames.map((name, index) => 
              createTrackingPlugin(name, '1.0.0', 
                index === failingIndex ? { throwOnMethod: 'onStepExecuted' } : {}
              )
            );

            plugins.forEach(plugin => pluginManager.register(plugin));

            await expect(
              pluginManager.notifyStepExecuted(step as StepInfo)
            ).resolves.not.toThrow();

            plugins.forEach((plugin, index) => {
              if (index !== failingIndex) {
                expect(plugin.events.some(e => e.type === 'onStepExecuted')).toBe(true);
              }
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should continue notifying other plugins when one plugin throws on onError', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniquePluginNamesArb(2, 5),
          fc.integer({ min: 0, max: 4 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (pluginNames, failingIndexRaw, errorMessage) => {
            const failingIndex = failingIndexRaw % pluginNames.length;
            
            const plugins = pluginNames.map((name, index) => 
              createTrackingPlugin(name, '1.0.0', 
                index === failingIndex ? { throwOnMethod: 'onError' } : {}
              )
            );

            plugins.forEach(plugin => pluginManager.register(plugin));

            const testError = new Error(errorMessage);
            const context = createMockErrorContext();

            await expect(
              pluginManager.notifyError(testError, context)
            ).resolves.not.toThrow();

            plugins.forEach((plugin, index) => {
              if (index !== failingIndex) {
                expect(plugin.events.some(e => e.type === 'onError')).toBe(true);
              }
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should continue flushing other plugins when one plugin throws on flush', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniquePluginNamesArb(2, 5),
          fc.integer({ min: 0, max: 4 }),
          async (pluginNames, failingIndexRaw) => {
            const failingIndex = failingIndexRaw % pluginNames.length;
            
            const plugins = pluginNames.map((name, index) => 
              createTrackingPlugin(name, '1.0.0', 
                index === failingIndex ? { throwOnMethod: 'flush' } : {}
              )
            );

            plugins.forEach(plugin => pluginManager.register(plugin));

            await expect(pluginManager.flushAll()).resolves.not.toThrow();

            plugins.forEach((plugin, index) => {
              if (index !== failingIndex) {
                expect(plugin.events.some(e => e.type === 'flush')).toBe(true);
              }
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should continue disposing other plugins when one plugin throws on dispose', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniquePluginNamesArb(2, 5),
          fc.integer({ min: 0, max: 4 }),
          async (pluginNames, failingIndexRaw) => {
            const failingIndex = failingIndexRaw % pluginNames.length;
            
            const plugins = pluginNames.map((name, index) => 
              createTrackingPlugin(name, '1.0.0', 
                index === failingIndex ? { throwOnMethod: 'dispose' } : {}
              )
            );

            plugins.forEach(plugin => pluginManager.register(plugin));

            await expect(pluginManager.disposeAll()).resolves.not.toThrow();

            plugins.forEach((plugin, index) => {
              if (index !== failingIndex) {
                expect(plugin.events.some(e => e.type === 'dispose')).toBe(true);
              }
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle multiple plugins throwing errors simultaneously', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniquePluginNamesArb(3, 6),
          fc.array(fc.boolean(), { minLength: 3, maxLength: 6 }),
          testIdArb,
          testNameArb,
          async (pluginNames, shouldThrowFlags, testId, testName) => {
            // Ensure at least one plugin doesn't throw
            const adjustedFlags = shouldThrowFlags.slice(0, pluginNames.length);
            if (adjustedFlags.every(f => f)) {
              adjustedFlags[0] = false;
            }

            const plugins = pluginNames.map((name, index) => 
              createTrackingPlugin(name, '1.0.0', 
                adjustedFlags[index] ? { throwOnMethod: 'onTestStart' } : {}
              )
            );

            plugins.forEach(plugin => pluginManager.register(plugin));

            await expect(
              pluginManager.notifyTestStart(testId, testName)
            ).resolves.not.toThrow();

            // Non-throwing plugins should have received the event
            plugins.forEach((plugin, index) => {
              if (!adjustedFlags[index]) {
                expect(plugin.events.some(e => e.type === 'onTestStart')).toBe(true);
              }
            });
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Plugin Registration Idempotence', () => {
    it('should replace existing plugin when registering with same name', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          pluginVersionArb,
          pluginVersionArb,
          async (pluginName, version1, version2) => {
            // Create fresh plugin manager for each property test run
            const localLogger = createMockLogger();
            const localManager = new PluginManagerImpl(localLogger);
            
            const plugin1 = createTrackingPlugin(pluginName, version1);
            const plugin2 = createTrackingPlugin(pluginName, version2);

            localManager.register(plugin1);
            expect(localManager.size).toBe(1);
            expect(localManager.get(pluginName)).toBe(plugin1);

            localManager.register(plugin2);
            expect(localManager.size).toBe(1);
            expect(localManager.get(pluginName)).toBe(plugin2);
            expect(localManager.get(pluginName)).not.toBe(plugin1);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should maintain plugin count after re-registration', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniquePluginNamesArb(2, 5),
          fc.integer({ min: 0, max: 4 }),
          async (pluginNames, reregisterIndexRaw) => {
            // Create fresh plugin manager for each property test run
            const localLogger = createMockLogger();
            const localManager = new PluginManagerImpl(localLogger);
            
            const reregisterIndex = reregisterIndexRaw % pluginNames.length;
            
            // Register all plugins
            const plugins = pluginNames.map(name => createTrackingPlugin(name));
            plugins.forEach(plugin => localManager.register(plugin));
            
            const initialCount = localManager.size;
            expect(initialCount).toBe(pluginNames.length);

            // Re-register one plugin
            const newPlugin = createTrackingPlugin(pluginNames[reregisterIndex], '2.0.0');
            localManager.register(newPlugin);

            // Count should remain the same
            expect(localManager.size).toBe(initialCount);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should log warning when replacing existing plugin', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          async (pluginName) => {
            // Create fresh plugin manager for each property test run
            const localLogger = createMockLogger();
            const localManager = new PluginManagerImpl(localLogger);
            
            const plugin1 = createTrackingPlugin(pluginName, '1.0.0');
            const plugin2 = createTrackingPlugin(pluginName, '2.0.0');

            localManager.register(plugin1);
            
            localManager.register(plugin2);

            expect(localLogger.warn).toHaveBeenCalledWith(
              'Plugin already registered, replacing',
              expect.objectContaining({ pluginName })
            );
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Broadcast Completeness', () => {
    it('should notify all registered plugins of onTestStart', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniquePluginNamesArb(1, 10),
          testIdArb,
          testNameArb,
          async (pluginNames, testId, testName) => {
            const plugins = pluginNames.map(name => createTrackingPlugin(name));
            plugins.forEach(plugin => pluginManager.register(plugin));

            await pluginManager.notifyTestStart(testId, testName);

            // All plugins should have received the event
            plugins.forEach(plugin => {
              expect(plugin.events.length).toBe(1);
              expect(plugin.events[0].type).toBe('onTestStart');
              const event = plugin.events[0] as { type: 'onTestStart'; testId: string; testName: string };
              expect(event.testId).toBe(testId);
              expect(event.testName).toBe(testName);
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should notify all registered plugins of onTestEnd', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniquePluginNamesArb(1, 10),
          testIdArb,
          testStatusArb,
          durationArb,
          async (pluginNames, testId, status, duration) => {
            const plugins = pluginNames.map(name => createTrackingPlugin(name));
            plugins.forEach(plugin => pluginManager.register(plugin));

            await pluginManager.notifyTestEnd(testId, status, duration);

            plugins.forEach(plugin => {
              expect(plugin.events.length).toBe(1);
              expect(plugin.events[0].type).toBe('onTestEnd');
              const event = plugin.events[0] as { type: 'onTestEnd'; testId: string; status: TestStatus; duration: number };
              expect(event.testId).toBe(testId);
              expect(event.status).toBe(status);
              expect(event.duration).toBe(duration);
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should notify all registered plugins of onStepExecuted', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniquePluginNamesArb(1, 10),
          stepInfoArb,
          async (pluginNames, step) => {
            const plugins = pluginNames.map(name => createTrackingPlugin(name));
            plugins.forEach(plugin => pluginManager.register(plugin));

            await pluginManager.notifyStepExecuted(step as StepInfo);

            plugins.forEach(plugin => {
              expect(plugin.events.length).toBe(1);
              expect(plugin.events[0].type).toBe('onStepExecuted');
              const event = plugin.events[0] as { type: 'onStepExecuted'; step: StepInfo };
              expect(event.step).toEqual(step);
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should notify all registered plugins of onError', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniquePluginNamesArb(1, 10),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (pluginNames, errorMessage) => {
            const plugins = pluginNames.map(name => createTrackingPlugin(name));
            plugins.forEach(plugin => pluginManager.register(plugin));

            const testError = new Error(errorMessage);
            const context = createMockErrorContext();

            await pluginManager.notifyError(testError, context);

            plugins.forEach(plugin => {
              expect(plugin.events.length).toBe(1);
              expect(plugin.events[0].type).toBe('onError');
              const event = plugin.events[0] as { type: 'onError'; error: Error; context: ErrorContext };
              expect(event.error).toBe(testError);
              expect(event.context).toBe(context);
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should flush all registered plugins', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniquePluginNamesArb(1, 10),
          async (pluginNames) => {
            const plugins = pluginNames.map(name => createTrackingPlugin(name));
            plugins.forEach(plugin => pluginManager.register(plugin));

            await pluginManager.flushAll();

            plugins.forEach(plugin => {
              expect(plugin.events.length).toBe(1);
              expect(plugin.events[0].type).toBe('flush');
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should dispose all registered plugins and clear registry', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniquePluginNamesArb(1, 10),
          async (pluginNames) => {
            const plugins = pluginNames.map(name => createTrackingPlugin(name));
            plugins.forEach(plugin => pluginManager.register(plugin));

            expect(pluginManager.size).toBe(pluginNames.length);

            await pluginManager.disposeAll();

            // All plugins should have received dispose event
            plugins.forEach(plugin => {
              expect(plugin.events.some(e => e.type === 'dispose')).toBe(true);
            });

            // Registry should be cleared
            expect(pluginManager.size).toBe(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Complete Test Execution Sequence', () => {
    it('should handle complete test execution lifecycle for any number of plugins', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniquePluginNamesArb(1, 10),
          testIdArb,
          testNameArb,
          fc.array(stepInfoArb, { minLength: 0, maxLength: 5 }),
          testStatusArb,
          durationArb,
          async (pluginNames, testId, testName, steps, status, duration) => {
            const plugins = pluginNames.map(name => createTrackingPlugin(name));
            plugins.forEach(plugin => pluginManager.register(plugin));

            // Execute complete test lifecycle
            await pluginManager.notifyTestStart(testId, testName);
            for (const step of steps) {
              await pluginManager.notifyStepExecuted(step as StepInfo);
            }
            await pluginManager.notifyTestEnd(testId, status, duration);
            await pluginManager.flushAll();

            // Verify each plugin received all events in correct order
            plugins.forEach(plugin => {
              const events = plugin.events;
              const expectedLength = 2 + steps.length + 1; // start + steps + end + flush
              expect(events.length).toBe(expectedLength);

              // Verify order
              expect(events[0].type).toBe('onTestStart');
              for (let i = 1; i <= steps.length; i++) {
                expect(events[i].type).toBe('onStepExecuted');
              }
              expect(events[steps.length + 1].type).toBe('onTestEnd');
              expect(events[steps.length + 2].type).toBe('flush');
            });
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle test execution with errors for any number of plugins', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniquePluginNamesArb(1, 10),
          testIdArb,
          testNameArb,
          fc.string({ minLength: 1, maxLength: 50 }),
          async (pluginNames, testId, testName, errorMessage) => {
            const plugins = pluginNames.map(name => createTrackingPlugin(name));
            plugins.forEach(plugin => pluginManager.register(plugin));

            const testError = new Error(errorMessage);
            const context = createMockErrorContext({ testId });

            // Execute test lifecycle with error
            await pluginManager.notifyTestStart(testId, testName);
            await pluginManager.notifyError(testError, context);
            await pluginManager.notifyTestEnd(testId, 'failed', 1000);

            // Verify each plugin received all events
            plugins.forEach(plugin => {
              const events = plugin.events;
              expect(events.length).toBe(3);
              expect(events[0].type).toBe('onTestStart');
              expect(events[1].type).toBe('onError');
              expect(events[2].type).toBe('onTestEnd');
            });
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Plugin Retrieval', () => {
    it('should retrieve registered plugins by name', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniquePluginNamesArb(1, 10),
          async (pluginNames) => {
            // Create fresh plugin manager for each property test run
            const localLogger = createMockLogger();
            const localManager = new PluginManagerImpl(localLogger);
            
            const plugins = pluginNames.map(name => createTrackingPlugin(name));
            plugins.forEach(plugin => localManager.register(plugin));

            // Each plugin should be retrievable by name
            plugins.forEach((plugin, index) => {
              const retrieved = localManager.get(pluginNames[index]);
              expect(retrieved).toBe(plugin);
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should return undefined for non-existent plugin names', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniquePluginNamesArb(1, 5),
          pluginNameArb,
          async (registeredNames, queryName) => {
            // Only test if queryName is not in registeredNames
            if (registeredNames.includes(queryName)) {
              return; // Skip this case
            }

            // Create fresh plugin manager for each property test run
            const localLogger = createMockLogger();
            const localManager = new PluginManagerImpl(localLogger);

            const plugins = registeredNames.map(name => createTrackingPlugin(name));
            plugins.forEach(plugin => localManager.register(plugin));

            const retrieved = localManager.get(queryName);
            expect(retrieved).toBeUndefined();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should return all plugin names via getPluginNames', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniquePluginNamesArb(1, 10),
          async (pluginNames) => {
            // Create fresh plugin manager for each property test run
            const localLogger = createMockLogger();
            const localManager = new PluginManagerImpl(localLogger);
            
            const plugins = pluginNames.map(name => createTrackingPlugin(name));
            plugins.forEach(plugin => localManager.register(plugin));

            const retrievedNames = localManager.getPluginNames();
            
            // Should have same length
            expect(retrievedNames.length).toBe(pluginNames.length);
            
            // Should contain all registered names
            pluginNames.forEach(name => {
              expect(retrievedNames).toContain(name);
            });
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Empty Plugin Manager', () => {
    it('should handle lifecycle events with no registered plugins', async () => {
      await fc.assert(
        fc.asyncProperty(
          testIdArb,
          testNameArb,
          testStatusArb,
          durationArb,
          async (testId, testName, status, duration) => {
            // Create fresh plugin manager for each property test run
            const localLogger = createMockLogger();
            const localManager = new PluginManagerImpl(localLogger);
            
            // No plugins registered
            expect(localManager.size).toBe(0);

            // All lifecycle methods should complete without error
            await expect(localManager.notifyTestStart(testId, testName)).resolves.not.toThrow();
            await expect(localManager.notifyStepExecuted(createMockStepInfo())).resolves.not.toThrow();
            await expect(localManager.notifyTestEnd(testId, status, duration)).resolves.not.toThrow();
            await expect(localManager.notifyError(new Error('test'), createMockErrorContext())).resolves.not.toThrow();
            await expect(localManager.flushAll()).resolves.not.toThrow();
            await expect(localManager.disposeAll()).resolves.not.toThrow();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

describe('createPluginManager factory', () => {
  it('should create a new PluginManager instance with provided logger', () => {
    const logger = createMockLogger();
    const manager = createPluginManager(logger);
    
    expect(manager).toBeInstanceOf(PluginManagerImpl);
    expect(manager.size).toBe(0);
  });
});
