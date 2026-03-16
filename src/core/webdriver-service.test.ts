/**
 * Unit tests for WebDriverService.
 * Tests browser lifecycle management, retry logic, and configuration.
 * 
 * @module core/webdriver-service.test
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { WebDriverService, BrowserInitializationError } from './webdriver-service.js';
import type { FrameworkConfig } from '../types/config.types.js';
import type { StructuredLogger } from '../types/context.types.js';

// Create mock driver
const createMockDriver = () => ({
  quit: vi.fn().mockResolvedValue(undefined),
  manage: vi.fn().mockReturnValue({
    setTimeouts: vi.fn().mockResolvedValue(undefined),
    window: vi.fn().mockReturnValue({
      setRect: vi.fn().mockResolvedValue(undefined),
    }),
  }),
  getCapabilities: vi.fn().mockResolvedValue({
    get: vi.fn((key: string) => {
      const caps: Record<string, string> = {
        browserName: 'chrome',
        browserVersion: '120.0.0',
        platformName: 'linux',
      };
      return caps[key];
    }),
  }),
});

// Create mock options
const createMockOptions = () => ({
  addArguments: vi.fn().mockReturnThis(),
});

// Mock variables
let mockDriver: ReturnType<typeof createMockDriver>;
let mockChromeOptions: ReturnType<typeof createMockOptions>;
let mockFirefoxOptions: ReturnType<typeof createMockOptions>;
let mockEdgeOptions: ReturnType<typeof createMockOptions>;
let mockSafariOptions: ReturnType<typeof createMockOptions>;
let mockBuild: Mock;

// Mock selenium-webdriver
vi.mock('selenium-webdriver', () => {
  return {
    Builder: vi.fn().mockImplementation(() => ({
      forBrowser: vi.fn().mockReturnThis(),
      setChromeOptions: vi.fn().mockReturnThis(),
      setFirefoxOptions: vi.fn().mockReturnThis(),
      setEdgeOptions: vi.fn().mockReturnThis(),
      setSafariOptions: vi.fn().mockReturnThis(),
      build: vi.fn(),
    })),
    Capabilities: vi.fn(),
  };
});

// Mock browser options
vi.mock('selenium-webdriver/chrome.js', () => ({
  Options: vi.fn(),
}));

vi.mock('selenium-webdriver/firefox.js', () => ({
  Options: vi.fn(),
}));

vi.mock('selenium-webdriver/edge.js', () => ({
  Options: vi.fn(),
}));

vi.mock('selenium-webdriver/safari.js', () => ({
  Options: vi.fn(),
}));

describe('WebDriverService', () => {
  let mockLogger: StructuredLogger;
  let baseConfig: FrameworkConfig;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create fresh mocks
    mockDriver = createMockDriver();
    mockChromeOptions = createMockOptions();
    mockFirefoxOptions = createMockOptions();
    mockEdgeOptions = createMockOptions();
    mockSafariOptions = createMockOptions();
    
    // Setup Builder mock
    const { Builder } = await import('selenium-webdriver');
    mockBuild = vi.fn().mockResolvedValue(mockDriver);
    vi.mocked(Builder).mockImplementation(() => ({
      forBrowser: vi.fn().mockReturnThis(),
      setChromeOptions: vi.fn().mockReturnThis(),
      setFirefoxOptions: vi.fn().mockReturnThis(),
      setEdgeOptions: vi.fn().mockReturnThis(),
      setSafariOptions: vi.fn().mockReturnThis(),
      build: mockBuild,
    }) as any);
    
    // Setup options mocks
    const { Options: ChromeOptions } = await import('selenium-webdriver/chrome.js');
    vi.mocked(ChromeOptions).mockImplementation(() => mockChromeOptions as any);
    
    const { Options: FirefoxOptions } = await import('selenium-webdriver/firefox.js');
    vi.mocked(FirefoxOptions).mockImplementation(() => mockFirefoxOptions as any);
    
    const { Options: EdgeOptions } = await import('selenium-webdriver/edge.js');
    vi.mocked(EdgeOptions).mockImplementation(() => mockEdgeOptions as any);
    
    const { Options: SafariOptions } = await import('selenium-webdriver/safari.js');
    vi.mocked(SafariOptions).mockImplementation(() => mockSafariOptions as any);
    
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      setTestId: vi.fn(),
      clearTestId: vi.fn(),
    };

    baseConfig = {
      environment: 'local',
      baseUrl: 'http://localhost:3000',
      browser: {
        name: 'chrome',
        headless: true,
        windowSize: { width: 1920, height: 1080 },
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      },
      timeouts: {
        implicit: 0,
        explicit: 10000,
        pageLoad: 30000,
        script: 30000,
        polling: 500,
      },
      retry: {
        maxAttempts: 3,
        backoffMs: 10, // Short for tests
        backoffMultiplier: 2,
      },
      parallel: {
        enabled: false,
        workers: 1,
      },
      logging: {
        level: 'info',
        structured: true,
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should initialize browser successfully on first attempt', async () => {
      const service = new WebDriverService(baseConfig, mockLogger);
      
      const driver = await service.initialize();
      
      expect(driver).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Initializing browser',
        expect.objectContaining({ browserName: 'chrome', attempt: 1 })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Browser session created',
        expect.objectContaining({
          browserName: 'chrome',
          browserVersion: '120.0.0',
        })
      );
    });

    it('should retry with exponential backoff on failure', async () => {
      // Fail first two attempts, succeed on third
      let attempts = 0;
      mockBuild.mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Connection refused');
        }
        return mockDriver;
      });

      const service = new WebDriverService(baseConfig, mockLogger);
      const driver = await service.initialize();

      expect(driver).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Retrying after backoff',
        expect.objectContaining({ delayMs: expect.any(Number) })
      );
    });

    it('should throw BrowserInitializationError after all retries fail', async () => {
      mockBuild.mockRejectedValue(new Error('Browser not found'));

      const service = new WebDriverService(baseConfig, mockLogger);

      await expect(service.initialize()).rejects.toThrow(BrowserInitializationError);
    });

    it('should include browser name and attempts in error', async () => {
      mockBuild.mockRejectedValue(new Error('Browser not found'));

      const service = new WebDriverService(baseConfig, mockLogger);

      try {
        await service.initialize();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BrowserInitializationError);
        expect((error as BrowserInitializationError).browserName).toBe('chrome');
        expect((error as BrowserInitializationError).attempts).toBe(3);
      }
    });

    it('should log session details after successful initialization', async () => {
      const service = new WebDriverService(baseConfig, mockLogger);
      
      await service.initialize();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Browser session created',
        expect.objectContaining({
          browserName: 'chrome',
          browserVersion: '120.0.0',
          platformName: 'linux',
        })
      );
    });
  });

  describe('browser configuration', () => {
    it('should configure Chrome browser with headless mode', async () => {
      const service = new WebDriverService(baseConfig, mockLogger);
      await service.initialize();

      expect(mockChromeOptions.addArguments).toHaveBeenCalledWith('--headless=new');
    });

    it('should configure Firefox browser', async () => {
      const firefoxConfig = {
        ...baseConfig,
        browser: { ...baseConfig.browser, name: 'firefox' as const },
      };
      
      const service = new WebDriverService(firefoxConfig, mockLogger);
      await service.initialize();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Initializing browser',
        expect.objectContaining({ browserName: 'firefox' })
      );
      expect(mockFirefoxOptions.addArguments).toHaveBeenCalledWith('-headless');
    });

    it('should configure Edge browser', async () => {
      const edgeConfig = {
        ...baseConfig,
        browser: { ...baseConfig.browser, name: 'edge' as const },
      };
      
      const service = new WebDriverService(edgeConfig, mockLogger);
      await service.initialize();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Initializing browser',
        expect.objectContaining({ browserName: 'edge' })
      );
      expect(mockEdgeOptions.addArguments).toHaveBeenCalledWith('--headless=new');
    });

    it('should configure Safari browser', async () => {
      const safariConfig = {
        ...baseConfig,
        browser: { ...baseConfig.browser, name: 'safari' as const, headless: false },
      };
      
      const service = new WebDriverService(safariConfig, mockLogger);
      await service.initialize();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Initializing browser',
        expect.objectContaining({ browserName: 'safari' })
      );
    });

    it('should pass additional browser arguments', async () => {
      const service = new WebDriverService(baseConfig, mockLogger);
      await service.initialize();

      expect(mockChromeOptions.addArguments).toHaveBeenCalledWith('--no-sandbox');
      expect(mockChromeOptions.addArguments).toHaveBeenCalledWith('--disable-dev-shm-usage');
    });

    it('should not add headless flag when headless is false', async () => {
      const nonHeadlessConfig = {
        ...baseConfig,
        browser: { ...baseConfig.browser, headless: false },
      };
      
      const service = new WebDriverService(nonHeadlessConfig, mockLogger);
      await service.initialize();

      expect(mockChromeOptions.addArguments).not.toHaveBeenCalledWith('--headless=new');
    });
  });

  describe('quit', () => {
    it('should quit browser and clean up', async () => {
      const service = new WebDriverService(baseConfig, mockLogger);
      await service.initialize();
      
      await service.quit();

      expect(mockDriver.quit).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Quitting browser');
      expect(mockLogger.debug).toHaveBeenCalledWith('Browser quit successfully');
    });

    it('should handle quit when driver is not initialized', async () => {
      const service = new WebDriverService(baseConfig, mockLogger);
      
      // Should not throw
      await service.quit();

      expect(mockLogger.info).not.toHaveBeenCalledWith('Quitting browser');
    });

    it('should set driver to null after quit', async () => {
      const service = new WebDriverService(baseConfig, mockLogger);
      await service.initialize();
      
      expect(service.getDriver()).not.toBeNull();
      
      await service.quit();
      
      expect(service.getDriver()).toBeNull();
    });
  });

  describe('getDriver', () => {
    it('should return null before initialization', () => {
      const service = new WebDriverService(baseConfig, mockLogger);
      
      expect(service.getDriver()).toBeNull();
    });

    it('should return driver after initialization', async () => {
      const service = new WebDriverService(baseConfig, mockLogger);
      await service.initialize();
      
      expect(service.getDriver()).not.toBeNull();
    });
  });

  describe('BrowserInitializationError', () => {
    it('should include browser name and attempts in error message', () => {
      const error = new BrowserInitializationError(
        'Failed to initialize',
        'chrome',
        3,
        new Error('Connection refused')
      );

      expect(error.message).toContain('chrome');
      expect(error.message).toContain('3');
      expect(error.browserName).toBe('chrome');
      expect(error.attempts).toBe(3);
      expect(error.lastError?.message).toBe('Connection refused');
    });

    it('should work without lastError', () => {
      const error = new BrowserInitializationError(
        'Failed to initialize',
        'firefox',
        2
      );

      expect(error.browserName).toBe('firefox');
      expect(error.attempts).toBe(2);
      expect(error.lastError).toBeUndefined();
    });
  });
});
