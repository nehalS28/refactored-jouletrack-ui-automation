/**
 * Property-based tests for MorpheusPlugin.
 * Tests Property 59: Morpheus Development-Time Only
 * 
 * **Validates: Requirements 19.1, 19.8**
 * 
 * @module plugins/morpheus/morpheus-plugin.property.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { MorpheusPlugin, type MorpheusPluginConfig } from './morpheus-plugin.js';
import type { StructuredLogger, TestStatus, StepInfo, ErrorContext } from '../../types/context.types.js';

describe('Property 59: Morpheus Development-Time Only', () => {
  let mockLogger: StructuredLogger;
  let config: MorpheusPluginConfig;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    // Save original fetch
    originalFetch = global.fetch;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as StructuredLogger;

    config = {
      enabled: true,
      endpoint: 'http://localhost:3000/morpheus',
      timeout: 5000,
    };

    // Mock fetch to prevent actual network calls
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        found: true,
        matches: [],
        suggestions: [],
      }),
    });
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  /**
   * Property 59: Morpheus Development-Time Only
   * 
   * For any test execution, the Morpheus plugin should NOT make network calls
   * or block test execution. Morpheus queries should only occur via CLI commands.
   */
  it('should NOT make network calls during test lifecycle methods', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // testId
        fc.string({ minLength: 1, maxLength: 100 }), // testName
        fc.constantFrom('passed', 'failed', 'skipped', 'pending'), // status
        fc.integer({ min: 0, max: 10000 }), // duration
        async (testId, testName, status, duration) => {
          const plugin = new MorpheusPlugin(config, mockLogger);
          const fetchMock = vi.mocked(global.fetch);
          
          await plugin.initialize();
          fetchMock.mockClear();

          // Execute test lifecycle
          await plugin.onTestStart(testId, testName);
          await plugin.onTestEnd(testId, status as TestStatus, duration);

          // Verify NO network calls were made during test execution
          expect(fetchMock).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should NOT make network calls during step execution', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // stepId
        fc.string({ minLength: 1, maxLength: 200 }), // stepText
        fc.constantFrom('Given', 'When', 'Then', 'And', 'But'), // stepType
        fc.constantFrom('passed', 'failed', 'skipped', 'pending'), // status
        fc.integer({ min: 0, max: 5000 }), // duration
        async (stepId, stepText, stepType, status, duration) => {
          const plugin = new MorpheusPlugin(config, mockLogger);
          const fetchMock = vi.mocked(global.fetch);
          
          await plugin.initialize();
          fetchMock.mockClear();

          const step: StepInfo = {
            id: stepId,
            text: stepText,
            type: stepType as 'Given' | 'When' | 'Then' | 'And' | 'But',
            status: status as TestStatus,
            duration,
          };

          await plugin.onStepExecuted(step);

          // Verify NO network calls during step execution
          expect(fetchMock).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should NOT make network calls during error handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }), // error message
        fc.string({ minLength: 1, maxLength: 50 }), // testId
        async (errorMessage, testId) => {
          const plugin = new MorpheusPlugin(config, mockLogger);
          const fetchMock = vi.mocked(global.fetch);
          
          await plugin.initialize();
          fetchMock.mockClear();

          const error = new Error(errorMessage);
          const context: ErrorContext = { testId };

          await plugin.onError(error, context);

          // Verify NO network calls during error handling
          expect(fetchMock).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should NOT make network calls during flush and dispose', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null), // No input needed
        async () => {
          const plugin = new MorpheusPlugin(config, mockLogger);
          const fetchMock = vi.mocked(global.fetch);
          
          await plugin.initialize();
          fetchMock.mockClear();

          await plugin.flush();
          await plugin.dispose();

          // Verify NO network calls during cleanup
          expect(fetchMock).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should ONLY make network calls via explicit CLI methods', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 5 }), // selectors
        async (selectors) => {
          const plugin = new MorpheusPlugin(config, mockLogger);
          const fetchMock = vi.mocked(global.fetch);
          
          await plugin.initialize();
          fetchMock.mockClear();

          // Call CLI method (validateSelectors)
          await plugin.validateSelectors(selectors);

          // Verify network calls ONLY happen via CLI methods
          expect(fetchMock).toHaveBeenCalled();
          expect(fetchMock).toHaveBeenCalledTimes(selectors.length);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should maintain query log without blocking test execution', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 3 }), // selectors
        fc.string({ minLength: 1, maxLength: 50 }), // testId
        fc.string({ minLength: 1, maxLength: 100 }), // testName
        async (selectors, testId, testName) => {
          const plugin = new MorpheusPlugin(config, mockLogger);
          
          await plugin.initialize();

          // Execute test lifecycle (should not affect query log)
          await plugin.onTestStart(testId, testName);
          await plugin.onTestEnd(testId, 'passed', 1000);

          const logBeforeQueries = plugin.getQueryLog();
          expect(logBeforeQueries).toHaveLength(0);

          // Execute CLI queries
          await plugin.validateSelectors(selectors);

          const logAfterQueries = plugin.getQueryLog();
          expect(logAfterQueries).toHaveLength(selectors.length);

          // Verify query log entries
          for (let i = 0; i < selectors.length; i++) {
            expect(logAfterQueries[i].query).toBe(selectors[i]);
            expect(logAfterQueries[i].type).toBe('selector');
            expect(logAfterQueries[i].timestamp).toBeInstanceOf(Date);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should never block or delay test execution regardless of Morpheus availability', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // testId
        fc.string({ minLength: 1, maxLength: 100 }), // testName
        fc.integer({ min: 0, max: 1000 }), // duration
        async (testId, testName, duration) => {
          // Simulate Morpheus being unavailable
          global.fetch = vi.fn().mockRejectedValue(new Error('Morpheus unavailable'));

          const plugin = new MorpheusPlugin(config, mockLogger);
          await plugin.initialize();

          const startTime = Date.now();

          // Execute test lifecycle
          await plugin.onTestStart(testId, testName);
          await plugin.onTestEnd(testId, 'passed', duration);

          const executionTime = Date.now() - startTime;

          // Verify test execution was not blocked (should be nearly instant)
          expect(executionTime).toBeLessThan(100); // Less than 100ms
        }
      ),
      { numRuns: 10 }
    );
  });
});
