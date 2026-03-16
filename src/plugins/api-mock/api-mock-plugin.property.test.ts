/**
 * Property-based tests for API Mock Isolation.
 * 
 * **Property 58: API Mock Isolation**
 * **Validates: Requirements 15.2**
 * 
 * Tests that mocks are cleared after each test to prevent interference
 * with subsequent tests.
 * 
 * @module plugins/api-mock/api-mock-plugin.property.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { ApiMockPlugin, type MockDefinition, type MockResponse } from './api-mock-plugin.js';
import type { StructuredLogger } from '../../types/context.types.js';
import type { TestStatus } from '../plugin.types.js';

// ============================================================================
// Arbitraries for generating test data
// ============================================================================

/**
 * Arbitrary for generating valid URL paths.
 */
const urlPathArb = fc.stringOf(
  fc.constantFrom('/', 'a', 'b', 'c', 'd', 'e', '1', '2', '3', '-', '_'),
  { minLength: 1, maxLength: 30 }
).map(s => `/api/${s.replace(/^\/+/, '')}`);

/**
 * Arbitrary for generating exact URL patterns (strings).
 */
const exactUrlPatternArb = urlPathArb;

/**
 * Arbitrary for generating regex URL patterns.
 */
const regexUrlPatternArb = fc.constantFrom(
  /^\/api\/users\/\d+$/,
  /^\/api\/items\/[a-z]+$/,
  /^\/api\/data\/.*/,
  /^\/api\/v\d+\/.*/
);

/**
 * Arbitrary for generating glob URL patterns.
 */
const globUrlPatternArb = fc.constantFrom(
  '/api/users/*',
  '/api/items/*/details',
  '/api/**',
  '/api/v1/**'
);


/**
 * Arbitrary for generating URL patterns (exact, regex, or glob).
 */
const urlPatternArb: fc.Arbitrary<string | RegExp> = fc.oneof(
  exactUrlPatternArb,
  regexUrlPatternArb,
  globUrlPatternArb
);

/**
 * Arbitrary for generating HTTP methods.
 */
const httpMethodArb = fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH');

/**
 * Arbitrary for generating HTTP methods with mixed case.
 */
const httpMethodMixedCaseArb = fc.constantFrom(
  'GET', 'get', 'Get',
  'POST', 'post', 'Post',
  'PUT', 'put', 'Put',
  'DELETE', 'delete', 'Delete',
  'PATCH', 'patch', 'Patch'
);

/**
 * Arbitrary for generating HTTP status codes.
 */
const httpStatusArb = fc.constantFrom(200, 201, 204, 400, 401, 403, 404, 500);

/**
 * Arbitrary for generating response bodies.
 */
const responseBodyArb = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.record({
    id: fc.integer({ min: 1, max: 1000 }),
    name: fc.string({ minLength: 1, maxLength: 20 }),
  }),
  fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 0, maxLength: 5 }),
  fc.record({
    success: fc.boolean(),
    data: fc.string({ minLength: 0, maxLength: 50 }),
  })
);

/**
 * Arbitrary for generating response headers.
 */
const responseHeadersArb = fc.option(
  fc.record({
    'Content-Type': fc.constant('application/json'),
    'X-Custom-Header': fc.string({ minLength: 1, maxLength: 20 }),
  }),
  { nil: undefined }
);

/**
 * Arbitrary for generating mock responses.
 */
const mockResponseArb: fc.Arbitrary<MockResponse> = fc.record({
  status: httpStatusArb,
  body: responseBodyArb,
  headers: responseHeadersArb,
}).map(r => {
  const response: MockResponse = { status: r.status };
  if (r.body !== undefined) {
    (response as { body?: unknown }).body = r.body;
  }
  if (r.headers !== undefined) {
    (response as { headers?: Record<string, string> }).headers = r.headers;
  }
  return response;
});

/**
 * Arbitrary for generating delay values in milliseconds.
 */
const delayArb = fc.option(
  fc.integer({ min: 0, max: 5000 }),
  { nil: undefined }
);

/**
 * Arbitrary for generating mock definitions with exact URL patterns.
 */
const exactMockDefinitionArb: fc.Arbitrary<MockDefinition> = fc.record({
  urlPattern: exactUrlPatternArb,
  method: fc.option(httpMethodArb, { nil: undefined }),
  response: mockResponseArb,
  delay: delayArb,
}).map(m => {
  const def: MockDefinition = {
    urlPattern: m.urlPattern,
    response: m.response,
  };
  if (m.method !== undefined) {
    (def as { method?: string }).method = m.method;
  }
  if (m.delay !== undefined) {
    (def as { delay?: number }).delay = m.delay;
  }
  return def;
});


