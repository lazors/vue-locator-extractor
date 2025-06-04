# Page Object Model Locator Extractor

An enhanced TypeScript tool that automatically extracts locators from Vue components and HTML files to generate comprehensive Page Object Model (POM) classes and mappings for test automation.

## Features

✨ **Comprehensive Locator Detection**

- `data-testid` attributes (preferred for testing)
- `id` attributes
- `class` attributes (with compound class support)
- `name` attributes (for form elements)
- `placeholder` text
- `aria-label` attributes (accessibility)
- `role` attributes

✨ **Multiple Output Formats**

- **Page Object Classes** - Ready-to-use TypeScript classes with getter methods
- **Locator Maps** - Simple key-value mappings for flexible usage
- **JSON** - Detailed metadata including element types and raw values
- **YAML** - Human-readable configuration format

✨ **Framework Support**

- Playwright
- Cypress
- Selenium WebDriver
- Any CSS selector-based automation framework

## Installation & Setup

1. Clone and install dependencies:

```bash
git clone <repository-url>
cd vue-locator-extractor
npm install
```

2. Run the locator extraction:

```bash
npm run extract [path-to-your-vue/html-files]
```

If no path is provided, it defaults to `./test-vue-src`

## Generated Output Files

### 1. Page Object Classes (`output/pageObjects.ts`)

Ready-to-use TypeScript classes with getter methods:

```typescript
export class loginPage {
  // input with data-testid: "username-input"
  get usernameInput() {
    return '[data-testid="username-input"]';
  }

  // button with data-testid: "login-button"
  get loginButton() {
    return '[data-testid="login-button"]';
  }
}
```

### 2. Locator Map (`output/locatorMap.ts`)

Simple key-value mappings with comments:

```typescript
export const locatorMap = {
  login: {
    // input - data-testid: "username-input"
    username_input: '[data-testid="username-input"]',
    // button - data-testid: "login-button"
    login_button: '[data-testid="login-button"]',
  },
};
```

### 3. Detailed Metadata (`output/locatorMap.json`)

Comprehensive information about each locator:

```json
{
  "login.html": {
    "username_input": {
      "selector": "[data-testid=\"username-input\"]",
      "type": "data-testid",
      "element": "input",
      "rawValue": "username-input"
    }
  }
}
```

## Usage Examples

### Playwright Example

```typescript
import { loginPage } from '../output/pageObjects';

class LoginAutomation extends loginPage {
  constructor(private page: Page) {
    super();
  }

  async login(username: string, password: string) {
    await this.page.fill(this.usernameInput, username);
    await this.page.fill(this.passwordInput, password);
    await this.page.click(this.loginButton);
  }
}
```

### Cypress Example

```typescript
import { locatorMap } from '../output/locatorMap';

describe('Login Test', () => {
  it('should login successfully', () => {
    cy.visit('/login');
    cy.get(locatorMap.login.username_input).type('user@example.com');
    cy.get(locatorMap.login.password_input).type('password');
    cy.get(locatorMap.login.login_button).click();
  });
});
```

### Selenium WebDriver Example

```typescript
import { locatorMap } from '../output/locatorMap';

const usernameField = await driver.findElement({
  css: locatorMap.login.username_input,
});
const passwordField = await driver.findElement({
  css: locatorMap.login.password_input,
});
const loginButton = await driver.findElement({
  css: locatorMap.login.login_button,
});
```

## Supported Locator Types

| Attribute Type | Example HTML                       | Generated Selector           | Use Case                      |
| -------------- | ---------------------------------- | ---------------------------- | ----------------------------- |
| `data-testid`  | `<button data-testid="save-btn">`  | `[data-testid="save-btn"]`   | Primary testing identifiers   |
| `id`           | `<input id="username">`            | `#username`                  | Unique element identification |
| `class`        | `<div class="modal-content">`      | `.modal-content`             | Styling-based selection       |
| `name`         | `<input name="email">`             | `[name="email"]`             | Form element identification   |
| `placeholder`  | `<input placeholder="Enter name">` | `[placeholder="Enter name"]` | Input field identification    |
| `aria-label`   | `<button aria-label="Close">`      | `[aria-label="Close"]`       | Accessibility-based selection |
| `role`         | `<div role="dialog">`              | `[role="dialog"]`            | Semantic role identification  |

## Configuration

### File Types Supported

- `.vue` files (Vue.js components)
- `.html` files (Plain HTML)

### Ignored Directories

- `node_modules/`
- `dist/`
- `.output/`
- `build/`

## Advanced Features

### Element Context Detection

The tool automatically detects the HTML element type (div, button, input, etc.) and includes it in comments for better documentation.

### Duplicate Handling

When multiple elements have the same attribute value, the tool automatically generates unique keys by appending numbers (`_1`, `_2`, etc.).

### Class Compound Support

Multi-class attributes are converted to compound CSS selectors:

```html
<div class="btn btn-primary"></div>
```

Becomes: `.btn.btn-primary`

### Vue Dynamic Attributes

The tool preserves Vue.js dynamic attribute syntax for reference:

```html
<tr :data-testid="`user-row-${user.id}`"></tr>
```

Becomes: `[data-testid="`user-row-${user.id}`"]`

## Best Practices

### 1. Prioritize `data-testid`

Use `data-testid` attributes for elements you plan to interact with in tests:

```html
<button data-testid="submit-form">Submit</button>
```

### 2. Consistent Naming

Use kebab-case for test IDs and follow a consistent naming pattern:

- `login-button`
- `username-input`
- `error-message`

### 3. Avoid Styling Classes for Testing

Don't rely on CSS classes that might change due to styling updates. Use dedicated test attributes instead.

### 4. Dynamic Selectors

For dynamic content, document the expected format in comments:

```typescript
// Use like: `[data-testid="user-row-123"]` where 123 is the user ID
get userRow() {
  return '[data-testid^="user-row-"]';
}
```

## Troubleshooting

### No Locators Found

- Ensure your HTML/Vue files contain the supported attribute types
- Check that the target directory path is correct
- Verify files aren't in ignored directories

### TypeScript Errors

- Run `npm install` to ensure all dependencies are installed
- Check that `@types/node` and `@types/fs-extra` are installed

### Linting Issues

- The tool automatically handles imports and module resolution
- Generated files follow TypeScript best practices

## Contributing

To extend the tool with additional locator types or output formats:

1. Edit `src/scanVueTemplates.ts` to add new regex patterns
2. Update the `LocatorInfo` interface if needed
3. Modify `src/extractLocators.ts` for new output formats
4. Test with sample files in `test-vue-src/`

## Example Output Summary

For a typical project with login and dashboard pages:

```
✅ Page Object Model locators saved as:
 - output/locatorMap.ts (simple map)
 - output/pageObjects.ts (POM classes)
 - output/locatorMap.json (detailed metadata)
 - output/locatorMap.yaml (detailed metadata)
📁 Source: /path/to/your/project
📊 Extracted 124 locators from 2 files
```

This comprehensive approach ensures your test automation has reliable, maintainable selectors across all your UI components.
