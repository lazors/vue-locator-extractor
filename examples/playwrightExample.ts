// Comprehensive Playwright Page Object Model Examples with XPath Support
import { test, expect, Page } from '@playwright/test';
import { dashboardPage } from '../output/pageObjects';
import { locatorMap } from '../output/locatorMap';

/**
 * XPath Locator Usage Examples
 *
 * The Vue locator extractor supports XPath locators using two attribute patterns:
 * 1. data-xpath="xpath-expression"
 * 2. xpath="xpath-expression"
 *
 * Vue Template Examples:
 * <template>
 *   <!-- Basic XPath for text content -->
 *   <a href="/reports" data-xpath="//a[contains(text(),'Reports')]">Reports</a>
 *
 *   <!-- XPath with attribute selectors -->
 *   <a href="/analytics" xpath="//nav//a[@href='/analytics']">Analytics</a>
 *
 *   <!-- Complex XPath with position -->
 *   <div class="stat-card" data-xpath="//div[@class='stat-card'][position()=3]">
 *     <h3>Revenue</h3>
 *   </div>
 *
 *   <!-- XPath for finding elements by relationship -->
 *   <button data-xpath="//tr[@data-testid='order-row-1']//button[contains(@class,'delete-btn')]">
 *     Delete
 *   </button>
 *
 *   <!-- XPath using following-sibling axis -->
 *   <button data-xpath="//input[@name='search']/following-sibling::button[2]">
 *     Clear
 *   </button>
 * </template>
 */

// Extended Dashboard Page Object with XPath examples
class DashboardPageActions extends dashboardPage {
  constructor(page: Page) {
    super(page);
  }

  // Using generated XPath locators
  async clickReportsUsingXPath() {
    // Uses the generated XPath locator: //a[contains(text(),'Reports')]
    await this.xpathAContainsTextReports.click();
  }

  async clickAnalyticsUsingXPath() {
    // Uses the generated XPath locator: //nav//a[@href='/analytics']
    await this.xpathNavAHrefAnalytics.click();
  }

  async verifyRevenueCardUsingXPath() {
    // Uses position-based XPath: //div[@class='stat-card'][position()=3]
    await expect(this.xpathDivClassStatCardPosition3).toBeVisible();
  }

  async deleteOrderUsingXPath() {
    // Uses complex relationship XPath: //tr[@data-testid='order-row-1']//button[contains(@class,'delete-btn')]
    await this.xpathTrDataTestidOrderRow1ButtonContainsClassDeleteBtn.click();
  }

  async clearSearchUsingXPath() {
    // Uses following-sibling XPath: //input[@name='search']/following-sibling::button[2]
    await this.xpathInputNameSearchFollowingSiblingButton2.click();
  }

  // Custom XPath methods for dynamic scenarios
  async findUserRowByName(userName: string) {
    // Dynamic XPath for finding table rows by user name
    return this.page.locator(`//tr[td[contains(text(),'${userName}')]]`);
  }

  async editUserByName(userName: string) {
    // XPath for finding edit button in specific user row
    await this.page
      .locator(
        `//tr[td[contains(text(),'${userName}')]]//button[contains(@class,'edit-btn')]`
      )
      .click();
  }

  async deleteUserByName(userName: string) {
    // XPath for finding delete button in specific user row
    await this.page
      .locator(
        `//tr[td[contains(text(),'${userName}')]]//button[contains(@class,'delete-btn')]`
      )
      .click();
  }

  async performSearch(query: string) {
    await this.searchOrdersInput.fill(query);
  }

  async performLogout() {
    await this.logoutBtn.click();
  }

  async verifyDashboardElements() {
    await expect(this.userCount).toBeVisible();
    await expect(this.orderCount).toBeVisible();
    await expect(this.xpathDivClassStatCardPosition3).toBeVisible(); // Revenue card using XPath
  }

  async waitForPageLoad() {
    await expect(this.userCount).toBeVisible();
    await expect(this.searchOrdersInput).toBeVisible();
  }

  async getStatsValues() {
    const userCountText = await this.userCount.textContent();
    const orderCountText = await this.orderCount.textContent();
    const revenueText = await this.xpathDivClassStatCardPosition3.textContent();

    return {
      users: parseInt(userCountText?.match(/\d+/)?.[0] || '0'),
      orders: parseInt(orderCountText?.match(/\d+/)?.[0] || '0'),
      revenue: parseFloat(
        revenueText?.match(/\$?([\d,]+\.?\d*)/)?.[1]?.replace(',', '') || '0'
      ),
    };
  }

  async searchAndVerifyResults(searchTerm: string, expectedCount: number) {
    await this.performSearch(searchTerm);
    await this.page.waitForTimeout(500); // Wait for search debounce

    // Count visible order rows using XPath
    const orderRows = this.page.locator(
      '//tr[@data-testid="order-row-1"] | //tr[contains(@data-testid,"order-row-")]'
    );
    await expect(orderRows).toHaveCount(expectedCount);
  }
}

// Test Suite 1: Basic Dashboard Functionality
test.describe('Dashboard Basic Tests', () => {
  test('should verify dashboard elements are visible', async ({ page }) => {
    const dashboard = new DashboardPageActions(page);

    await page.goto('/dashboard');
    await dashboard.waitForPageLoad();
    await dashboard.verifyDashboardElements();
  });

  test('should perform search using regular locators', async ({ page }) => {
    const dashboard = new DashboardPageActions(page);

    await page.goto('/dashboard');
    await dashboard.waitForPageLoad();

    // Search using standard locators
    await dashboard.performSearch('John Doe');
    await expect(dashboard.searchOrdersInput).toHaveValue('John Doe');
  });
});

