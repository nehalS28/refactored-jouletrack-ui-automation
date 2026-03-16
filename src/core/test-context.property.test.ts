/**
 * Property-based tests for Worker-Scoped Context Isolation.
 * 
 * **Property 50: Worker-Scoped Context Isolation**
 * **Validates: Requirements 15.2**
 * 
 * Tests that parallel contexts have no shared mutable state and
 * that each worker has unique correlation IDs.
 * 
 * @module core/test-context.property.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { TestContextFactory } from './test-context.js';
import type { FrameworkConfig, TestContext } from '../types/index.js';

/**
 * Create a minimal valid FrameworkConfig for testing.
 */
function createTestConfig(overrides: Partial<FrameworkConfig> = {}): FrameworkConfig {
  return {
    environment: 'local',
    baseUrl: 'http://localhost:3000',
    browser: {
      name: 'chrome',
      headless: true,
      windowSize: { width: 1920, height: 1080 },
      args: [],
    },
    timeouts: {
      implicit: 0,
      explicit: 10000,
      pageLoad: 30000,
      script: 30000,
      polling: 500,
    },
    retry: {
      maxAttempts: 3,
      backoffMs: 1000,
      backoffMultiplier: 2,
    },
    parallel: {
      enabled: false,
      workers: 1,
    },
    logging: {
      level: 'info',
      structured: true,
    },
    ...overrides,
  };
}

/**
 * Reserved property names that should not be used as worker IDs.
 */
const RESERVED_NAMES = new Set([
  'length', 'name', 'prototype', 'constructor', '__proto__',
  'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf',
  'propertyIsEnumerable', 'toLocaleString'
]);

/**
 * Arbitrary for generating valid worker IDs.
 * Worker IDs should be alphanumeric with optional dashes/underscores.
 * Excludes reserved JavaScript property names.
 */
const workerIdArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s))
  .filter(s => !RESERVED_NAMES.has(s));

/**
 * Arbitrary for generating a list of unique worker IDs.
 */
const uniqueWorkerIdsArb = (minLength: number, maxLength: number) =>
  fc.array(workerIdArb, { minLength, maxLength })
    .map(ids => [...new Set(ids)])
    .filter(ids => ids.length >= minLength);

/**
 * Arbitrary for generating a number of parallel workers.
 */
const workerCountArb = fc.integer({ min: 2, max: 10 });

