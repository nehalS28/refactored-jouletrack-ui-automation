/**
 * AllurePlugin implementation for generating Allure-compatible test reports.
 * Provides step-by-step execution details, screenshots, and custom attachments.
 * 
 * @module plugins/allure/allure-plugin
 * @requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

import type { Plugin, TestStatus, StepInfo, ErrorContext } from '../plugin.types.js';
import type { StructuredLogger } from '../../types/context.types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

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
 * Default configuration values.
 */
const DEFAULT_CONFIG: AllurePluginConfig = {
  enabled: true,
  resultsDir: './allure-results',
  attachScreenshotsOnFailure: true,
};

/**
 * Allure step result structure.
 */
interface AllureStep {
  readonly name: string;
  readonly status: string;
  readonly start: number;
  readonly stop: number;
  readonly statusDetails?: {
    readonly message?: string | undefined;
    readonly trace?: string | undefined;
  };
  readonly attachments?: readonly AllureAttachment[];
}

/**
 * Allure attachment structure.
 */
interface AllureAttachment {
  readonly name: string;
  readonly source: string;
  readonly type: string;
}

/**
 * Allure label structure.
 */
interface AllureLabel {
  readonly name: string;
  readonly value: string;
}

/**
 * Allure parameter structure.
 */
interface AllureParameter {
  readonly name: string;
  readonly value: string;
}

/**
 * Allure test result structure.
 */
interface AllureResult {
  uuid: string;
  historyId: string;
  name: string;
  fullName: string;
  status: string;
  start: number;
  stop: number;
  steps: AllureStep[];
  attachments: AllureAttachment[];
  labels: AllureLabel[];
  parameters: AllureParameter[];
  statusDetails?: {
    message?: string | undefined;
    trace?: string | undefined;
  };
}

/**
 * Builder class for accumulating test result data during test execution.
 */
class AllureResultBuilder {
  private readonly uuid: string;
  private readonly testId: string;
  private readonly testName: string;
  private readonly startTime: number;
  private readonly steps: AllureStep[] = [];
  private readonly attachments: AllureAttachment[] = [];
  private readonly labels: AllureLabel[] = [];
  private statusDetails?: { message?: string | undefined; trace?: string | undefined };

  constructor(testId: string, testName: string) {
    this.uuid = randomUUID();
    this.testId = testId;
    this.testName = testName;
    this.startTime = Date.now();
  }

  getUuid(): string {
    return this.uuid;
  }

  addStep(step: StepInfo): void {
    const allureStep: AllureStep = {
      name: `${step.type} ${step.text}`,
      status: this.mapStatus(step.status),
      start: Date.now() - step.duration,
      stop: Date.now(),
      ...(step.error && {
        statusDetails: {
          message: step.error.message,
          trace: step.error.stack,
        },
      }),
    };
    this.steps.push(allureStep);
  }

  addAttachment(name: string, source: string, type: string): void {
    this.attachments.push({ name, source, type });
  }

  addLabel(name: string, value: string): void {
    this.labels.push({ name, value });
  }

  setStatusDetails(message: string, trace?: string | undefined): void {
    this.statusDetails = { message, trace };
  }

  build(status: TestStatus, durationMs: number, parameters: AllureParameter[]): AllureResult {
    const stopTime = this.startTime + durationMs;
    
    return {
      uuid: this.uuid,
      historyId: this.testId,
      name: this.testName,
      fullName: this.testName,
      status: this.mapStatus(status),
      start: this.startTime,
      stop: stopTime,
      steps: [...this.steps],
      attachments: [...this.attachments],
      labels: [...this.labels],
      parameters,
      ...(this.statusDetails && { statusDetails: this.statusDetails }),
    };
  }

  private mapStatus(status: TestStatus): string {
    switch (status) {
      case 'passed':
        return 'passed';
      case 'failed':
        return 'failed';
      case 'skipped':
        return 'skipped';
      case 'pending':
        return 'broken';
      default:
        return 'unknown';
    }
  }
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
export class AllurePlugin implements Plugin {
  readonly name = 'allure';
  readonly version = '1.0.0';

  private readonly config: AllurePluginConfig;
  private readonly logger: StructuredLogger;
  private currentResult: AllureResultBuilder | null = null;
  private attachmentCounter = 0;

  constructor(config: Partial<AllurePluginConfig> | undefined, logger: StructuredLogger) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = logger;
  }

  /**
   * Initialize the plugin and create results directory.
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.config.resultsDir, { recursive: true });
    this.logger.info('Allure plugin initialized', {
      resultsDir: this.config.resultsDir,
      attachScreenshotsOnFailure: this.config.attachScreenshotsOnFailure,
    });
  }

  /**
   * Called when a test starts.
   * Creates a new result builder for the test.
   * 
   * @param testId - Unique test identifier
   * @param testName - Human-readable test name
   */
  async onTestStart(testId: string, testName: string): Promise<void> {
    this.currentResult = new AllureResultBuilder(testId, testName);
    this.logger.debug('Allure test started', { testId, testName });
  }

