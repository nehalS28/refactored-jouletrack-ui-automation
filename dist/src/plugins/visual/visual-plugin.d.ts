/**
 * VisualPlugin implementation for visual regression testing.
 * Provides screenshot capture, baseline management, and pixel-level comparison.
 *
 * @module plugins/visual/visual-plugin
 * @requirements 17.3
 */
import type { Plugin, TestStatus, StepInfo, ErrorContext, VisualCheckResult } from '../plugin.types.js';
import type { StructuredLogger } from '../../types/context.types.js';
/**
 * Configuration for the VisualPlugin.
 */
export interface VisualPluginConfig {
    readonly enabled: boolean;
    readonly baselinePath: string;
    readonly diffPath: string;
    readonly threshold: number;
    readonly updateBaselines: boolean;
}
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
export declare class VisualPlugin implements Plugin {
    readonly name = "visual";
    readonly version = "1.0.0";
    private readonly config;
    private readonly logger;
    constructor(config: Partial<VisualPluginConfig> | undefined, logger: StructuredLogger);
    /**
     * Initialize the plugin and create required directories.
     */
    initialize(): Promise<void>;
    /**
     * Compare a screenshot against its baseline.
     *
     * @param name - Name identifier for the screenshot
     * @param screenshot - Screenshot buffer (PNG format)
     * @returns Visual check result with pass/fail status and diff percentage
     * @requirements 17.3
     */
    compareScreenshot(name: string, screenshot: Buffer): Promise<VisualCheckResult>;
    /**
     * Update or create a baseline image.
     *
     * @param name - Name identifier for the baseline
     * @param screenshot - Screenshot buffer to save as baseline
     */
    updateBaseline(name: string, screenshot: Buffer): Promise<void>;
    /**
     * Get a baseline image by name.
     *
     * @param name - Name identifier for the baseline
     * @returns Baseline buffer or null if not found
     */
    getBaseline(name: string): Promise<Buffer | null>;
    /**
     * Called when a test starts.
     * Visual plugin doesn't need to track test lifecycle.
     *
     * @param _testId - Unique test identifier
     * @param _testName - Human-readable test name
     */
    onTestStart(_testId: string, _testName: string): Promise<void>;
    /**
     * Called when a test ends.
     * Visual plugin doesn't need to track test lifecycle.
     *
     * @param _testId - Unique test identifier
     * @param _status - Test execution status
     * @param _duration - Test execution duration in milliseconds
     */
    onTestEnd(_testId: string, _status: TestStatus, _duration: number): Promise<void>;
    /**
     * Called after each step is executed.
     * Visual plugin doesn't need to track step execution.
     *
     * @param _step - Step execution information
     */
    onStepExecuted(_step: StepInfo): Promise<void>;
    /**
     * Called when an error occurs.
     * Visual plugin doesn't need to handle errors.
     *
     * @param _error - The error that occurred
     * @param _context - Error context information
     */
    onError(_error: Error, _context: ErrorContext): Promise<void>;
    /**
     * Flush any buffered data.
     */
    flush(): Promise<void>;
    /**
     * Dispose the plugin and clean up resources.
     */
    dispose(): Promise<void>;
    /**
     * Check if an error is a file not found error.
     */
    private isFileNotFoundError;
}
//# sourceMappingURL=visual-plugin.d.ts.map