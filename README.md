# Enhanced Vue Locator Extractor - Advanced Features

## 🚀 Overview

The Enhanced Vue Locator Extractor has been significantly upgraded to handle real-world Vue.js applications with dynamic content, conditional rendering, custom components, and JavaScript/TypeScript generated elements.

## 🎯 Key Enhancements

### 1. **Dynamic Content Detection (v-for)**

- **Detects**: Elements rendered in loops using `v-for`
- **Marks**: As `[DYNAMIC]` in output
- **Analysis**: Identifies elements that may be repeated
- **Testing Guidance**: Use `.nth(index)`, `.count()`, or pattern-based selectors

### 2. **Conditional Element Detection (v-if, v-show)**

- **Detects**: Elements that may not always be present
- **Marks**: As `[CONDITIONAL]` in output
- **Analysis**: Identifies conditional rendering patterns
- **Testing Guidance**: Use `.isVisible()` checks and `.waitFor()` methods

### 3. **Custom Component Analysis**

- **Detects**: Vue custom components (`<MyComponent>`, `<AppButton>`)
- **Reports**: Warnings for unextractable locators
- **Recommendations**: Suggests adding test attributes to component roots
- **Line Numbers**: Provides exact locations for review

### 4. **JavaScript/TypeScript Integration**

- **Scans**: `.js` and `.ts` files for element generation
- **Detects**: `createElement`, `h()` functions, template strings
- **Extracts**: Test attributes from dynamically created elements
- **Marks**: All JS/TS elements as `[DYNAMIC]`

## 📊 Enhanced Output Classification

### Status Indicators

- ✅ **Robust**: Production-ready locators
- 🔸 **Fragile**: Needs improvement (class-based, XPath text)
- 🔄 **Dynamic**: May be repeated (v-for)
- ❓ **Conditional**: May not always be present (v-if, v-show)
- 🎪 **Custom Component**: Needs manual review

### Context Information

- **Parent Context**: Shows containing directive context
- **Vue Directives**: Lists detected directives
- **Line Numbers**: For custom component warnings
- **File Types**: Vue templates vs JS/TS generation

## 🛠️ Technical Implementation

### Vue Directive Detection

```typescript
// Detects Vue directives affecting element behavior
const directiveMatches = attributeString.matchAll(/(v-[\w-]+|@\w+|:\w+)/g);

// Classifies directives
if (['v-for'].includes(match[1])) {
  isDynamic = true;
}
if (['v-if', 'v-else-if', 'v-show'].includes(match[1])) {
  isConditional = true;
}
```

### Custom Component Recognition

```typescript
// Identifies custom components
const customComponentPattern = /^[A-Z][a-zA-Z0-9]*$/;
const isCustomComponent =
  customComponentPattern.test(tagName) || tagName.includes('-');
```

### JavaScript Element Extraction

