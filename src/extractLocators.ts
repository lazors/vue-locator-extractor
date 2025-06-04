import { extractLocatorsFromVue } from './scanVueTemplates';
import fs from 'fs-extra';
import path from 'path';

const vueProjectPath = process.argv[2] || './test-vue-src';

(async () => {
  try {
    const absPath = path.resolve(vueProjectPath);
    const groupedLocators = await extractLocatorsFromVue(absPath);

    // Generate TypeScript Page Object Model compatible output
    const tsLines = Object.entries(groupedLocators).map(([file, locators]) => {
      const className = file
        .replace(/[\/\\]/g, '_')
        .replace(/\.(vue|html)$/, '')
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .replace(/^_+|_+$/g, '');

      const locatorEntries = Object.entries(locators).map(([key, info]) => {
        const comment = `    // ${info.element} - ${info.type}: "${info.rawValue}"`;
        return `${comment}\n    ${key}: '${info.selector}'`;
      });

      return `  // Page Object for: ${file}\n  ${className}: {\n${locatorEntries.join(
        ',\n'
      )}\n  }`;
    });

    // Generate Playwright-based Page Object Model classes
    const pageObjectClasses = Object.entries(groupedLocators).map(
      ([file, locators]) => {
        const className =
          file
            .replace(/[\/\\]/g, '_')
            .replace(/\.(vue|html)$/, '')
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .replace(/^_+|_+$/g, '') + 'Page';

        // Generate Playwright locator properties
        const locatorProperties = Object.entries(locators).map(
          ([key, info]) => {
            const propertyName = key.replace(/_(\w)/g, (_, letter) =>
              letter.toUpperCase()
            );
            let playwrightMethod = '';

            // Map to appropriate Playwright locator method
            switch (info.type) {
              case 'data-testid':
                playwrightMethod = `this.page.getByTestId('${info.rawValue}')`;
                break;
              case 'id':
                playwrightMethod = `this.page.locator('#${info.rawValue}')`;
                break;
              case 'aria-label':
                playwrightMethod = `this.page.getByLabel('${info.rawValue}')`;
                break;
              case 'role':
                playwrightMethod = `this.page.getByRole('${info.rawValue}')`;
                break;
              case 'placeholder':
                playwrightMethod = `this.page.getByPlaceholder('${info.rawValue}')`;
                break;
              case 'name':
                playwrightMethod = `this.page.locator('[name="${info.rawValue}"]')`;
                break;
              case 'class':
                playwrightMethod = `this.page.locator('${info.selector}')`;
                break;
              case 'xpath':
                // For XPath, properly escape quotes and use Playwright's XPath locator syntax
                const escapedXPath = info.rawValue.replace(/'/g, "\\'");
                playwrightMethod = `this.page.locator('${escapedXPath}')`;
                break;
              default:
                playwrightMethod = `this.page.locator('${info.selector}')`;
            }

            return `  // ${info.element} with ${info.type}: "${info.rawValue}"\n  ${propertyName} = ${playwrightMethod};`;
          }
        );

        return `import { Page } from '@playwright/test';\n\nexport class ${className} {\n  constructor(protected page: Page) {}\n\n${locatorProperties.join(
          '\n\n'
        )}\n}`;
      }
    );

    const tsOutput = `// Auto-generated locator map for Page Object Model\nexport const locatorMap = {\n${tsLines.join(
      ',\n'
    )}\n};\n`;
    const pomOutput = `// Auto-generated Playwright Page Object Model classes\n${pageObjectClasses.join(
      '\n\n'
    )}\n`;

    await fs.ensureDir('./output');
    await fs.outputFile('./output/locatorMap.ts', tsOutput);
    await fs.outputFile('./output/pageObjects.ts', pomOutput);

    console.log(`✅ Playwright Page Object Model locators saved as:`);
    console.log(` - output/locatorMap.ts (simple map)`);
    console.log(` - output/pageObjects.ts (Playwright POM classes)`);
    console.log(`📁 Source: ${absPath}`);

    // Print summary
    const totalFiles = Object.keys(groupedLocators).length;
    const totalLocators = Object.values(groupedLocators).reduce(
      (sum, locators) => sum + Object.keys(locators).length,
      0
    );
    console.log(
      `📊 Extracted ${totalLocators} locators from ${totalFiles} files`
    );
  } catch (err) {
    console.error('❌ Failed to extract locators:', err);
  }
})();
