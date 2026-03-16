/**
 * CLI command for generating feature files and step definitions.
 * 
 * @module cli/commands/generate-feature
 * @requirements 18.1, 18.2, 18.7, 18.8
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

/** Options for feature generation */
interface GenerateFeatureOptions {
  verbose?: boolean;
}

/**
 * Converts a string to kebab-case.
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Converts a string to PascalCase.
 */
function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Converts a string to Title Case.
 */
function toTitleCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Validates feature name.
 */
function validateFeatureName(name: string): void {
  if (!name || name.trim() === '') {
    throw new Error('Feature name cannot be empty');
  }

  
  // Check for invalid characters
  if (!/^[a-zA-Z0-9\s_-]+$/.test(name)) {
    throw new Error('Invalid feature name: only alphanumeric characters, spaces, hyphens, and underscores are allowed');
  }
}

/**
 * Reads a template file and replaces placeholders.
 */
function processTemplate(templatePath: string, replacements: Record<string, string>): string {
  const template = fs.readFileSync(templatePath, 'utf-8');
  
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  
  return result;
}

/**
 * Generates a feature file from template.
 */
function generateFeatureFile(
  featureName: string,
  domain: string,
  outputDir: string
): string {
  const kebabName = toKebabCase(featureName);
  const titleName = toTitleCase(featureName);
  
  const templatePath = path.join(__dirname, '..', 'templates', 'feature.template.txt');
  const outputPath = path.join(outputDir, 'features', domain, `${kebabName}.feature`);
  
  // Create directory if it doesn't exist
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Generate content from template
  const content = processTemplate(templatePath, {
    domain,
    featureTitle: titleName,
    featureDescription: `use ${titleName.toLowerCase()} functionality`,
    featureBenefit: `accomplish my goals with ${titleName.toLowerCase()}`,
    scenarioName: `Successfully use ${titleName.toLowerCase()}`,
    givenStep: `I am on the ${kebabName} page`,
    whenStep: `I perform an action on ${kebabName}`,
    thenStep: 'I should see the expected result',
    negativeScenarioName: `Handle error in ${titleName.toLowerCase()}`,
    negativeGivenStep: `I am on the ${kebabName} page`,
    negativeWhenStep: `I perform an invalid action on ${kebabName}`,
    negativeThenStep: 'I should see an error message'
  });

  
  // Write file
  fs.writeFileSync(outputPath, content, 'utf-8');
  
  return outputPath;
}

/**
 * Generates step definitions file from template.
 */
function generateStepsFile(
  featureName: string,
  domain: string,
  outputDir: string
): string {
  const kebabName = toKebabCase(featureName);
  const pascalName = toPascalCase(featureName);
  
  const templatePath = path.join(__dirname, '..', 'templates', 'steps.template.txt');
  const outputPath = path.join(outputDir, 'src', 'steps', domain, `${kebabName}.steps.ts`);
  
  // Create directory if it doesn't exist
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Generate content from template
  const content = processTemplate(templatePath, {
    featureName: kebabName,
    PageName: pascalName,
    domain
  });
  
  // Write file
  fs.writeFileSync(outputPath, content, 'utf-8');
  
  return outputPath;
}

/**
 * Main function to generate feature and step definitions.
 */
export function generateFeature(
  name: string,
  domain: string = 'shared',
  options: GenerateFeatureOptions = {}
): void {
  validateFeatureName(name);
  
  const outputDir = process.cwd();
  
  // Generate feature file
  const featurePath = generateFeatureFile(name, domain, outputDir);
  
  // Generate step definitions
  const stepsPath = generateStepsFile(name, domain, outputDir);
  
  // Output success messages
  if (options.verbose) {
    console.log(`✓ Created feature file: ${featurePath}`);
    console.log(`✓ Created step definitions: ${stepsPath}`);
  }
  
  console.log(`\n✓ Generated feature: ${toKebabCase(name)}`);
  console.log(`  Domain: ${domain}`);
  console.log(`  Feature: ${path.relative(outputDir, featurePath)}`);
  console.log(`  Steps: ${path.relative(outputDir, stepsPath)}`);
}


/**
 * Creates the generate:feature command for the CLI.
 */
export function createGenerateFeatureCommand(): Command {
  const command = new Command('generate:feature')
    .description('Generate a new feature file with step definitions')
    .argument('<name>', 'Feature name (e.g., user-login or UserLogin)')
    .option('-d, --domain <domain>', 'Domain folder', 'shared')
    .option('-v, --verbose', 'Enable verbose output')
    .action((name: string, options) => {
      try {
        generateFeature(name, options.domain, { verbose: options.verbose });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`\n✗ Error: ${message}`);
        process.exit(1);
      }
    });
  
  return command;
}
