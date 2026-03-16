/**
 * Unit tests for core type definitions.
 * Validates type safety and error handling.
 * 
 * @requirements 14.1, 14.2, 14.4
 */

import { describe, it, expect } from 'vitest';
import {
  LocatorNotFoundError,
  ConfigurationError,
  type Locator,
  type FrameworkConfig,
  type TestContext,
  type Plugin,
  type TestStatus,
} from './index.js';

describe('Locator Types', () => {
  it('should create a valid Locator object', () => {
    const locator: Locator = {
      selector: "[data-testid='username-input']",
      strategy: 'data-testid',
      description: 'Username input field',
      timeout: 5000,
    };

    expect(locator.selector).toBe("[data-testid='username-input']");
    expect(locator.strategy).toBe('data-testid');
    expect(locator.description).toBe('Username input field');
    expect(locator.timeout).toBe(5000);
  });

  it('should create a Locator without optional timeout', () => {
    const locator: Locator = {
      selector: 'button[type="submit"]',
      strategy: 'css',
      description: 'Submit button',
    };

    expect(locator.timeout).toBeUndefined();
  });

  it('should throw LocatorNotFoundError with suggestions', () => {
    const availableKeys = ['login.username', 'login.password', 'login.submit'];
    const error = new LocatorNotFoundError('login.email', availableKeys);

    expect(error.name).toBe('LocatorNotFoundError');
    expect(error.locatorKey).toBe('login.email');
    expect(error.availableKeys).toEqual(availableKeys);
    expect(error.message).toContain('login.email');
    expect(error.message).toContain('login.username');
  });

  it('should handle empty available keys in LocatorNotFoundError', () => {
    const error = new LocatorNotFoundError('missing.locator', []);

    expect(error.message).toContain('No locators available');
  });
});

describe('Configuration Types', () => {
  it('should create a valid FrameworkConfig object', () => {
    const config: FrameworkConfig = {
      environment: 'local',
      baseUrl: 'http://localhost:3000',
      browser: {
        name: 'chrome',
        headless: false,
        windowSize: { width: 1920, height: 1080 },
        args: [],
      },
      timeouts: {
        implicit: 0,
        explicit: 10000,
        pageLoad: 30000,
        script: 10000,
        polling: 200,
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
        level: 'debug',
        structured: false,
      },
    };

    expect(config.environment).toBe('local');
    expect(config.browser.name).toBe('chrome');
    expect(config.timeouts.explicit).toBe(10000);
  });

  it('should throw ConfigurationError with missing keys', () => {
    const missingKeys = ['baseUrl', 'browser.name'];
    const error = new ConfigurationError('Invalid configuration', missingKeys);

    expect(error.name).toBe('ConfigurationError');
    expect(error.missingKeys).toEqual(missingKeys);
    expect(error.message).toContain('baseUrl');
    expect(error.message).toContain('browser.name');
  });

  it('should handle ConfigurationError without missing keys', () => {
    const error = new ConfigurationError('General configuration error');

    expect(error.missingKeys).toBeUndefined();
    expect(error.message).toBe('General configuration error');
  });
});

describe('Plugin Types', () => {
  it('should validate TestStatus type', () => {
    const statuses: TestStatus[] = ['passed', 'failed', 'skipped', 'pending'];

    expect(statuses).toHaveLength(4);
    expect(statuses).toContain('passed');
    expect(statuses).toContain('failed');
  });

  it('should define Plugin interface structure', () => {
    // Type-level test: verify Plugin interface has required properties
    const mockPlugin: Plugin = {
      name: 'test-plugin',
      version: '1.0.0',
      initialize: async () => {},
      onTestStart: async () => {},
      onTestEnd: async () => {},
      onStepExecuted: async () => {},
      onError: async () => {},
      flush: async () => {},
      dispose: async () => {},
    };

    expect(mockPlugin.name).toBe('test-plugin');
    expect(mockPlugin.version).toBe('1.0.0');
    expect(typeof mockPlugin.initialize).toBe('function');
  });
});

describe('Context Types', () => {
  it('should validate TestContext interface structure', () => {
    // This is a compile-time type check
    // TestContext requires specific readonly properties
    type TestContextKeys = keyof TestContext;
    const requiredKeys: TestContextKeys[] = [
      'id',
      'workerId',
      'driver',
      'config',
      'logger',
      'actions',
      'wait',
      'locators',
      'plugins',
      'correlationId',
    ];

    expect(requiredKeys).toHaveLength(10);
  });
});
