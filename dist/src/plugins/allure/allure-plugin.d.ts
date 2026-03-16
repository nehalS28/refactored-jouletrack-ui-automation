/**
 * AllurePlugin implementation for generating Allure-compatible test reports.
 * Provides step-by-step execution details, screenshots, and custom attachments.
 *
 * @module plugins/allure/allure-plugin
 * @requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */
import type { Plugin, TestStatus, StepInfo, ErrorContext } from '../plugin.types.js';
import type { StructuredLogger } from '../../types/context.types.js';
/**
 * Configuration for the AllurePlugin.
 */
export interface AllurePluginConfig {
    readonly enabled: boolean;
    readonly resultsDir: string;
    readonly attachScreenshotsOnFailure: boolean;
    readonly environmentInfo?: Record<string, string>;
}
/**
 * AllurePlugin implementation for generating Allure-compatible test reports.
 *
 * Features:
 * - Generate Allure-compatible JSON result files
 * - Record step-by-step execution details
 * - Attach screenshots on test failure
 * - Support custom attachments (logs, API responses)
 * - Categorize tests by feature, severity, domain
 * - Display environment information in reports
 *
 * @requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */
export declare class AllurePlugin implements Plugin {
    readonly name = "allure";
    readonly version = "1.0.0";
    private readonly config;
    private readonly logger;
    private currentResult;
    private attachmentCounter;
    constructor(config: Partial<AllurePluginConfig> | undefined, logger: StructuredLogger);
    /**
     * Initialize the plugin and create results directory.
     */
    initialize(): Promise<void>;
    /**
     * Called when a test starts.
     * Creates a new result builder for the test.
     *
     * @param testId - Unique test identifier
     * @param testName - Human-readable test name
     */
    onTestStart(testId: string, testName: string): Promise<void>;
    /**
     * Called when a test ends.
     * Writes the Allure result file.
     *
     * @param testId - Unique test identifier
     * @param status - Test execution status
     * @param duration - Test execution duration in milliseconds
     */
    onTestEnd(testId: string, status: TestStatus, duration: number): Promise<void>;
    /**
     * Called after each step is executed.
     * Records step details in the Allure result.
     *
     * @param step - Step execution information
     */
    onStepExecuted(step: StepInfo): Promise<void>;
    /**
     * Called when an error occurs.
     * Attaches screenshot if available and configured.
     *
     * @param error - The error that occurred
     * @param context - Error context information
     */
    onError(error: Error, context: ErrorContext): Promise<void>;
    /**
     * Add a custom attachment to the current test result.
     *
     * @param name - Attachment name
     * @param content - Attachment content
     * @param type - MIME type of the attachment
     * @requirements 11.3
     */
    addAttachment(name: string, content: string, type: string): Promise<void>;
    /**
     * Add a label to the current test result for categorization.
     *
     * @param name - Label name (feature, severity, suite, epic, etc.)
     * @param value - Label value
     * @requirements 11.4
     */
    addLabel(name: string, value: string): void;
    /**
     * Flush any buffered data.
     */
    flush(): Promise<void>;
    /**
     * Dispose the plugin and clean up resources.
     */
    dispose(): Promise<void>;
    /**
     * Get file extension for a MIME type.
     */
    private getExtensionForMimeType;
}
//# sourceMappingURL=allure-plugin.d.ts.map