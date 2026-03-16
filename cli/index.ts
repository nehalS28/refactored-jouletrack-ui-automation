#!/usr/bin/env node
/**
 * CLI entry point for the UI automation framework.
 * 
 * @module cli
 * @requirements 18.1, 18.7
 * 
 * Provides scaffolding commands for generating test boilerplate code,
 * locator management, metrics reporting, and Morpheus integration.
 */

import { Command } from 'commander';
import { createGenerateLocatorsCommand } from './commands/generate-locators.js';
import { createGenerateFeatureCommand } from './commands/generate-feature.js';
import { createGeneratePageCommand } from './commands/generate-page.js';
import { createGenerateDomainCommand } from './commands/generate-domain.js';
import { validateSelectors } from './commands/validate-selectors.js';
import { buildDependencyGraph } from './commands/build-graph.js';
import { getAffectedTests } from './commands/affected-tests.js';

const program = new Command();

program
  .name('ui-automation')
  .description('CLI tools for the UI automation framework')
  .version('1.0.0');

// Register commands
program.addCommand(createGenerateLocatorsCommand());
program.addCommand(createGenerateFeatureCommand());
program.addCommand(createGeneratePageCommand());
program.addCommand(createGenerateDomainCommand());

// Morpheus validation command
program
  .command('validate:selectors')
  .description('Validate all locator selectors against JouleTrack frontend via Morpheus')
  .option('-r, --registry-path <path>', 'Path to locator registry directory')
  .option('-e, --endpoint <url>', 'Morpheus MCP endpoint URL')
  .option('-t, --timeout <ms>', 'Request timeout in milliseconds', '5000')
  .action(async (options) => {
    await validateSelectors({
      registryPath: options.registryPath,
      endpoint: options.endpoint,
      timeout: parseInt(options.timeout, 10),
    });
  });

// Dependency graph commands
program
  .command('graph:build')
  .description('Build test dependency graph for smart test selection')
  .action(async () => {
    await buildDependencyGraph();
  });

program
  .command('graph:affected')
  .description('Get tests affected by changed files')
  .option('-f, --files <files>', 'Comma-separated list of changed files')
  .action(async (options) => {
    const files = options.files ? options.files.split(',').map((f: string) => f.trim()) : [];
    await getAffectedTests(files);
  });

// Parse command line arguments
program.parse();

