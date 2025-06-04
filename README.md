# Vue Locator Extractor for Playwright

A powerful tool to extract locators from Vue.js templates and generate production-ready Playwright Page Object Models with robustness analysis and improvement recommendations.

## 🎯 Overview

This project scans Vue.js template files (`.vue`) and intelligently extracts locators, classifying them as **robust** (production-ready) or **fragile** (needs improvement). It generates Playwright-compatible Page Object Models and provides actionable warnings for improving test stability.

## ✨ Key Features

- **🛡️ Robust vs Fragile Classification**: Automatically categorizes locators by stability
- **⚠️ Smart Warnings**: Identifies fragile locators and suggests improvements
- **🎭 Playwright Integration**: Generates ready-to-use Page Object Models
- **🔍 Comprehensive Locator Support**: Extracts 8 types of locators including XPath
- **📊 Detailed Analysis**: Provides robustness ratios and improvement metrics
- **🚀 Production Ready**: Separates robust locators for immediate use

## 📂 Project Structure

```
vue-locator-extractor/
├── src/
│   ├── extractLocators.ts        ← Main extraction engine
│   └── scanVueTemplates.ts       ← Vue template parser
├── output/                       ← Generated files (auto-ignored)
│   ├── pageObjects.ts            ← Robust Playwright Page Objects
│   ├── fragileLocators.ts        ← Fragile locators with warnings
│   ├── locatorMap.ts             ← Complete locator map
│   └── fragileLocatorMap.ts      ← Improvement tracking map
├── examples/
│   └── playwrightExample.ts      ← Usage examples
├── .cursor/rules/                ← Cursor IDE rules
└── test-vue-src/                 ← Sample Vue files
```

## 🚀 Installation

```bash
npm install
```

## 📋 Usage

### Basic Usage (Default Directory)

```bash
npm run extract
```

### Scan Your Vue Project

```bash
npm run extract "/path/to/your/vue/project"
```

### Examples

```bash
# Scan current directory
npm run extract "."

# Scan parent directory
npm run extract "../my-vue-app"

# Scan specific project
npm run extract "C:\Users\username\projects\my-vue-app"
```

## 🔍 Supported Locator Types

### **Robust Locators** (Recommended for Production):

- `data-testid="value"` → `page.getByTestId('value')`
- `data-test="value"` → `page.locator('[data-test="value"]')`
- `id="value"` → `page.locator('#value')`
- `name="value"` → `page.locator('[name="value"]')`
- **Interactive XPath**: `//button`, `//input`, patterns with `btn`
- **Button Classes**: Any class containing `btn`

### **Fragile Locators** (Need Improvement):

- `class="nav-link"` → Class-based selectors
- **Text-based XPath**: `//a[contains(text(),'Reports')]`
- **Navigation XPath**: `//nav//a[@href='/analytics']`
- `role="table"` → Generic role selectors

## 📊 Output Files

### 1. **`pageObjects.ts`** - Production Ready

```typescript
// ROBUST PAGE OBJECT MODEL - Recommended for E2E testing
import { Page } from '@playwright/test';

export class dashboardPage {
  constructor(protected page: Page) {}

  // button with data-testid: "logout-btn" (robust)
  logoutBtn = this.page.getByTestId('logout-btn');

  // input with placeholder: "Search orders..." (robust)
  searchOrdersInput = this.page.getByPlaceholder('Search orders...');
}
```

### 2. **`fragileLocators.ts`** - Needs Improvement

```typescript
// FRAGILE LOCATORS - Consider improving with stable test attributes
export class dashboardPage {
  // a with class: "nav-link" (fragile)
  // WARNING: Consider adding data-testid="nav-link"
  classNavLink = this.page.locator('.nav-link');
}
```

### 3. **`locatorMap.ts`** - Complete Reference

```typescript
export const locatorMap = {
  dashboard: {
    // button - data-testid: "logout-btn" (robust)
    logout_btn: '[data-testid="logout-btn"]',
    // a - class: "nav-link" (fragile)
    class_nav_link: '.nav-link',
  },
};
```

## ⚠️ Improvement Warnings

The tool provides specific recommendations for fragile locators:

```
⚠️  FRAGILE LOCATOR WARNINGS:
🔸 dashboard.vue: FRAGILE LOCATOR WARNING: a with class="nav-link" lacks stable test attributes.
   Consider adding data-testid="nav-link" | Alternative: data-test="nav-link" | Or add unique id="nav-link"
```

## 📈 Analysis Report

```
📊 SUMMARY:
   Total files processed: 5
   Robust locators: 24 (ready for production)
   Fragile locators: 12 (8 with warnings)
   Robustness ratio: 67%
```