describe('Property 50: Worker-Scoped Context Isolation', () => {
  let factory: TestContextFactory;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Use placeholder driver to avoid real browser initialization
    factory = new TestContextFactory(createTestConfig(), { usePlaceholderDriver: true });
    // Suppress console output during tests
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Unique Context IDs', () => {
    it('should generate unique context IDs for any number of parallel workers', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueWorkerIdsArb(2, 8),
          async (workerIds) => {
            // Create contexts for all workers in parallel
            const contexts = await Promise.all(
              workerIds.map(workerId => factory.create(workerId))
            );

            try {
              // Collect all context IDs
              const contextIds = contexts.map(ctx => ctx.id);

              // All context IDs should be unique
              const uniqueIds = new Set(contextIds);
              expect(uniqueIds.size).toBe(contextIds.length);

              // Each context ID should contain its worker ID
              for (let i = 0; i < contexts.length; i++) {
                expect(contexts[i].id).toContain(workerIds[i]);
              }
            } finally {
              // Clean up all contexts
              await Promise.all(contexts.map(ctx => factory.dispose(ctx)));
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should generate unique context IDs even for the same worker ID called multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(
          workerIdArb,
          fc.integer({ min: 2, max: 5 }),
          async (workerId, count) => {
            const contexts: TestContext[] = [];

            try {
              // Create multiple contexts for the same worker ID sequentially
              // with small delays to ensure different timestamps
              for (let i = 0; i < count; i++) {
                const ctx = await factory.create(workerId);
                contexts.push(ctx);
                // Small delay to ensure different timestamps
                await new Promise(resolve => setTimeout(resolve, 2));
              }

              // All context IDs should be unique
              const contextIds = contexts.map(ctx => ctx.id);
              const uniqueIds = new Set(contextIds);
              expect(uniqueIds.size).toBe(count);
            } finally {
              // Clean up all contexts
              await Promise.all(contexts.map(ctx => factory.dispose(ctx)));
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Unique Correlation IDs', () => {
    it('should generate unique correlation IDs for any number of parallel workers', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueWorkerIdsArb(2, 8),
          async (workerIds) => {
            // Create contexts for all workers in parallel
            const contexts = await Promise.all(
              workerIds.map(workerId => factory.create(workerId))
            );

            try {
              // Collect all correlation IDs
              const correlationIds = contexts.map(ctx => ctx.correlationId);

              // All correlation IDs should be unique
              const uniqueCorrelationIds = new Set(correlationIds);
              expect(uniqueCorrelationIds.size).toBe(correlationIds.length);

              // Each correlation ID should contain its worker ID
              for (let i = 0; i < contexts.length; i++) {
                expect(contexts[i].correlationId).toContain(workerIds[i]);
              }
            } finally {
              // Clean up all contexts
              await Promise.all(contexts.map(ctx => factory.dispose(ctx)));
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should generate correlation IDs with expected format', async () => {
      await fc.assert(
        fc.asyncProperty(
          workerIdArb,
          async (workerId) => {
            const context = await factory.create(workerId);

            try {
              // Correlation ID should match expected format: corr-{workerId}-{timestamp}-{random}
              const correlationIdPattern = new RegExp(`^corr-${workerId}-\\d+-[a-z0-9]+$`);
              expect(context.correlationId).toMatch(correlationIdPattern);
            } finally {
              await factory.dispose(context);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('No Shared Mutable State', () => {
    it('should create independent driver instances for each context', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueWorkerIdsArb(2, 5),
          async (workerIds) => {
            const contexts = await Promise.all(
              workerIds.map(workerId => factory.create(workerId))
            );

            try {
              // All driver instances should be different objects
              for (let i = 0; i < contexts.length; i++) {
                for (let j = i + 1; j < contexts.length; j++) {
                  expect(contexts[i].driver).not.toBe(contexts[j].driver);
                }
              }
            } finally {
              await Promise.all(contexts.map(ctx => factory.dispose(ctx)));
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should create independent logger instances for each context', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueWorkerIdsArb(2, 5),
          async (workerIds) => {
            const contexts = await Promise.all(
              workerIds.map(workerId => factory.create(workerId))
            );

            try {
              // All logger instances should be different objects
              for (let i = 0; i < contexts.length; i++) {
                for (let j = i + 1; j < contexts.length; j++) {
                  expect(contexts[i].logger).not.toBe(contexts[j].logger);
                }
              }
            } finally {
              await Promise.all(contexts.map(ctx => factory.dispose(ctx)));
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should create independent action helper instances for each context', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueWorkerIdsArb(2, 5),
          async (workerIds) => {
            const contexts = await Promise.all(
              workerIds.map(workerId => factory.create(workerId))
            );

            try {
              // All action helper instances should be different objects
              for (let i = 0; i < contexts.length; i++) {
                for (let j = i + 1; j < contexts.length; j++) {
                  expect(contexts[i].actions).not.toBe(contexts[j].actions);
                }
              }
            } finally {
              await Promise.all(contexts.map(ctx => factory.dispose(ctx)));
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should create independent wait strategy instances for each context', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueWorkerIdsArb(2, 5),
          async (workerIds) => {
            const contexts = await Promise.all(
              workerIds.map(workerId => factory.create(workerId))
            );

            try {
              // All wait strategy instances should be different objects
              for (let i = 0; i < contexts.length; i++) {
                for (let j = i + 1; j < contexts.length; j++) {
                  expect(contexts[i].wait).not.toBe(contexts[j].wait);
                }
              }
            } finally {
              await Promise.all(contexts.map(ctx => factory.dispose(ctx)));
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should create independent plugin manager instances for each context', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueWorkerIdsArb(2, 5),
          async (workerIds) => {
            const contexts = await Promise.all(
              workerIds.map(workerId => factory.create(workerId))
            );

            try {
              // All plugin manager instances should be different objects
              for (let i = 0; i < contexts.length; i++) {
                for (let j = i + 1; j < contexts.length; j++) {
                  expect(contexts[i].plugins).not.toBe(contexts[j].plugins);
                }
              }
            } finally {
              await Promise.all(contexts.map(ctx => factory.dispose(ctx)));
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Context Immutability', () => {
    it('should create frozen context objects that cannot be modified', async () => {
      await fc.assert(
        fc.asyncProperty(
          workerIdArb,
          async (workerId) => {
            const context = await factory.create(workerId);

            try {
              // Context should be frozen
              expect(Object.isFrozen(context)).toBe(true);

              // Attempting to modify should throw
              expect(() => {
                (context as Record<string, unknown>).id = 'modified-id';
              }).toThrow();

              expect(() => {
                (context as Record<string, unknown>).newProperty = 'value';
              }).toThrow();

              expect(() => {
                delete (context as Record<string, unknown>).id;
              }).toThrow();
            } finally {
              await factory.dispose(context);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should create frozen config objects within contexts', async () => {
      await fc.assert(
        fc.asyncProperty(
          workerIdArb,
          async (workerId) => {
            const context = await factory.create(workerId);

            try {
              // Config should be frozen
              expect(Object.isFrozen(context.config)).toBe(true);
            } finally {
              await factory.dispose(context);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Worker ID Preservation', () => {
    it('should preserve the worker ID in the created context', async () => {
      await fc.assert(
        fc.asyncProperty(
          workerIdArb,
          async (workerId) => {
            const context = await factory.create(workerId);

            try {
              // Worker ID should be preserved exactly
              expect(context.workerId).toBe(workerId);
            } finally {
              await factory.dispose(context);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should include worker ID in context ID for traceability', async () => {
      await fc.assert(
        fc.asyncProperty(
          workerIdArb,
          async (workerId) => {
            const context = await factory.create(workerId);

            try {
              // Context ID should contain worker ID for traceability
              expect(context.id).toContain(workerId);
            } finally {
              await factory.dispose(context);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Parallel Context Creation Stress Test', () => {
    it('should handle concurrent context creation without conflicts', async () => {
      await fc.assert(
        fc.asyncProperty(
          workerCountArb,
          async (workerCount) => {
            // Generate unique worker IDs
            const workerIds = Array.from(
              { length: workerCount },
              (_, i) => `worker-${i}`
            );

            // Create all contexts concurrently
            const contexts = await Promise.all(
              workerIds.map(workerId => factory.create(workerId))
            );

            try {
              // Verify all contexts were created successfully
              expect(contexts.length).toBe(workerCount);

              // Verify all context IDs are unique
              const contextIds = new Set(contexts.map(ctx => ctx.id));
              expect(contextIds.size).toBe(workerCount);

              // Verify all correlation IDs are unique
              const correlationIds = new Set(contexts.map(ctx => ctx.correlationId));
              expect(correlationIds.size).toBe(workerCount);

              // Verify each context has the correct worker ID
              for (let i = 0; i < workerCount; i++) {
                expect(contexts[i].workerId).toBe(workerIds[i]);
              }
            } finally {
              // Clean up all contexts concurrently
              await Promise.all(contexts.map(ctx => factory.dispose(ctx)));
            }
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Context Disposal Independence', () => {
    it('should dispose contexts independently without affecting other contexts', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueWorkerIdsArb(3, 5),
          async (workerIds) => {
            const contexts = await Promise.all(
              workerIds.map(workerId => factory.create(workerId))
            );

            try {
              // Dispose the first context
              await factory.dispose(contexts[0]);

              // Other contexts should still be valid and accessible
              for (let i = 1; i < contexts.length; i++) {
                expect(contexts[i].id).toBeDefined();
                expect(contexts[i].workerId).toBe(workerIds[i]);
                expect(contexts[i].correlationId).toBeDefined();
              }
            } finally {
              // Clean up remaining contexts
              await Promise.all(
                contexts.slice(1).map(ctx => factory.dispose(ctx))
              );
            }
          }
        ),
        { numRuns: 15 }
      );
    });
  });
});
