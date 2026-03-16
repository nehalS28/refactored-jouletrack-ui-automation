/**
 * Unit tests for ConfigManager.
 * Tests configuration loading, environment variable resolution, and validation.
 * 
 * @module core/config-manager.test
 * @requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigManager, loadConfig, createConfigManager } from './config-manager.js';
import { ConfigurationError } from '../types/config.types.js';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ConfigManager', () => {
  let testConfigDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Create a temporary directory for test config files
    testConfigDir = join(tmpdir(), `config-manager-test-${Date.now()}`);
    mkdirSync(testConfigDir, { recursive: true });
    
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    
    // Clean up test directory
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper to create a valid config file.
   */
  function createValidConfig(environment: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      environment,
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
        level: 'info',
        structured: false,
      },
      ...overrides,
    };
  }

  /**
   * Helper to write a config file.
   */
  function writeConfigFile(environment: string, config: Record<string, unknown>): void {
    const filePath = join(testConfigDir, `${environment}.json`);
    writeFileSync(filePath, JSON.stringify(config, null, 2));
  }

  describe('load()', () => {
    it('should load a valid configuration file', () => {
      const config = createValidConfig('local');
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);
      const loaded = manager.load('local');

      expect(loaded.environment).toBe('local');
      expect(loaded.baseUrl).toBe('http://localhost:3000');
      expect(loaded.browser.name).toBe('chrome');
    });

    it('should throw ConfigurationError when config file not found', () => {
      const manager = new ConfigManager(testConfigDir);

      expect(() => manager.load('local')).toThrow(ConfigurationError);
      expect(() => manager.load('local')).toThrow(/Configuration file not found/);
    });

    it('should throw ConfigurationError for invalid JSON', () => {
      const filePath = join(testConfigDir, 'local.json');
      writeFileSync(filePath, '{ invalid json }');

      const manager = new ConfigManager(testConfigDir);

      expect(() => manager.load('local')).toThrow(ConfigurationError);
      expect(() => manager.load('local')).toThrow(/Failed to parse configuration/);
    });

    it('should support all environment profiles', () => {
      const environments = ['local', 'ci', 'staging', 'production'] as const;

      for (const env of environments) {
        const config = createValidConfig(env);
        writeConfigFile(env, config);

        const manager = new ConfigManager(testConfigDir);
        const loaded = manager.load(env);

        expect(loaded.environment).toBe(env);
      }
    });
  });

  describe('environment variable resolution', () => {
    it('should resolve environment variables in string values', () => {
      process.env['TEST_BASE_URL'] = 'https://test.example.com';
      
      const config = createValidConfig('local', {
        baseUrl: '${TEST_BASE_URL}',
      });
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);
      const loaded = manager.load('local');

      expect(loaded.baseUrl).toBe('https://test.example.com');
    });

    it('should resolve multiple environment variables in a single string', () => {
      process.env['PROTOCOL'] = 'https';
      process.env['HOST'] = 'api.example.com';
      
      const config = createValidConfig('local', {
        baseUrl: '${PROTOCOL}://${HOST}',
      });
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);
      const loaded = manager.load('local');

      expect(loaded.baseUrl).toBe('https://api.example.com');
    });

    it('should resolve environment variables in nested objects', () => {
      process.env['ZEPHYR_KEY'] = 'PROJECT-123';
      
      const config = createValidConfig('local', {
        plugins: {
          enabled: ['zephyr'],
          zephyr: {
            projectKey: '${ZEPHYR_KEY}',
            batchSize: 50,
          },
        },
      });
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);
      const loaded = manager.load('local');

      expect(loaded.plugins?.zephyr?.projectKey).toBe('PROJECT-123');
    });

    it('should resolve environment variables in arrays', () => {
      process.env['BROWSER_ARG'] = '--disable-gpu';
      
      const config = createValidConfig('local', {
        browser: {
          name: 'chrome',
          headless: true,
          windowSize: { width: 1920, height: 1080 },
          args: ['--no-sandbox', '${BROWSER_ARG}'],
        },
      });
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);
      const loaded = manager.load('local');

      expect(loaded.browser.args).toContain('--disable-gpu');
    });

    it('should throw ConfigurationError for missing environment variable', () => {
      delete process.env['MISSING_VAR'];
      
      const config = createValidConfig('local', {
        baseUrl: '${MISSING_VAR}',
      });
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);

      expect(() => manager.load('local')).toThrow(ConfigurationError);
      expect(() => manager.load('local')).toThrow(/Required environment variable 'MISSING_VAR' is not set/);
    });

    it('should include missing variable name in error', () => {
      delete process.env['UNDEFINED_VAR'];
      
      const config = createValidConfig('local', {
        baseUrl: '${UNDEFINED_VAR}',
      });
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);

      try {
        manager.load('local');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as ConfigurationError).missingKeys).toContain('UNDEFINED_VAR');
      }
    });
  });

  describe('validation', () => {
    it('should throw ConfigurationError for missing required keys', () => {
      const config = {
        environment: 'local',
        baseUrl: 'http://localhost:3000',
        // Missing: browser, timeouts, retry, parallel, logging
      };
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);

      expect(() => manager.load('local')).toThrow(ConfigurationError);
      expect(() => manager.load('local')).toThrow(/Missing required configuration keys/);
    });

    it('should include all missing keys in error', () => {
      const config = {
        environment: 'local',
        baseUrl: 'http://localhost:3000',
      };
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);

      try {
        manager.load('local');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        const configError = error as ConfigurationError;
        expect(configError.missingKeys).toContain('browser');
        expect(configError.missingKeys).toContain('timeouts');
        expect(configError.missingKeys).toContain('retry');
        expect(configError.missingKeys).toContain('parallel');
        expect(configError.missingKeys).toContain('logging');
      }
    });

    it('should throw ConfigurationError for invalid environment value', () => {
      const config = createValidConfig('invalid-env');
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);

      expect(() => manager.load('local')).toThrow(ConfigurationError);
      expect(() => manager.load('local')).toThrow(/Invalid environment/);
    });

    it('should throw ConfigurationError for invalid browser name', () => {
      const config = createValidConfig('local', {
        browser: {
          name: 'invalid-browser',
          headless: false,
          windowSize: { width: 1920, height: 1080 },
          args: [],
        },
      });
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);

      expect(() => manager.load('local')).toThrow(ConfigurationError);
      expect(() => manager.load('local')).toThrow(/Invalid browser name/);
    });

    it('should throw ConfigurationError for invalid log level', () => {
      const config = createValidConfig('local', {
        logging: {
          level: 'invalid-level',
          structured: false,
        },
      });
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);

      expect(() => manager.load('local')).toThrow(ConfigurationError);
      expect(() => manager.load('local')).toThrow(/Invalid log level/);
    });

    it('should throw ConfigurationError for empty baseUrl', () => {
      const config = createValidConfig('local', {
        baseUrl: '',
      });
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);

      expect(() => manager.load('local')).toThrow(ConfigurationError);
      expect(() => manager.load('local')).toThrow(/baseUrl must be a non-empty string/);
    });

    it('should throw ConfigurationError for negative timeout values', () => {
      const config = createValidConfig('local', {
        timeouts: {
          implicit: -1,
          explicit: 10000,
          pageLoad: 30000,
          script: 10000,
          polling: 200,
        },
      });
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);

      expect(() => manager.load('local')).toThrow(ConfigurationError);
      expect(() => manager.load('local')).toThrow(/timeouts.implicit must be a non-negative number/);
    });

    it('should throw ConfigurationError for invalid retry maxAttempts', () => {
      const config = createValidConfig('local', {
        retry: {
          maxAttempts: 0,
          backoffMs: 1000,
          backoffMultiplier: 2,
        },
      });
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);

      expect(() => manager.load('local')).toThrow(ConfigurationError);
      expect(() => manager.load('local')).toThrow(/retry.maxAttempts must be a positive number/);
    });

    it('should throw ConfigurationError for invalid parallel workers', () => {
      const config = createValidConfig('local', {
        parallel: {
          enabled: true,
          workers: 0,
        },
      });
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);

      expect(() => manager.load('local')).toThrow(ConfigurationError);
      expect(() => manager.load('local')).toThrow(/parallel.workers must be a positive number/);
    });

    it('should throw ConfigurationError for missing nested keys', () => {
      const config = createValidConfig('local', {
        browser: {
          name: 'chrome',
          // Missing: headless, windowSize, args
        },
      });
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);

      expect(() => manager.load('local')).toThrow(ConfigurationError);
      expect(() => manager.load('local')).toThrow(/Missing required configuration keys in browser/);
    });
  });

  describe('getConfig()', () => {
    it('should return loaded configuration', () => {
      const config = createValidConfig('local');
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);
      manager.load('local');
      const retrieved = manager.getConfig();

      expect(retrieved.environment).toBe('local');
    });

    it('should throw ConfigurationError when config not loaded', () => {
      const manager = new ConfigManager(testConfigDir);

      expect(() => manager.getConfig()).toThrow(ConfigurationError);
      expect(() => manager.getConfig()).toThrow(/Configuration not loaded/);
    });
  });

  describe('logging', () => {
    it('should log loaded configuration', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const config = createValidConfig('local');
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);
      manager.load('local');

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry.message).toContain("Configuration loaded for environment 'local'");
      expect(logEntry.config).toBeDefined();
      
      consoleSpy.mockRestore();
    });

    it('should mask sensitive values in logs', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const config = createValidConfig('local', {
        plugins: {
          enabled: ['zephyr'],
          zephyr: {
            projectKey: 'PROJECT-123',
            apiToken: 'secret-token-value',
          },
        },
      });
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);
      manager.load('local');

      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      // apiToken should be redacted
      expect(logEntry.config.plugins.zephyr.apiToken).toBe('[REDACTED]');
      // projectKey should not be redacted
      expect(logEntry.config.plugins.zephyr.projectKey).toBe('PROJECT-123');
      
      consoleSpy.mockRestore();
    });
  });

  describe('loadConfig() helper', () => {
    it('should load config from UI_AUTOMATION_ENV environment variable', () => {
      process.env['UI_AUTOMATION_ENV'] = 'local';
      
      const config = createValidConfig('local');
      writeConfigFile('local', config);

      const loaded = loadConfig(testConfigDir);

      expect(loaded.environment).toBe('local');
    });

    it('should default to local environment when UI_AUTOMATION_ENV not set', () => {
      delete process.env['UI_AUTOMATION_ENV'];
      
      const config = createValidConfig('local');
      writeConfigFile('local', config);

      const loaded = loadConfig(testConfigDir);

      expect(loaded.environment).toBe('local');
    });
  });

  describe('createConfigManager() helper', () => {
    it('should create a ConfigManager instance', () => {
      const manager = createConfigManager(testConfigDir);

      expect(manager).toBeInstanceOf(ConfigManager);
    });
  });

  describe('fail-fast behavior', () => {
    it('should fail immediately on missing config file', () => {
      const manager = new ConfigManager(testConfigDir);
      const startTime = Date.now();

      expect(() => manager.load('local')).toThrow(ConfigurationError);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should fail fast
    });

    it('should fail immediately on validation error', () => {
      const config = { environment: 'invalid' };
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);
      const startTime = Date.now();

      expect(() => manager.load('local')).toThrow(ConfigurationError);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should fail fast
    });

    it('should fail immediately on missing environment variable', () => {
      delete process.env['REQUIRED_VAR'];
      
      const config = createValidConfig('local', {
        baseUrl: '${REQUIRED_VAR}',
      });
      writeConfigFile('local', config);

      const manager = new ConfigManager(testConfigDir);
      const startTime = Date.now();

      expect(() => manager.load('local')).toThrow(ConfigurationError);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should fail fast
    });
  });
});
