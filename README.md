# Vue Locator Extractor

A tool to extract locators from Vue.js templates and generate Playwright-friendly locator maps for automated testing.

## Overview

This project scans Vue.js template files (`.vue`) and extracts data attributes, IDs, classes, and other locators that can be used for Playwright end-to-end testing. It generates multiple output formats (TypeScript, JSON, YAML) with locators organized by component file.

## Project Structure

```
vue-locator-extractor/
├── src/
│   ├── extractLocators.ts        ← Main entry script
│   ├── scanVueTemplates.ts       ← Parses .vue files for locators
│   └── utils.ts                  ← Helper functions
├── test-vue-src/                 ← Place your Vue project here
├── output/
│   ├── locatorMap.ts             ← TypeScript locator map
│   ├── locatorMap.json           ← JSON locator map
│   └── locatorMap.yaml           ← YAML locator map
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

```bash
npm install
```

## Usage

1. Place your Vue.js project files in the `test-vue-src/` directory, or specify a custom path
2. Run the extractor:
   ```bash
   npm run extract
   ```
   Or with a custom path:
   ```bash
   npm run extract /path/to/your/vue/project
   ```
3. Check the generated locator maps in the `output/` directory

## Features

- Extracts `data-testid`, `id`, `aria-label`, and `role` attributes
- Groups locators by Vue component file
- Generates multiple output formats (TypeScript, JSON, YAML)
- Supports custom source directory via command line argument
- Ignores common build directories (`node_modules`, `dist`, `.output`)
- Handles duplicate locators gracefully

## Example Output

**TypeScript (`output/locatorMap.ts`):**

```typescript
export const locatorMap = {
  'components/LoginForm.vue': {
    login_title: '[data-testid="login-title"]',
    email_field: '[data-testid="email-field"]',
    password_field: '[data-testid="password-field"]',
    submit_button: '[data-testid="submit-button"]',
  },
  'components/UserProfile.vue': {
    user_avatar: '#user-avatar',
    user_name: '[data-testid="user-name"]',
    edit_button: '[aria-label="Edit Profile"]',
  },
};
```

**JSON (`output/locatorMap.json`):**

```json
{
  "components/LoginForm.vue": {
    "login_title": "[data-testid=\"login-title\"]",
    "email_field": "[data-testid=\"email-field\"]",
    "password_field": "[data-testid=\"password-field\"]",
    "submit_button": "[data-testid=\"submit-button\"]"
  }
}
```

**YAML (`output/locatorMap.yaml`):**

```yaml
components/LoginForm.vue:
  login_title: '[data-testid="login-title"]'
  email_field: '[data-testid="email-field"]'
  password_field: '[data-testid="password-field"]'
  submit_button: '[data-testid="submit-button"]'
```

## Contributing

Feel free to submit issues and enhancement requests!