// Test Suite 2: XPath Functionality Tests
test.describe('XPath Locators Tests', () => {
  test('should use XPath locators for navigation', async ({ page }) => {
    const dashboard = new DashboardPageActions(page);

    await page.goto('/dashboard');
    await dashboard.waitForPageLoad();

    // Test generated XPath locators
    await dashboard.clickReportsUsingXPath();
    await expect(page).toHaveURL(/.*reports.*/);

    await page.goBack();
    await dashboard.clickAnalyticsUsingXPath();
    await expect(page).toHaveURL(/.*analytics.*/);
  });

  test('should verify elements using XPath position selectors', async ({
    page,
  }) => {
    const dashboard = new DashboardPageActions(page);

    await page.goto('/dashboard');
    await dashboard.waitForPageLoad();

    // Verify revenue card using position-based XPath
    await dashboard.verifyRevenueCardUsingXPath();

    // Get stats using mixed locator types
    const stats = await dashboard.getStatsValues();
    expect(stats.users).toBeGreaterThanOrEqual(0);
    expect(stats.orders).toBeGreaterThanOrEqual(0);
    expect(stats.revenue).toBeGreaterThanOrEqual(0);
  });

  test('should interact with table elements using XPath relationships', async ({
    page,
  }) => {
    const dashboard = new DashboardPageActions(page);

    await page.goto('/dashboard');
    await dashboard.waitForPageLoad();

    // Find user row by name using dynamic XPath
    const johnDoeRow = await dashboard.findUserRowByName('John Doe');
    await expect(johnDoeRow).toBeVisible();

    // Edit user using XPath relationship
    await dashboard.editUserByName('John Doe');
    // Verify edit action was triggered (this would depend on your app's behavior)
  });

  test('should clear search using XPath sibling navigation', async ({
    page,
  }) => {
    const dashboard = new DashboardPageActions(page);

    await page.goto('/dashboard');
    await dashboard.waitForPageLoad();

    // Perform search
    await dashboard.performSearch('test query');
    await expect(dashboard.searchOrdersInput).toHaveValue('test query');

    // Clear search using XPath following-sibling
    await dashboard.clearSearchUsingXPath();
    await expect(dashboard.searchOrdersInput).toHaveValue('');
  });
});

// Test Suite 3: Advanced XPath Patterns
test.describe('Advanced XPath Usage', () => {
  test('should use complex XPath expressions for dynamic content', async ({
    page,
  }) => {
    const dashboard = new DashboardPageActions(page);

    await page.goto('/dashboard');
    await dashboard.waitForPageLoad();

    // XPath for text-based selection
    await page.locator('//button[contains(text(),"Search")]').click();

    // XPath for attribute contains matching
    await page
      .locator('//input[contains(@placeholder,"Search")]')
      .fill('dynamic test');

    // XPath for complex relationships
    await page
      .locator(
        '//tr[td[text()="John Doe"]]//button[@class="btn btn-sm edit-btn"]'
      )
      .click();

    // XPath for position-based selection
    await page.locator('//div[@class="stat-card"][1]').click(); // First stat card

    // XPath for finding elements by multiple conditions
    await page
      .locator('//button[@type="button" and contains(@class,"clear-btn")]')
      .click();
  });

  test('should handle dynamic table interactions with XPath', async ({
    page,
  }) => {
    const dashboard = new DashboardPageActions(page);

    await page.goto('/dashboard');
    await dashboard.waitForPageLoad();

    // Dynamic XPath for table operations
    const userNames = ['John Doe', 'Jane Smith'];

    for (const userName of userNames) {
      // Find row using XPath
      const userRow = page.locator(`//tr[td[contains(text(),'${userName}')]]`);
      await expect(userRow).toBeVisible();

      // Get user status using XPath
      const status = await page
        .locator(
          `//tr[td[contains(text(),'${userName}')]]//span[contains(@class,'status')]`
        )
        .textContent();
      console.log(`User ${userName} has status: ${status}`);
    }
  });
});

// Test Suite 4: Using Locator Map with XPath
test.describe('Using Locator Map Directly', () => {
  test('should interact with elements using locator map', async ({ page }) => {
    await page.goto('/dashboard');

    // Use the locator map for direct selector access
    await page
      .locator(locatorMap.dashboard.search_orders_input)
      .fill('test search');
    await page.locator(locatorMap.dashboard.logout_btn).click();

    // Mixed approach: locator map + dynamic XPath
    const searchValue = await page
      .locator(locatorMap.dashboard.search_orders_input)
      .inputValue();

    // Use XPath to find elements related to the search
    if (searchValue) {
      await page
        .locator(`//div[contains(text(),'Search results for: ${searchValue}')]`)
        .waitFor();
    }
  });
});

/**
 * XPath Best Practices Demonstrated in Tests:
 *
 * 1. ✅ Use data-testid when possible (more reliable)
 * 2. ✅ Use XPath for complex DOM relationships
 * 3. ✅ Prefer text content matching for user-facing elements
 * 4. ✅ Use position() for dynamic lists where order matters
 * 5. ✅ Use contains() for partial matches
 * 6. ✅ Use axes like following-sibling, preceding-sibling, ancestor, descendant
 *
 * Common XPath Patterns Used:
 * - Text matching: //button[text()='Submit']
 * - Partial text: //button[contains(text(),'Submit')]
 * - Attribute matching: //input[@name='username']
 * - Partial attribute: //div[contains(@class,'active')]
 * - Position: //li[1] or //li[last()]
 * - Parent/child: //div[@id='parent']//span
 * - Following sibling: //label[@for='username']/following-sibling::input
 * - Ancestor: //input[@name='email']/ancestor::form
 * - Multiple conditions: //button[@type='button' and contains(@class,'primary')]
 * - Table relationships: //tr[td[text()='John']]//button[@aria-label='Edit']
 */
