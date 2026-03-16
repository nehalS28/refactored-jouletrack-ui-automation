/**
 * Lightweight WebDriver service for browser lifecycle management.
 * Single responsibility: browser initialization, session management, and cleanup.
 * @module core/webdriver-service
 * @requirements 3.1, 3.2, 3.4, 3.6
 */
import { Builder } from 'selenium-webdriver';
import { Options as ChromeOptions } from 'selenium-webdriver/chrome.js';
import { Options as FirefoxOptions } from 'selenium-webdriver/firefox.js';
import { Options as EdgeOptions } from 'selenium-webdriver/edge.js';
import { Options as SafariOptions } from 'selenium-webdriver/safari.js';
/** Error thrown when browser initialization fails after all retry attempts. */
export class BrowserInitializationError extends Error {
    browserName;
    attempts;
    lastError;
    constructor(message, browserName, attempts, lastError) {
        super(`${message} (browser: ${browserName}, attempts: ${attempts})`);
        this.browserName = browserName;
        this.attempts = attempts;
        this.lastError = lastError;
        this.name = 'BrowserInitializationError';
    }
}
/** Lightweight WebDriver service with single responsibility for browser lifecycle. */
export class WebDriverService {
    config;
    logger;
    driver = null;
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }
    /** Initialize WebDriver with retry logic and exponential backoff. */
    async initialize() {
        const { maxAttempts, backoffMs, backoffMultiplier } = this.config.retry;
        const browserName = this.config.browser.name;
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                this.logger.info('Initializing browser', { browserName, attempt, maxAttempts });
                this.driver = await this.createDriver();
                await this.logSessionDetails();
                return this.driver;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                this.logger.warn('Browser initialization failed', {
                    browserName, attempt, maxAttempts, error: lastError.message,
                });
                if (attempt < maxAttempts) {
                    const delay = backoffMs * Math.pow(backoffMultiplier, attempt - 1);
                    this.logger.debug('Retrying after backoff', { delayMs: delay });
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw new BrowserInitializationError('Failed to initialize browser after all retry attempts', browserName, maxAttempts, lastError);
    }
    getDriver() { return this.driver; }
    async quit() {
        if (this.driver) {
            this.logger.info('Quitting browser');
            await this.driver.quit();
            this.driver = null;
            this.logger.debug('Browser quit successfully');
        }
    }
    async createDriver() {
        const builder = new Builder();
        const { name, headless, args } = this.config.browser;
        const browserMap = {
            chrome: {
                browser: 'chrome',
                options: () => {
                    const opts = new ChromeOptions();
                    if (headless)
                        opts.addArguments('--headless=new');
                    args.forEach(arg => opts.addArguments(arg));
                    return opts;
                },
            },
            firefox: {
                browser: 'firefox',
                options: () => {
                    const opts = new FirefoxOptions();
                    if (headless)
                        opts.addArguments('-headless');
                    args.forEach(arg => opts.addArguments(arg));
                    return opts;
                },
            },
            edge: {
                browser: 'MicrosoftEdge',
                options: () => {
                    const opts = new EdgeOptions();
                    if (headless)
                        opts.addArguments('--headless=new');
                    args.forEach(arg => opts.addArguments(arg));
                    return opts;
                },
            },
            safari: { browser: 'safari', options: () => new SafariOptions() },
        };
        const browserConfig = browserMap[name];
        if (!browserConfig)
            throw new Error(`Unsupported browser: ${name}`);
        builder.forBrowser(browserConfig.browser);
        const options = browserConfig.options();
        if (name === 'chrome')
            builder.setChromeOptions(options);
        else if (name === 'firefox')
            builder.setFirefoxOptions(options);
        else if (name === 'edge')
            builder.setEdgeOptions(options);
        else if (name === 'safari')
            builder.setSafariOptions(options);
        const driver = await builder.build();
        const { implicit, pageLoad, script } = this.config.timeouts;
        await driver.manage().setTimeouts({ implicit, pageLoad, script });
        const { width, height } = this.config.browser.windowSize;
        await driver.manage().window().setRect({ width, height });
        return driver;
    }
    async logSessionDetails() {
        if (!this.driver)
            return;
        const caps = await this.driver.getCapabilities();
        this.logger.info('Browser session created', {
            browserName: caps.get('browserName'),
            browserVersion: caps.get('browserVersion'),
            platformName: caps.get('platformName'),
        });
    }
}
//# sourceMappingURL=webdriver-service.js.map