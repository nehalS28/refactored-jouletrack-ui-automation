# Troubleshooting Guide

This guide covers common issues, debugging techniques, performance optimization tips, and solutions for CI/CD integration problems.

## Table of Contents

1. [Common Issues](#common-issues)
2. [Debugging Techniques](#debugging-techniques)
3. [Performance Optimization](#performance-optimization)
4. [CI/CD Integration Issues](#cicd-integration-issues)
5. [Browser Driver Issues](#browser-driver-issues)
6. [Test Flakiness Solutions](#test-flakiness-solutions)

---

## Common Issues

### Issue: "Cannot find module" errors after generating locators

**Symptoms**:
```
Error: Cannot find module './locators/generated/index.js'
```

**Cause**: Locators not generated or TypeScript not compiled.

**Solution**:
```bash
# Generate locators from YAML
npm run generate:locators

# Compile TypeScript
npm run build

# Verify generated file exists
ls -la src/locators/generated/index.ts
```

---

### Issue: Tests fail with "Element not found"

**Symptoms**:
```
Error: Element not found: [data-testid='username-input']
```

**Causes**:
1. Selector is incorrect
2. Element not yet rendered
3. Element is in an iframe
4. Element is hidden/not visible

**Solutions**:

**1. Verify selector in browser DevTools**:
```javascript
// In browser console
document.querySelector("[data-testid='username-input']")
```

**2. Increase wait timeout**:
```typescript
await this.wait.forVisible(locator, 10000); // 10 seconds
```

**3. Check if element is in iframe**:
```typescript
// Switch to iframe first
await this.driver.switchTo().frame(0);
await this.actions.click(locator);
await this.driver.switchTo().defaultContent();
```

**4. Wait for element to be visible**:
```typescript
// Use appropriate wait condition
await this.wait.forVisible(locator);      // Element visible
await this.wait.forClickable(locator);    // Element clickable
await this.wait.forPresent(locator);      // Element in DOM
```

---

### Issue: "WebDriver session not created"

**Symptoms**:
```
Error: WebDriver session not created: Chrome version mismatch
```

**Cause**: Browser driver version doesn't match installed browser version.

**Solution**:

**For Chrome**:
```bash
# Check Chrome version
google-chrome --version

# Update ChromeDriver
npm install chromedriver@latest

# Or use webdriver-manager
npx webdriver-manager update
```

**For Firefox**:
```bash
# Check Firefox version
firefox --version

# Update GeckoDriver
npm install geckodriver@latest
```

**Alternative**: Use Selenium Manager (auto-manages drivers):
```typescript
// In config
{
  "browser": {
    "type": "chrome",
    "useSeleniumManager": true
  }
}
```

---

### Issue: Tests pass locally but fail in CI

**Symptoms**: Tests work on local machine but fail in CI pipeline.

**Common Causes**:
1. Timing issues (CI is slower)
2. Headless mode differences
3. Missing environment variables
4. Different screen resolution

**Solutions**:

**1. Increase timeouts for CI**:
```json
// config/profiles/ci.json
{
  "timeouts": {
    "implicit": 10000,
    "explicit": 30000,
    "pageLoad": 60000
  }
}
```

**2. Use headless mode in CI**:
```json
{
  "browser": {
    "type": "chrome",
    "headless": true,
    "args": [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ]
  }
}
```

**3. Set environment variables in CI**:
```yaml
# .github/workflows/test.yml
env:
  BASE_URL: http://localhost:3000
  TEST_USERNAME: ${{ secrets.TEST_USERNAME }}
  TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

**4. Set consistent window size**:
```typescript
await this.driver.manage().window().setRect({ width: 1920, height: 1080 });
```

---

### Issue: "StaleElementReferenceException"

**Symptoms**:
```
Error: stale element reference: element is not attached to the page document
```

**Cause**: Element was found but DOM changed before interaction.

**Solution**:

**1. Re-find element before interaction**:
```typescript
// ActionHelper already handles this with retry logic
await this.actions.click(locator); // Automatically retries on stale element
```

**2. Wait for element to be stable**:
```typescript
await this.wait.forAnimationComplete(locator);
await this.actions.click(locator);
```

**3. Use explicit wait**:
```typescript
await this.wait.forStale(oldElement);
await this.wait.forVisible(locator);
```

---

### Issue: Parallel tests interfere with each other

**Symptoms**: Tests pass when run individually but fail in parallel.

**Cause**: Shared mutable state or resource conflicts.

**Solutions**:

**1. Verify worker isolation**:
```typescript
// Each worker should have its own TestContext
console.log('Worker ID:', this.context.workerId);
console.log('Correlation ID:', this.context.correlationId);
```

**2. Use unique test data per worker**:
```typescript
const username = `testuser-${this.context.workerId}@example.com`;
```

**3. Avoid shared resources**:
```typescript
// BAD: Shared file
const filePath = 'test-data.json';

// GOOD: Worker-specific file
const filePath = `test-data-${this.context.workerId}.json`;
```

**4. Use resource locking for exclusive access**:
```gherkin
@exclusive
Scenario: Test requiring exclusive resource
  # This test won't run in parallel with other @exclusive tests
```

---

## Debugging Techniques

### Enable Debug Logging

```bash
# Set log level to debug
LOG_LEVEL=debug npm test

# View structured logs
LOG_LEVEL=debug npm test | jq '.'
```

### Run Single Test

```bash
# Run specific scenario by line number
npm test features/authentication/login.feature:10

# Run specific tag
TAG_FILTER="@smoke" npm test
```

### Take Screenshots on Failure

Screenshots are automatically captured on failure. View them in:
```
reports/screenshots/
```

To manually capture:
```typescript
const visualPlugin = this.context.plugins.get<VisualPlugin>('visual');
await visualPlugin.captureScreenshot('debug-screenshot');
```

### Inspect Element State

```typescript
// Get element attributes
const value = await this.actions.getAttribute(locator, 'value');
const disabled = await this.actions.getAttribute(locator, 'disabled');

// Get element text
const text = await this.actions.getText(locator);

// Check if element is displayed
const isDisplayed = await this.actions.isDisplayed(locator);
```

### Use Browser DevTools

```typescript
// Pause execution for manual inspection
await this.driver.executeScript('debugger;');

// Or add a long wait
await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute
```

### View Test Metrics

```bash
# Generate metrics report
npm run cli metrics:report --format html --output reports/metrics.html

# View in browser
open reports/metrics.html
```

### Check Dependency Graph

```bash
# Build dependency graph
npm run cli graph:build

# View affected tests
npm run cli graph:affected --files "src/pages/login-page.ts"
```

---

## Performance Optimization

### Slow Test Execution

**Symptoms**: Tests take too long to complete.

**Solutions**:

**1. Enable parallel execution**:
```bash
PARALLEL_WORKERS=4 npm test
```

**2. Use smart test selection**:
```bash
# Only run tests affected by changes
npm run cli graph:affected --files "$(git diff --name-only main)"
```

**3. Optimize waits**:
```typescript
// BAD: Hardcoded sleep
await new Promise(resolve => setTimeout(resolve, 5000));

// GOOD: Explicit wait with condition
await this.wait.forVisible(locator, 5000);
```

**4. Reduce implicit wait timeout**:
```json
{
  "timeouts": {
    "implicit": 0,  // Use explicit waits instead
    "explicit": 10000
  }
}
```

**5. Use headless mode**:
```json
{
  "browser": {
    "headless": true
  }
}
```

### Slow Locator Lookups

**Symptoms**: Metrics report shows locators > 500ms.

**Solutions**:

**1. Optimize selectors**:
```yaml
# BAD: Complex CSS selector
selector: "div.container > ul.list > li:nth-child(3) > a.link"

# GOOD: data-testid
selector: "[data-testid='third-link']"
strategy: data-testid
```

**2. Use more specific selectors**:
```yaml
# BAD: Generic selector (searches entire DOM)
selector: "button"

# GOOD: Specific selector
selector: "[data-testid='submit-button']"
```

**3. Check for slow animations**:
```typescript
// Wait for animations to complete
await this.wait.forAnimationComplete(locator);
```

### High Memory Usage

**Symptoms**: Tests crash with "Out of memory" errors.

**Solutions**:

**1. Reduce parallel workers**:
```bash
PARALLEL_WORKERS=2 npm test
```

**2. Dispose contexts properly**:
```typescript
// Framework handles this automatically
// Verify in logs: "TestContext disposed"
```

**3. Clear browser cache between tests**:
```typescript
await this.driver.manage().deleteAllCookies();
await this.driver.executeScript('window.localStorage.clear();');
await this.driver.executeScript('window.sessionStorage.clear();');
```

---

## CI/CD Integration Issues

### GitHub Actions Failures

**Issue**: Tests fail in GitHub Actions but pass locally.

**Solution**:

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
      
      - name: Start application
        run: |
          npm run start:test &
          npx wait-on http://localhost:3000
      
      - name: Run tests
        run: npm test
        env:
          ENVIRONMENT: ci
          BASE_URL: http://localhost:3000
          PARALLEL_WORKERS: 2
          LOG_LEVEL: info
      
      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: reports/
      
      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: screenshots
          path: reports/screenshots/
```

### Docker Container Issues

**Issue**: Tests fail in Docker container.

**Solution**:

```dockerfile
FROM node:18

# Install Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build
RUN npm run generate:locators

# Run tests
CMD ["npm", "test"]
```

### Jenkins Pipeline Issues

**Issue**: Tests fail in Jenkins.

**Solution**:

```groovy
pipeline {
    agent any
    
    environment {
        BASE_URL = 'http://test-server:3000'
        ENVIRONMENT = 'ci'
        PARALLEL_WORKERS = '4'
    }
    
    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Build') {
            steps {
                sh 'npm run build'
                sh 'npm run generate:locators'
            }
        }
        
        stage('Test') {
            steps {
                sh 'npm test'
            }
        }
    }
    
    post {
        always {
            publishHTML([
                reportDir: 'reports',
                reportFiles: 'cucumber-report.html',
                reportName: 'Test Report'
            ])
            
            junit 'reports/junit/*.xml'
        }
        
        failure {
            archiveArtifacts artifacts: 'reports/screenshots/**', allowEmptyArchive: true
        }
    }
}
```

---

## Browser Driver Issues

### ChromeDriver Version Mismatch

**Error**:
```
SessionNotCreatedException: session not created: This version of ChromeDriver only supports Chrome version 120
```

**Solution**:

```bash
# Option 1: Update ChromeDriver
npm install chromedriver@latest

# Option 2: Use Selenium Manager (recommended)
# Add to config:
{
  "browser": {
    "useSeleniumManager": true
  }
}

# Option 3: Use webdriver-manager
npx webdriver-manager update
npx webdriver-manager start
```

### GeckoDriver (Firefox) Issues

**Error**:
```
WebDriverError: Unable to find a matching set of capabilities
```

**Solution**:

```bash
# Update GeckoDriver
npm install geckodriver@latest

# Or download manually
wget https://github.com/mozilla/geckodriver/releases/download/v0.33.0/geckodriver-v0.33.0-linux64.tar.gz
tar -xvzf geckodriver-v0.33.0-linux64.tar.gz
sudo mv geckodriver /usr/local/bin/
```

### Headless Mode Issues

**Issue**: Tests fail in headless mode but pass in headed mode.

**Solution**:

```json
{
  "browser": {
    "type": "chrome",
    "headless": true,
    "args": [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1920,1080",
      "--disable-extensions",
      "--disable-software-rasterizer"
    ]
  }
}
```

---

## Test Flakiness Solutions

### Intermittent Failures

**Symptoms**: Tests sometimes pass, sometimes fail.

**Common Causes**:
1. Race conditions
2. Timing issues
3. Network delays
4. Animation timing

**Solutions**:

**1. Use appropriate wait strategies**:
```typescript
// Wait for network to be idle
await this.wait.forNetworkIdle();

// Wait for specific text
await this.wait.forText(locator, 'Expected Text');

// Wait for element count
await this.wait.forCount(locator, 5);

// Wait for API response
await this.wait.forApiResponse('/api/users');
```

**2. Add retry logic**:
```typescript
// ActionHelper already retries 3 times
await this.actions.click(locator); // Auto-retries on failure
```

**3. Disable animations in test environment**:
```typescript
await this.driver.executeScript(`
  const style = document.createElement('style');
  style.innerHTML = '* { transition: none !important; animation: none !important; }';
  document.head.appendChild(style);
`);
```

**4. Use stable selectors**:
```yaml
# BAD: Position-based selector (fragile)
selector: "div:nth-child(3) > button"

# GOOD: data-testid (stable)
selector: "[data-testid='submit-button']"
strategy: data-testid
```

**5. Tag flaky tests for retry**:
```gherkin
@flaky
Scenario: Sometimes fails due to timing
  # This test will be retried on failure
```

```json
{
  "retry": {
    "maxAttempts": 3,
    "tagFilter": "@flaky"
  }
}
```

### Element Interaction Issues

**Issue**: "Element is not clickable at point (x, y)"

**Solution**:

```typescript
// ActionHelper automatically scrolls into view
await this.actions.click(locator);

// Or manually scroll
await this.driver.executeScript('arguments[0].scrollIntoView(true);', element);
await this.actions.click(locator);
```

### Timing-Dependent Tests

**Issue**: Tests depend on specific timing.

**Solution**:

```typescript
// BAD: Hardcoded wait
await new Promise(resolve => setTimeout(resolve, 3000));

// GOOD: Wait for condition
await this.wait.forCustom(
  async () => {
    const count = await this.actions.getElementCount(locator);
    return count === 5 ? true : false;
  },
  'Wait for 5 elements',
  10000
);
```

---

## Getting Help

### Check Logs

```bash
# View structured logs
LOG_LEVEL=debug npm test 2>&1 | tee test.log

# Search logs for errors
grep "ERROR" test.log

# View logs for specific correlation ID
grep "corr-worker-1-" test.log
```

### Generate Diagnostic Report

```bash
# Generate comprehensive metrics report
npm run cli metrics:report --format json --output diagnostics.json

# View dependency graph
npm run cli graph:build
cat .cache/test-dependency-graph.json
```

### Report Issues

When reporting issues, include:
1. Framework version (`npm list @jira2test/ui-automation`)
2. Node version (`node --version`)
3. Browser version
4. Operating system
5. Error message and stack trace
6. Steps to reproduce
7. Relevant logs (with correlation ID)
8. Screenshots (if applicable)

### Community Resources

- GitHub Issues: [Report bugs and request features]
- Documentation: [README.md](../README.md), [ARCHITECTURE.md](./ARCHITECTURE.md)
- Examples: [EXAMPLE-TEST-SUITE.md](./EXAMPLE-TEST-SUITE.md)

---

## Summary

Most issues can be resolved by:
1. ✅ Using appropriate wait strategies
2. ✅ Enabling debug logging
3. ✅ Verifying selectors in browser DevTools
4. ✅ Checking environment configuration
5. ✅ Reviewing test metrics for performance issues
6. ✅ Using stable, data-testid selectors
7. ✅ Ensuring proper test isolation

For persistent issues, generate a diagnostic report and check the logs with correlation IDs for detailed tracing.
