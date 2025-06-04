// Enhanced Playwright Example - Using Vue Locator Extractor with Dynamic Content
// This example demonstrates advanced patterns for testing Vue applications with:
// 1. Dynamic content (v-for loops)
// 2. Conditional elements (v-if, v-show)
// 3. Custom component integration
// 4. JS/TS generated elements

import { test, expect, Page } from '@playwright/test';
import {
  dashboardPage,
  dynamic_contentPage,
  dynamic_elements_js__JS_TSPage,
} from '../output/pageObjects';

// Test suite for static dashboard elements
test.describe('Dashboard - Static Elements', () => {
  let dashboard: dashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new dashboardPage(page);
    await page.goto('/dashboard');
  });

  test('should interact with robust static elements', async () => {
    // Test robust locators (recommended for production)
    await dashboard.searchOrdersInput.fill('test query');
    await expect(dashboard.searchOrdersInput).toHaveValue('test query');

    await dashboard.logoutBtn.click();
    await expect(page).toHaveURL('/login');
  });

  test('should handle XPath locators for complex elements', async () => {
    // Using robust XPath locators for complex element relationships
    await dashboard.xpathTrDataTestidOrderRow1ButtonContainsClassDeleteBtn.click();
    await expect(page.getByText('Are you sure?')).toBeVisible();

    // Using following-sibling XPath pattern
    await dashboard.xpathInputNameSearchFollowingSiblingButton21.click();
    await expect(dashboard.searchOrdersInput).toHaveValue('');
  });
});

// Test suite for dynamic content scenarios
test.describe('Dynamic Content - Advanced Patterns', () => {
  let dynamicPage: dynamic_contentPage;

  test.beforeEach(async ({ page }) => {
    dynamicPage = new dynamic_contentPage(page);
    await page.goto('/dynamic-content');
  });

  test('should handle conditional elements properly', async () => {
    // Test conditional elements that may not always be present
    await dynamicPage.refreshBtn.click();

    // Wait for loading state and verify conditional element
    await expect(dynamicPage.loadingIndicatorConditional).toBeVisible();

    // Wait for loading to complete
    await expect(dynamicPage.loadingIndicatorConditional).not.toBeVisible({
      timeout: 5000,
    });

    // If error state occurs, handle it appropriately
    if (await dynamicPage.retryBtn.isVisible()) {
      await dynamicPage.retryBtn.click();
      await expect(dynamicPage.loadingIndicatorConditional).toBeVisible();
    }
  });

  test('should handle dynamic lists with multiple instances', async ({
    page,
  }) => {
    // Wait for page to load data
    await page.waitForLoadState('networkidle');

    // Handle dynamic elements that may be repeated
    const userItems = page.locator('[data-testid^="user-item-"]');
    const userCount = await userItems.count();

    if (userCount > 0) {
      // Test first user item
      await userItems.first().scrollIntoViewIfNeeded();

      // Click edit on first user (dynamic testid pattern)
      const firstUserId = await userItems.first().getAttribute('data-testid');
      const userId = firstUserId?.replace('user-item-', '');

      if (userId) {
        await page.getByTestId(`edit-user-${userId}`).click();
        await expect(page.getByTestId('user-edit-modal')).toBeVisible();
      }
    }
  });

  test('should handle pagination controls dynamically', async ({ page }) => {
    // Handle dynamic pagination
    const pageButtons = page.locator('[data-testid^="page-"]');
    const pageCount = await pageButtons.count();

    if (pageCount > 1) {
      // Click on last page
      await pageButtons.last().click();

      // Verify page change
      await expect(pageButtons.last()).toHaveClass(/active/);
    }
  });

  test('should handle form validation errors conditionally', async () => {
    // Test conditional form validation
    await dynamicPage.usernameInput.fill(''); // Invalid input
    await dynamicPage.emailInput.fill('invalid-email'); // Invalid email
    await dynamicPage.submitFormBtn.click();

    // Check for conditional error messages
    await expect(dynamicPage.usernameErrorConditional).toBeVisible();
    await expect(dynamicPage.emailErrorConditional).toBeVisible();

    // Fix validation errors
    await dynamicPage.usernameInput.fill('validuser');
    await dynamicPage.emailInput.fill('valid@email.com');

    // Errors should disappear
    await expect(dynamicPage.usernameErrorConditional).not.toBeVisible();
    await expect(dynamicPage.emailErrorConditional).not.toBeVisible();
  });

  test('should handle notifications with dynamic dismiss functionality', async ({
    page,
  }) => {
    // Trigger notifications
    await page.evaluate(() => {
      // Simulate adding notifications
      window.addNotification?.({
        id: '1',
        message: 'Test notification',
        dismissible: true,
      });
      window.addNotification?.({
        id: '2',
        message: 'Another notification',
        dismissible: false,
      });
    });

    // Handle dynamic notification dismissal
    const dismissibleNotifications = page.locator('[data-testid^="dismiss-"]');
    const dismissCount = await dismissibleNotifications.count();

    for (let i = 0; i < dismissCount; i++) {
      const dismissBtn = dismissibleNotifications.nth(i);
      if (await dismissBtn.isVisible()) {
        await dismissBtn.click();
        // Verify notification is removed
        await expect(dismissBtn).not.toBeVisible();
      }
    }
  });
});

