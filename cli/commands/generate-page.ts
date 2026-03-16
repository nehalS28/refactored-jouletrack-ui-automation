/**
 * CLI command for generating page objects.
 * 
 * @module cli/commands/generate-page
 * @requirements 18.1, 18.7, 18.8
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

/** Options for page generation */
interface GeneratePageOptions {
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
 * Validates page name.
 */
function validatePageName(name: string): void {
  if (!name || name.trim() === '') {
    throw new Error('Page name cannot be empty');
  }
  
  // Check for invalid characters
  if (!/^[a-zA-Z0-9\s_-]+$/.test(name)) {
    throw new Error('Invalid page name: only alphanumeric characters, spaces, hyphens, and underscores are allowed');
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
 * Generates a page object file from template.
 */
function generatePageFile(
  pageName: string,
  domain: string,
  outputDir: string
): string {
  const kebabName = toKebabCase(pageName);
  const pascalName = toPascalCase(pageName);
  
  const templatePath = path.join(__dirname, '..', 'templates', 'page.template.txt');
  const outputPath = path.join(outputDir, 'src', 'pages', domain, `${kebabName}-page.ts`);
  
  // Create directory if it doesn't exist
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Generate content from template
  const content = processTemplate(templatePath, {
    pageName: kebabName,
    PageName: pascalName,
    domain
  });
  
  // Write file
  fs.writeFileSync(outputPath, content, 'utf-8');
  
  return outputPath;
}

/**
 * Main function to generate page object.
 */
export function generatePage(
  name: string,
  domain: string = 'shared',
  options: GeneratePageOptions = {}
): void {
  validatePageName(name);
  
  const outputDir = process.cwd();
  
  // Generate page object file
  const pagePath = generatePageFile(name, domain, outputDir);
  
  // Output success messages
  if (options.verbose) {
    console.log(`✓ Created page object: ${pagePath}`);
  }
  
  console.log(`\n✓ Generated page object: ${toPascalCase(name)}Page`);
  console.log(`  Domain: ${domain}`);
  console.log(`  File: ${path.relative(outputDir, pagePath)}`);
}

/**
 * Creates the generate:page command for the CLI.
 */
export function createGeneratePageCommand(): Command {
  const command = new Command('generate:page')
    .description('Generate a new page object')
    .argument('<name>', 'Page name (e.g., user-profile or UserProfile)')
    .option('-d, --domain <domain>', 'Domain folder', 'shared')
    .option('-v, --verbose', 'Enable verbose output')
    .action((name: string, options) => {
      try {
        generatePage(name, options.domain, { verbose: options.verbose });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`\n✗ Error: ${message}`);
        process.exit(1);
      }
    });
  
  return command;
}
