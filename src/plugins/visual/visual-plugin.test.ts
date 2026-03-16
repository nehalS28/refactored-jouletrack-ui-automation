/**
 * Unit tests for VisualPlugin implementation.
 * Uses mocked file system and image operations for test isolation.
 * 
 * @module plugins/visual/visual-plugin.test
 * @requirements 17.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VisualPlugin, type VisualPluginConfig } from './visual-plugin.js';
import type { StructuredLogger } from '../../types/context.types.js';
import type { StepInfo, ErrorContext } from '../plugin.types.js';
import * as fs from 'fs/promises';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn(),
  access: vi.fn().mockResolvedValue(undefined),
}));

// Mock pixelmatch
vi.mock('pixelmatch', () => ({
  default: vi.fn().mockReturnValue(0),
}));

// Mock pngjs - need to mock both the constructor and static methods
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

function createMockErrorContext(overrides: Partial<ErrorContext> = {}): ErrorContext {
  return {
    testId: 'test-123',
    pageUrl: 'http://example.com',
    ...overrides,
  };
}

describe('VisualPlugin', () => {
  let plugin: VisualPlugin;
  let logger: StructuredLogger;
  const testConfig: Partial<VisualPluginConfig> = {
    enabled: true,
    baselinePath: './test-visual-baselines',
    diffPath: './test-visual-diffs',
    threshold: 0.01, // 1% threshold
    updateBaselines: false,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    logger = createMockLogger();
    plugin = new VisualPlugin(testConfig, logger);
    await plugin.initialize();
  });

  afterEach(async () => {
    await plugin.dispose();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      expect(plugin.name).toBe('visual');
      expect(plugin.version).toBe('1.0.0');
      expect(logger.info).toHaveBeenCalledWith('Visual plugin initialized', expect.any(Object));
    });

    it('should create baseline and diff directories on initialization', async () => {
      expect(fs.mkdir).toHaveBeenCalledWith('./test-visual-baselines', { recursive: true });
      expect(fs.mkdir).toHaveBeenCalledWith('./test-visual-diffs', { recursive: true });
    });

    it('should use default config when not provided', async () => {
      const defaultPlugin = new VisualPlugin(undefined, logger);
      await defaultPlugin.initialize();
      expect(defaultPlugin.name).toBe('visual');
      await defaultPlugin.dispose();
    });
  });

  describe('compareScreenshot', () => {
    it('should create baseline when no baseline exists and updateBaselines is true', async () => {
      const updatePlugin = new VisualPlugin({ ...testConfig, updateBaselines: true }, logger);
      await updatePlugin.initialize();
      
      // Mock readFile to throw ENOENT (file not found)
      vi.mocked(fs.readFile).mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      
      const screenshot = Buffer.from('mock-screenshot-data');
      const result = await updatePlugin.compareScreenshot('login-page', screenshot);
      
      expect(result.passed).toBe(true);
      expect(result.baselineCreated).toBe(true);
      expect(result.name).toBe('login-page');
      expect(result.diffPercentage).toBe(0);
      expect(fs.writeFile).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Baseline created', { name: 'login-page' });
      
      await updatePlugin.dispose();
    });

    it('should throw error when no baseline exists and updateBaselines is false', async () => {
      // Mock readFile to throw ENOENT (file not found)
      vi.mocked(fs.readFile).mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      
      const screenshot = Buffer.from('mock-screenshot-data');
      
      await expect(plugin.compareScreenshot('missing-baseline', screenshot))
        .rejects.toThrow('No baseline found for: missing-baseline');
    });

    it('should pass when images match within threshold', async () => {
      // Mock readFile to return baseline image
      vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('mock-baseline-data'));
      
      // Mock pixelmatch to return 0 diff pixels
      const pixelmatch = await import('pixelmatch');
      vi.mocked(pixelmatch.default).mockReturnValueOnce(0);
      
      const screenshot = Buffer.from('mock-screenshot-data');
      const result = await plugin.compareScreenshot('matching-page', screenshot);
      
      expect(result.passed).toBe(true);
      expect(result.diffPercentage).toBe(0);
      expect(result.name).toBe('matching-page');
    });

    it('should fail when images differ beyond threshold', async () => {
      // Mock readFile to return baseline image
      vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('mock-baseline-data'));
      
      // Mock pixelmatch to return significant diff (500 pixels out of 10000 = 5%)
      const pixelmatch = await import('pixelmatch');
      vi.mocked(pixelmatch.default).mockReturnValueOnce(500);
      
      const screenshot = Buffer.from('mock-screenshot-data');
      const result = await plugin.compareScreenshot('different-page', screenshot);
      
      expect(result.passed).toBe(false);
      expect(result.diffPercentage).toBe(0.05); // 500 / (100 * 100) = 0.05
      expect(result.name).toBe('different-page');
      expect(logger.warn).toHaveBeenCalledWith('Visual regression detected', expect.objectContaining({
        name: 'different-page',
      }));
    });

    it('should save diff image when comparison fails', async () => {
      // Mock readFile to return baseline image
      vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('mock-baseline-data'));
      
      // Mock pixelmatch to return significant diff
      const pixelmatch = await import('pixelmatch');
      vi.mocked(pixelmatch.default).mockReturnValueOnce(500);
      
      const screenshot = Buffer.from('mock-screenshot-data');
      await plugin.compareScreenshot('diff-page', screenshot);
      
      // Should write diff image
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('diff-page-diff.png'),
        expect.any(Buffer)
      );
    });

    it('should pass when diff is exactly at threshold', async () => {
      // Mock readFile to return baseline image
      vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('mock-baseline-data'));
      
      // Mock pixelmatch to return exactly threshold diff (1% of 10000 = 100 pixels)
      const pixelmatch = await import('pixelmatch');
      vi.mocked(pixelmatch.default).mockReturnValueOnce(100);
      
      const screenshot = Buffer.from('mock-screenshot-data');
      const result = await plugin.compareScreenshot('threshold-page', screenshot);
      
      expect(result.passed).toBe(true);
      expect(result.diffPercentage).toBe(0.01);
    });

    it('should fail when diff is just above threshold', async () => {
      // Mock readFile to return baseline image
      vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('mock-baseline-data'));
      
      // Mock pixelmatch to return just above threshold (1.01% of 10000 = 101 pixels)
      const pixelmatch = await import('pixelmatch');
      vi.mocked(pixelmatch.default).mockReturnValueOnce(101);
      
      const screenshot = Buffer.from('mock-screenshot-data');
      const result = await plugin.compareScreenshot('above-threshold-page', screenshot);
      
      expect(result.passed).toBe(false);
      expect(result.diffPercentage).toBeCloseTo(0.0101, 4);
    });
  });

  describe('updateBaseline', () => {
    it('should save screenshot as new baseline', async () => {
      const screenshot = Buffer.from('mock-screenshot-data');
      await plugin.updateBaseline('new-baseline', screenshot);
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('new-baseline.png'),
        screenshot
      );
      expect(logger.info).toHaveBeenCalledWith('Baseline updated', { name: 'new-baseline' });
    });

    it('should overwrite existing baseline', async () => {
      const screenshot = Buffer.from('updated-screenshot-data');
      await plugin.updateBaseline('existing-baseline', screenshot);
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('existing-baseline.png'),
        screenshot
      );
    });
  });

  describe('getBaseline', () => {
    it('should return baseline image when it exists', async () => {
      const baselineData = Buffer.from('baseline-image-data');
      vi.mocked(fs.readFile).mockResolvedValueOnce(baselineData);
      
      const result = await plugin.getBaseline('existing-page');
      
      expect(result).toEqual(baselineData);
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('existing-page.png')
      );
    });

    it('should return null when baseline does not exist', async () => {
      vi.mocked(fs.readFile).mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      
      const result = await plugin.getBaseline('non-existent-page');
      
      expect(result).toBeNull();
    });
  });

  describe('plugin lifecycle methods', () => {
    it('should handle onTestStart', async () => {
      await plugin.onTestStart('test-123', 'Visual Test');
      // Should not throw
    });

    it('should handle onTestEnd', async () => {
      await plugin.onTestEnd('test-123', 'passed', 1000);
      // Should not throw
    });

    it('should handle onStepExecuted', async () => {
      const step = createMockStepInfo();
      await plugin.onStepExecuted(step);
      // Should not throw
    });

    it('should handle onError', async () => {
      const error = new Error('Test error');
      const context = createMockErrorContext();
      await plugin.onError(error, context);
      // Should not throw
    });

    it('should handle flush', async () => {
      await plugin.flush();
      expect(logger.debug).toHaveBeenCalledWith('Visual plugin flushed');
    });

    it('should handle dispose', async () => {
      await plugin.dispose();
      expect(logger.info).toHaveBeenCalledWith('Visual plugin disposed');
    });
  });

  describe('threshold configuration', () => {
    it('should use custom threshold from config', async () => {
      const customPlugin = new VisualPlugin({ ...testConfig, threshold: 0.05 }, logger);
      await customPlugin.initialize();
      
      // Mock readFile to return baseline image
      vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('mock-baseline-data'));
      
      // Mock pixelmatch to return 4% diff (400 pixels out of 10000)
      const pixelmatch = await import('pixelmatch');
      vi.mocked(pixelmatch.default).mockReturnValueOnce(400);
      
      const screenshot = Buffer.from('mock-screenshot-data');
      const result = await customPlugin.compareScreenshot('custom-threshold', screenshot);
      
      // 4% is within 5% threshold, should pass
      expect(result.passed).toBe(true);
      
      await customPlugin.dispose();
    });

    it('should use default threshold when not specified', async () => {
      const defaultPlugin = new VisualPlugin({ enabled: true }, logger);
      await defaultPlugin.initialize();
      
      // Default threshold should be 0.01 (1%)
      expect(defaultPlugin).toBeDefined();
      
      await defaultPlugin.dispose();
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in screenshot names', async () => {
      const updatePlugin = new VisualPlugin({ ...testConfig, updateBaselines: true }, logger);
      await updatePlugin.initialize();
      
      vi.mocked(fs.readFile).mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      
      const screenshot = Buffer.from('mock-screenshot-data');
      const result = await updatePlugin.compareScreenshot('page-with-special_chars-123', screenshot);
      
      expect(result.passed).toBe(true);
      expect(result.name).toBe('page-with-special_chars-123');
      
      await updatePlugin.dispose();
    });

    it('should handle empty screenshot buffer', async () => {
      const updatePlugin = new VisualPlugin({ ...testConfig, updateBaselines: true }, logger);
      await updatePlugin.initialize();
      
      vi.mocked(fs.readFile).mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      
      const screenshot = Buffer.alloc(0);
      const result = await updatePlugin.compareScreenshot('empty-screenshot', screenshot);
      
      expect(result.passed).toBe(true);
      expect(result.baselineCreated).toBe(true);
      
      await updatePlugin.dispose();
    });

    it('should handle file system errors gracefully', async () => {
      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('Permission denied'));
      
      const screenshot = Buffer.from('mock-screenshot-data');
      
      await expect(plugin.compareScreenshot('permission-error', screenshot))
        .rejects.toThrow('Permission denied');
    });

    it('should handle mkdir errors during initialization', async () => {
      vi.mocked(fs.mkdir).mockRejectedValueOnce(new Error('Cannot create directory'));
      
      const errorPlugin = new VisualPlugin(testConfig, logger);
      
      await expect(errorPlugin.initialize()).rejects.toThrow('Cannot create directory');
    });
  });

  describe('complete visual testing workflow', () => {
    it('should support full visual testing lifecycle', async () => {
      const updatePlugin = new VisualPlugin({ ...testConfig, updateBaselines: true }, logger);
      await updatePlugin.initialize();
      
      // First run: create baseline
      vi.mocked(fs.readFile).mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      
      const screenshot1 = Buffer.from('initial-screenshot');
      const result1 = await updatePlugin.compareScreenshot('workflow-test', screenshot1);
      
      expect(result1.passed).toBe(true);
      expect(result1.baselineCreated).toBe(true);
      
      // Second run: compare against baseline (matching)
      vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from('baseline-data'));
      const pixelmatch = await import('pixelmatch');
      vi.mocked(pixelmatch.default).mockReturnValueOnce(0);
      
      const screenshot2 = Buffer.from('matching-screenshot');
      const result2 = await updatePlugin.compareScreenshot('workflow-test', screenshot2);
      
      expect(result2.passed).toBe(true);
      expect(result2.baselineCreated).toBeUndefined();
      
      await updatePlugin.dispose();
    });

    it('should handle multiple screenshots in sequence', async () => {
      const updatePlugin = new VisualPlugin({ ...testConfig, updateBaselines: true }, logger);
      await updatePlugin.initialize();
      
      const screenshots = ['page-1', 'page-2', 'page-3'];
      
      for (const name of screenshots) {
        vi.mocked(fs.readFile).mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
        
        const screenshot = Buffer.from(`screenshot-${name}`);
        const result = await updatePlugin.compareScreenshot(name, screenshot);
        
        expect(result.passed).toBe(true);
        expect(result.name).toBe(name);
      }
      
      await updatePlugin.dispose();
    });
  });
});
