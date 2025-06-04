// Comprehensive Playwright Page Object Model Examples with Robust/Fragile Separation
import { test, expect, Page } from '@playwright/test';
// Note: Import paths should be relative to where your test files are located
// import { dashboardPage as RobustDashboardPage } from '../output/pageObjects';
// import { dashboardPage as FragileDashboardPage } from '../output/fragileLocators';

/**
 * ROBUST vs FRAGILE LOCATORS
 *
 * ROBUST LOCATORS (Recommended for Production):
 * - Use stable test attributes: data-testid, data-test, id, name
 * - Generated in pageObjects.ts
 * - Less likely to break with UI changes
 *
 * FRAGILE LOCATORS (Use with Caution):
 * - Rely on class names, XPath, or other unstable selectors
 * - Generated in fragileLocators.ts with warnings
 * - Should be improved with stable test attributes
 */

// Example using the generated robust Page Object Model
// Uncomment the import above and use this class in your tests
class RobustDashboardActions {
  constructor(protected page: Page) {}

  // Mock properties based on generated robust locators
  get logoutBtn() {
    return this.page.getByTestId('logout-btn');
  }
  get orderRow1() {
    return this.page.getByTestId('order-row-1');
  }
  get editOrder1() {
    return this.page.getByTestId('edit-order-1');
  }
  get searchOrdersInput() {
    return this.page.getByPlaceholder('Search orders...');
  }
  get search() {
    return this.page.locator('[name="search"]');
  }
  get orderSearch() {
    return this.page.locator('#order-search');
  }
  get classBtnBtnPrimary() {
    return this.page.locator('.btn.btn-primary');
  }

  // Using robust locators for critical user flows
  async performSearch(query: string) {
    // Uses placeholder attribute - highly reliable
    await this.searchOrdersInput.fill(query);
  }

  async logout() {
    // Uses data-testid - highly reliable
    await this.logoutBtn.click();
  }

  async editOrder() {
    // Uses data-testid - highly reliable
    await this.editOrder1.click();
  }

  async verifyRobustElements() {
    // All these use stable test attributes
    await expect(this.logoutBtn).toBeVisible();
    await expect(this.searchOrdersInput).toBeVisible();
    await expect(this.orderRow1).toBeVisible();
  }
}

// Example using the generated fragile Page Object Model
class FragileDashboardActions {
  constructor(protected page: Page) {}

  // Mock properties based on generated fragile locators (these need improvement)
  get classTitle() {
    return this.page.locator('.title');
  }
  get classNavLink() {
    return this.page.locator('.nav-link');
  }
  get classDataTable() {
    return this.page.locator('.data-table');
  }
  get classBtnSearchBtn() {
    return this.page.locator('.btn.search-btn');
  }
  get classBtnClearBtn() {
    return this.page.locator('.btn.clear-btn');
  }
  get xpathAContainsTextReports() {
    return this.page.locator("//a[contains(text(),'Reports')]");
  }
  get xpathNavAHrefAnalytics() {
    return this.page.locator("//nav//a[@href='/analytics']");
  }

  // WARNING: These methods use fragile locators that may break
  async navigateToReports() {
    // FRAGILE: Uses text-based XPath
    await this.xpathAContainsTextReports.click();
  }

  async clickNavigationLink() {
    // FRAGILE: Uses class-based selector
    await this.classNavLink.click();
  }

  async verifyFragileElements() {
    // These may break with styling or structure changes
    await expect(this.classTitle).toBeVisible();
    await expect(this.classDataTable).toBeVisible();
  }
}

// Combined approach for comprehensive functionality
class ComprehensiveDashboardActions {
  private robust: RobustDashboardActions;
  private fragile: FragileDashboardActions;

  constructor(page: Page) {
    this.robust = new RobustDashboardActions(page);
    this.fragile = new FragileDashboardActions(page);
  }

  // Prefer robust methods for critical paths
  async performCriticalUserFlow() {
    await this.robust.performSearch('important order');
    await this.robust.editOrder();
    // Only use fragile when necessary
    await this.fragile.navigateToReports();
    await this.robust.logout();
  }

  async verifyPageElements() {
    // Use robust verifications first
    await this.robust.verifyRobustElements();
    // Add fragile checks for comprehensive coverage
    await this.fragile.verifyFragileElements();
  }
}

