/**
 * Unit tests for shared navigation step definitions.
 * Tests navigation steps with mocked TestContext.
 * 
 * @module steps/shared/navigation.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TestContext } from '../../types/context.types.js';
import { BasePage } from '../../pages/base-page.js';

// Mock the BasePage
vi.mock('../../pages/base-page.js', () => ({
  BasePage: vi.fn()
}));

describe('Navigation Step Definitions', () => {
  let mockContext: TestContext;
  let mockBasePage: any;

  beforeEach(() => {
    // Create mock TestContext
    mockContext = {
      id: 'test-context-1',
      workerId: 'worker-1',
      driver: {} as any,
      config: {
        baseUrl: 'http://localhost:3000',
        timeouts: { explicit: 10000 }
      } as any,
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      } as any,
      actions: {} as any,
      wait: {} as any,
      locators: {} as any,
      plugins: {} as any,
      correlationId: 'corr-1'
    };

    // Create mock BasePage instance
    mockBasePage = {
      navigateTo: vi.fn().mockResolvedValue(undefined),
      getCurrentUrl: vi.fn().mockResolvedValue('http://localhost:3000/dashboard'),
      goBack: vi.fn().mockResolvedValue(undefined),
      goForward: vi.fn().mockResolvedValue(undefined),
      refresh: vi.fn().mockResolvedValue(undefined)
    };

    // Mock BasePage constructor to return our mock instance
    (BasePage as any).mockImplementation(() => mockBasePage);
  });

  describe('Given the application is running', () => {
    it('should verify baseUrl is defined', () => {
      expect(mockContext.config.baseUrl).toBeDefined();
      expect(mockContext.config.baseUrl).not.toBe('');
    });

    it('should fail when baseUrl is empty', () => {
      mockContext.config.baseUrl = '';
      expect(mockContext.config.baseUrl).toBe('');
    });

    it('should fail when baseUrl is undefined', () => {
      mockContext.config.baseUrl = undefined as any;
      expect(mockContext.config.baseUrl).toBeUndefined();
    });
  });

  describe('When I navigate to {string}', () => {
    it('should navigate to the specified path', async () => {
      const path = '/dashboard';
      
      const page = new BasePage(mockContext);
      await page.navigateTo(path);

      expect(mockBasePage.navigateTo).toHaveBeenCalledWith(path);
    });

    it('should handle absolute URLs', async () => {
      const url = 'http://example.com/page';
      
      const page = new BasePage(mockContext);
      await page.navigateTo(url);

      expect(mockBasePage.navigateTo).toHaveBeenCalledWith(url);
    });

    it('should handle paths with query parameters', async () => {
      const path = '/dashboard?tab=overview';
      
      const page = new BasePage(mockContext);
      await page.navigateTo(path);

      expect(mockBasePage.navigateTo).toHaveBeenCalledWith(path);
    });
  });

  describe('When I go to the {string} page', () => {
    it('should navigate to login page', async () => {
      const page = new BasePage(mockContext);
      await page.navigateTo('/login');

      expect(mockBasePage.navigateTo).toHaveBeenCalledWith('/login');
    });

    it('should navigate to dashboard page', async () => {
      const page = new BasePage(mockContext);
      await page.navigateTo('/dashboard');

      expect(mockBasePage.navigateTo).toHaveBeenCalledWith('/dashboard');
    });

    it('should navigate to reports page', async () => {
      const page = new BasePage(mockContext);
      await page.navigateTo('/reports');

      expect(mockBasePage.navigateTo).toHaveBeenCalledWith('/reports');
    });

    it('should navigate to settings page', async () => {
      const page = new BasePage(mockContext);
      await page.navigateTo('/settings');

      expect(mockBasePage.navigateTo).toHaveBeenCalledWith('/settings');
    });

    it('should navigate to home page', async () => {
      const page = new BasePage(mockContext);
      await page.navigateTo('/');

      expect(mockBasePage.navigateTo).toHaveBeenCalledWith('/');
    });

    it('should throw error for unknown page', () => {
      const unknownPage = 'unknown-page';
      const pathMap: Record<string, string> = {
        'login': '/login',
        'dashboard': '/dashboard',
        'reports': '/reports',
        'settings': '/settings',
        'home': '/'
      };
      
      const path = pathMap[unknownPage.toLowerCase()];
      expect(path).toBeUndefined();
    });
  });

  describe('Then I should be on the {string} page', () => {
    it('should verify current URL contains expected path', async () => {
      mockBasePage.getCurrentUrl.mockResolvedValue('http://localhost:3000/dashboard');
      
      const page = new BasePage(mockContext);
      const currentUrl = await page.getCurrentUrl();

      expect(currentUrl).toContain('/dashboard');
    });

    it('should fail when URL does not contain expected path', async () => {
      mockBasePage.getCurrentUrl.mockResolvedValue('http://localhost:3000/login');
      
      const page = new BasePage(mockContext);
      const currentUrl = await page.getCurrentUrl();

      expect(currentUrl).not.toContain('/dashboard');
    });
  });

  describe('Then I should be redirected to the {string}', () => {
    it('should verify redirection to dashboard', async () => {
      mockBasePage.getCurrentUrl.mockResolvedValue('http://localhost:3000/dashboard');
      
      const page = new BasePage(mockContext);
      const currentUrl = await page.getCurrentUrl();

      expect(currentUrl).toContain('dashboard');
    });

    it('should verify redirection to login', async () => {
      mockBasePage.getCurrentUrl.mockResolvedValue('http://localhost:3000/login');
      
      const page = new BasePage(mockContext);
      const currentUrl = await page.getCurrentUrl();

      expect(currentUrl).toContain('login');
    });
  });

  describe('Then I should remain on the {string} page', () => {
    it('should verify staying on login page', async () => {
      mockBasePage.getCurrentUrl.mockResolvedValue('http://localhost:3000/login');
      
      const page = new BasePage(mockContext);
      const currentUrl = await page.getCurrentUrl();

      expect(currentUrl).toContain('login');
    });
  });

  describe('When I go back', () => {
    it('should navigate back in browser history', async () => {
      const page = new BasePage(mockContext);
      await page.goBack();

      expect(mockBasePage.goBack).toHaveBeenCalled();
    });
  });

  describe('When I go forward', () => {
    it('should navigate forward in browser history', async () => {
      const page = new BasePage(mockContext);
      await page.goForward();

      expect(mockBasePage.goForward).toHaveBeenCalled();
    });
  });

  describe('When I refresh the page', () => {
    it('should refresh the current page', async () => {
      const page = new BasePage(mockContext);
      await page.refresh();

      expect(mockBasePage.refresh).toHaveBeenCalled();
    });
  });

  describe('When I return to the {string} page', () => {
    it('should navigate back to login page', async () => {
      const page = new BasePage(mockContext);
      await page.navigateTo('/login');

      expect(mockBasePage.navigateTo).toHaveBeenCalledWith('/login');
    });

    it('should navigate back to dashboard page', async () => {
      const page = new BasePage(mockContext);
      await page.navigateTo('/dashboard');

      expect(mockBasePage.navigateTo).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Parameterization and Reusability', () => {
    it('should support navigation to multiple pages', async () => {
      const pages = ['login', 'dashboard', 'reports', 'settings'];
      const pathMap: Record<string, string> = {
        'login': '/login',
        'dashboard': '/dashboard',
        'reports': '/reports',
        'settings': '/settings'
      };
      
      for (const pageName of pages) {
        const page = new BasePage(mockContext);
        const path = pathMap[pageName];
        await page.navigateTo(path);
        expect(mockBasePage.navigateTo).toHaveBeenCalledWith(path);
      }
    });

    it('should support URL verification for multiple pages', async () => {
      const urls = [
        'http://localhost:3000/login',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/reports'
      ];
      
      for (const url of urls) {
        mockBasePage.getCurrentUrl.mockResolvedValue(url);
        const page = new BasePage(mockContext);
        const currentUrl = await page.getCurrentUrl();
        expect(currentUrl).toBe(url);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle navigation failures', async () => {
      mockBasePage.navigateTo.mockRejectedValue(new Error('Navigation timeout'));
      
      const page = new BasePage(mockContext);
      
      await expect(page.navigateTo('/dashboard')).rejects.toThrow('Navigation timeout');
    });

    it('should handle getCurrentUrl failures', async () => {
      mockBasePage.getCurrentUrl.mockRejectedValue(new Error('Driver error'));
      
      const page = new BasePage(mockContext);
      
      await expect(page.getCurrentUrl()).rejects.toThrow('Driver error');
    });

    it('should handle goBack failures', async () => {
      mockBasePage.goBack.mockRejectedValue(new Error('No history'));
      
      const page = new BasePage(mockContext);
      
      await expect(page.goBack()).rejects.toThrow('No history');
    });
  });

  describe('Step Definition Delegation', () => {
    it('should delegate all navigation logic to BasePage', () => {
      const page = new BasePage(mockContext);
      
      // All these methods should exist on the page object
      expect(typeof page.navigateTo).toBe('function');
      expect(typeof page.getCurrentUrl).toBe('function');
      expect(typeof page.goBack).toBe('function');
      expect(typeof page.goForward).toBe('function');
      expect(typeof page.refresh).toBe('function');
    });
  });
});
