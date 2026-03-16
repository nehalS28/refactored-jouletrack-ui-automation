/**
 * Property-based tests for Visual Regression Detection.
 * 
 * **Property 57: Visual Regression Detection**
 * **Validates: Visual Testing**
 * 
 * Tests that visual differences are detected correctly with proper
 * threshold handling, baseline management, and diff calculations.
 * 
 * @module plugins/visual/visual-plugin.property.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { VisualPlugin, type VisualPluginConfig } from './visual-plugin.js';
import type { StructuredLogger } from '../../types/context.types.js';
import * as fs from 'fs/promises';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn(),
  access: vi.fn().mockResolvedValue(undefined),
}));

// Mock pixelmatch - return value will be controlled per test
vi.mock('pixelmatch', () => ({
  default: vi.fn().mockReturnValue(0),
}));

// Mock pngjs - dimensions will be controlled per test
vi.mock('pngjs', () => {
  const MockPNG = vi.fn().mockImplementation(({ width, height }) => ({
    width,
    height,
    data: Buffer.alloc(width * height * 4),
  }));
  
  // Add static sync methods
  MockPNG.sync = {
    read: vi.fn().mockReturnValue({
      width: 100,
      height: 100,
      data: Buffer.alloc(100 * 100 * 4),
    }),
    write: vi.fn().mockReturnValue(Buffer.from('mock-png-data')),
  };
  
  return { PNG: MockPNG };
});

// ============================================================================
// Arbitraries for generating test data
// ============================================================================

/**
 * Arbitrary for generating valid screenshot names.
 * Names should be alphanumeric with optional dashes/underscores.
 */
const screenshotNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s));

/**
 * Arbitrary for generating threshold values (0.0 to 1.0).
 */
const thresholdArb = fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true });

/**
 * Arbitrary for generating image dimensions.
 * Realistic range: 10x10 to 2000x2000 pixels.
 */
const dimensionArb = fc.integer({ min: 10, max: 2000 });

/**
 * Arbitrary for generating image dimensions as a tuple.
 */
const imageDimensionsArb = fc.record({
  width: dimensionArb,
  height: dimensionArb,
});

/**
 * Arbitrary for generating diff pixel counts relative to total pixels.
 * Returns { diffPixels, totalPixels, diffPercentage }
 */
const diffPixelDataArb = fc.record({
  width: dimensionArb,
  height: dimensionArb,
}).chain(({ width, height }) => {
  const totalPixels = width * height;
  return fc.integer({ min: 0, max: totalPixels }).map(diffPixels => ({
    width,
    height,
    totalPixels,
    diffPixels,
    diffPercentage: totalPixels > 0 ? diffPixels / totalPixels : 0,
  }));
});

/**
 * Arbitrary for generating threshold and diff percentage pairs
 * where diff is at or below threshold (should pass).
 */
const passingComparisonArb = fc.double({ min: 0.01, max: 1, noNaN: true, noDefaultInfinity: true })
  .chain(threshold => 
    fc.double({ min: 0, max: threshold, noNaN: true, noDefaultInfinity: true })
      .map(diffPercentage => ({ threshold, diffPercentage }))
  );

/**
 * Arbitrary for generating threshold and diff percentage pairs
 * where diff is above threshold (should fail).
 */
const failingComparisonArb = fc.double({ min: 0, max: 0.99, noNaN: true, noDefaultInfinity: true })
  .chain(threshold => 
    fc.double({ min: threshold + 0.001, max: 1, noNaN: true, noDefaultInfinity: true })
      .map(diffPercentage => ({ threshold, diffPercentage }))
  );

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
 * Configure mocks for a specific image dimension and diff pixel count.
 */
