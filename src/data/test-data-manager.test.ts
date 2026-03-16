/**
 * Unit tests for TestDataManager.
 * Tests data loading, environment variable resolution, error handling, and sensitive data masking.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TestDataManager } from './test-data-manager.js';
import { ConfigurationError, TestDataNotFoundError } from '../utils/errors.js';
import type { StructuredLogger } from '../types/context.types.js';
import type { Environment } from '../types/config.types.js';

// Mock logger
const createMockLogger = (): StructuredLogger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  setTestId: vi.fn(),
  clearTestId: vi.fn()
});

describe('TestDataManager', () => {
  let tempDir: string;
  let mockLogger: StructuredLogger;
  const originalEnv = process.env;

  beforeEach(() => {
    // Create temporary fixtures directory
    tempDir = path.join(process.cwd(), 'test-fixtures-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });
    
    mockLogger = createMockLogger();
    
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    // Restore environment
    process.env = originalEnv;
  });

  describe('Data Loading', () => {
    it('should load test data from YAML files', () => {
      // Create test fixture
      const fixtureContent = `
testKey:
  value:
    field1: "value1"
    field2: "value2"
  sensitive: false
`;
      fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

      const manager = new TestDataManager('local', mockLogger, tempDir);
      const data = manager.get<{ field1: string; field2: string }>('test', 'testKey');

      expect(data).toEqual({ field1: 'value1', field2: 'value2' });
    });

    it('should load multiple YAML files', () => {
      fs.writeFileSync(path.join(tempDir, 'domain1.yaml'), 'key1:\n  value: "data1"');
      fs.writeFileSync(path.join(tempDir, 'domain2.yaml'), 'key2:\n  value: "data2"');

      const manager = new TestDataManager('local', mockLogger, tempDir);
      
      expect(manager.get<string>('domain1', 'key1')).toBe('data1');
      expect(manager.get<string>('domain2', 'key2')).toBe('data2');
    });

    it('should throw ConfigurationError if fixtures directory does not exist', () => {
      const invalidPath = path.join(tempDir, 'nonexistent');
      
      expect(() => {
        new TestDataManager('local', mockLogger, invalidPath);
      }).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for invalid YAML syntax', () => {
      fs.writeFileSync(path.join(tempDir, 'invalid.yaml'), 'invalid: yaml: syntax:');
      
      expect(() => {
        new TestDataManager('local', mockLogger, tempDir);
      }).toThrow(ConfigurationError);
    });
  });

  describe('Environment Variable Resolution', () => {
    it('should resolve environment variables in strings', () => {
      process.env.TEST_VAR = 'resolved-value';
      
      const fixtureContent = `
testKey:
  value: "\${TEST_VAR}"
`;
      fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

      const manager = new TestDataManager('local', mockLogger, tempDir);
      const data = manager.get<string>('test', 'testKey');

      expect(data).toBe('resolved-value');
    });

    it('should resolve multiple environment variables in a string', () => {
      process.env.VAR1 = 'hello';
      process.env.VAR2 = 'world';
      
      const fixtureContent = `
testKey:
  value: "\${VAR1} \${VAR2}"
`;
      fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

      const manager = new TestDataManager('local', mockLogger, tempDir);
      const data = manager.get<string>('test', 'testKey');

      expect(data).toBe('hello world');
    });

    it('should resolve environment variables in nested objects', () => {
      process.env.USERNAME = 'testuser';
      process.env.PASSWORD = 'testpass';
      
      const fixtureContent = `
credentials:
  value:
    username: "\${USERNAME}"
    password: "\${PASSWORD}"
`;
      fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

      const manager = new TestDataManager('local', mockLogger, tempDir);
      const data = manager.get<{ username: string; password: string }>('test', 'credentials');

      expect(data).toEqual({ username: 'testuser', password: 'testpass' });
    });

    it('should resolve environment variables in arrays', () => {
      process.env.ITEM1 = 'first';
      process.env.ITEM2 = 'second';
      
      const fixtureContent = `
items:
  value:
    - "\${ITEM1}"
    - "\${ITEM2}"
`;
      fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

      const manager = new TestDataManager('local', mockLogger, tempDir);
      const data = manager.get<string[]>('test', 'items');

      expect(data).toEqual(['first', 'second']);
    });

    it('should throw ConfigurationError for missing environment variable', () => {
      const fixtureContent = `
testKey:
  value: "\${MISSING_VAR}"
`;
      fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

      const manager = new TestDataManager('local', mockLogger, tempDir);
      
      expect(() => {
        manager.get('test', 'testKey');
      }).toThrow(ConfigurationError);
      
      expect(() => {
        manager.get('test', 'testKey');
      }).toThrow('Missing environment variable: MISSING_VAR');
    });

    it('should not resolve environment variables in non-string values', () => {
      const fixtureContent = `
testKey:
  value:
    number: 123
    boolean: true
    nullValue: null
`;
      fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

      const manager = new TestDataManager('local', mockLogger, tempDir);
      const data = manager.get<{ number: number; boolean: boolean; nullValue: null }>('test', 'testKey');

      expect(data).toEqual({ number: 123, boolean: true, nullValue: null });
    });
  });

  describe('Error Handling', () => {
    it('should throw TestDataNotFoundError for non-existent domain', () => {
      fs.writeFileSync(path.join(tempDir, 'test.yaml'), 'key:\n  value: "data"');
      
      const manager = new TestDataManager('local', mockLogger, tempDir);
      
      expect(() => {
        manager.get('nonexistent', 'key');
      }).toThrow(TestDataNotFoundError);
      
      expect(() => {
        manager.get('nonexistent', 'key');
      }).toThrow('Domain not found: nonexistent');
    });

    it('should throw TestDataNotFoundError for non-existent key', () => {
      fs.writeFileSync(path.join(tempDir, 'test.yaml'), 'key:\n  value: "data"');
      
      const manager = new TestDataManager('local', mockLogger, tempDir);
      
      expect(() => {
        manager.get('test', 'nonexistent');
      }).toThrow(TestDataNotFoundError);
      
      expect(() => {
        manager.get('test', 'nonexistent');
      }).toThrow('Test data not found: test.nonexistent');
    });

    it('should include available domains in error context', () => {
      fs.writeFileSync(path.join(tempDir, 'domain1.yaml'), 'key:\n  value: "data"');
      fs.writeFileSync(path.join(tempDir, 'domain2.yaml'), 'key:\n  value: "data"');
      
      const manager = new TestDataManager('local', mockLogger, tempDir);
      
      try {
        manager.get('nonexistent', 'key');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TestDataNotFoundError);
        const err = error as TestDataNotFoundError;
        expect(err.context?.availableDomains).toEqual(['domain1', 'domain2']);
      }
    });

    it('should include available keys in error context', () => {
      fs.writeFileSync(path.join(tempDir, 'test.yaml'), 'key1:\n  value: "data1"\nkey2:\n  value: "data2"');
      
      const manager = new TestDataManager('local', mockLogger, tempDir);
      
      try {
        manager.get('test', 'nonexistent');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TestDataNotFoundError);
        const err = error as TestDataNotFoundError;
        expect(err.context?.availableKeys).toEqual(['key1', 'key2']);
      }
    });
  });

  describe('Environment-Specific Availability', () => {
    it('should allow access to data available in current environment', () => {
      const fixtureContent = `
testKey:
  value: "data"
  environment: [local, staging]
`;
      fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

      const manager = new TestDataManager('local', mockLogger, tempDir);
      const data = manager.get<string>('test', 'testKey');

      expect(data).toBe('data');
    });

    it('should throw TestDataNotFoundError for data not available in current environment', () => {
      const fixtureContent = `
testKey:
  value: "data"
  environment: [staging, production]
`;
      fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

      const manager = new TestDataManager('local', mockLogger, tempDir);
      
      expect(() => {
        manager.get('test', 'testKey');
      }).toThrow(TestDataNotFoundError);
      
      expect(() => {
        manager.get('test', 'testKey');
      }).toThrow('not available for environment: local');
    });

    it('should allow access to data without environment restriction', () => {
      const fixtureContent = `
testKey:
  value: "data"
`;
      fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

      const manager = new TestDataManager('production', mockLogger, tempDir);
      const data = manager.get<string>('test', 'testKey');

      expect(data).toBe('data');
    });
  });

  describe('Sensitive Data Masking', () => {
    it('should mask sensitive data in logs', () => {
      const fixtureContent = `
credentials:
  value:
    username: "testuser"
    password: "testpass"
  sensitive: true
`;
      fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

      const manager = new TestDataManager('local', mockLogger, tempDir);
      manager.get('test', 'credentials');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Accessing sensitive data: test.credentials',
        { value: '[MASKED]' }
      );
    });

    it('should not mask non-sensitive data in logs', () => {
      const fixtureContent = `
publicData:
  value: "public-value"
  sensitive: false
`;
      fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

      const manager = new TestDataManager('local', mockLogger, tempDir);
      manager.get('test', 'publicData');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Accessing test data: test.publicData',
        { value: 'public-value' }
      );
    });
  });

  describe('Dynamic Data Generation', () => {
    it('should generate unique timestamp', () => {
      const manager = new TestDataManager('local', mockLogger, tempDir);
      
      const timestamp1 = manager.generateUnique('timestamp');
      const timestamp2 = manager.generateUnique('timestamp');

      expect(timestamp1).toMatch(/^\d+$/);
      expect(timestamp2).toMatch(/^\d+$/);
      expect(parseInt(timestamp2)).toBeGreaterThanOrEqual(parseInt(timestamp1));
    });

    it('should generate unique UUID', () => {
      const manager = new TestDataManager('local', mockLogger, tempDir);
      
      const uuid1 = manager.generateUnique('uuid');
      const uuid2 = manager.generateUnique('uuid');

      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(uuid2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty YAML files', () => {
      fs.writeFileSync(path.join(tempDir, 'empty.yaml'), '');
      
      const manager = new TestDataManager('local', mockLogger, tempDir);
      
      expect(() => {
        manager.get('empty', 'key');
      }).toThrow(TestDataNotFoundError);
    });

    it('should handle special characters in values', () => {
      const fixtureContent = `
special:
  value: "!@#$%^&*()_+-=[]{}|;':,.<>?/~\`"
`;
      fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

      const manager = new TestDataManager('local', mockLogger, tempDir);
      const data = manager.get<string>('test', 'special');

      expect(data).toBe("!@#$%^&*()_+-=[]{}|;':,.<>?/~`");
    });

    it('should handle deeply nested objects', () => {
      const fixtureContent = `
nested:
  value:
    level1:
      level2:
        level3:
          data: "deep-value"
`;
      fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

      const manager = new TestDataManager('local', mockLogger, tempDir);
      const data = manager.get<any>('test', 'nested');

      expect(data.level1.level2.level3.data).toBe('deep-value');
    });
  });
});
