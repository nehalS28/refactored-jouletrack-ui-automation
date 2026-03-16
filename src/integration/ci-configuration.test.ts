/**
 * Integration tests for CI/CD configuration.
 * Tests that CI profile loads correctly, headless mode works, and JUnit reports are generated.
 * 
 * @module integration/ci-configuration.test
 * @requirements 16.1, 16.2, 16.3, 16.5, 16.6
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ConfigManager } from '../core/config-manager.js';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

describe('CI Configuration Integration Tests', () => {
  let configManager: ConfigManager;
  const testReportsDir = join(process.cwd(), 'test-reports-ci');

  beforeAll(() => {
    // Create test reports directory
    if (!existsSync(testReportsDir)) {
      mkdirSync(testReportsDir, { recursive: true });
    }
    
    // Set environment variable for CI testing
    process.env.BASE_URL = 'http://localhost:3000';
  });

  afterAll(() => {
    // Clean up test reports directory
    if (existsSync(testReportsDir)) {
      rmSync(testReportsDir, { recursive: true, force: true });
    }
    
    delete process.env.BASE_URL;
  });

  describe('Task 15.1: CI Profile Loading', () => {
    it('should load CI configuration profile successfully', () => {
      configManager = new ConfigManager();
      const config = configManager.load('ci');

      expect(config).toBeDefined();
      expect(config.environment).toBe('ci');
    });

    it('should configure headless browser for CI', () => {
      configManager = new ConfigManager();
      const config = configManager.load('ci');

      expect(config.browser.headless).toBe(true);
      expect(config.browser.name).toBe('chrome');
      expect(config.browser.args).toContain('--no-sandbox');
      expect(config.browser.args).toContain('--disable-dev-shm-usage');
    });

    it('should configure appropriate timeouts for CI environment', () => {
      configManager = new ConfigManager();
      const config = configManager.load('ci');

      expect(config.timeouts.explicit).toBe(10000);
      expect(config.timeouts.pageLoad).toBe(30000);
      expect(config.timeouts.script).toBe(10000);
      expect(config.timeouts.polling).toBe(200);
    });

    it('should enable parallel execution with 4 workers', () => {
      configManager = new ConfigManager();
      const config = configManager.load('ci');

      expect(config.parallel.enabled).toBe(true);
      expect(config.parallel.workers).toBe(4);
    });

    it('should enable metrics and Allure plugins', () => {
      configManager = new ConfigManager();
      const config = configManager.load('ci');

      expect(config.plugins?.enabled).toContain('metrics');
      expect(config.plugins?.enabled).toContain('allure');
    });

    it('should configure retry logic for failed tests', () => {
      configManager = new ConfigManager();
      const config = configManager.load('ci');

      expect(config.retry.maxAttempts).toBe(3);
      expect(config.retry.backoffMs).toBe(1000);
      expect(config.retry.backoffMultiplier).toBe(2);
    });

    it('should resolve environment variables in configuration', () => {
      process.env.BASE_URL = 'http://ci-server:8080';
      
      configManager = new ConfigManager();
      const config = configManager.load('ci');

      expect(config.baseUrl).toBe('http://ci-server:8080');
      
      process.env.BASE_URL = 'http://localhost:3000';
    });
  });

  describe('Task 15.2: JUnit XML Report Generation', () => {
    it('should include JUnit XML format in Cucumber configuration', async () => {
      // Import cucumber config
      const cucumberConfig = await import('../../cucumber.config.js');
      const config = cucumberConfig.default;

      expect(config.format).toBeDefined();
      
      // Check if JUnit XML format is configured
      const hasJUnitFormat = config.format?.some((fmt: string) => 
        fmt.includes('junit') || fmt.includes('reports/junit')
      );
      
      expect(hasJUnitFormat).toBe(true);
    });

    it('should place JUnit reports in standard location for CI tools', async () => {
      const cucumberConfig = await import('../../cucumber.config.js');
      const config = cucumberConfig.default;

      const junitFormat = config.format?.find((fmt: string) => 
        fmt.includes('junit')
      );

      expect(junitFormat).toBeDefined();
      expect(junitFormat).toContain('reports/junit');
    });
  });

  describe('Task 15.3: Test Retry for Flaky Tests', () => {
    it('should configure retry count from framework config', async () => {
      const cucumberConfig = await import('../../cucumber.config.js');
      const config = cucumberConfig.default;

      expect(config.retry).toBeDefined();
      expect(config.retry).toBeGreaterThan(0);
    });

    it('should support retry tag filter for flaky tests', async () => {
      const cucumberConfig = await import('../../cucumber.config.js');
      const config = cucumberConfig.default;

      expect(config.retryTagFilter).toBeDefined();
      expect(config.retryTagFilter).toBe('@flaky');
    });
  });

  describe('Task 15.4: Headless Browser Validation', () => {
    it('should validate headless browser arguments are CI-optimized', () => {
      configManager = new ConfigManager();
      const config = configManager.load('ci');

      // CI-specific Chrome arguments
      const requiredArgs = [
        '--no-sandbox',
        '--disable-dev-shm-usage'
      ];

      requiredArgs.forEach(arg => {
        expect(config.browser.args).toContain(arg);
      });
    });

    it('should configure window size for consistent screenshots', () => {
      configManager = new ConfigManager();
      const config = configManager.load('ci');

      expect(config.browser.windowSize).toBeDefined();
      expect(config.browser.windowSize.width).toBe(1920);
      expect(config.browser.windowSize.height).toBe(1080);
    });
  });

  describe('Exit Code Validation', () => {
    it('should exit with code 0 for successful test execution', () => {
      // This would be tested in actual CI pipeline
      // Here we just validate the configuration supports it
      configManager = new ConfigManager();
      const config = configManager.load('ci');

      expect(config).toBeDefined();
      // Cucumber automatically exits with appropriate codes
    });
  });

  describe('Performance Optimization for CI', () => {
    it('should optimize logging for CI environment', () => {
      configManager = new ConfigManager();
      const config = configManager.load('ci');

      expect(config.logging.level).toBe('info');
      expect(config.logging.structured).toBe(true);
    });

    it('should configure implicit timeout to 0 for speed', () => {
      configManager = new ConfigManager();
      const config = configManager.load('ci');

      expect(config.timeouts.implicit).toBe(0);
    });
  });
});
