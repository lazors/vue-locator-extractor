import { extractLocatorsFromVue } from './scanVueTemplates';
import fs from 'fs-extra';
import path from 'path';

const vueProjectPath = process.argv[2] || './test-vue-src';

(async () => {
  try {
    const absPath = path.resolve(vueProjectPath);
    const { groupedLocators, warnings } = await extractLocatorsFromVue(absPath);

    // Separate robust and fragile locators
    const robustLocators: typeof groupedLocators = {};
    const fragileLocators: typeof groupedLocators = {};

    for (const [file, locators] of Object.entries(groupedLocators)) {
      for (const [key, info] of Object.entries(locators)) {
        if (info.robustness === 'robust') {
          if (!robustLocators[file]) robustLocators[file] = {};
          robustLocators[file][key] = info;
        } else {
          if (!fragileLocators[file]) fragileLocators[file] = {};
          fragileLocators[file][key] = info;
        }
      }
    }

    // Generate Playwright Page Object Model classes for robust locators
    const generatePageObjectClasses = (
      locators: typeof groupedLocators,
      includeWarnings = false
    ) => {
      return Object.entries(locators).map(([file, locatorSet]) => {
        const className =
          file
            .replace(/[\/\\]/g, '_')
            .replace(/\.(vue|html)$/, '')
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .replace(/^_+|_+$/g, '') + 'Page';

        // Generate Playwright locator properties
        const locatorProperties = Object.entries(locatorSet).map(
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
              case 'data-test':
                playwrightMethod = `this.page.locator('[data-test="${info.rawValue}"]')`;
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
                const escapedXPath = info.rawValue.replace(/'/g, "\\'");
                playwrightMethod = `this.page.locator('${escapedXPath}')`;
                break;
              default:
                playwrightMethod = `this.page.locator('${info.selector}')`;
            }

            const comment = `  // ${info.element} with ${info.type}: "${info.rawValue}" (${info.robustness})`;
            const warningComment =
              includeWarnings && info.warning
                ? `\n  // WARNING: ${info.warning}`
                : '';

            return `${comment}${warningComment}\n  ${propertyName} = ${playwrightMethod};`;
          }
        );

        const classComment = includeWarnings
          ? `// FRAGILE LOCATORS - Consider improving these with stable test attributes`
          : `// ROBUST PAGE OBJECT MODEL - Recommended for E2E testing`;

        return `${classComment}\nimport { Page } from '@playwright/test';\n\nexport class ${className} {\n  constructor(protected page: Page) {}\n\n${locatorProperties.join(
          '\n\n'
        )}\n}`;
      });
    };

    // Generate main locator map (includes all locators with robustness info)
    const generateMainLocatorMap = (allLocators: typeof groupedLocators) => {
      const tsLines = Object.entries(allLocators).map(([file, locatorSet]) => {
        const className = file
          .replace(/[\/\\]/g, '_')
          .replace(/\.(vue|html)$/, '')
          .replace(/[^a-zA-Z0-9_]/g, '_')
          .replace(/^_+|_+$/g, '');

        const locatorEntries = Object.entries(locatorSet).map(([key, info]) => {
          const comment = `    // ${info.element} - ${info.type}: "${info.rawValue}" (${info.robustness})`;
          const escapedSelector = info.selector.replace(/'/g, "\\'");
          return `${comment}\n    ${key}: '${escapedSelector}'`;
        });

        return `  // Page Object for: ${file}\n  ${className}: {\n${locatorEntries.join(
          ',\n'
        )}\n  }`;
      });

      return `// Auto-generated locator map for Page Object Model\n// Contains both robust (recommended) and fragile (needs improvement) locators\nexport const locatorMap = {\n${tsLines.join(
        ',\n'
      )}\n};\n`;
    };

    // Generate fragile-only locator map for improvement tracking
    const generateFragileLocatorMap = (locators: typeof groupedLocators) => {
      const tsLines = Object.entries(locators).map(([file, locatorSet]) => {
        const className = file
          .replace(/[\/\\]/g, '_')
          .replace(/\.(vue|html)$/, '')
          .replace(/[^a-zA-Z0-9_]/g, '_')
          .replace(/^_+|_+$/g, '');

        const locatorEntries = Object.entries(locatorSet).map(([key, info]) => {
          const comment = `    // ${info.element} - ${info.type}: "${info.rawValue}" (NEEDS IMPROVEMENT)`;
          const escapedSelector = info.selector.replace(/'/g, "\\'");
          return `${comment}\n    ${key}: '${escapedSelector}'`;
        });

        return `  // Fragile locators for: ${file}\n  ${className}: {\n${locatorEntries.join(
          ',\n'
        )}\n  }`;
      });

      return `// FRAGILE LOCATORS - These need stable test attributes\n// Use this map to identify which selectors should be improved\nexport const fragileLocatorMap = {\n${tsLines.join(
        ',\n'
      )}\n};\n`;
    };

    // Generate outputs
    const robustPageObjects = generatePageObjectClasses(robustLocators, false);
    const fragilePageObjects = generatePageObjectClasses(fragileLocators, true);

    const mainLocatorMap = generateMainLocatorMap(groupedLocators);
    const fragileLocatorMap = generateFragileLocatorMap(fragileLocators);

    // Write robust page objects (recommended for production use)
    const robustOutput = `// ROBUST PAGE OBJECT MODEL CLASSES
// These locators use stable test attributes and are recommended for E2E testing
${robustPageObjects.join('\n\n')}`;

    // Write fragile locators (needs improvement)
    const fragileOutput = `// FRAGILE LOCATOR CLASSES - NEEDS IMPROVEMENT
// These locators lack stable test attributes and may break easily
// Consider adding data-testid, data-test, or id attributes to improve robustness

${fragilePageObjects.join('\n\n')}

// IMPROVEMENT SUGGESTIONS:
// 1. Add data-testid attributes to interactive elements
// 2. Use semantic HTML with proper roles and labels
// 3. Avoid relying on class names or complex XPath selectors
// 4. Review the warnings above for specific recommendations`;

    await fs.ensureDir('./output');

    // Write Page Object Model files
    await fs.outputFile('./output/pageObjects.ts', robustOutput);
    await fs.outputFile('./output/fragileLocators.ts', fragileOutput);

    // Write locator map files
    await fs.outputFile('./output/locatorMap.ts', mainLocatorMap);
    await fs.outputFile('./output/fragileLocatorMap.ts', fragileLocatorMap);

    // Display warnings
    if (warnings.length > 0) {
      console.log('\n⚠️  FRAGILE LOCATOR WARNINGS:');
      console.log('='.repeat(60));
      warnings.forEach((warning) => console.log(`🔸 ${warning}`));
      console.log('='.repeat(60));
      console.log(
        '💡 Consider adding stable test attributes to improve locator robustness\n'
      );
    }

    console.log(`✅ Locator extraction completed:`);
    console.log(` 📁 ROBUST (Production Ready):`);
    console.log(
      `    - output/pageObjects.ts (${
        Object.keys(robustLocators).length
      } files, ${Object.values(robustLocators).reduce(
        (sum, locators) => sum + Object.keys(locators).length,
        0
      )} locators)`
    );
    console.log(` 🔸 FRAGILE (Needs Improvement):`);
    console.log(
      `    - output/fragileLocators.ts (${
        Object.keys(fragileLocators).length
      } files, ${Object.values(fragileLocators).reduce(
        (sum, locators) => sum + Object.keys(locators).length,
        0
      )} locators)`
    );
    console.log(`    - output/fragileLocatorMap.ts`);
    console.log(` 📋 COMPLETE LOCATOR MAP:`);
    console.log(
      `    - output/locatorMap.ts (all locators with robustness info)`
    );
    console.log(`📁 Source: ${absPath}`);

    // Summary statistics
    const totalRobust = Object.values(robustLocators).reduce(
      (sum, locators) => sum + Object.keys(locators).length,
      0
    );
    const totalFragile = Object.values(fragileLocators).reduce(
      (sum, locators) => sum + Object.keys(locators).length,
      0
    );
    const totalFiles = Object.keys(groupedLocators).length;

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total files processed: ${totalFiles}`);
    console.log(`   Robust locators: ${totalRobust} (ready for production)`);
    console.log(
      `   Fragile locators: ${totalFragile} (${warnings.length} with warnings)`
    );
    console.log(
      `   Robustness ratio: ${
        totalRobust > 0
          ? Math.round((totalRobust / (totalRobust + totalFragile)) * 100)
          : 0
      }%`
    );
  } catch (err) {
    console.error('❌ Failed to extract locators:', err);
  }
})();
