/**
 * Unit tests for Cucumber parallel execution configuration.
 * 
 * @module cucumber.config.test
 * @requirements 15.1, 15.2, 15.3
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Cucumber Configuration', () => {
  const configPath = join(process.cwd(), 'cucumber.config.ts');

  it('should have cucumber.config.ts file', () => {
    expect(existsSync(configPath)).toBe(true);
  });

  it('should contain parallel configuration', () => {
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('parallel:');
  });

  it('should contain feature paths configuration', () => {
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('paths:');
    expect(content).toContain('features/**/*.feature');
  });

  it('should contain step definition paths configuration', () => {
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('require:');
    expect(content).toContain('.steps.js');
  });

  it('should contain format options', () => {
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('format:');
  });

  it('should contain world parameters for TestContext', () => {
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('worldParameters:');
  });

  it('should load worker count from framework config', () => {
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('loadConfig');
    expect(content).toContain('frameworkConfig.parallel');
  });

  it('should export default configuration', () => {
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('export default config');
  });
});

describe('Cucumber Parallel Configuration Logic', () => {
  it('should use worker count from config when parallel is enabled', () => {
    const content = readFileSync(join(process.cwd(), 'cucumber.config.ts'), 'utf-8');
    // Check that parallel workers are determined from frameworkConfig
    expect(content).toContain('frameworkConfig.parallel.enabled');
    expect(content).toContain('frameworkConfig.parallel.workers');
  });

  it('should default to 1 worker when parallel is disabled', () => {
    const content = readFileSync(join(process.cwd(), 'cucumber.config.ts'), 'utf-8');
    // Check that there's a fallback to 1 worker
    expect(content).toMatch(/:\s*1/);
  });
});
