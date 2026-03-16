/**
 * Unit tests for the StructuredLogger implementation.
 * 
 * @module core/logger.test
 * @requirements 10.1, 10.2, 10.3, 10.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StructuredLoggerImpl, createStructuredLogger, maskSensitiveData, type LoggerConfig } from './logger.js';

describe('StructuredLogger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let logOutput: string[];

  beforeEach(() => {
    logOutput = [];
    consoleSpy = vi.spyOn(console, 'log').mockImplementation((msg: string) => {
      logOutput.push(msg);
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const createTestLogger = (level: LoggerConfig['level'] = 'debug'): StructuredLoggerImpl => {
    return new StructuredLoggerImpl({
      workerId: 'worker-1',
      correlationId: 'corr-123',
      level,
    });
  };

  describe('log level filtering', () => {
    /**
     * @requirements 10.2
     */
    it('should log debug messages when level is debug', () => {
      const logger = createTestLogger('debug');
      logger.debug('test message');
      
      expect(logOutput).toHaveLength(1);
      const entry = JSON.parse(logOutput[0]);
      expect(entry.level).toBe('debug');
      expect(entry.message).toBe('test message');
    });

    /**
     * @requirements 10.2
     */
    it('should not log debug messages when level is info', () => {
      const logger = createTestLogger('info');
      logger.debug('test message');
      
      expect(logOutput).toHaveLength(0);
    });

    /**
     * @requirements 10.2
     */
    it('should log info messages when level is info', () => {
      const logger = createTestLogger('info');
      logger.info('test message');
      
      expect(logOutput).toHaveLength(1);
      const entry = JSON.parse(logOutput[0]);
      expect(entry.level).toBe('info');
    });

    /**
     * @requirements 10.2
     */
    it('should not log info messages when level is warn', () => {
      const logger = createTestLogger('warn');
      logger.info('test message');
      
      expect(logOutput).toHaveLength(0);
    });

    /**
     * @requirements 10.2
     */
    it('should log warn messages when level is warn', () => {
      const logger = createTestLogger('warn');
      logger.warn('test message');
      
      expect(logOutput).toHaveLength(1);
      const entry = JSON.parse(logOutput[0]);
      expect(entry.level).toBe('warn');
    });

    /**
     * @requirements 10.2
     */
    it('should not log warn messages when level is error', () => {
      const logger = createTestLogger('error');
      logger.warn('test message');
      
      expect(logOutput).toHaveLength(0);
    });

    /**
     * @requirements 10.2
     */
    it('should always log error messages regardless of level', () => {
      const logger = createTestLogger('error');
      logger.error('test error');
      
      expect(logOutput).toHaveLength(1);
      const entry = JSON.parse(logOutput[0]);
      expect(entry.level).toBe('error');
    });
  });

  describe('structured JSON output', () => {
    /**
     * @requirements 10.1
     */
    it('should output valid JSON', () => {
      const logger = createTestLogger();
      logger.info('test message');
      
      expect(() => JSON.parse(logOutput[0])).not.toThrow();
    });

    /**
     * @requirements 10.1, 10.3
     */
    it('should include required fields in log entry', () => {
      const logger = createTestLogger();
      logger.info('test message');
      
      const entry = JSON.parse(logOutput[0]);
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('level', 'info');
      expect(entry).toHaveProperty('message', 'test message');
      expect(entry).toHaveProperty('workerId', 'worker-1');
      expect(entry).toHaveProperty('correlationId', 'corr-123');
    });

    /**
     * @requirements 10.1
     */
    it('should include ISO 8601 timestamp', () => {
      const logger = createTestLogger();
      logger.info('test message');
      
      const entry = JSON.parse(logOutput[0]);
      const timestamp = new Date(entry.timestamp);
      expect(timestamp.toISOString()).toBe(entry.timestamp);
    });

    /**
     * @requirements 10.1
     */
    it('should include additional data in log entry', () => {
      const logger = createTestLogger();
      logger.info('test message', { action: 'click', element: 'button' });
      
      const entry = JSON.parse(logOutput[0]);
      expect(entry.action).toBe('click');
      expect(entry.element).toBe('button');
    });
  });

  describe('correlation IDs', () => {
    /**
     * @requirements 10.3
     */
    it('should include workerId in all log entries', () => {
      const logger = new StructuredLoggerImpl({
        workerId: 'worker-42',
        correlationId: 'corr-abc',
        level: 'debug',
      });
      
      logger.info('test');
      logger.warn('test');
      logger.error('test');
      
      logOutput.forEach(output => {
        const entry = JSON.parse(output);
        expect(entry.workerId).toBe('worker-42');
      });
    });

    /**
     * @requirements 10.3
     */
    it('should include correlationId in all log entries', () => {
      const logger = new StructuredLoggerImpl({
        workerId: 'worker-1',
        correlationId: 'corr-xyz-789',
        level: 'debug',
      });
      
      logger.info('test');
      logger.warn('test');
      logger.error('test');
      
      logOutput.forEach(output => {
        const entry = JSON.parse(output);
        expect(entry.correlationId).toBe('corr-xyz-789');
      });
    });

    /**
     * @requirements 10.3
     */
    it('should include testId when set', () => {
      const logger = createTestLogger();
      logger.setTestId('test-123');
      logger.info('test message');
      
      const entry = JSON.parse(logOutput[0]);
      expect(entry.testId).toBe('test-123');
    });

    /**
     * @requirements 10.3
     */
    it('should not include testId when not set', () => {
      const logger = createTestLogger();
      logger.info('test message');
      
      const entry = JSON.parse(logOutput[0]);
      expect(entry.testId).toBeUndefined();
    });

    /**
     * @requirements 10.3
     */
    it('should clear testId when clearTestId is called', () => {
      const logger = createTestLogger();
      logger.setTestId('test-123');
      logger.info('with testId');
      logger.clearTestId();
      logger.info('without testId');
      
      const entry1 = JSON.parse(logOutput[0]);
      const entry2 = JSON.parse(logOutput[1]);
      
      expect(entry1.testId).toBe('test-123');
      expect(entry2.testId).toBeUndefined();
    });
  });

  describe('sensitive data masking', () => {
    /**
     * @requirements 10.6
     */
    it('should mask password fields', () => {
      const logger = createTestLogger();
      logger.info('login attempt', { username: 'user1', password: 'secret123' });
      
      const entry = JSON.parse(logOutput[0]);
      expect(entry.username).toBe('user1');
      expect(entry.password).toBe('[REDACTED]');
    });

    /**
     * @requirements 10.6
     */
    it('should mask token fields', () => {
      const logger = createTestLogger();
      logger.info('auth', { accessToken: 'abc123', refreshToken: 'xyz789' });
      
      const entry = JSON.parse(logOutput[0]);
      expect(entry.accessToken).toBe('[REDACTED]');
      expect(entry.refreshToken).toBe('[REDACTED]');
    });

    /**
     * @requirements 10.6
     */
    it('should mask api key fields', () => {
      const logger = createTestLogger();
      logger.info('api call', { apiKey: 'key123', api_key: 'key456' });
      
      const entry = JSON.parse(logOutput[0]);
      expect(entry.apiKey).toBe('[REDACTED]');
      expect(entry.api_key).toBe('[REDACTED]');
    });

    /**
     * @requirements 10.6
     */
    it('should mask authorization headers', () => {
      const logger = createTestLogger();
      logger.info('request', { authorization: 'Bearer token123' });
      
      const entry = JSON.parse(logOutput[0]);
      expect(entry.authorization).toBe('[REDACTED]');
    });

    /**
     * @requirements 10.6
     */
    it('should mask nested sensitive fields', () => {
      const logger = createTestLogger();
      logger.info('nested data', {
        user: {
          name: 'John',
          credentials: {
            password: 'secret',
            apiKey: 'key123',
          },
        },
      });
      
      const entry = JSON.parse(logOutput[0]);
      expect(entry.user.name).toBe('John');
      expect(entry.user.credentials.password).toBe('[REDACTED]');
      expect(entry.user.credentials.apiKey).toBe('[REDACTED]');
    });

    /**
     * @requirements 10.6
     */
    it('should mask sensitive fields in arrays', () => {
      const logger = createTestLogger();
      logger.info('array data', {
        users: [
          { name: 'User1', password: 'pass1' },
          { name: 'User2', password: 'pass2' },
        ],
      });
      
      const entry = JSON.parse(logOutput[0]);
      expect(entry.users[0].name).toBe('User1');
      expect(entry.users[0].password).toBe('[REDACTED]');
      expect(entry.users[1].name).toBe('User2');
      expect(entry.users[1].password).toBe('[REDACTED]');
    });

    /**
     * @requirements 10.6
     */
    it('should be case-insensitive when matching sensitive keys', () => {
      const logger = createTestLogger();
      logger.info('mixed case', {
        PASSWORD: 'secret1',
        Password: 'secret2',
        passWord: 'secret3',
      });
      
      const entry = JSON.parse(logOutput[0]);
      expect(entry.PASSWORD).toBe('[REDACTED]');
      expect(entry.Password).toBe('[REDACTED]');
      expect(entry.passWord).toBe('[REDACTED]');
    });

    /**
     * @requirements 10.6
     */
    it('should mask fields containing sensitive keywords', () => {
      const logger = createTestLogger();
      logger.info('partial match', {
        userPassword: 'secret',
        authToken: 'token123',
        privateKey: 'key456',
      });
      
      const entry = JSON.parse(logOutput[0]);
      expect(entry.userPassword).toBe('[REDACTED]');
      expect(entry.authToken).toBe('[REDACTED]');
      expect(entry.privateKey).toBe('[REDACTED]');
    });
  });

  describe('createStructuredLogger factory', () => {
    it('should create a working logger instance', () => {
      const logger = createStructuredLogger({
        workerId: 'factory-worker',
        correlationId: 'factory-corr',
        level: 'info',
      });
      
      logger.info('factory test');
      
      const entry = JSON.parse(logOutput[0]);
      expect(entry.workerId).toBe('factory-worker');
      expect(entry.correlationId).toBe('factory-corr');
    });
  });

  describe('maskSensitiveData function', () => {
    /**
     * @requirements 10.6
     */
    it('should return a new object without mutating the original', () => {
      const original = { password: 'secret', name: 'test' };
      const masked = maskSensitiveData(original);
      
      expect(original.password).toBe('secret');
      expect(masked.password).toBe('[REDACTED]');
      expect(masked.name).toBe('test');
    });

    /**
     * @requirements 10.6
     */
    it('should handle empty objects', () => {
      const result = maskSensitiveData({});
      expect(result).toEqual({});
    });

    /**
     * @requirements 10.6
     */
    it('should preserve non-sensitive primitive values', () => {
      const data = {
        string: 'hello',
        number: 42,
        boolean: true,
        nullValue: null,
      };
      
      const result = maskSensitiveData(data);
      expect(result.string).toBe('hello');
      expect(result.number).toBe(42);
      expect(result.boolean).toBe(true);
      expect(result.nullValue).toBeNull();
    });

    /**
     * @requirements 10.6
     */
    it('should handle deeply nested objects', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              secret: 'hidden',
              visible: 'shown',
            },
          },
        },
      };
      
      const result = maskSensitiveData(data);
      expect((result.level1 as any).level2.level3.secret).toBe('[REDACTED]');
      expect((result.level1 as any).level2.level3.visible).toBe('shown');
    });

    /**
     * @requirements 10.6
     */
    it('should handle arrays with mixed content', () => {
      const data = {
        items: [
          'string',
          123,
          { password: 'secret' },
          [{ token: 'abc' }],
        ],
      };
      
      const result = maskSensitiveData(data);
      expect((result.items as any)[0]).toBe('string');
      expect((result.items as any)[1]).toBe(123);
      expect((result.items as any)[2].password).toBe('[REDACTED]');
      expect((result.items as any)[3][0].token).toBe('[REDACTED]');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined data parameter', () => {
      const logger = createTestLogger();
      logger.info('no data');
      
      const entry = JSON.parse(logOutput[0]);
      expect(entry.message).toBe('no data');
    });

    it('should handle empty string messages', () => {
      const logger = createTestLogger();
      logger.info('');
      
      const entry = JSON.parse(logOutput[0]);
      expect(entry.message).toBe('');
    });

    it('should handle special characters in messages', () => {
      const logger = createTestLogger();
      logger.info('Message with "quotes" and \\ backslash');
      
      expect(() => JSON.parse(logOutput[0])).not.toThrow();
    });

    it('should handle unicode characters', () => {
      const logger = createTestLogger();
      logger.info('Unicode: 日本語 🎉 émojis');
      
      const entry = JSON.parse(logOutput[0]);
      expect(entry.message).toBe('Unicode: 日本語 🎉 émojis');
    });
  });
});