// Test Suite 1: Robust Locators (Production Ready)
test.describe('Robust Locator Tests - Production Ready', () => {
  test('should use only robust locators for critical flows', async ({
    page,
  }) => {
    const dashboard = new RobustDashboardActions(page);

    await page.goto('/dashboard');

    // All interactions use stable test attributes
    await dashboard.performSearch('test query');
    await expect(dashboard.searchOrdersInput).toHaveValue('test query');

    await dashboard.editOrder();
    await dashboard.logout();
  });

  test('should verify robust elements are stable', async ({ page }) => {
    const dashboard = new RobustDashboardActions(page);

    await page.goto('/dashboard');
    await dashboard.verifyRobustElements();

    // These assertions should rarely fail due to UI changes
    await expect(dashboard.logoutBtn).toBeEnabled();
    await expect(dashboard.searchOrdersInput).toBeEditable();
  });
});

// Test Suite 2: Fragile Locators (Needs Improvement)
test.describe('Fragile Locator Tests - Needs Improvement', () => {
  test('should handle fragile locators with care', async ({ page }) => {
    const dashboard = new FragileDashboardActions(page);

    await page.goto('/dashboard');

    // These may break with UI changes - consider improving
    try {
      await dashboard.navigateToReports();
    } catch (error) {
      console.warn(
        'Fragile locator failed - consider adding data-testid to Reports link'
      );
      throw error;
    }
  });

  test('should demonstrate fragile navigation patterns', async ({ page }) => {
    const dashboard = new FragileDashboardActions(page);

    await page.goto('/dashboard');

    // Class-based selectors - functional but fragile
    await dashboard.clickNavigationLink();
    // Better approach: Add data-testid="profile-nav" to the link
  });
});

// Test Suite 3: Combined Approach
test.describe('Combined Robust/Fragile Approach', () => {
  test('should prioritize robust locators with fragile fallback', async ({
    page,
  }) => {
    const dashboard = new ComprehensiveDashboardActions(page);

    await page.goto('/dashboard');

    // Prefer robust locators for critical functionality
    await dashboard.performCriticalUserFlow();
  });

  test('should provide comprehensive page verification', async ({ page }) => {
    const dashboard = new ComprehensiveDashboardActions(page);

    await page.goto('/dashboard');

    // Verify both robust and fragile elements for complete coverage
    await dashboard.verifyPageElements();
  });
});

// Test Suite 4: Direct Locator Usage Examples
test.describe('Direct Locator Usage Examples', () => {
  test('should demonstrate robust vs fragile selector patterns', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // ROBUST PATTERNS (Recommended):
    await page.getByTestId('logout-btn').click(); // data-testid
    await page.getByPlaceholder('Search orders...').fill('test'); // placeholder
    await page.locator('#order-search').clear(); // id
    await page.locator('[name="search"]').fill('query'); // name

    // FRAGILE PATTERNS (Use with caution):
    await page.locator('.btn.search-btn').click(); // class-based
    await page.locator('//a[contains(text(),"Reports")]').click(); // text-based XPath
  });

  test('should show improvement opportunities', async ({ page }) => {
    await page.goto('/dashboard');

    // BEFORE (Fragile): Class-based navigation
    // await page.locator('.nav-link').first().click(); // FRAGILE!

    // AFTER (Robust): Add data-testid to Vue template
    // <a href="/profile" data-testid="profile-nav-link" class="nav-link">Profile</a>
    // await page.getByTestId('profile-nav-link').click(); // ROBUST!

    // BEFORE (Fragile): Complex XPath
    // await page.locator('//tr[@data-testid="order-row-1"]//button[contains(@class,"delete-btn")]').click();

    // AFTER (Robust): Direct data-testid on button
    // <button data-testid="delete-order-1" class="btn btn-sm delete-btn">Delete</button>
    // await page.getByTestId('delete-order-1').click(); // ROBUST!
  });
});

/**
 * IMPROVEMENT RECOMMENDATIONS FROM GENERATED WARNINGS:
 *
 * 1. Navigation Links (HIGH PRIORITY):
 *    - Add data-testid="dashboard-nav", "profile-nav", "settings-nav" to nav links
 *    - Current: <a href="/profile" class="nav-link">Profile</a>
 *    - Improved: <a href="/profile" data-testid="profile-nav" class="nav-link">Profile</a>
 *
 * 2. Action Buttons (HIGH PRIORITY):
 *    - Add data-testid="search-btn", "clear-btn", "delete-order-btn" to buttons
 *    - Current: <button class="btn search-btn">Search</button>
 *    - Improved: <button data-testid="search-btn" class="btn search-btn">Search</button>
 *
 * 3. XPath Locators (MEDIUM PRIORITY):
 *    - Replace complex XPath with direct data-testid attributes
 *    - Consider semantic roles and labels for accessibility
 *
 * 4. Implementation Steps:
 *    a. Review the fragile locator warnings in console output
 *    b. Add data-testid attributes to Vue components
 *    c. Re-run the extraction script
 *    d. Use the updated robust Page Object Models in tests
 *    e. Gradually phase out fragile locators
 */