/**
 * Arbitrary for generating mock definitions with any URL pattern type.
 */
const mockDefinitionArb: fc.Arbitrary<MockDefinition> = fc.record({
  urlPattern: urlPatternArb,
  method: fc.option(httpMethodArb, { nil: undefined }),
  response: mockResponseArb,
  delay: delayArb,
}).map(m => {
  const def: MockDefinition = {
    urlPattern: m.urlPattern,
    response: m.response,
  };
  if (m.method !== undefined) {
    (def as { method?: string }).method = m.method;
  }
  if (m.delay !== undefined) {
    (def as { delay?: number }).delay = m.delay;
  }
  return def;
});

/**
 * Arbitrary for generating test IDs.
 */
const testIdArb = fc.string({ minLength: 1, maxLength: 30 })
  .filter(s => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s));

/**
 * Arbitrary for generating test status.
 */
const testStatusArb: fc.Arbitrary<TestStatus> = fc.constantFrom('passed', 'failed', 'skipped', 'pending');

/**
 * Arbitrary for generating test duration.
 */
const durationArb = fc.integer({ min: 100, max: 60000 });

/**
 * Arbitrary for generating a sequence of mock definitions.
 */
const mockSequenceArb = fc.array(exactMockDefinitionArb, { minLength: 1, maxLength: 10 });

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Create a mock structured logger for testing.
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
 * Create a fresh ApiMockPlugin instance for testing.
 */