## 🎭 Playwright Integration Example

```typescript
import { test, expect } from '@playwright/test';
import { dashboardPage } from '../output/pageObjects';

test('should login successfully', async ({ page }) => {
  const dashboard = new dashboardPage(page);

  await page.goto('/dashboard');
  await dashboard.searchOrdersInput.fill('test query');
  await dashboard.logoutBtn.click();
});
```

## 🛠️ Configuration

### Custom Vue Project Path

```bash
# Set default path in src/extractLocators.ts
const vueProjectPath = process.argv[2] || './src'; // Your Vue project path
```

### Ignored Directories

The tool automatically ignores:

- `**/node_modules/**`
- `**/dist/**`
- `**/.output/**`
- `**/build/**`

## 🎯 Best Practices

### 1. **Prioritize Robust Locators**

- Use `data-testid` for interactive elements
- Add unique `id` attributes where appropriate
- Prefer semantic locators over class-based ones

### 2. **Improve Fragile Locators**

```vue
<!-- BEFORE (Fragile) -->
<button class="btn search-btn">Search</button>

<!-- AFTER (Robust) -->
<button data-testid="search-btn" class="btn search-btn">Search</button>
```

### 3. **Use Generated Page Objects**

```typescript
// Use robust Page Objects for critical test paths
const robust = new RobustDashboardPage(page);
await robust.performCriticalUserFlow();
```

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

MIT License - see LICENSE file for details.

---

# 🎭 Playwright Page Object Model Patterns

## Page Object Structure

### Base Page Object Class

Reference the generated classes in `output/pageObjects.ts`:

```typescript
import { Page } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  // Common navigation methods
  async goto(url: string) {
    await this.page.goto(url);
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }
}
```

### Component-Specific Page Objects

Extend base classes with component-specific functionality:

```typescript
export class DashboardPageActions extends dashboardPage {
  constructor(page: Page) {
    super(page);
  }

  // High-level business actions
  async performLogin(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginBtn.click();
  }

  // Element interaction patterns
  async verifyElementsVisible() {
    await expect(this.userCount).toBeVisible();
    await expect(this.orderCount).toBeVisible();
  }
}
```

## Locator Method Mapping

### Robust Locator Mapping

Map different locator types to appropriate Playwright methods:

```typescript
// data-testid → getByTestId (preferred)
submitBtn = this.page.getByTestId('submit-btn');

// id → locator with #
usernameInput = this.page.locator('#username');

// name → locator with [name]
passwordField = this.page.locator('[name="password"]');

// aria-label → getByLabel
saveButton = this.page.getByLabel('Save changes');

// role → getByRole
navigationMenu = this.page.getByRole('navigation');

// placeholder → getByPlaceholder
searchInput = this.page.getByPlaceholder('Search orders...');
```

### XPath Locator Handling

For complex selectors and relationships:

```typescript
// XPath locators (use when CSS selectors are insufficient)
complexElement = this.page.locator(
  '//tr[td[contains(text(),"John")]//button[@aria-label="Edit"]'
);

// Position-based selection
thirdStatCard = this.page.locator('//div[@class="stat-card"][position()=3]');

// Text content matching
reportsLink = this.page.locator('//a[contains(text(),"Reports")]');
```

## Dynamic Locator Patterns

### Parameterized Methods

Handle dynamic content with method parameters:

```typescript
class UserManagementPage extends basePage {
  // Dynamic user selection
  getUserRow(userName: string) {
    return this.page.locator(`//tr[td[contains(text(),'${userName}')]]`);
  }

  async editUser(userName: string) {
    await this.page.locator(`[data-testid="edit-user-${userName}"]`).click();
  }

  async deleteUser(userId: string) {
    await this.page.locator(`[data-testid="delete-user-${userId}"]`).click();
  }
}
```

### List and Table Operations

Handle collections and tables efficiently:

```typescript
class DataTablePage extends basePage {
  // Get all rows
  get allUserRows() {
    return this.page.locator('[data-testid^="user-row-"]');
  }

  // Count visible items
  async getVisibleRowCount() {
    return await this.allUserRows.count();
  }

  // Find by text content
  async findRowByText(searchText: string) {
    return this.page.locator(`//tr[td[contains(text(),'${searchText}')]]`);
  }
}
```

## Error Handling and Reliability

### Wait Strategies

Implement proper waiting mechanisms:

```typescript
class ReliablePage extends basePage {
  async waitForElementReady(locator: Locator) {
    await locator.waitFor({ state: 'visible' });
    await expect(locator).toBeEnabled();
  }

