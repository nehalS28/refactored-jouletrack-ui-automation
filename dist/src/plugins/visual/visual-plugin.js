/**
 * VisualPlugin implementation for visual regression testing.
 * Provides screenshot capture, baseline management, and pixel-level comparison.
 *
 * @module plugins/visual/visual-plugin
 * @requirements 17.3
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
/**
 * Default configuration values.
 */
const DEFAULT_CONFIG = {
    enabled: true,
    baselinePath: './visual-baselines',
    diffPath: './visual-diffs',
    threshold: 0.01, // 1% threshold
    updateBaselines: false,
};
/**
 * VisualPlugin implementation for visual regression testing.
 *
 * Features:
 * - Screenshot capture and comparison against baselines
 * - Pixel-level comparison using pixelmatch
 * - Configurable threshold for acceptable differences
 * - Automatic baseline creation when updateBaselines is enabled
 * - Diff image generation for failed comparisons
 *
 * @requirements 17.3
 */
export class VisualPlugin {
    name = 'visual';
    version = '1.0.0';
    config;
    logger;
    constructor(config, logger) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.logger = logger;
    }
    /**
     * Initialize the plugin and create required directories.
     */
    async initialize() {
        await fs.mkdir(this.config.baselinePath, { recursive: true });
        await fs.mkdir(this.config.diffPath, { recursive: true });
        this.logger.info('Visual plugin initialized', {
            baselinePath: this.config.baselinePath,
            diffPath: this.config.diffPath,
            threshold: this.config.threshold,
            updateBaselines: this.config.updateBaselines,
        });
    }
    /**
     * Compare a screenshot against its baseline.
     *
     * @param name - Name identifier for the screenshot
     * @param screenshot - Screenshot buffer (PNG format)
     * @returns Visual check result with pass/fail status and diff percentage
     * @requirements 17.3
     */
    async compareScreenshot(name, screenshot) {
        const baselinePath = path.join(this.config.baselinePath, `${name}.png`);
        const currentPng = PNG.sync.read(screenshot);
        try {
            const baselineBuffer = await fs.readFile(baselinePath);
            const baselinePng = PNG.sync.read(baselineBuffer);
            // Compare images
            const { width, height } = baselinePng;
            const diff = new PNG({ width, height });
            const numDiffPixels = pixelmatch(baselinePng.data, currentPng.data, diff.data, width, height, { threshold: 0.1 });
            const totalPixels = width * height;
            const diffPercentage = totalPixels > 0 ? numDiffPixels / totalPixels : 0;
            const passed = diffPercentage <= this.config.threshold;
            if (!passed) {
                // Save diff image
                const diffPath = path.join(this.config.diffPath, `${name}-diff.png`);
                await fs.writeFile(diffPath, PNG.sync.write(diff));
                this.logger.warn('Visual regression detected', {
                    name,
                    diffPercentage: (diffPercentage * 100).toFixed(2) + '%',
                    threshold: (this.config.threshold * 100).toFixed(2) + '%',
                    diffPath,
                });
            }
            else {
                this.logger.debug('Visual comparison passed', {
                    name,
                    diffPercentage: (diffPercentage * 100).toFixed(2) + '%',
                });
            }
            return { passed, diffPercentage, name };
        }
        catch (error) {
            // Check if baseline doesn't exist
            if (this.isFileNotFoundError(error)) {
                if (this.config.updateBaselines) {
                    await fs.writeFile(baselinePath, screenshot);
                    this.logger.info('Baseline created', { name });
                    return { passed: true, diffPercentage: 0, name, baselineCreated: true };
                }
                throw new Error(`No baseline found for: ${name}`);
            }
            throw error;
        }
    }
    /**
     * Update or create a baseline image.
     *
     * @param name - Name identifier for the baseline
     * @param screenshot - Screenshot buffer to save as baseline
     */
    async updateBaseline(name, screenshot) {
        const baselinePath = path.join(this.config.baselinePath, `${name}.png`);
        await fs.writeFile(baselinePath, screenshot);
        this.logger.info('Baseline updated', { name });
    }
    /**
     * Get a baseline image by name.
     *
     * @param name - Name identifier for the baseline
     * @returns Baseline buffer or null if not found
     */
    async getBaseline(name) {
        const baselinePath = path.join(this.config.baselinePath, `${name}.png`);
        try {
            return await fs.readFile(baselinePath);
        }
        catch (error) {
            if (this.isFileNotFoundError(error)) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Called when a test starts.
     * Visual plugin doesn't need to track test lifecycle.
     *
     * @param _testId - Unique test identifier
     * @param _testName - Human-readable test name
     */
    async onTestStart(_testId, _testName) {
        // Visual plugin doesn't need to track test lifecycle
    }
    /**
     * Called when a test ends.
     * Visual plugin doesn't need to track test lifecycle.
     *
     * @param _testId - Unique test identifier
     * @param _status - Test execution status
     * @param _duration - Test execution duration in milliseconds
     */
    async onTestEnd(_testId, _status, _duration) {
        // Visual plugin doesn't need to track test lifecycle
    }
    /**
     * Called after each step is executed.
     * Visual plugin doesn't need to track step execution.
     *
     * @param _step - Step execution information
     */
    async onStepExecuted(_step) {
        // Visual plugin doesn't need to track step execution
    }
    /**
     * Called when an error occurs.
     * Visual plugin doesn't need to handle errors.
     *
     * @param _error - The error that occurred
     * @param _context - Error context information
     */
    async onError(_error, _context) {
        // Visual plugin doesn't need to handle errors
    }
    /**
     * Flush any buffered data.
     */
    async flush() {
        this.logger.debug('Visual plugin flushed');
    }
    /**
     * Dispose the plugin and clean up resources.
     */
    async dispose() {
        this.logger.info('Visual plugin disposed');
    }
    /**
     * Check if an error is a file not found error.
     */
    isFileNotFoundError(error) {
        return (error instanceof Error &&
            'code' in error &&
            error.code === 'ENOENT');
    }
}
//# sourceMappingURL=visual-plugin.js.map