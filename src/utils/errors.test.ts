/**
 * Unit tests for error utilities.
 * 
 * @requirements 10.1, 10.4
 */

import { describe, it, expect } from 'vitest';
import {
  FrameworkError,
  BrowserInitializationError,
  ActionFailedError,
  WaitTimeoutError,
  TestDataNotFoundError,
  StepConflictError,
  PluginError,
  LocatorNotFoundError,
  ConfigurationError,
} from './errors.js';

describe('FrameworkError', () => {
  it('should create error with message and context', () => {
    const error = new FrameworkError('Test error', { key: 'value' });

    expect(error.name).toBe('FrameworkError');
    expect(error.message).toBe('Test error');
    expect(error.context).toEqual({ key: 'value' });
  });

  it('should create error without context', () => {
    const error = new FrameworkError('Simple error');

    expect(error.context).toBeUndefined();
  });
});

describe('BrowserInitializationError', () => {
  it('should include browser name and attempts in message', () => {
    const error = new BrowserInitializationError(
      'Connection refused',
      'chrome',
      3,
      { port: 9222 }
    );

    expect(error.name).toBe('BrowserInitializationError');
    expect(error.browserName).toBe('chrome');
    expect(error.attempts).toBe(3);
    expect(error.message).toContain('3 attempts');
    expect(error.message).toContain('Connection refused');
    expect(error.context).toEqual({ browserName: 'chrome', attempts: 3, port: 9222 });
  });
});

describe('ActionFailedError', () => {
  it('should include action and locator in message', () => {
    const error = new ActionFailedError(
      'click',
      'Submit button',
      'Element not interactable',
      { pageUrl: 'http://localhost/login' }
    );

    expect(error.name).toBe('ActionFailedError');
    expect(error.action).toBe('click');
    expect(error.locatorDescription).toBe('Submit button');
    expect(error.message).toContain('click');
    expect(error.message).toContain('Submit button');
    expect(error.message).toContain('Element not interactable');
  });
});

describe('WaitTimeoutError', () => {
  it('should include condition and timeout in message', () => {
    const error = new WaitTimeoutError(
      'visible',
      10000,
      'Login form',
      { selector: '#login-form' }
    );

    expect(error.name).toBe('WaitTimeoutError');
    expect(error.condition).toBe('visible');
    expect(error.timeoutMs).toBe(10000);
    expect(error.locatorDescription).toBe('Login form');
    expect(error.message).toContain('visible');
    expect(error.message).toContain('10000ms');
    expect(error.message).toContain('Login form');
  });

  it('should handle missing locator description', () => {
    const error = new WaitTimeoutError('networkIdle', 5000);

    expect(error.locatorDescription).toBeUndefined();
    expect(error.message).not.toContain('for element');
  });
});

describe('TestDataNotFoundError', () => {
  it('should include data key in message', () => {
    const error = new TestDataNotFoundError('authentication.validUser');

    expect(error.name).toBe('TestDataNotFoundError');
    expect(error.dataKey).toBe('authentication.validUser');
    expect(error.message).toContain('authentication.validUser');
  });
});

describe('StepConflictError', () => {
  it('should include pattern and file paths in message', () => {
    const error = new StepConflictError(
      'I click the {string} button',
      'common.steps.ts',
      'login.steps.ts'
    );

    expect(error.name).toBe('StepConflictError');
    expect(error.pattern).toBe('I click the {string} button');
    expect(error.existingFile).toBe('common.steps.ts');
    expect(error.newFile).toBe('login.steps.ts');
    expect(error.message).toContain('I click the {string} button');
    expect(error.message).toContain('common.steps.ts');
    expect(error.message).toContain('login.steps.ts');
  });
});

describe('PluginError', () => {
  it('should include plugin name and operation in message', () => {
    const error = new PluginError(
      'metrics',
      'flush',
      'Database connection lost',
      { dbPath: './data/metrics.db' }
    );

    expect(error.name).toBe('PluginError');
    expect(error.pluginName).toBe('metrics');
    expect(error.operation).toBe('flush');
    expect(error.message).toContain('metrics');
    expect(error.message).toContain('flush');
    expect(error.message).toContain('Database connection lost');
  });
});

describe('Re-exported errors', () => {
  it('should export LocatorNotFoundError', () => {
    const error = new LocatorNotFoundError('test.locator', ['other.locator']);
    expect(error.name).toBe('LocatorNotFoundError');
  });

  it('should export ConfigurationError', () => {
    const error = new ConfigurationError('Missing config', ['key1']);
    expect(error.name).toBe('ConfigurationError');
  });
});