  async waitForPageLoad() {
    await expect(this.pageTitle).toBeVisible();
    await this.page.waitForLoadState('networkidle');
  }

  async retryAction(action: () => Promise<void>, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await action();
        return;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.page.waitForTimeout(1000);
      }
    }
  }
}
```

### Robustness Checks

Validate element states before interaction:

```typescript
async safeClick(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();
  await locator.click();
}

async safeFill(locator: Locator, text: string) {
  await expect(locator).toBeVisible();
  await expect(locator).toBeEditable();
  await locator.fill(text);
}
```

## Test Organization Patterns

### Test Suite Structure

Organize tests by functionality and page:

```typescript
test.describe('Dashboard Functionality', () => {
  let dashboard: DashboardPageActions;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPageActions(page);
    await dashboard.goto('/dashboard');
    await dashboard.waitForPageLoad();
  });

  test('should display user statistics', async () => {
    await dashboard.verifyElementsVisible();
    const stats = await dashboard.getStatsValues();
    expect(stats.users).toBeGreaterThan(0);
  });
});
```

### Reusable Actions

Create reusable action patterns:

```typescript
class CommonActions {
  constructor(private page: Page) {}

  async loginAs(userType: 'admin' | 'user') {
    const credentials =
      userType === 'admin'
        ? { username: 'admin@test.com', password: 'admin123' }
        : { username: 'user@test.com', password: 'user123' };

    await this.page.goto('/login');
    await this.page.getByTestId('username-input').fill(credentials.username);
    await this.page.getByTestId('password-input').fill(credentials.password);
    await this.page.getByTestId('login-btn').click();
    await this.page.waitForURL('**/dashboard');
  }
}
```

## Integration with Locator Map

### Using Generated Locator Map

Leverage the generated map from `output/locatorMap.ts`:

```typescript
import { locatorMap } from '../output/locatorMap';

class DirectLocatorPage {
  constructor(private page: Page) {}

  async interactWithElements() {
    // Use locator map for direct access
    await this.page.locator(locatorMap.dashboard.submit_btn).click();
    await this.page.locator(locatorMap.dashboard.username_input).fill('test');

    // Combine with dynamic selectors
    const robustLocator = locatorMap.dashboard.user_row_template;
    await this.page.locator(robustLocator.replace('{id}', '123')).click();
  }
}
```

## 🛠️ Configuration

### Custom Vue Project Path

```bash
# Set default path in src/extractLocators.ts
const vueProjectPath = process.argv[2] || './src'; // Your Vue project path
```

### Ignored Directories

The tool automatically ignores:

- `**/node_modules/**`
- `**/dist/**`
- `**/.output/**`
- `**/build/**`

## 🎯 Best Practices

### 1. **Prioritize Robust Locators**

- Use `data-testid` for interactive elements
- Add unique `id` attributes where appropriate
- Prefer semantic locators over class-based ones

### 2. **Improve Fragile Locators**

```vue
<!-- BEFORE (Fragile) -->
<button class="btn search-btn">Search</button>

<!-- AFTER (Robust) -->
<button data-testid="search-btn" class="btn search-btn">Search</button>
```

### 3. **Use Generated Page Objects**

```typescript
// Use robust Page Objects for critical test paths
const robust = new RobustDashboardPage(page);
await robust.performCriticalUserFlow();
```

### 4. **Locator Quality Assessment**

Regular review of locator robustness:

```typescript
// Good: Robust, test-specific
this.page.getByTestId('submit-form');

// Better: Semantic and accessible
this.page.getByRole('button', { name: 'Submit Form' });

// Avoid: Fragile, dependent on styling
this.page.locator('.btn.btn-primary.submit-button');

// Last resort: XPath with clear documentation
this.page.locator('//button[contains(text(),"Submit")][1]'); // FRAGILE: Consider adding data-testid
```

### 5. **Documentation Standards**

Document complex locators and business logic:

```typescript
class DocumentedPage extends basePage {
  /**
   * Submits the user form after validation
   * @param userData - User information to submit
   * @requires User must be logged in and form must be visible
   */
  async submitUserForm(userData: UserData) {
    await this.validateFormState();
    await this.fillUserForm(userData);
    await this.submitForm();
    await this.waitForSubmissionComplete();
  }

  // Complex XPath with explanation
  private get dynamicStatusIndicator() {
    // XPath: Find status indicator that changes based on user state
    // FRAGILE: Consider adding data-testid to status elements
    return this.page.locator(
      '//div[@class="status-indicator"][ancestor::div[@data-user-id]]'
    );
  }
}
```

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

MIT License - see LICENSE file for details.