// Test suite for JS/TS generated elements
test.describe('JavaScript Generated Elements', () => {
  let jsElements: dynamic_elements_js__JS_TSPage;

  test.beforeEach(async ({ page }) => {
    jsElements = new dynamic_elements_js__JS_TSPage(page);
    await page.goto('/js-generated-content');
  });

  test('should handle createElement generated elements', async ({ page }) => {
    // Trigger dynamic table creation
    await page.evaluate(() => {
      window.createDynamicTable?.([
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      ]);
    });

    // Test dynamically created elements
    const dynamicTable = page.getByTestId('dynamic-table');
    await expect(dynamicTable).toBeVisible();

    // Test dynamic edit buttons
    await page.getByTestId('edit-user-1').click();
    await expect(page.getByTestId('edit-user-modal')).toBeVisible();
  });

  test('should handle template string generated forms', async ({ page }) => {
    // Generate form via template string
    await page.evaluate(() => {
      const formHtml = window.createFormHTML?.('test-form-123');
      if (formHtml) {
        document.body.insertAdjacentHTML('beforeend', formHtml);
      }
    });

    // Use extracted JS/TS locators
    await jsElements.formNameInput.fill('Test User');
    await jsElements.formEmailInput.fill('test@example.com');

    await jsElements.formSubmitBtn.click();

    // Verify form submission
    await expect(page.getByText('Form submitted successfully')).toBeVisible();
  });

  test('should handle Vue h() function generated elements', async ({
    page,
  }) => {
    // Trigger modal creation via Vue h() function
    await page.evaluate(() => {
      window.createModalDialog?.('confirmation-modal');
    });

    // Use extracted h() function locators
    await expect(jsElements.modalCloseBtn).toBeVisible();
    await expect(jsElements.modalConfirmBtn).toBeVisible();

    // Test modal interaction
    await jsElements.modalConfirmBtn.click();
    await expect(page.getByText('Action confirmed')).toBeVisible();
  });

  test('should handle notification template patterns', async ({ page }) => {
    // Generate notification via template string
    await page.evaluate(() => {
      const notification = {
        id: 'test-123',
        title: 'Test Notification',
        message: 'This is a test message',
        type: 'info',
      };
      const notificationHtml = window.generateNotificationHTML?.(notification);
      if (notificationHtml) {
        document.body.insertAdjacentHTML('beforeend', notificationHtml);
      }
    });

    // Test template-generated elements
    await expect(jsElements.notificationTitle).toBeVisible();
    await expect(jsElements.notificationMessage).toBeVisible();

    // Test dynamic close functionality
    const closeBtn = page.getByTestId('close-notification-test-123');
    await closeBtn.click();
    await expect(jsElements.notificationTitle).not.toBeVisible();
  });
});

// Advanced testing patterns for mixed dynamic/conditional content
test.describe('Advanced Integration Patterns', () => {
  test('should handle complex user workflows with dynamic elements', async ({
    page,
  }) => {
    const dashboard = new dashboardPage(page);
    const dynamicContent = new dynamic_contentPage(page);

    // Navigate and set up initial state
    await page.goto('/dashboard');
    await dashboard.searchOrdersInput.fill('active users');

    // Navigate to dynamic content area
    await page.goto('/dynamic-content');

    // Handle user management workflow
    await dynamicContent.refreshBtn.click();

    // Wait for dynamic content to load
    await expect(dynamicContent.loadingIndicatorConditional).toBeVisible();
    await expect(dynamicContent.loadingIndicatorConditional).not.toBeVisible();

    // Work with dynamic user list
    const userItems = page.locator('[data-testid^="user-item-"]');
    const userCount = await userItems.count();

    for (let i = 0; i < Math.min(userCount, 3); i++) {
      const userItem = userItems.nth(i);
      const userTestId = await userItem.getAttribute('data-testid');
      const userId = userTestId?.replace('user-item-', '');

      if (userId) {
        // Check user status and take appropriate action
        const deactivateBtn = page.getByTestId(`deactivate-user-${userId}`);
        const activateBtn = page.getByTestId(`activate-user-${userId}`);

        if (await deactivateBtn.isVisible()) {
          await deactivateBtn.click();
          await expect(activateBtn).toBeVisible({ timeout: 2000 });
        } else if (await activateBtn.isVisible()) {
          await activateBtn.click();
          await expect(deactivateBtn).toBeVisible({ timeout: 2000 });
        }
      }
    }
  });

  test('should handle error states and recovery patterns', async ({ page }) => {
    const dynamicContent = new dynamic_contentPage(page);
    await page.goto('/dynamic-content');

    // Simulate error condition
    await page.evaluate(() => {
      window.simulateError?.();
    });

    await dynamicContent.refreshBtn.click();

    // Handle conditional error state
    if (await dynamicContent.retryBtn.isVisible()) {
      await dynamicContent.retryBtn.click();

      // Wait for either success or continued error
      await Promise.race([
        expect(dynamicContent.loadingIndicatorConditional).toBeVisible(),
        expect(page.getByText('Data loaded successfully')).toBeVisible(),
      ]);
    }
  });
});

