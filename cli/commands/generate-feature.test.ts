/**
 * Unit tests for generate:feature CLI command.
 * 
 * @module cli/commands/generate-feature.test
 * @requirements 18.1, 18.2, 18.7, 18.8
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { generateFeature } from './generate-feature.js';

describe('generate:feature command', () => {
  const testOutputDir = path.join(process.cwd(), 'test-output');
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Create test output directory
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
    
    // Mock process.cwd to use test directory
    vi.spyOn(process, 'cwd').mockReturnValue(testOutputDir);
  });

  afterEach(() => {
    // Clean up test output directory
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
    
    vi.restoreAllMocks();
  });

  describe('Feature file generation', () => {
    it('should generate feature file with correct structure', () => {
      const featureName = 'user-profile';
      const domain = 'dashboard';

      generateFeature(featureName, domain);

      const featurePath = path.join(testOutputDir, 'features', domain, `${featureName}.feature`);
      expect(fs.existsSync(featurePath)).toBe(true);

      const content = fs.readFileSync(featurePath, 'utf-8');
      expect(content).toContain('Feature:');
      expect(content).toContain('Scenario:');
      expect(content).toContain('Given');
      expect(content).toContain('When');
      expect(content).toContain('Then');
    });

    it('should generate feature file with proper tags', () => {
      const featureName = 'login';
      const domain = 'authentication';

      generateFeature(featureName, domain);

      const featurePath = path.join(testOutputDir, 'features', domain, `${featureName}.feature`);
      const content = fs.readFileSync(featurePath, 'utf-8');
      
      expect(content).toMatch(/@\w+/); // Should have at least one tag
      expect(content).toContain(`@${domain}`);
    });

    it('should create domain directory if it does not exist', () => {
      const featureName = 'new-feature';
      const domain = 'new-domain';

      generateFeature(featureName, domain);

      const domainPath = path.join(testOutputDir, 'features', domain);
      expect(fs.existsSync(domainPath)).toBe(true);
    });

    it('should use kebab-case for feature file names', () => {
      const featureName = 'UserProfileSettings';
      const domain = 'settings';

      generateFeature(featureName, domain);

      const expectedPath = path.join(testOutputDir, 'features', domain, 'user-profile-settings.feature');
      expect(fs.existsSync(expectedPath)).toBe(true);
    });

    it('should throw error for empty feature name', () => {
      expect(() => generateFeature('', 'dashboard')).toThrow('Feature name cannot be empty');
    });

    it('should throw error for invalid feature name with special characters', () => {
      expect(() => generateFeature('feature@#$', 'dashboard')).toThrow('Invalid feature name');
    });
  });

  describe('Step definition generation', () => {
    it('should generate step definition file alongside feature', () => {
      const featureName = 'checkout';
      const domain = 'ecommerce';

      generateFeature(featureName, domain);

      const stepsPath = path.join(testOutputDir, 'src', 'steps', domain, `${featureName}.steps.ts`);
      expect(fs.existsSync(stepsPath)).toBe(true);
    });

    it('should generate step definitions with correct imports', () => {
      const featureName = 'search';
      const domain = 'dashboard';

      generateFeature(featureName, domain);

      const stepsPath = path.join(testOutputDir, 'src', 'steps', domain, `${featureName}.steps.ts`);
      const content = fs.readFileSync(stepsPath, 'utf-8');
      
      expect(content).toContain("import { Given, When, Then } from '@cucumber/cucumber'");
      expect(content).toContain("import { expect } from 'vitest'");
      expect(content).toContain("import type { TestContext } from '../../types/context.types.js'");
    });

    it('should generate step definitions with page object import', () => {
      const featureName = 'profile';
      const domain = 'dashboard';

      generateFeature(featureName, domain);

      const stepsPath = path.join(testOutputDir, 'src', 'steps', domain, `${featureName}.steps.ts`);
      const content = fs.readFileSync(stepsPath, 'utf-8');
      
      // Should import corresponding page object
      expect(content).toMatch(/import.*Page.*from.*pages/);
    });

    it('should generate step definitions with placeholder steps', () => {
      const featureName = 'notifications';
      const domain = 'dashboard';

      generateFeature(featureName, domain);

      const stepsPath = path.join(testOutputDir, 'src', 'steps', domain, `${featureName}.steps.ts`);
      const content = fs.readFileSync(stepsPath, 'utf-8');
      
      expect(content).toContain('Given(');
      expect(content).toContain('When(');
      expect(content).toContain('Then(');
      expect(content).toContain('this: { context: TestContext }');
    });

    it('should create steps directory if it does not exist', () => {
      const featureName = 'new-feature';
      const domain = 'new-domain';

      generateFeature(featureName, domain);

      const stepsDir = path.join(testOutputDir, 'src', 'steps', domain);
      expect(fs.existsSync(stepsDir)).toBe(true);
    });
  });

  describe('File naming conventions', () => {
    it('should convert PascalCase to kebab-case', () => {
      const featureName = 'UserAuthentication';
      const domain = 'auth';

      generateFeature(featureName, domain);

      const featurePath = path.join(testOutputDir, 'features', domain, 'user-authentication.feature');
      const stepsPath = path.join(testOutputDir, 'src', 'steps', domain, 'user-authentication.steps.ts');
      
      expect(fs.existsSync(featurePath)).toBe(true);
      expect(fs.existsSync(stepsPath)).toBe(true);
    });

    it('should handle already kebab-cased names', () => {
      const featureName = 'user-login';
      const domain = 'auth';

      generateFeature(featureName, domain);

      const featurePath = path.join(testOutputDir, 'features', domain, 'user-login.feature');
      expect(fs.existsSync(featurePath)).toBe(true);
    });
  });

  describe('Verbose output', () => {
    it('should log file creation when verbose is true', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      generateFeature('test-feature', 'test-domain', { verbose: true });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Created feature file'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Created step definitions'));
      
      consoleSpy.mockRestore();
    });

    it('should not log verbose details when verbose is false', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      generateFeature('test-feature', 'test-domain', { verbose: false });

      // Should log summary but not verbose details
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Created feature file'));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Created step definitions'));
      
      consoleSpy.mockRestore();
    });
  });
});