```typescript
// Patterns for Vue h() function
/h\(\s*['"`](\w+)['"`]\s*,\s*{([^}]*)}/g

// Patterns for createElement
/createElement\(\s*['"`](\w+)['"`]\s*,\s*{([^}]*)}/g

// Template string patterns
/`[^`]*<(\w+)[^>]*([^`]*)`/g
```

## 📝 Usage Examples

### Basic Dynamic Content

```vue
<template>
  <!-- Static element -->
  <button data-testid="refresh-btn">Refresh</button>

  <!-- Conditional element -->
  <div v-if="isLoading" data-testid="loading-indicator">Loading...</div>

  <!-- Dynamic list -->
  <li v-for="user in users" :key="user.id" :data-testid="`user-${user.id}`">
    <button :data-testid="`edit-${user.id}`">Edit</button>
    <button v-if="user.canDelete" :data-testid="`delete-${user.id}`">
      Delete
    </button>
  </li>
</template>
```

**Extraction Results:**

```
✅ refresh_btn: data-testid="refresh-btn"
❓ loading_indicator_conditional: data-testid="loading-indicator" [CONDITIONAL]
🔄 user_user_id_dynamic: data-testid="`user-${user.id}`" [DYNAMIC]
✅ edit_user_id: data-testid="`edit-${user.id}`" (inside li with dynamic directives)
❓ delete_user_id_conditional: data-testid="`delete-${user.id}`" [CONDITIONAL]
```

### Custom Component Detection

```vue
<template>
  <div>
    <!-- Standard element - extracted normally -->
    <button data-testid="submit-btn">Submit</button>

    <!-- Custom components - warnings generated -->
    <UserModal v-if="showModal" :user="selectedUser" />
    <DataTable :data="tableData" @row-click="handleRowClick" />
  </div>
</template>
```

**Custom Component Warnings:**

```
⚠️  CUSTOM COMPONENT WARNINGS:
🔸 my-component.vue: Custom component <UserModal> at line 5 — locator not extracted. Review component source or ensure it passes data-testid down to root element.
🔸 my-component.vue: Custom component <DataTable> at line 6 — locator not extracted. Review component source or ensure it passes data-testid down to root element.
```

### JavaScript Generated Elements

```javascript
// Vue h() function
export function createButton(userId) {
  return h(
    'button',
    {
      'data-testid': `dynamic-btn-${userId}`,
      class: 'btn btn-primary',
    },
    'Click Me'
  );
}

// Template string
export function generateForm(formId) {
  return `
    <form data-testid="generated-form-${formId}">
      <input type="text" data-testid="form-input" />
      <button type="submit" data-testid="form-submit">Submit</button>
    </form>
  `;
}
```

**JS/TS Extraction Results:**

```
🔄 dynamic_btn_user_id: data-testid="dynamic-btn-${userId}" [DYNAMIC] (JS createElement)
🔄 generated_form_form_id: data-testid="generated-form-${formId}" [DYNAMIC] (JS template string)
🔄 form_input: data-testid="form-input" [DYNAMIC] (JS template string)
🔄 form_submit: data-testid="form-submit" [DYNAMIC] (JS template string)
```

## 🧪 Enhanced Testing Patterns

### Conditional Element Testing

```typescript
// Handle conditional elements
test('should handle conditional elements', async ({ page }) => {
  const dynamicPage = new dynamic_contentPage(page);

  // Trigger condition that shows element
  await dynamicPage.refreshBtn.click();

  // Wait for conditional element
  await expect(dynamicPage.loadingIndicatorConditional).toBeVisible();

  // Wait for condition to change
  await expect(dynamicPage.loadingIndicatorConditional).not.toBeVisible();
});
```

### Dynamic List Testing

```typescript
// Handle dynamic lists
test('should handle dynamic user list', async ({ page }) => {
  // Get all dynamic user items
  const userItems = page.locator('[data-testid^="user-item-"]');
  const userCount = await userItems.count();

  // Process each user
  for (let i = 0; i < userCount; i++) {
    const userItem = userItems.nth(i);
    const userId = await userItem
      .getAttribute('data-testid')
      ?.replace('user-item-', '');

    // Use dynamic test ID patterns
    await page.getByTestId(`edit-user-${userId}`).click();
  }
});
```

### Custom Component Testing

```typescript
// Test custom components by behavior
test('should handle custom modal component', async ({ page }) => {
  // Trigger modal
  await page.getByTestId('open-modal-btn').click();

  // Test modal by common patterns since internals aren't extracted
  const modal = page
    .locator('[role="dialog"]')
    .or(page.locator('.modal'))
    .or(page.locator('[data-testid*="modal"]'));

  await expect(modal).toBeVisible();

  // Test close functionality
  const closeBtn = page
    .locator('[aria-label="Close"]')
    .or(page.locator('button:has-text("Close")'));

  await closeBtn.click();
  await expect(modal).not.toBeVisible();
});
```

## 📊 Enhanced Analysis Output

### Summary Statistics

```
📊 ENHANCED ANALYSIS SUMMARY:
   📄 Total files processed: 3
   🎯 Total locators found: 102
   ✅ Robust locators: 76 (ready for production)
   🔸 Fragile locators: 26 (9 with warnings)
   🔄 Dynamic locators: 24 (may be repeated)
   ❓ Conditional locators: 20 (may not always be present)
   🎪 Custom components: 2 (need manual review)
   📈 Robustness ratio: 75%
```

### Generated Files with Enhanced Metadata

#### `output/pageObjects.ts`

```typescript
// ROBUST PAGE OBJECT MODEL - Recommended for E2E testing
// NOTE: Some locators are marked as DYNAMIC or CONDITIONAL - test carefully for element presence

export class dynamic_contentPage {
  constructor(protected page: Page) {}

  // button with data-testid: "refresh-btn" (robust)
  refreshBtn = this.page.getByTestId('refresh-btn');

  // div with data-testid: "loading-indicator" (robust) - CONDITIONAL (may not always be present)
  loadingIndicatorConditional = this.page.getByTestId('loading-indicator');

  // li with data-testid: "`user-item-${user.id}`" (robust) - DYNAMIC (may be repeated)
  userItemDynamic = this.page.getByTestId('`user-item-${user.id}`');
}
```

#### `output/locatorMap.ts`

```typescript
export const locatorMap = {
  dynamic_content: {
    // button - data-testid: "refresh-btn" (robust)
    refresh_btn: '[data-testid="refresh-btn"]',
    // div - data-testid: "loading-indicator" (robust) - CONDITIONAL
    loading_indicator_conditional: '[data-testid="loading-indicator"]',
    // li - data-testid: "`user-item-${user.id}`" (robust) - DYNAMIC
    user_item_dynamic: '[data-testid="`user-item-${user.id}`"]',
  },
};
```

## 🚀 Best Practices

### 1. **Improving Custom Components**

```vue
<!-- BEFORE: Unextractable -->
<MyButton @click="handleClick">Submit</MyButton>

<!-- AFTER: Extractable -->
<MyButton data-testid="submit-btn" @click="handleClick">Submit</MyButton>

<!-- OR: Pass through props -->
<MyButton :data-testid="testId" @click="handleClick">Submit</MyButton>
```

### 2. **Dynamic Element Patterns**

```vue
<!-- Good: Consistent pattern -->
<li v-for="user in users" :key="user.id" :data-testid="`user-${user.id}`">
  <button :data-testid="`edit-user-${user.id}`">Edit</button>
  <button :data-testid="`delete-user-${user.id}`">Delete</button>
</li>

<!-- Avoid: Inconsistent patterns -->
<li v-for="user in users" :key="user.id" :data-testid="'user_' + user.id">
  <button :data-testid="user.id + '-edit'">Edit</button>
</li>
```

### 3. **Conditional Element Testing**

```typescript
// Good: Check existence before interaction
if (await page.getByTestId('conditional-element').isVisible()) {
  await page.getByTestId('conditional-element').click();
}

// Better: Use waitFor with timeout
await expect(page.getByTestId('conditional-element')).toBeVisible({
  timeout: 5000,
});
await page.getByTestId('conditional-element').click();
```

### 4. **JavaScript Integration**

```javascript
// Good: Consistent test attributes in JS
export function createButton(id) {
  return h(
    'button',
    {
      'data-testid': `js-button-${id}`,
      class: 'btn',
    },
    'Click'
  );
}

// Template strings with test attributes
export function generateHTML(id) {
  return `<div data-testid="container-${id}">Content</div>`;
}
```

## 🔧 Configuration Options

### Scanning Scope

```bash
# Scan specific Vue project
npm run extract "/path/to/your/vue/project"

# Scan current directory
npm run extract "."
```

### File Types Processed

- **Vue Files**: `**/*.vue` (template sections only)
- **JavaScript**: `**/*.js` (createElement patterns, template strings)
- **TypeScript**: `**/*.ts` (excluding `.d.ts` files)

### Ignored Directories

- `**/node_modules/**`
- `**/dist/**`
- `**/.output/**`
- `**/build/**`
- `**/tests/**` (for JS/TS files)
- `**/test/**` (for JS/TS files)

## 🚨 Limitations and Recommendations

### Current Limitations

1. **Custom Component Internals**: Cannot extract locators from custom component definitions
2. **Complex Expressions**: Skips Vue expressions that can't be converted to valid CSS selectors
3. **Runtime Dependencies**: Cannot analyze elements created by third-party libraries at runtime

### Recommendations

1. **For Custom Components**: Add `data-testid` to root elements or use prop passing
2. **For Runtime Elements**: Consider dynamic extraction using Playwright's live DOM inspection
3. **For Complex Scenarios**: Combine static extraction with runtime discovery patterns

### Future Enhancements

- **Component Resolution**: Parse and resolve custom component definitions
- **Runtime Integration**: Playwright plugin for live DOM extraction
- **Smart Suggestions**: AI-powered recommendations for test attribute placement
- **Visual Mapping**: Generate visual test coverage maps

## 📚 Advanced Usage Examples

See `examples/enhanced-playwright-example.ts` for comprehensive examples including:

- Dynamic list processing
- Conditional element handling
- Custom component testing patterns
- JavaScript integration examples
- Advanced helper utilities

## 🤝 Contributing

This enhanced functionality provides a solid foundation for testing modern Vue.js applications. Contributions for additional patterns, edge cases, and integration improvements are welcome!
