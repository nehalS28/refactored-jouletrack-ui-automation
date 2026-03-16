# UI Automation Framework

A modern, scalable UI automation framework built with Selenium, Cucumber, and TypeScript. Features worker-scoped architecture, typed locators, plugin system, and smart test selection for large test suites (1000+ tests).

## Features

- **Worker-Scoped Architecture**: Safe parallel execution with isolated test contexts
- **Typed Locators**: Compile-time safety with auto-generated locators from YAML
- **Plugin System**: Extensible architecture for metrics, reporting, and integrations
- **Smart Test Selection**: Dependency graph-based test selection for faster CI/CD
- **Performance Metrics**: SQLite-based metrics tracking with regression detection
- **Domain-Based Organization**: Tests organized by business domain for maintainability
- **CLI Scaffolding**: Generate test boilerplate with a single command

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Chrome/Firefox browser installed

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Generate typed locators from YAML
npm run generate:locators
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific tags
TAG_FILTER="@smoke" npm test

# Run tests in parallel (4 workers)
PARALLEL_WORKERS=4 npm test
```

### Your First Test

1. **Create a locator registry** (`src/locators/registry/myfeature.yaml`):

```yaml
myfeature:
  loginForm:
    usernameInput:
      selector: "[data-testid='username']"
      strategy: data-testid
      description: "Username input field"
```

2. **Generate typed locators**:

```bash
npm run generate:locators
```

3. **Create a feature file** (`features/myfeature/login.feature`):

```gherkin
@myfeature @smoke
Feature: User Login
  As a user
  I want to log in to the application
  So that I can access my account

  Scenario: Successful login
    Given I am on the login page
    When I enter valid credentials
    Then I should see the dashboard
```

4. **Create step definitions** (`src/steps/myfeature/login.steps.ts`):

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { LoginPage } from '../../pages/myfeature/login-page.js';

Given('I am on the login page', async function() {
  const loginPage = new LoginPage(this.context);
  await loginPage.navigate();
});

When('I enter valid credentials', async function() {
  const loginPage = new LoginPage(this.context);
  await loginPage.login('testuser', 'password123');
});

Then('I should see the dashboard', async function() {
  await this.context.wait.forVisible({ 
    selector: '[data-testid="dashboard"]', 
    strategy: 'data-testid' 
  });
});
```

5. **Run your test**:

```bash
TAG_FILTER="@myfeature" npm test
```

## Configuration

### Environment Variables

```bash
# Base URL for the application under test
BASE_URL=http://localhost:3000

# Environment profile (local, ci, staging, production)
ENVIRONMENT=local

# Parallel execution
PARALLEL_WORKERS=4

# Logging level (debug, info, warn, error)
LOG_LEVEL=info

# Test filtering
TAG_FILTER="@smoke"

# Retry failed tests
RETRY_ATTEMPTS=2
```

### Configuration Profiles

Create environment-specific profiles in `config/profiles/`:

```json
{
  "environment": "ci",
  "baseUrl": "http://test-server:3000",
  "browser": {
    "type": "chrome",
    "headless": true
  },
  "parallel": {
    "enabled": true,
    "workers": 4
  },
  "plugins": {
    "enabled": ["metrics", "allure"],
    "metrics": {
      "dbPath": "data/metrics.db",
      "slowLocatorThresholdMs": 500
    }
  }
}
```

## CLI Commands

### Generate Locators

```bash
# Generate typed locators from YAML registry
npm run cli generate:locators

# Or use the full command
npm run cli -- generate:locators --registry src/locators/registry
```

### Generate Test Boilerplate

```bash
# Generate a complete domain (feature + page + steps + locators)
npm run cli generate:domain --name checkout --description "Checkout flow"

# Generate a feature file
npm run cli generate:feature --name login --domain authentication

# Generate a page object
npm run cli generate:page --name checkout --domain ecommerce
```

### Validate Selectors (Morpheus Integration)

```bash
# Validate all selectors against the frontend codebase
npm run cli validate:selectors --endpoint http://morpheus:3000
```

### Dependency Graph & Smart Test Selection

```bash
# Build dependency graph
npm run cli graph:build

# Get tests affected by changed files
npm run cli graph:affected --files "src/pages/login-page.ts,src/locators/registry/auth.yaml"
```

### Metrics Reporting

```bash
# Generate metrics report
npm run cli metrics:report --format html --output reports/metrics.html

# Compare with baseline
npm run cli metrics:report --baseline --format json
```

## Project Structure