async function createFreshPlugin(): Promise<{ plugin: ApiMockPlugin; logger: StructuredLogger }> {
  const logger = createMockLogger();
  const plugin = new ApiMockPlugin(undefined, logger);
  await plugin.initialize();
  return { plugin, logger };
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 58: API Mock Isolation', () => {
  describe('Mock Isolation Between Tests', () => {
    /**
     * Property: For any sequence of tests, mocks registered in test N should not
     * be visible in test N+1. After onTestEnd is called, all mocks should be cleared.
     * The mock count should be 0 after each test ends.
     */
    it('should clear all mocks after onTestEnd is called', async () => {
      await fc.assert(
        fc.asyncProperty(
          mockSequenceArb,
          testIdArb,
          testStatusArb,
          durationArb,
          async (mocks, testId, status, duration) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              // Register mocks during a test
              for (const mock of mocks) {
                plugin.mockEndpoint(mock);
              }
              
              // Verify mocks are registered
              expect(plugin.getMockCount()).toBe(mocks.length);
              
              // End the test
              await plugin.onTestEnd(testId, status, duration);
              
              // All mocks should be cleared
              expect(plugin.getMockCount()).toBe(0);
              
              // Verify no mock can be retrieved
              for (const mock of mocks) {
                const url = typeof mock.urlPattern === 'string' 
                  ? mock.urlPattern 
                  : '/api/test';
                const result = plugin.getMock(url, mock.method ?? 'GET');
                expect(result).toBeNull();
              }
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 50 }
      );
    });


    it('should isolate mocks between consecutive tests', async () => {
      await fc.assert(
        fc.asyncProperty(
          mockSequenceArb,
          mockSequenceArb,
          testIdArb,
          testIdArb,
          async (mocksTest1, mocksTest2, testId1, testId2) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              // Test 1: Register mocks
              await plugin.onTestStart(testId1, 'Test 1');
              for (const mock of mocksTest1) {
                plugin.mockEndpoint(mock);
              }
              expect(plugin.getMockCount()).toBe(mocksTest1.length);
              
              // End Test 1
              await plugin.onTestEnd(testId1, 'passed', 1000);
              expect(plugin.getMockCount()).toBe(0);
              
              // Test 2: Register different mocks
              await plugin.onTestStart(testId2, 'Test 2');
              for (const mock of mocksTest2) {
                plugin.mockEndpoint(mock);
              }
              
              // Only Test 2 mocks should be present
              expect(plugin.getMockCount()).toBe(mocksTest2.length);
              
              // End Test 2
              await plugin.onTestEnd(testId2, 'passed', 1000);
              expect(plugin.getMockCount()).toBe(0);
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should clear mocks regardless of test status', async () => {
      await fc.assert(
        fc.asyncProperty(
          mockSequenceArb,
          testIdArb,
          testStatusArb,
          durationArb,
          async (mocks, testId, status, duration) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              // Register mocks
              for (const mock of mocks) {
                plugin.mockEndpoint(mock);
              }
              expect(plugin.getMockCount()).toBe(mocks.length);
              
              // End test with any status (passed, failed, skipped, pending)
              await plugin.onTestEnd(testId, status, duration);
              
              // Mocks should be cleared regardless of status
              expect(plugin.getMockCount()).toBe(0);
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('URL Pattern Matching Correctness', () => {
    /**
     * Property: For any URL pattern (exact, regex, glob), the mock should match
     * the expected URLs. Exact patterns should only match exact URLs.
     */
    it('should match exact URL patterns only for exact URLs', async () => {
      await fc.assert(
        fc.asyncProperty(
          exactUrlPatternArb,
          mockResponseArb,
          async (urlPattern, response) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              plugin.mockEndpoint({ urlPattern, response });
              
              // Exact match should work
              const exactMatch = plugin.getMock(urlPattern, 'GET');
              expect(exactMatch).not.toBeNull();
              expect(exactMatch?.status).toBe(response.status);
              
              // Different URL should not match
              const differentUrl = urlPattern + '/extra';
              const noMatch = plugin.getMock(differentUrl, 'GET');
              expect(noMatch).toBeNull();
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 50 }
      );
    });


    it('should match regex URL patterns according to regex rules', async () => {
      await fc.assert(
        fc.asyncProperty(
          mockResponseArb,
          async (response) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              // Register a regex pattern for user IDs
              const regexPattern = /^\/api\/users\/\d+$/;
              plugin.mockEndpoint({ urlPattern: regexPattern, response });
              
              // Should match URLs with numeric IDs
              expect(plugin.getMock('/api/users/123', 'GET')).not.toBeNull();
              expect(plugin.getMock('/api/users/1', 'GET')).not.toBeNull();
              expect(plugin.getMock('/api/users/999999', 'GET')).not.toBeNull();
              
              // Should not match URLs with non-numeric IDs
              expect(plugin.getMock('/api/users/abc', 'GET')).toBeNull();
              expect(plugin.getMock('/api/users/', 'GET')).toBeNull();
              expect(plugin.getMock('/api/users/123/profile', 'GET')).toBeNull();
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should match glob patterns with single wildcard (*)', async () => {
      await fc.assert(
        fc.asyncProperty(
          mockResponseArb,
          async (response) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              // Register a glob pattern with single wildcard
              plugin.mockEndpoint({ urlPattern: '/api/users/*', response });
              
              // Should match single path segment
              expect(plugin.getMock('/api/users/123', 'GET')).not.toBeNull();
              expect(plugin.getMock('/api/users/abc', 'GET')).not.toBeNull();
              
              // Should not match multiple path segments
              expect(plugin.getMock('/api/users/123/profile', 'GET')).toBeNull();
              
              // Should not match without the segment
              expect(plugin.getMock('/api/users/', 'GET')).toBeNull();
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should match glob patterns with double wildcard (**)', async () => {
      await fc.assert(
        fc.asyncProperty(
          mockResponseArb,
          async (response) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              // Register a glob pattern with double wildcard
              plugin.mockEndpoint({ urlPattern: '/api/**', response });
              
              // Should match any path under /api/
              expect(plugin.getMock('/api/users', 'GET')).not.toBeNull();
              expect(plugin.getMock('/api/users/123', 'GET')).not.toBeNull();
              expect(plugin.getMock('/api/users/123/profile', 'GET')).not.toBeNull();
              expect(plugin.getMock('/api/a/b/c/d', 'GET')).not.toBeNull();
              
              // Should not match paths outside /api/
              expect(plugin.getMock('/other/path', 'GET')).toBeNull();
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Method Filtering Correctness', () => {
    /**
     * Property: When method is specified, only that method should match.
     * When method is not specified, all methods should match.
     */
    it('should match all methods when method is not specified', async () => {
      await fc.assert(
        fc.asyncProperty(
          exactUrlPatternArb,
          mockResponseArb,
          httpMethodArb,
          async (urlPattern, response, method) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              // Register mock without method filter
              plugin.mockEndpoint({ urlPattern, response });
              
              // Should match any method
              const result = plugin.getMock(urlPattern, method);
              expect(result).not.toBeNull();
              expect(result?.status).toBe(response.status);
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 50 }
      );
    });


    it('should only match specified method when method is provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          exactUrlPatternArb,
          mockResponseArb,
          httpMethodArb,
          async (urlPattern, response, specifiedMethod) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              // Register mock with specific method
              plugin.mockEndpoint({ urlPattern, method: specifiedMethod, response });
              
              // Should match the specified method
              const matchResult = plugin.getMock(urlPattern, specifiedMethod);
              expect(matchResult).not.toBeNull();
              
              // Should not match other methods
              const otherMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
                .filter(m => m !== specifiedMethod.toUpperCase());
              
              for (const otherMethod of otherMethods) {
                const noMatchResult = plugin.getMock(urlPattern, otherMethod);
                expect(noMatchResult).toBeNull();
              }
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should match methods case-insensitively', async () => {
      await fc.assert(
        fc.asyncProperty(
          exactUrlPatternArb,
          mockResponseArb,
          httpMethodMixedCaseArb,
          async (urlPattern, response, method) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              // Register mock with method in any case
              plugin.mockEndpoint({ urlPattern, method, response });
              
              // Should match regardless of case
              const upperCase = plugin.getMock(urlPattern, method.toUpperCase());
              const lowerCase = plugin.getMock(urlPattern, method.toLowerCase());
              const mixedCase = plugin.getMock(urlPattern, method);
              
              expect(upperCase).not.toBeNull();
              expect(lowerCase).not.toBeNull();
              expect(mixedCase).not.toBeNull();
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Mock Registration Order', () => {
    /**
     * Property: When multiple mocks match a URL, the first registered mock
     * should be returned. The order of registration should be preserved.
     */
    it('should return first registered mock when multiple patterns match', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(mockResponseArb, { minLength: 2, maxLength: 5 }),
          async (responses) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              // Register multiple mocks that all match the same URL
              const testUrl = '/api/users/123';
              
              // First: glob pattern
              plugin.mockEndpoint({ 
                urlPattern: '/api/users/*', 
                response: responses[0] 
              });
              
              // Second: exact pattern (would also match)
              plugin.mockEndpoint({ 
                urlPattern: testUrl, 
                response: responses[1] 
              });
              
              // The first registered mock should be returned
              const result = plugin.getMock(testUrl, 'GET');
              expect(result).not.toBeNull();
              expect(result?.status).toBe(responses[0].status);
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should preserve registration order for multiple mocks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(exactMockDefinitionArb, { minLength: 2, maxLength: 5 })
            .filter(mocks => {
              // Ensure all mocks have unique URL patterns
              const patterns = mocks.map(m => 
                typeof m.urlPattern === 'string' ? m.urlPattern : m.urlPattern.source
              );
              return new Set(patterns).size === patterns.length;
            }),
          async (mocks) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              // Register mocks in order
              for (const mock of mocks) {
                plugin.mockEndpoint(mock);
              }
              
              // Each mock should be retrievable
              for (const mock of mocks) {
                const url = typeof mock.urlPattern === 'string' 
                  ? mock.urlPattern 
                  : '/api/test';
                const method = mock.method ?? 'GET';
                
                if (typeof mock.urlPattern === 'string') {
                  const result = plugin.getMock(url, method);
                  expect(result).not.toBeNull();
                  expect(result?.status).toBe(mock.response.status);
                }
              }
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });


  describe('Delay Configuration', () => {
    /**
     * Property: Delay values should be preserved and returned correctly.
     * Undefined delay should be returned when not configured.
     */
    it('should preserve delay values when configured', async () => {
      await fc.assert(
        fc.asyncProperty(
          exactUrlPatternArb,
          mockResponseArb,
          fc.integer({ min: 0, max: 5000 }),
          async (urlPattern, response, delay) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              plugin.mockEndpoint({ urlPattern, response, delay });
              
              const result = plugin.getMockWithDelay(urlPattern, 'GET');
              expect(result).not.toBeNull();
              expect(result?.delay).toBe(delay);
              expect(result?.response.status).toBe(response.status);
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return undefined delay when not configured', async () => {
      await fc.assert(
        fc.asyncProperty(
          exactUrlPatternArb,
          mockResponseArb,
          async (urlPattern, response) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              // Register mock without delay
              plugin.mockEndpoint({ urlPattern, response });
              
              const result = plugin.getMockWithDelay(urlPattern, 'GET');
              expect(result).not.toBeNull();
              expect(result?.delay).toBeUndefined();
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should support zero delay', async () => {
      await fc.assert(
        fc.asyncProperty(
          exactUrlPatternArb,
          mockResponseArb,
          async (urlPattern, response) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              plugin.mockEndpoint({ urlPattern, response, delay: 0 });
              
              const result = plugin.getMockWithDelay(urlPattern, 'GET');
              expect(result).not.toBeNull();
              expect(result?.delay).toBe(0);
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should return null for empty URL', async () => {
      await fc.assert(
        fc.asyncProperty(
          exactMockDefinitionArb,
          httpMethodArb,
          async (mock, method) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              plugin.mockEndpoint(mock);
              
              // Empty URL should return null
              const result = plugin.getMock('', method);
              expect(result).toBeNull();
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should return null for non-matching URL', async () => {
      await fc.assert(
        fc.asyncProperty(
          exactUrlPatternArb,
          mockResponseArb,
          async (urlPattern, response) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              plugin.mockEndpoint({ urlPattern, response });
              
              // Completely different URL should not match
              const result = plugin.getMock('/completely/different/path', 'GET');
              expect(result).toBeNull();
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle special characters in URL', async () => {
      await fc.assert(
        fc.asyncProperty(
          mockResponseArb,
          async (response) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              const specialUrl = '/api/search?q=test&page=1';
              plugin.mockEndpoint({ urlPattern: specialUrl, response });
              
              const result = plugin.getMock(specialUrl, 'GET');
              expect(result).not.toBeNull();
              expect(result?.status).toBe(response.status);
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle URL-encoded characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          mockResponseArb,
          async (response) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              const encodedUrl = '/api/users/john%20doe';
              plugin.mockEndpoint({ urlPattern: encodedUrl, response });
              
              const result = plugin.getMock(encodedUrl, 'GET');
              expect(result).not.toBeNull();
              expect(result?.status).toBe(response.status);
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });


  describe('Multiple Test Execution Simulation', () => {
    /**
     * Property: Simulating multiple test executions should demonstrate
     * complete isolation between tests.
     */
    it('should maintain isolation across multiple simulated test runs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(mockSequenceArb, { minLength: 2, maxLength: 5 }),
          fc.array(testIdArb, { minLength: 2, maxLength: 5 }),
          async (mockSets, testIds) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              // Ensure we have matching arrays
              const numTests = Math.min(mockSets.length, testIds.length);
              
              for (let i = 0; i < numTests; i++) {
                const mocks = mockSets[i];
                const testId = testIds[i];
                
                // Start test
                await plugin.onTestStart(testId, `Test ${i}`);
                
                // Verify no mocks from previous test
                expect(plugin.getMockCount()).toBe(0);
                
                // Register mocks for this test
                for (const mock of mocks) {
                  plugin.mockEndpoint(mock);
                }
                expect(plugin.getMockCount()).toBe(mocks.length);
                
                // End test
                await plugin.onTestEnd(testId, 'passed', 1000);
                
                // Verify all mocks cleared
                expect(plugin.getMockCount()).toBe(0);
              }
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should allow new mocks after clearing', async () => {
      await fc.assert(
        fc.asyncProperty(
          exactMockDefinitionArb,
          exactMockDefinitionArb,
          testIdArb,
          async (mock1, mock2, testId) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              // Register first mock
              plugin.mockEndpoint(mock1);
              expect(plugin.getMockCount()).toBe(1);
              
              // Clear via test end
              await plugin.onTestEnd(testId, 'passed', 1000);
              expect(plugin.getMockCount()).toBe(0);
              
              // Register new mock
              plugin.mockEndpoint(mock2);
              expect(plugin.getMockCount()).toBe(1);
              
              // Verify old mock is not accessible
              if (typeof mock1.urlPattern === 'string' && 
                  typeof mock2.urlPattern === 'string' &&
                  mock1.urlPattern !== mock2.urlPattern) {
                const oldMock = plugin.getMock(mock1.urlPattern, mock1.method ?? 'GET');
                expect(oldMock).toBeNull();
              }
              
              // Verify new mock is accessible
              if (typeof mock2.urlPattern === 'string') {
                const newMock = plugin.getMock(mock2.urlPattern, mock2.method ?? 'GET');
                expect(newMock).not.toBeNull();
              }
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Plugin Lifecycle', () => {
    it('should clear mocks on dispose', async () => {
      await fc.assert(
        fc.asyncProperty(
          mockSequenceArb,
          async (mocks) => {
            const { plugin } = await createFreshPlugin();
            
            // Register mocks
            for (const mock of mocks) {
              plugin.mockEndpoint(mock);
            }
            expect(plugin.getMockCount()).toBe(mocks.length);
            
            // Dispose should clear mocks
            await plugin.dispose();
            expect(plugin.getMockCount()).toBe(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle clearMocks being called multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(
          mockSequenceArb,
          fc.integer({ min: 1, max: 5 }),
          async (mocks, clearCount) => {
            const { plugin } = await createFreshPlugin();
            
            try {
              // Register mocks
              for (const mock of mocks) {
                plugin.mockEndpoint(mock);
              }
              
              // Clear multiple times should be safe
              for (let i = 0; i < clearCount; i++) {
                plugin.clearMocks();
                expect(plugin.getMockCount()).toBe(0);
              }
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
