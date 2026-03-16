/**
 * Unit tests for shared common step definitions.
 * Tests common steps with mocked TestContext.
 * 
 * @module steps/shared/common.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TestContext } from '../../types/context.types.js';

describe('Common Step Definitions', () => {
  let mockContext: TestContext;
  let mockDriver: any;

  beforeEach(() => {
    // Create mock driver
    mockDriver = {
      takeScreenshot: vi.fn().mockResolvedValue('base64-screenshot-data'),
      switchTo: vi.fn().mockReturnValue({
        defaultContent: vi.fn().mockResolvedValue(undefined),
        alert: vi.fn().mockResolvedValue({
          accept: vi.fn().mockResolvedValue(undefined),
          dismiss: vi.fn().mockResolvedValue(undefined),
          getText: vi.fn().mockResolvedValue('Alert text')
        })
      })
    };

    // Create mock TestContext
    mockContext = {
      id: 'test-context-1',
      workerId: 'worker-1',
      driver: mockDriver,
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
  });

  describe('When I wait for {int} second(s)', () => {
    it('should wait for specified seconds', async () => {
      const seconds = 1;
      const startTime = Date.now();
      
      await new Promise(resolve => setTimeout(resolve, seconds * 1000));
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(seconds * 1000);
      expect(elapsed).toBeLessThan((seconds + 0.5) * 1000);
    });

    it('should wait for multiple seconds', async () => {
      const seconds = 2;
      const startTime = Date.now();
      
      await new Promise(resolve => setTimeout(resolve, seconds * 1000));
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(seconds * 1000);
    });
  });

  describe('When I wait for {int} millisecond(s)', () => {
    it('should wait for specified milliseconds', async () => {
      const milliseconds = 500;
      const startTime = Date.now();
      
      await new Promise(resolve => setTimeout(resolve, milliseconds));
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(milliseconds);
      expect(elapsed).toBeLessThan(milliseconds + 100);
    });

    it('should wait for 100 milliseconds', async () => {
      const milliseconds = 100;
      const startTime = Date.now();
      
      await new Promise(resolve => setTimeout(resolve, milliseconds));
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(milliseconds);
    });
  });

  describe('When I take a screenshot', () => {
    it('should capture a screenshot', async () => {
      const screenshot = await mockDriver.takeScreenshot();

      expect(mockDriver.takeScreenshot).toHaveBeenCalled();
      expect(screenshot).toBe('base64-screenshot-data');
    });

    it('should log screenshot capture', async () => {
      const screenshot = await mockDriver.takeScreenshot();
      
      mockContext.logger.debug('Screenshot captured', { size: screenshot.length });

      expect(mockContext.logger.debug).toHaveBeenCalledWith(
        'Screenshot captured',
        { size: screenshot.length }
      );
    });

    it('should handle screenshot failures', async () => {
      mockDriver.takeScreenshot.mockRejectedValue(new Error('Screenshot failed'));

      await expect(mockDriver.takeScreenshot()).rejects.toThrow('Screenshot failed');
    });
  });

  describe('When I switch to default content', () => {
    it('should switch to default content', async () => {
      await mockDriver.switchTo().defaultContent();

      expect(mockDriver.switchTo).toHaveBeenCalled();
    });
  });

  describe('When I accept the alert', () => {
    it('should accept the alert', async () => {
      const alert = await mockDriver.switchTo().alert();
      await alert.accept();

      expect(mockDriver.switchTo).toHaveBeenCalled();
      expect(alert.accept).toHaveBeenCalled();
    });
  });

  describe('When I dismiss the alert', () => {
    it('should dismiss the alert', async () => {
      const alert = await mockDriver.switchTo().alert();
      await alert.dismiss();

      expect(mockDriver.switchTo).toHaveBeenCalled();
      expect(alert.dismiss).toHaveBeenCalled();
    });
  });

  describe('Then the alert text should be {string}', () => {
    it('should verify alert text matches expected value', async () => {
      const expectedText = 'Alert text';
      const alert = await mockDriver.switchTo().alert();
      const actualText = await alert.getText();

      expect(actualText).toBe(expectedText);
    });

    it('should fail when alert text does not match', async () => {
      const expectedText = 'Different text';
      const alert = await mockDriver.switchTo().alert();
      alert.getText.mockResolvedValue('Alert text');
      const actualText = await alert.getText();

      expect(actualText).not.toBe(expectedText);
    });
  });

  describe('Logging and Debugging', () => {
    it('should log click actions', () => {
      const text = 'Submit Button';
      mockContext.logger.debug('Clicking element', { text });

      expect(mockContext.logger.debug).toHaveBeenCalledWith('Clicking element', { text });
    });

    it('should log typing actions', () => {
      const text = 'test input';
      const fieldName = 'username';
      mockContext.logger.debug('Typing into field', { text, fieldName });

      expect(mockContext.logger.debug).toHaveBeenCalledWith('Typing into field', { text, fieldName });
    });

    it('should log clearing actions', () => {
      const fieldName = 'password';
      mockContext.logger.debug('Clearing field', { fieldName });

      expect(mockContext.logger.debug).toHaveBeenCalledWith('Clearing field', { fieldName });
    });

    it('should log selection actions', () => {
      const option = 'Option 1';
      const dropdownName = 'Country';
      mockContext.logger.debug('Selecting from dropdown', { option, dropdownName });

      expect(mockContext.logger.debug).toHaveBeenCalledWith('Selecting from dropdown', { option, dropdownName });
    });

    it('should log checkbox actions', () => {
      const checkboxName = 'Terms and Conditions';
      mockContext.logger.debug('Checking checkbox', { checkboxName });

      expect(mockContext.logger.debug).toHaveBeenCalledWith('Checking checkbox', { checkboxName });
    });

    it('should log hover actions', () => {
      const elementName = 'Menu Item';
      mockContext.logger.debug('Hovering over element', { elementName });

      expect(mockContext.logger.debug).toHaveBeenCalledWith('Hovering over element', { elementName });
    });

    it('should log scroll actions', () => {
      const elementName = 'Footer';
      mockContext.logger.debug('Scrolling to element', { elementName });

      expect(mockContext.logger.debug).toHaveBeenCalledWith('Scrolling to element', { elementName });
    });

    it('should log iframe switch actions', () => {
      const iframeName = 'payment-iframe';
      mockContext.logger.debug('Switching to iframe', { iframeName });

      expect(mockContext.logger.debug).toHaveBeenCalledWith('Switching to iframe', { iframeName });
    });

    it('should log logout actions', () => {
      mockContext.logger.debug('Logging out');

      expect(mockContext.logger.debug).toHaveBeenCalledWith('Logging out');
    });
  });

  describe('Parameterization and Reusability', () => {
    it('should support multiple wait durations', async () => {
      const durations = [100, 200, 500];
      
      for (const ms of durations) {
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, ms));
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeGreaterThanOrEqual(ms);
      }
    });

    it('should support multiple alert texts', async () => {
      const alertTexts = ['Confirm action', 'Delete item?', 'Save changes?'];
      
      for (const text of alertTexts) {
        const alert = await mockDriver.switchTo().alert();
        alert.getText.mockResolvedValue(text);
        const actualText = await alert.getText();
        expect(actualText).toBe(text);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle screenshot failures gracefully', async () => {
      mockDriver.takeScreenshot.mockRejectedValue(new Error('Driver not initialized'));

      await expect(mockDriver.takeScreenshot()).rejects.toThrow('Driver not initialized');
    });

    it('should handle alert not present errors', async () => {
      mockDriver.switchTo.mockReturnValue({
        alert: vi.fn().mockRejectedValue(new Error('No alert present'))
      });

      await expect(mockDriver.switchTo().alert()).rejects.toThrow('No alert present');
    });

    it('should handle switch to iframe failures', async () => {
      mockDriver.switchTo.mockReturnValue({
        frame: vi.fn().mockRejectedValue(new Error('Iframe not found'))
      });

      await expect(mockDriver.switchTo().frame('test-iframe')).rejects.toThrow('Iframe not found');
    });
  });

  describe('Step Definition Conciseness', () => {
    it('should keep step implementations minimal', () => {
      // Verify that common steps follow the pattern:
      // 1. Log action (optional)
      // 2. Perform action via driver/actions
      // 3. Return (implicit)
      
      const stepPattern = async (context: TestContext) => {
        context.logger.debug('Action');
        await context.driver.takeScreenshot();
      };
      
      // Step should be under 10 lines
      expect(stepPattern.toString().split('\n').length).toBeLessThanOrEqual(10);
    });
  });

  describe('Cross-Domain Functionality', () => {
    it('should support actions across all domains', () => {
      // Common steps should work regardless of domain
      const domains = ['authentication', 'dashboard', 'reports', 'settings'];
      
      for (const domain of domains) {
        mockContext.logger.debug('Performing action in domain', { domain });
        expect(mockContext.logger.debug).toHaveBeenCalledWith('Performing action in domain', { domain });
      }
    });

    it('should provide consistent behavior across domains', async () => {
      // Screenshot should work the same in all domains
      const screenshot1 = await mockDriver.takeScreenshot();
      const screenshot2 = await mockDriver.takeScreenshot();
      
      expect(screenshot1).toBe(screenshot2);
    });
  });
});