```
ui-automation/
├── cli/                          # CLI commands
│   ├── commands/                 # Command implementations
│   └── templates/                # Code generation templates
├── config/                       # Configuration files
│   └── profiles/                 # Environment-specific configs
├── features/                     # Cucumber feature files
│   ├── authentication/
│   ├── dashboard/
│   └── reports/
├── src/
│   ├── core/                     # Core framework services
│   │   ├── test-context.ts      # Worker-scoped context
│   │   ├── webdriver-service.ts # Browser lifecycle
│   │   ├── action-helper.ts     # UI interactions
│   │   ├── wait-strategy.ts     # Wait conditions
│   │   └── config-manager.ts    # Configuration
│   ├── locators/
│   │   ├── registry/             # YAML locator definitions
│   │   └── generated/            # Auto-generated typed locators
│   ├── pages/                    # Page objects (domain-organized)
│   ├── steps/                    # Step definitions (domain-organized)
│   ├── plugins/                  # Plugin implementations
│   │   ├── metrics/              # Performance metrics
│   │   ├── allure/               # Allure reporting
│   │   ├── zephyr/               # Zephyr integration
│   │   └── visual/               # Visual regression
│   ├── data/                     # Test data management
│   └── utils/                    # Utility functions
└── reports/                      # Test reports and metrics
```

## Writing Tests

### Page Objects

Page objects extend `BasePage` and use typed locators:

```typescript
import { BasePage } from '../../core/base-page.js';
import { TestContext } from '../../core/test-context.js';
import { locators } from '../../locators/generated/index.js';

export class LoginPage extends BasePage {
  readonly pageName = 'login';
  private readonly loc = locators.authentication.loginForm;

  constructor(context: TestContext) {
    super(context);
  }

  protected get pageUrl(): string {
    return '/login';
  }

  async enterUsername(username: string): Promise<this> {
    await this.actions.type(this.loc.usernameInput, username);
    return this;
  }

  async enterPassword(password: string): Promise<this> {
    await this.actions.type(this.loc.passwordInput, password);
    return this;
  }

  async submitLogin(): Promise<this> {
    await this.actions.click(this.loc.submitButton);
    return this;
  }

  async login(username: string, password: string): Promise<this> {
    return this.enterUsername(username)
      .then(() => this.enterPassword(password))
      .then(() => this.submitLogin());
  }
}
```

### Step Definitions

Keep step definitions thin - delegate to page objects:

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { LoginPage } from '../../pages/authentication/login-page.js';

Given('I am on the login page', async function() {
  const page = new LoginPage(this.context);
  await page.navigate();
});

When('I enter username {string}', async function(username: string) {
  const page = new LoginPage(this.context);
  await page.enterUsername(username);
});
```

### Test Data

Use the TestDataManager for environment-specific data:

```yaml
# src/data/fixtures/authentication.yaml
validUser:
  username: ${TEST_USERNAME}
  password: ${TEST_PASSWORD}

invalidUser:
  username: "invalid@example.com"
  password: "wrongpassword"
```

```typescript
const userData = this.context.data.get('authentication.validUser');
await loginPage.login(userData.username, userData.password);
```

## Parallel Execution

The framework uses worker-scoped contexts for safe parallel execution:

```bash
# Run with 4 parallel workers
PARALLEL_WORKERS=4 npm test

# Each worker gets its own:
# - WebDriver instance
# - TestContext
# - Logger with unique correlation ID
# - Plugin instances
```

## Plugins

### Metrics Plugin

Tracks performance metrics and detects regressions:

```json
{
  "plugins": {
    "enabled": ["metrics"],
    "metrics": {
      "dbPath": "data/metrics.db",
      "slowLocatorThresholdMs": 500,
      "performanceRegressionThreshold": 0.5
    }
  }
}
```

### Allure Plugin

Generates comprehensive test reports:

```json
{
  "plugins": {
    "enabled": ["allure"],
    "allure": {
      "outputDir": "reports/allure-results"
    }
  }
}
```

### Visual Plugin

Captures and compares screenshots:

```typescript
const visualPlugin = this.context.plugins.get<VisualPlugin>('visual');
await visualPlugin.captureBaseline('login-page');
await visualPlugin.compareWithBaseline('login-page');
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: UI Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Generate locators
        run: npm run generate:locators
      
      - name: Run tests
        run: npm test
        env:
          ENVIRONMENT: ci
          PARALLEL_WORKERS: 4
          BASE_URL: http://localhost:3000
      
      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: reports/
```

## Troubleshooting

See [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) for common issues and solutions.

## Architecture

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed architecture documentation.

## Contributing

1. Follow the existing code structure and naming conventions
2. Write tests for new features
3. Update documentation
4. Run linting: `npm run lint`
5. Ensure all tests pass: `npm test`

## License

MIT