async function configureMocks(width: number, height: number, diffPixels: number): Promise<void> {
  // Import the mocked modules to configure them
  const pixelmatch = await import('pixelmatch');
  const { PNG } = await import('pngjs');
  
  // Configure PNG.sync.read to return images with specified dimensions
  vi.mocked(PNG.sync.read).mockReturnValue({
    width,
    height,
    data: Buffer.alloc(width * height * 4),
  });
  
  // Configure pixelmatch to return specified diff pixel count
  vi.mocked(pixelmatch.default).mockReturnValue(diffPixels);
}

/**
 * Create a fresh VisualPlugin instance for testing.
 */
async function createPlugin(
  config: Partial<VisualPluginConfig>,
  logger: StructuredLogger
): Promise<VisualPlugin> {
  const plugin = new VisualPlugin(config, logger);
  await plugin.initialize();
  return plugin;
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 57: Visual Regression Detection', () => {
  let logger: StructuredLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = createMockLogger();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Threshold Boundary Invariant', () => {
    /**
     * Property: For any diff percentage <= threshold, the comparison should pass.
     * The boundary should be exact - at threshold = pass.
     */
    it('should pass when diff percentage is at or below threshold', async () => {
      await fc.assert(
        fc.asyncProperty(
          screenshotNameArb,
          passingComparisonArb,
          imageDimensionsArb,
          async (name, { threshold, diffPercentage }, { width, height }) => {
            const totalPixels = width * height;
            const diffPixels = Math.floor(diffPercentage * totalPixels);
            
            // Configure mocks
            await configureMocks(width, height, diffPixels);
            
            // Mock baseline exists
            vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('mock-baseline-data'));
            
            const plugin = await createPlugin({
              enabled: true,
              baselinePath: './test-baselines',
              diffPath: './test-diffs',
              threshold,
              updateBaselines: false,
            }, logger);
            
            try {
              const screenshot = Buffer.from('mock-screenshot-data');
              const result = await plugin.compareScreenshot(name, screenshot);
              
              // Should pass when diff <= threshold
              expect(result.passed).toBe(true);
              expect(result.name).toBe(name);
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: For any diff percentage > threshold, the comparison should fail.
     */
    it('should fail when diff percentage is above threshold', async () => {
      await fc.assert(
        fc.asyncProperty(
          screenshotNameArb,
          failingComparisonArb,
          imageDimensionsArb,
          async (name, { threshold, diffPercentage }, { width, height }) => {
            const totalPixels = width * height;
            // Ensure at least 1 diff pixel above threshold
            const diffPixels = Math.max(1, Math.ceil(diffPercentage * totalPixels));
            
            // Recalculate actual diff percentage
            const actualDiffPercentage = diffPixels / totalPixels;
            
            // Skip if actual diff percentage is not above threshold
            if (actualDiffPercentage <= threshold) {
              return; // Skip this iteration
            }
            
            // Configure mocks
            await configureMocks(width, height, diffPixels);
            
            // Mock baseline exists
            vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('mock-baseline-data'));
            
            const plugin = await createPlugin({
              enabled: true,
              baselinePath: './test-baselines',
              diffPath: './test-diffs',
              threshold,
              updateBaselines: false,
            }, logger);
            
            try {
              const screenshot = Buffer.from('mock-screenshot-data');
              const result = await plugin.compareScreenshot(name, screenshot);
              
              // Should fail when diff > threshold
              expect(result.passed).toBe(false);
              expect(result.name).toBe(name);
              
              // Should log warning about visual regression
              expect(logger.warn).toHaveBeenCalledWith(
                'Visual regression detected',
                expect.objectContaining({ name })
              );
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: At exactly the threshold boundary, comparison should pass.
     */
    it('should pass when diff percentage equals threshold exactly', async () => {
      await fc.assert(
        fc.asyncProperty(
          screenshotNameArb,
          fc.double({ min: 0.01, max: 0.5, noNaN: true, noDefaultInfinity: true }),
          fc.integer({ min: 100, max: 1000 }), // Use square dimensions for exact calculation
          async (name, threshold, dimension) => {
            const width = dimension;
            const height = dimension;
            const totalPixels = width * height;
            
            // Calculate exact diff pixels for threshold
            const diffPixels = Math.floor(threshold * totalPixels);
            const actualDiffPercentage = diffPixels / totalPixels;
            
            // Configure mocks
            await configureMocks(width, height, diffPixels);
            
            // Mock baseline exists
            vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('mock-baseline-data'));
            
            const plugin = await createPlugin({
              enabled: true,
              baselinePath: './test-baselines',
              diffPath: './test-diffs',
              threshold,
              updateBaselines: false,
            }, logger);
            
            try {
              const screenshot = Buffer.from('mock-screenshot-data');
              const result = await plugin.compareScreenshot(name, screenshot);
              
              // At or below threshold should pass
              expect(result.passed).toBe(actualDiffPercentage <= threshold);
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Baseline Creation Invariant', () => {
    /**
     * Property: When updateBaselines is true and no baseline exists,
     * a new baseline should be created and the comparison should pass.
     */
    it('should create baseline when updateBaselines is true and no baseline exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          screenshotNameArb,
          thresholdArb,
          imageDimensionsArb,
          async (name, threshold, { width, height }) => {
            // Configure mocks for image dimensions
            await configureMocks(width, height, 0);
            
            // Mock baseline does not exist (ENOENT error)
            vi.mocked(fs.readFile).mockRejectedValueOnce(
              Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
            );
            
            const plugin = await createPlugin({
              enabled: true,
              baselinePath: './test-baselines',
              diffPath: './test-diffs',
              threshold,
              updateBaselines: true, // Enable baseline creation
            }, logger);
            
            try {
              const screenshot = Buffer.from('mock-screenshot-data');
              const result = await plugin.compareScreenshot(name, screenshot);
              
              // Should pass and indicate baseline was created
              expect(result.passed).toBe(true);
              expect(result.baselineCreated).toBe(true);
              expect(result.diffPercentage).toBe(0);
              expect(result.name).toBe(name);
              
              // Should write the baseline file
              expect(fs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining(`${name}.png`),
                screenshot
              );
              
              // Should log baseline creation
              expect(logger.info).toHaveBeenCalledWith(
                'Baseline created',
                expect.objectContaining({ name })
              );
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * Property: When updateBaselines is false and no baseline exists,
     * an error should be thrown.
     */
    it('should throw error when updateBaselines is false and no baseline exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          screenshotNameArb,
          thresholdArb,
          async (name, threshold) => {
            // Mock baseline does not exist (ENOENT error)
            vi.mocked(fs.readFile).mockRejectedValueOnce(
              Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
            );
            
            const plugin = await createPlugin({
              enabled: true,
              baselinePath: './test-baselines',
              diffPath: './test-diffs',
              threshold,
              updateBaselines: false, // Disable baseline creation
            }, logger);
            
            try {
              const screenshot = Buffer.from('mock-screenshot-data');
              
              // Should throw error about missing baseline
              await expect(plugin.compareScreenshot(name, screenshot))
                .rejects.toThrow(`No baseline found for: ${name}`);
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * Property: The created baseline should match the input screenshot exactly.
     */
    it('should create baseline that matches input screenshot exactly', async () => {
      await fc.assert(
        fc.asyncProperty(
          screenshotNameArb,
          fc.uint8Array({ minLength: 100, maxLength: 1000 }),
          async (name, screenshotData) => {
            // Configure mocks
            await configureMocks(100, 100, 0);
            
            // Mock baseline does not exist
            vi.mocked(fs.readFile).mockRejectedValueOnce(
              Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
            );
            
            const plugin = await createPlugin({
              enabled: true,
              baselinePath: './test-baselines',
              diffPath: './test-diffs',
              threshold: 0.01,
              updateBaselines: true,
            }, logger);
            
            try {
              const screenshot = Buffer.from(screenshotData);
              await plugin.compareScreenshot(name, screenshot);
              
              // Verify the exact screenshot buffer was written
              expect(fs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining(`${name}.png`),
                screenshot
              );
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });


  describe('Diff Percentage Calculation', () => {
    /**
     * Property: For any number of differing pixels, the diff percentage should equal:
     * diffPixels / totalPixels
     */
    it('should calculate diff percentage as diffPixels / totalPixels', async () => {
      await fc.assert(
        fc.asyncProperty(
          screenshotNameArb,
          diffPixelDataArb,
          async (name, { width, height, totalPixels, diffPixels }) => {
            // Configure mocks with specific dimensions and diff pixels
            await configureMocks(width, height, diffPixels);
            
            // Mock baseline exists
            vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('mock-baseline-data'));
            
            // Use a threshold that will allow us to see the actual diff percentage
            const plugin = await createPlugin({
              enabled: true,
              baselinePath: './test-baselines',
              diffPath: './test-diffs',
              threshold: 1.0, // Allow all diffs to pass so we can check the percentage
              updateBaselines: false,
            }, logger);
            
            try {
              const screenshot = Buffer.from('mock-screenshot-data');
              const result = await plugin.compareScreenshot(name, screenshot);
              
              // Diff percentage should equal diffPixels / totalPixels
              const expectedDiffPercentage = totalPixels > 0 ? diffPixels / totalPixels : 0;
              expect(result.diffPercentage).toBeCloseTo(expectedDiffPercentage, 10);
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Zero diff pixels should always result in 0% diff.
     */
    it('should return 0% diff when no pixels differ', async () => {
      await fc.assert(
        fc.asyncProperty(
          screenshotNameArb,
          imageDimensionsArb,
          async (name, { width, height }) => {
            // Configure mocks with zero diff pixels
            await configureMocks(width, height, 0);
            
            // Mock baseline exists
            vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('mock-baseline-data'));
            
            const plugin = await createPlugin({
              enabled: true,
              baselinePath: './test-baselines',
              diffPath: './test-diffs',
              threshold: 0.01,
              updateBaselines: false,
            }, logger);
            
            try {
              const screenshot = Buffer.from('mock-screenshot-data');
              const result = await plugin.compareScreenshot(name, screenshot);
              
              // Zero diff pixels should result in 0% diff
              expect(result.diffPercentage).toBe(0);
              expect(result.passed).toBe(true);
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * Property: All pixels differing should result in 100% diff.
     */
    it('should return 100% diff when all pixels differ', async () => {
      await fc.assert(
        fc.asyncProperty(
          screenshotNameArb,
          imageDimensionsArb,
          async (name, { width, height }) => {
            const totalPixels = width * height;
            
            // Configure mocks with all pixels differing
            await configureMocks(width, height, totalPixels);
            
            // Mock baseline exists
            vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('mock-baseline-data'));
            
            const plugin = await createPlugin({
              enabled: true,
              baselinePath: './test-baselines',
              diffPath: './test-diffs',
              threshold: 1.0, // Allow to pass so we can check percentage
              updateBaselines: false,
            }, logger);
            
            try {
              const screenshot = Buffer.from('mock-screenshot-data');
              const result = await plugin.compareScreenshot(name, screenshot);
              
              // All pixels differing should result in 100% diff
              expect(result.diffPercentage).toBe(1);
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });


  describe('Comparison Symmetry', () => {
    /**
     * Property: Comparing image A to baseline B should produce the same diff percentage
     * as comparing image B to baseline A (when roles are swapped).
     * 
     * Note: This tests the mathematical property that pixel difference is symmetric.
     * In practice, pixelmatch compares two images and the order shouldn't matter
     * for the diff count.
     */
    it('should produce symmetric diff percentage regardless of comparison order', async () => {
      await fc.assert(
        fc.asyncProperty(
          screenshotNameArb,
          imageDimensionsArb,
          fc.integer({ min: 0, max: 10000 }),
          async (name, { width, height }, diffPixelsSeed) => {
            const totalPixels = width * height;
            const diffPixels = diffPixelsSeed % (totalPixels + 1); // Ensure valid range
            
            // Configure mocks - pixelmatch should return same diff count
            // regardless of which image is "current" vs "baseline"
            await configureMocks(width, height, diffPixels);
            
            // First comparison: A as current, B as baseline
            vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('image-B-baseline'));
            
            const plugin1 = await createPlugin({
              enabled: true,
              baselinePath: './test-baselines',
              diffPath: './test-diffs',
              threshold: 1.0,
              updateBaselines: false,
            }, logger);
            
            const screenshotA = Buffer.from('image-A-current');
            const result1 = await plugin1.compareScreenshot(name, screenshotA);
            await plugin1.dispose();
            
            // Second comparison: B as current, A as baseline (simulated by same mock)
            vi.clearAllMocks();
            await configureMocks(width, height, diffPixels);
            vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('image-A-baseline'));
            
            const plugin2 = await createPlugin({
              enabled: true,
              baselinePath: './test-baselines',
              diffPath: './test-diffs',
              threshold: 1.0,
              updateBaselines: false,
            }, logger);
            
            const screenshotB = Buffer.from('image-B-current');
            const result2 = await plugin2.compareScreenshot(name, screenshotB);
            await plugin2.dispose();
            
            // Both comparisons should produce the same diff percentage
            // (since pixelmatch returns the same diff count for both)
            expect(result1.diffPercentage).toBe(result2.diffPercentage);
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * Property: The pass/fail decision should be symmetric for the same diff.
     */
    it('should produce symmetric pass/fail decision for same diff', async () => {
      await fc.assert(
        fc.asyncProperty(
          screenshotNameArb,
          thresholdArb,
          imageDimensionsArb,
          fc.integer({ min: 0, max: 10000 }),
          async (name, threshold, { width, height }, diffPixelsSeed) => {
            const totalPixels = width * height;
            const diffPixels = diffPixelsSeed % (totalPixels + 1);
            
            // First comparison
            await configureMocks(width, height, diffPixels);
            vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('baseline-1'));
            
            const plugin1 = await createPlugin({
              enabled: true,
              baselinePath: './test-baselines',
              diffPath: './test-diffs',
              threshold,
              updateBaselines: false,
            }, logger);
            
            const result1 = await plugin1.compareScreenshot(name, Buffer.from('current-1'));
            await plugin1.dispose();
            
            // Second comparison (swapped roles, same diff)
            vi.clearAllMocks();
            await configureMocks(width, height, diffPixels);
            vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('baseline-2'));
            
            const plugin2 = await createPlugin({
              enabled: true,
              baselinePath: './test-baselines',
              diffPath: './test-diffs',
              threshold,
              updateBaselines: false,
            }, logger);
            
            const result2 = await plugin2.compareScreenshot(name, Buffer.from('current-2'));
            await plugin2.dispose();
            
            // Pass/fail decision should be the same
            expect(result1.passed).toBe(result2.passed);
          }
        ),
        { numRuns: 30 }
      );
    });
  });


  describe('Edge Cases', () => {
    /**
     * Property: Very small thresholds should still work correctly.
     */
    it('should handle very small thresholds correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          screenshotNameArb,
          fc.double({ min: 0.0001, max: 0.001, noNaN: true, noDefaultInfinity: true }),
          imageDimensionsArb,
          async (name, threshold, { width, height }) => {
            // Test with zero diff (should pass)
            await configureMocks(width, height, 0);
            vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('mock-baseline'));
            
            const plugin = await createPlugin({
              enabled: true,
              baselinePath: './test-baselines',
              diffPath: './test-diffs',
              threshold,
              updateBaselines: false,
            }, logger);
            
            try {
              const result = await plugin.compareScreenshot(name, Buffer.from('mock-screenshot'));
              expect(result.passed).toBe(true);
              expect(result.diffPercentage).toBe(0);
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * Property: Threshold of 0 should only pass when images are identical.
     */
    it('should only pass with threshold 0 when images are identical', async () => {
      await fc.assert(
        fc.asyncProperty(
          screenshotNameArb,
          imageDimensionsArb,
          fc.integer({ min: 0, max: 100 }),
          async (name, { width, height }, diffPixels) => {
            await configureMocks(width, height, diffPixels);
            vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('mock-baseline'));
            
            const plugin = await createPlugin({
              enabled: true,
              baselinePath: './test-baselines',
              diffPath: './test-diffs',
              threshold: 0, // Zero threshold
              updateBaselines: false,
            }, logger);
            
            try {
              const result = await plugin.compareScreenshot(name, Buffer.from('mock-screenshot'));
              
              // Should only pass if diffPixels is 0
              if (diffPixels === 0) {
                expect(result.passed).toBe(true);
              } else {
                expect(result.passed).toBe(false);
              }
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * Property: Threshold of 1 should always pass (100% tolerance).
     */
    it('should always pass with threshold 1 (100% tolerance)', async () => {
      await fc.assert(
        fc.asyncProperty(
          screenshotNameArb,
          imageDimensionsArb,
          fc.integer({ min: 0, max: 10000 }),
          async (name, { width, height }, diffPixelsSeed) => {
            const totalPixels = width * height;
            const diffPixels = diffPixelsSeed % (totalPixels + 1);
            
            await configureMocks(width, height, diffPixels);
            vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('mock-baseline'));
            
            const plugin = await createPlugin({
              enabled: true,
              baselinePath: './test-baselines',
              diffPath: './test-diffs',
              threshold: 1, // 100% tolerance
              updateBaselines: false,
            }, logger);
            
            try {
              const result = await plugin.compareScreenshot(name, Buffer.from('mock-screenshot'));
              
              // Should always pass with 100% tolerance
              expect(result.passed).toBe(true);
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });


  describe('Diff Image Generation', () => {
    /**
     * Property: When comparison fails, a diff image should be saved.
     */
    it('should save diff image when comparison fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          screenshotNameArb,
          fc.double({ min: 0, max: 0.5, noNaN: true, noDefaultInfinity: true }),
          imageDimensionsArb,
          async (name, threshold, { width, height }) => {
            const totalPixels = width * height;
            // Ensure diff is above threshold
            const diffPixels = Math.ceil((threshold + 0.1) * totalPixels);
            
            if (diffPixels > totalPixels) {
              return; // Skip invalid case
            }
            
            await configureMocks(width, height, diffPixels);
            vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('mock-baseline'));
            
            const plugin = await createPlugin({
              enabled: true,
              baselinePath: './test-baselines',
              diffPath: './test-diffs',
              threshold,
              updateBaselines: false,
            }, logger);
            
            try {
              const result = await plugin.compareScreenshot(name, Buffer.from('mock-screenshot'));
              
              if (!result.passed) {
                // Diff image should be saved
                expect(fs.writeFile).toHaveBeenCalledWith(
                  expect.stringContaining(`${name}-diff.png`),
                  expect.any(Buffer)
                );
              }
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * Property: When comparison passes, no diff image should be saved.
     */
    it('should not save diff image when comparison passes', async () => {
      await fc.assert(
        fc.asyncProperty(
          screenshotNameArb,
          imageDimensionsArb,
          async (name, { width, height }) => {
            // Zero diff - should always pass
            await configureMocks(width, height, 0);
            vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('mock-baseline'));
            
            const plugin = await createPlugin({
              enabled: true,
              baselinePath: './test-baselines',
              diffPath: './test-diffs',
              threshold: 0.01,
              updateBaselines: false,
            }, logger);
            
            try {
              const result = await plugin.compareScreenshot(name, Buffer.from('mock-screenshot'));
              
              expect(result.passed).toBe(true);
              
              // No diff image should be saved for passing comparison
              const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
              const diffImageCalls = writeFileCalls.filter(
                call => String(call[0]).includes('-diff.png')
              );
              expect(diffImageCalls.length).toBe(0);
            } finally {
              await plugin.dispose();
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