  /**
   * Called when a test ends.
   * Writes the Allure result file.
   * 
   * @param testId - Unique test identifier
   * @param status - Test execution status
   * @param duration - Test execution duration in milliseconds
   */
  async onTestEnd(testId: string, status: TestStatus, duration: number): Promise<void> {
    if (!this.currentResult) {
      this.logger.warn('No current Allure test result', { testId });
      return;
    }

    // Build environment parameters
    const parameters: AllureParameter[] = this.config.environmentInfo
      ? Object.entries(this.config.environmentInfo).map(([name, value]) => ({ name, value }))
      : [];

    const result = this.currentResult.build(status, duration, parameters);
    
    // Write result file
    const filename = `${result.uuid}-result.json`;
    const filepath = path.join(this.config.resultsDir, filename);
    
    try {
      await fs.writeFile(filepath, JSON.stringify(result, null, 2));
      this.logger.debug('Allure result written', { testId, filepath });
    } catch (error) {
      this.logger.error('Failed to write Allure result', {
        testId,
        filepath,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    this.currentResult = null;
  }

  /**
   * Called after each step is executed.
   * Records step details in the Allure result.
   * 
   * @param step - Step execution information
   */
  async onStepExecuted(step: StepInfo): Promise<void> {
    if (!this.currentResult) {
      return;
    }

    this.currentResult.addStep(step);
    this.logger.debug('Allure step recorded', {
      stepId: step.id,
      text: step.text,
      status: step.status,
    });
  }

  /**
   * Called when an error occurs.
   * Attaches screenshot if available and configured.
   * 
   * @param error - The error that occurred
   * @param context - Error context information
   */
  async onError(error: Error, context: ErrorContext): Promise<void> {
    if (!this.currentResult) {
      return;
    }

    // Set error details
    this.currentResult.setStatusDetails(error.message, error.stack);

    // Attach screenshot if available and configured
    if (this.config.attachScreenshotsOnFailure && context.screenshot) {
      try {
        const screenshotContent = await fs.readFile(context.screenshot);
        const attachmentName = `screenshot-${++this.attachmentCounter}.png`;
        const attachmentPath = path.join(this.config.resultsDir, attachmentName);
        await fs.writeFile(attachmentPath, screenshotContent);
        
        this.currentResult.addAttachment('Screenshot on failure', attachmentName, 'image/png');
        this.logger.debug('Screenshot attached to Allure result', {
          testId: context.testId,
          attachment: attachmentName,
        });
      } catch (err) {
        this.logger.warn('Failed to attach screenshot', {
          testId: context.testId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  /**
   * Add a custom attachment to the current test result.
   * 
   * @param name - Attachment name
   * @param content - Attachment content
   * @param type - MIME type of the attachment
   * @requirements 11.3
   */
  async addAttachment(name: string, content: string, type: string): Promise<void> {
    if (!this.currentResult) {
      return;
    }

    const extension = this.getExtensionForMimeType(type);
    const attachmentName = `attachment-${++this.attachmentCounter}${extension}`;
    const attachmentPath = path.join(this.config.resultsDir, attachmentName);
    
    try {
      await fs.writeFile(attachmentPath, content);
      this.currentResult.addAttachment(name, attachmentName, type);
      this.logger.debug('Custom attachment added', { name, type, file: attachmentName });
    } catch (err) {
      this.logger.warn('Failed to add attachment', {
        name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Add a label to the current test result for categorization.
   * 
   * @param name - Label name (feature, severity, suite, epic, etc.)
   * @param value - Label value
   * @requirements 11.4
   */
  addLabel(name: string, value: string): void {
    if (!this.currentResult) {
      return;
    }

    this.currentResult.addLabel(name, value);
    this.logger.debug('Label added to Allure result', { name, value });
  }

  /**
   * Flush any buffered data.
   */
  async flush(): Promise<void> {
    this.logger.debug('Allure results flushed');
  }

  /**
   * Dispose the plugin and clean up resources.
   */
  async dispose(): Promise<void> {
    this.currentResult = null;
    this.logger.info('Allure plugin disposed');
  }

  /**
   * Get file extension for a MIME type.
   */
  private getExtensionForMimeType(mimeType: string): string {
    const mimeToExtension: Record<string, string> = {
      'application/json': '.json',
      'text/plain': '.txt',
      'text/html': '.html',
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'application/xml': '.xml',
    };
    return mimeToExtension[mimeType] ?? '.bin';
  }
}
