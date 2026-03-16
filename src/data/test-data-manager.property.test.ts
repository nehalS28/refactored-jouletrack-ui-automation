/**
 * Property-based tests for TestDataManager.
 * 
 * **Property 55: Environment Variable Resolution**
 * **Validates: Requirements 6.2, 6.5**
 * 
 * For any test data entry containing environment variable references (${VAR}),
 * the Test Data Manager should resolve the value from environment variables
 * and throw an error if the variable is not set.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { TestDataManager } from './test-data-manager.js';
import { ConfigurationError } from '../utils/errors.js';
import type { StructuredLogger } from '../types/context.types.js';

// Mock logger
const createMockLogger = (): StructuredLogger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  setTestId: vi.fn(),
  clearTestId: vi.fn()
});

describe('TestDataManager - Property Tests', () => {
  let tempDir: string;
  let mockLogger: StructuredLogger;
  const originalEnv = process.env;

  beforeEach(() => {
    tempDir = path.join(process.cwd(), 'test-fixtures-prop-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });
    mockLogger = createMockLogger();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    process.env = originalEnv;
  });

  describe('Property 55: Environment Variable Resolution', () => {
    it('should resolve all environment variables when they are set', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(
            fc.stringMatching(/^[A-Z_][A-Z0-9_]*$/), // Valid env var name
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('"') && !s.includes('\\')) // Env var value
          ), { minLength: 1, maxLength: 5 }).filter(envVars => {
            // Ensure unique variable names
            const names = envVars.map(([name]) => name);
            return new Set(names).size === names.length;
          }),
          (envVars) => {
            // Set environment variables
            for (const [varName, varValue] of envVars) {
              process.env[varName] = varValue;
            }

            // Create fixture with environment variable references
            const fixtureContent = envVars.map(([varName], idx) => 
              `key${idx}:\n  value: "\${${varName}}"`
            ).join('\n');
            
            fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

            const manager = new TestDataManager('local', mockLogger, tempDir);

            // Verify all environment variables are resolved
            for (let idx = 0; idx < envVars.length; idx++) {
              const [, expectedValue] = envVars[idx];
              const actualValue = manager.get<string>('test', `key${idx}`);
              expect(actualValue).toBe(expectedValue);
            }

            // Clean up
            for (const [varName] of envVars) {
              delete process.env[varName];
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should throw ConfigurationError for any missing environment variable', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[A-Z_][A-Z0-9_]*$/), // Valid env var name
          (missingVar) => {
            // Ensure the variable is NOT set
            delete process.env[missingVar];

            const fixtureContent = `testKey:\n  value: "\${${missingVar}}"`;
            fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

            const manager = new TestDataManager('local', mockLogger, tempDir);

            // Should throw ConfigurationError
            expect(() => {
              manager.get('test', 'testKey');
            }).toThrow(ConfigurationError);

            expect(() => {
              manager.get('test', 'testKey');
            }).toThrow(`Missing environment variable: ${missingVar}`);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should resolve environment variables in nested objects', () => {
      fc.assert(
        fc.property(
          fc.record({
            var1: fc.stringMatching(/^[A-Z_][A-Z0-9_]*$/),
            val1: fc.string({ minLength: 1, maxLength: 50 }),
            var2: fc.stringMatching(/^[A-Z_][A-Z0-9_]*$/),
            val2: fc.string({ minLength: 1, maxLength: 50 })
          }),
          ({ var1, val1, var2, val2 }) => {
            // Ensure unique variable names
            if (var1 === var2) return;

            process.env[var1] = val1;
            process.env[var2] = val2;

            const fixtureContent = `
nested:
  value:
    field1: "\${${var1}}"
    field2: "\${${var2}}"
`;
            fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

            const manager = new TestDataManager('local', mockLogger, tempDir);
            const data = manager.get<{ field1: string; field2: string }>('test', 'nested');

            expect(data.field1).toBe(val1);
            expect(data.field2).toBe(val2);

            delete process.env[var1];
            delete process.env[var2];
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should resolve environment variables in arrays', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(
              fc.stringMatching(/^[A-Z_][A-Z0-9_]*$/),
              fc.string({ minLength: 1, maxLength: 50 })
            ),
            { minLength: 1, maxLength: 5 }
          ).filter(envVars => {
            // Ensure unique variable names
            const names = envVars.map(([name]) => name);
            return new Set(names).size === names.length;
          }),
          (envVars) => {
            // Set environment variables
            for (const [varName, varValue] of envVars) {
              process.env[varName] = varValue;
            }

            const arrayItems = envVars.map(([varName]) => `    - "\${${varName}}"`).join('\n');
            const fixtureContent = `arrayData:\n  value:\n${arrayItems}`;
            
            fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

            const manager = new TestDataManager('local', mockLogger, tempDir);
            const data = manager.get<string[]>('test', 'arrayData');

            expect(data).toHaveLength(envVars.length);
            for (let i = 0; i < envVars.length; i++) {
              expect(data[i]).toBe(envVars[i][1]);
            }

            // Clean up
            for (const [varName] of envVars) {
              delete process.env[varName];
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle mixed content with and without environment variables', () => {
      fc.assert(
        fc.property(
          fc.record({
            varName: fc.stringMatching(/^[A-Z_][A-Z0-9_]*$/),
            varValue: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('\\') && !s.includes('"')),
            staticValue: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('\\') && !s.includes('"'))
          }),
          ({ varName, varValue, staticValue }) => {
            process.env[varName] = varValue;

            const fixtureContent = `
mixed:
  value:
    dynamic: "\${${varName}}"
    static: "${staticValue}"
`;
            fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

            const manager = new TestDataManager('local', mockLogger, tempDir);
            const data = manager.get<{ dynamic: string; static: string }>('test', 'mixed');

            expect(data.dynamic).toBe(varValue);
            expect(data.static).toBe(staticValue);

            delete process.env[varName];
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should resolve multiple environment variables in a single string', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.stringMatching(/^[A-Z_][A-Z0-9_]*$/),
            fc.string({ minLength: 1, maxLength: 20 }),
            fc.stringMatching(/^[A-Z_][A-Z0-9_]*$/),
            fc.string({ minLength: 1, maxLength: 20 })
          ),
          ([var1, val1, var2, val2]) => {
            // Ensure unique variable names
            if (var1 === var2) return;

            process.env[var1] = val1;
            process.env[var2] = val2;

            const fixtureContent = `testKey:\n  value: "\${${var1}} and \${${var2}}"`;
            fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

            const manager = new TestDataManager('local', mockLogger, tempDir);
            const data = manager.get<string>('test', 'testKey');

            expect(data).toBe(`${val1} and ${val2}`);

            delete process.env[var1];
            delete process.env[var2];
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should not modify non-string values', () => {
      fc.assert(
        fc.property(
          fc.record({
            number: fc.integer(),
            boolean: fc.boolean(),
            nullValue: fc.constant(null)
          }),
          ({ number, boolean: boolValue, nullValue }) => {
            const fixtureContent = `
nonString:
  value:
    number: ${number}
    boolean: ${boolValue}
    nullValue: ${nullValue}
`;
            fs.writeFileSync(path.join(tempDir, 'test.yaml'), fixtureContent);

            const manager = new TestDataManager('local', mockLogger, tempDir);
            const data = manager.get<{ number: number; boolean: boolean; nullValue: null }>('test', 'nonString');

            expect(data.number).toBe(number);
            expect(data.boolean).toBe(boolValue);
            expect(data.nullValue).toBe(null);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