// Utility functions for dynamic element handling
export class DynamicElementHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for dynamic list to load and return count
   */
  async waitForDynamicList(testIdPrefix: string): Promise<number> {
    await this.page.waitForFunction(
      (prefix) =>
        document.querySelectorAll(`[data-testid^="${prefix}"]`).length > 0,
      testIdPrefix,
      { timeout: 10000 }
    );
    return this.page.locator(`[data-testid^="${testIdPrefix}"]`).count();
  }

  /**
   * Handle conditional element with timeout
   */
  async handleConditionalElement(
    locator: any,
    action: () => Promise<void>,
    timeout = 5000
  ): Promise<boolean> {
    try {
      await expect(locator).toBeVisible({ timeout });
      await action();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract dynamic ID from element with pattern
   */
  async extractDynamicId(
    element: any,
    pattern: RegExp
  ): Promise<string | null> {
    const testId = await element.getAttribute('data-testid');
    const match = testId?.match(pattern);
    return match ? match[1] : null;
  }

  /**
   * Handle paginated dynamic content
   */
  async processPaginatedContent(
    itemSelector: string,
    pageSelector: string,
    processor: (item: any, index: number) => Promise<void>
  ): Promise<void> {
    const pages = this.page.locator(pageSelector);
    const pageCount = await pages.count();

    for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
      if (pageIdx > 0) {
        await pages.nth(pageIdx).click();
        await this.page.waitForTimeout(1000); // Wait for page load
      }

      const items = this.page.locator(itemSelector);
      const itemCount = await items.count();

      for (let itemIdx = 0; itemIdx < itemCount; itemIdx++) {
        await processor(items.nth(itemIdx), itemIdx);
      }
    }
  }
}

// Example usage of dynamic helpers
test.describe('Dynamic Helper Usage Examples', () => {
  test('should use dynamic helpers for complex scenarios', async ({ page }) => {
    const helpers = new DynamicElementHelpers(page);
    const dynamicContent = new dynamic_contentPage(page);

    await page.goto('/dynamic-content');

    // Wait for user list to load
    const userCount = await helpers.waitForDynamicList('user-item-');
    console.log(`Found ${userCount} users`);

    // Handle conditional form
    const formVisible = await helpers.handleConditionalElement(
      dynamicContent.usernameInput,
      async () => {
        await dynamicContent.usernameInput.fill('test user');
        await dynamicContent.emailInput.fill('test@example.com');
      }
    );

    if (formVisible) {
      await dynamicContent.submitFormBtn.click();
    }

    // Process paginated user list
    await helpers.processPaginatedContent(
      '[data-testid^="user-item-"]',
      '[data-testid^="page-"]',
      async (userItem, index) => {
        const userId = await helpers.extractDynamicId(
          userItem,
          /user-item-(.+)/
        );
        if (userId) {
          console.log(`Processing user ${userId} at index ${index}`);
          // Perform user-specific actions
        }
      }
    );
  });
});

// Export types and utilities for reuse
export interface DynamicTestConfig {
  waitTimeout?: number;
  retryAttempts?: number;
  pageLoadDelay?: number;
}

export const DEFAULT_DYNAMIC_CONFIG: DynamicTestConfig = {
  waitTimeout: 10000,
  retryAttempts: 3,
  pageLoadDelay: 1000,
};

/**
 * Custom component testing patterns
 * Since the extractor identifies custom components but can't extract their internals,
 * these patterns help test them effectively
 */
export class CustomComponentTester {
  constructor(private page: Page) {}

  /**
   * Test custom component by its container and known behavior
   */
  async testCustomModal(
    triggerSelector: string,
    expectedTitle: string
  ): Promise<void> {
    await this.page.locator(triggerSelector).click();

    // Test modal presence by common patterns
    const modal = this.page
      .locator('[role="dialog"]')
      .or(this.page.locator('.modal'))
      .or(this.page.locator('[data-testid*="modal"]'));

    await expect(modal).toBeVisible();

    // Test modal content
    await expect(this.page.getByText(expectedTitle)).toBeVisible();

    // Test close functionality
    const closeBtn = this.page
      .locator('[aria-label="Close"]')
      .or(this.page.locator('button:has-text("Close")'))
      .or(this.page.locator('[data-testid*="close"]'));

    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  }

  /**
   * Test custom component with props
   */
  async testUserCard(userId: string): Promise<void> {
    // Test custom UserCard component behavior
    const userCard = this.page
      .locator(`[data-testid="featured-user-card"]`)
      .or(this.page.locator(`[data-user-id="${userId}"]`));

    await expect(userCard).toBeVisible();

    // Test interactive elements within custom component
    const actionButtons = userCard.locator('button');
    const buttonCount = await actionButtons.count();

    if (buttonCount > 0) {
      // Test first action button
      await actionButtons.first().click();
      // Add appropriate assertions based on expected behavior
    }
  }
}
