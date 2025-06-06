import { extractLocatorsFromVue } from './scanVueTemplates'
import fs from 'fs-extra'
import path from 'path'

const vueProjectPath = process.argv[2] || './test-vue-src';

(async () => {
  try {
    const absPath = path.resolve(vueProjectPath)
    console.log(`🔍 Scanning for Vue and JS/TS files in: ${absPath}`)

    const { groupedLocators, warnings, customComponentWarnings } =
      await extractLocatorsFromVue(absPath)

    console.log('\n📁 Files found and processed:')
    Object.entries(groupedLocators).forEach(([file, locators]) => {
      console.log(`   📄 ${file} - ${Object.keys(locators).length} locators`)
      Object.entries(locators).forEach(([key, info]) => {
        let status = info.robustness === 'robust' ? '✅' : '🔸'
        let details = `${key}: ${info.type}="${info.rawValue}"`

        // Add dynamic/conditional indicators
        if (info.isDynamic && info.isConditional) {
          details += ' [DYNAMIC+CONDITIONAL]'
          status = '🔄'
        } else if (info.isDynamic) {
          details += ' [DYNAMIC]'
          status = '🔄'
        } else if (info.isConditional) {
          details += ' [CONDITIONAL]'
          status = '❓'
        }

        // Add custom component indicator
        if (info.customComponent) {
          details += ' [CUSTOM COMPONENT]'
        }

        // Add parent context if relevant
        if (info.parentContext) {
          details += ` (${info.parentContext})`
        }

        console.log(`      ${status} ${details}`)
      })
    })

    // Display custom component warnings
    if (customComponentWarnings.length > 0) {
      console.log('\n⚠️  CUSTOM COMPONENT WARNINGS:')
      customComponentWarnings.forEach((warning) => {
        console.log(`🔸 ${warning.file}: ${warning.message}`)
      })
      console.log('\n💡 RECOMMENDATION: For better test coverage, consider:')
      console.log('   1. Adding data-testid to custom component root elements')
      console.log(
        '   2. Using component composition to expose testable elements'
      )
      console.log(
        '   3. Running dynamic extraction on the rendered application'
      )
    }

    // Separate robust and fragile locators
    const robustLocators: typeof groupedLocators = {}
    const fragileLocators: typeof groupedLocators = {}

    for (const [file, locators] of Object.entries(groupedLocators)) {
      for (const [key, info] of Object.entries(locators)) {
        if (info.robustness === 'robust') {
          if (!robustLocators[file]) robustLocators[file] = {}
          robustLocators[file][key] = info
        } else {
          if (!fragileLocators[file]) fragileLocators[file] = {}
          fragileLocators[file][key] = info
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
          `${file
            .replace(/[\/\\]/g, '_')
            .replace(/\.(vue|html|js|ts)$/, '')
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .replace(/^_+|_+$/g, '')  }Page`

        // Generate Playwright locator properties
        const locatorDeclarations: string[] = []
        const locatorInitializations: string[] = []

        Object.entries(locatorSet).forEach(([key, info]) => {
          // Convert to proper camelCase
          const propertyName = key
            .replace(/_(\w)/g, (_, letter) => letter.toUpperCase()) // snake_case to camelCase
            .replace(/^(\w)/, (_, letter) => letter.toLowerCase()) // ensure first letter is lowercase
            .replace(/[^a-zA-Z0-9]/g, '') // remove any special characters

          let playwrightMethod = ''

          // Map to appropriate Playwright locator method
          switch (info.type) {
            case 'data-testid':
              playwrightMethod = `page.getByTestId('${info.rawValue}')`
              break
            case 'data-test-id':
              playwrightMethod = `page.getByTestId('${info.rawValue}')`
              break
            case 'data-test':
              playwrightMethod = `page.locator('[data-test="${info.rawValue}"]')`
              break
            case 'id':
              // Use getByTestId for strong or XGrid elements with id
              if (
                info.element &&
                (info.element.toLowerCase() === 'strong' ||
                  info.element.toLowerCase() === 'xgrid')
              ) {
                playwrightMethod = `page.getByTestId('${info.rawValue}')`
              } else {
                playwrightMethod = `page.locator('#${info.rawValue}')`
              }
              break
            case 'aria-label':
              playwrightMethod = `page.getByLabel('${info.rawValue}')`
              break
            case 'role':
              // Use getByRole with proper options for common interactive roles
              const commonInteractiveRoles = [
                'button',
                'link',
                'textbox',
                'combobox',
                'listbox',
                'checkbox',
                'radio',
                'tab',
                'menuitem'
              ]
              if (
                commonInteractiveRoles.includes(info.rawValue.toLowerCase())
              ) {
                playwrightMethod = `page.getByRole('${info.rawValue}')`
              } else {
                // For structural roles, use getByRole with name option if available
                playwrightMethod = `page.getByRole('${info.rawValue}')`
              }
              break
            case 'placeholder':
              playwrightMethod = `page.getByPlaceholder('${info.rawValue}')`
              break
            case 'name':
              // For form elements, prefer getByLabel if we can infer it's a form field
              const formElements = ['input', 'textarea', 'select']
              if (
                info.element &&
                formElements.includes(info.element.toLowerCase())
              ) {
                // Use getByLabel if there's likely an associated label, otherwise use name locator
                playwrightMethod = `page.getByLabel('${info.rawValue}')`
              } else {
                playwrightMethod = `page.locator('[name="${info.rawValue}"]')`
              }
              break
            case 'class':
              playwrightMethod = `page.locator('${info.selector}')`
              break
            case 'xpath':
              const escapedXPath = info.rawValue.replace(/'/g, "\\'")
              playwrightMethod = `page.locator('${escapedXPath}')`
              break
            default:
              playwrightMethod = `page.locator('${info.selector}')`
          }

          // Enhanced comment with dynamic/conditional information
          let comment = `  // ${info.element} with ${info.type}: "${info.rawValue}" (${info.robustness})`

          if (info.isDynamic && info.isConditional) {
            comment += ' - DYNAMIC & CONDITIONAL'
          } else if (info.isDynamic) {
            comment += ' - DYNAMIC (may be repeated)'
          } else if (info.isConditional) {
            comment += ' - CONDITIONAL (may not always be present)'
          }

          if (info.parentContext) {
            comment += ` - ${info.parentContext}`
          }

          const warningComment =
            includeWarnings && info.warning
              ? `\n  // WARNING: ${info.warning}`
              : ''

          // Clean up property name - remove xpath references and ensure camelCase
          const cleanPropertyName = propertyName
            .replace(/xpath/gi, '')
            .replace(/^_+|_+$/g, '')
          const finalPropertyName = cleanPropertyName || 'element'

          // Add to declarations array
          locatorDeclarations.push(
            `${comment}${warningComment}\n  readonly ${finalPropertyName}: Locator;`
          )

          // Add to initializations array
          locatorInitializations.push(
            `    this.${finalPropertyName} = ${playwrightMethod};`
          )
        })

        const classComment = includeWarnings
          ? '// FRAGILE LOCATORS - Consider improving these with stable test attributes'
          : '// ROBUST PAGE OBJECT MODEL - Recommended for E2E testing'

        const dynamicWarning = Object.values(locatorSet).some(
          (info) => info.isDynamic || info.isConditional
        )
          ? '\n// NOTE: Some locators are marked as DYNAMIC or CONDITIONAL - test carefully for element presence'
          : ''

        return `${classComment}${dynamicWarning}\n// File: ${file}\nimport { Page, Locator } from '@playwright/test';\n\nexport class ${className} {\n${locatorDeclarations.join(
          '\n\n'
        )}\n\n  constructor(protected page: Page) {\n${locatorInitializations.join(
          '\n'
        )}\n  }\n}`
      })
    }

    // Generate main locator map (includes all locators with robustness info)
    const generateMainLocatorMap = (allLocators: typeof groupedLocators) => {
      const tsLines = Object.entries(allLocators).map(([file, locatorSet]) => {
        const className = file
          .replace(/[\/\\]/g, '_')
          .replace(/\.(vue|html|js|ts)$/, '')
          .replace(/[^a-zA-Z0-9_]/g, '_')
          .replace(/^_+|_+$/g, '')

        const locatorEntries = Object.entries(locatorSet).map(([key, info]) => {
          let comment = `    // ${info.element} - ${info.type}: "${info.rawValue}" (${info.robustness})`

          // Add dynamic/conditional information
          if (info.isDynamic && info.isConditional) {
            comment += ' - DYNAMIC & CONDITIONAL'
          } else if (info.isDynamic) {
            comment += ' - DYNAMIC'
          } else if (info.isConditional) {
            comment += ' - CONDITIONAL'
          }

          const escapedSelector = info.selector.replace(/'/g, "\\'")
          return `${comment}\n    ${key}: '${escapedSelector}'`
        })

        return `  // Page Object for: ${file}\n  ${className}: {\n${locatorEntries.join(
          ',\n'
        )}\n  }`
      })

      return `// Auto-generated locator map for Page Object Model\n// Contains both robust (recommended) and fragile (needs improvement) locators\n// DYNAMIC = may be repeated, CONDITIONAL = may not always be present\nexport const locatorMap = {\n${tsLines.join(
        ',\n'
      )}\n};\n`
    }

    // Generate fragile-only locator map for improvement tracking
    const generateFragileLocatorMap = (locators: typeof groupedLocators) => {
      const tsLines = Object.entries(locators).map(([file, locatorSet]) => {
        const className = file
          .replace(/[\/\\]/g, '_')
          .replace(/\.(vue|html|js|ts)$/, '')
          .replace(/[^a-zA-Z0-9_]/g, '_')
          .replace(/^_+|_+$/g, '')

        const locatorEntries = Object.entries(locatorSet).map(([key, info]) => {
          let comment = `    // ${info.element} - ${info.type}: "${info.rawValue}" (NEEDS IMPROVEMENT)`

          if (info.isDynamic && info.isConditional) {
            comment += ' - DYNAMIC & CONDITIONAL'
          } else if (info.isDynamic) {
            comment += ' - DYNAMIC'
          } else if (info.isConditional) {
            comment += ' - CONDITIONAL'
          }

          const escapedSelector = info.selector.replace(/'/g, "\\'")
          return `${comment}\n    ${key}: '${escapedSelector}'`
        })

        return `  // Fragile locators for: ${file}\n  ${className}: {\n${locatorEntries.join(
          ',\n'
        )}\n  }`
      })

      return `// FRAGILE LOCATORS - These need stable test attributes\n// Use this map to identify which selectors should be improved\n// DYNAMIC = may be repeated, CONDITIONAL = may not always be present\nexport const fragileLocatorMap = {\n${tsLines.join(
        ',\n'
      )}\n};\n`
    }

    // Generate outputs
    const robustPageObjects = generatePageObjectClasses(robustLocators, false)
    const fragilePageObjects = generatePageObjectClasses(fragileLocators, true)

    const mainLocatorMap = generateMainLocatorMap(groupedLocators)
    const fragileLocatorMap = generateFragileLocatorMap(fragileLocators)

    // Write robust page objects (recommended for production use)
    const robustOutput = `// ROBUST PAGE OBJECT MODEL CLASSES
// These locators use stable test attributes and are recommended for E2E testing
// NOTE: DYNAMIC elements may be repeated, CONDITIONAL elements may not always be present
// 
// PLAYWRIGHT CONFIGURATION NOTE:
// If using data-test-id attributes, configure Playwright to recognize them:
// In playwright.config.ts: use: { testIdAttribute: 'data-test-id' }
// (Choose either 'data-testid' or 'data-test-id' as your project standard)

${robustPageObjects.join('\n\n')}`

    // Write fragile locators (needs improvement)
    const fragileOutput = `// FRAGILE LOCATOR CLASSES - NEEDS IMPROVEMENT
// These locators lack stable test attributes and may break easily
// Consider adding data-testid, data-test, or id attributes to improve robustness
// NOTE: DYNAMIC elements may be repeated, CONDITIONAL elements may not always be present

${fragilePageObjects.join('\n\n')}

// IMPROVEMENT SUGGESTIONS:
// 1. Add data-testid attributes to interactive elements
// 2. Use semantic HTML with proper roles and labels
// 3. Avoid relying on class names or complex XPath selectors
// 4. Review the warnings above for specific recommendations
// 5. For DYNAMIC elements, ensure selectors work with multiple instances
// 6. For CONDITIONAL elements, add existence checks in tests`

    await fs.ensureDir('./output')

    // Write Page Object Model files
    await fs.outputFile('./output/pageObjects.ts', robustOutput)
    await fs.outputFile('./output/fragileLocators.ts', fragileOutput)

    // Write locator map files
    await fs.outputFile('./output/locatorMap.ts', mainLocatorMap)
    await fs.outputFile('./output/fragileLocatorMap.ts', fragileLocatorMap)

    // Generate summary report
    const totalLocators = Object.values(groupedLocators).reduce(
      (sum, locators) => sum + Object.keys(locators).length,
      0
    )
    const robustCount = Object.values(robustLocators).reduce(
      (sum, locators) => sum + Object.keys(locators).length,
      0
    )
    const fragileCount = Object.values(fragileLocators).reduce(
      (sum, locators) => sum + Object.keys(locators).length,
      0
    )
    const dynamicCount = Object.values(groupedLocators).reduce(
      (sum, locators) =>
        sum + Object.values(locators).filter((info) => info.isDynamic).length,
      0
    )
    const conditionalCount = Object.values(groupedLocators).reduce(
      (sum, locators) =>
        sum +
        Object.values(locators).filter((info) => info.isConditional).length,
      0
    )

    const robustnessRatio =
      totalLocators > 0 ? Math.round((robustCount / totalLocators) * 100) : 0

    console.log('\n📊 ENHANCED ANALYSIS SUMMARY:')
    console.log(
      `   📄 Total files processed: ${Object.keys(groupedLocators).length}`
    )
    console.log(`   🎯 Total locators found: ${totalLocators}`)
    console.log(`   ✅ Robust locators: ${robustCount} (ready for production)`)
    console.log(
      `   🔸 Fragile locators: ${fragileCount} (${warnings.length} with warnings)`
    )
    console.log(`   🔄 Dynamic locators: ${dynamicCount} (may be repeated)`)
    console.log(
      `   ❓ Conditional locators: ${conditionalCount} (may not always be present)`
    )
    console.log(
      `   🎪 Custom components: ${customComponentWarnings.length} (need manual review)`
    )
    console.log(`   📈 Robustness ratio: ${robustnessRatio}%`)

    // Display warnings
    if (warnings.length > 0) {
      console.log('\n⚠️  FRAGILE LOCATOR WARNINGS:')
      warnings.forEach((warning) => {
        console.log(`🔸 ${warning}`)
      })
    }

    console.log('\n✅ Generated files:')
    console.log(
      '   📄 output/pageObjects.ts - Robust Playwright Page Object classes'
    )
    console.log(
      '   📄 output/fragileLocators.ts - Fragile locators needing improvement'
    )
    console.log(
      '   📄 output/locatorMap.ts - Complete locator map with metadata'
    )
    console.log('   📄 output/fragileLocatorMap.ts - Improvement tracking map')

    console.log('\n�� NEXT STEPS:')
    console.log(
      '   1. Review custom component warnings and add test attributes where needed'
    )
    console.log('   2. Use robust Page Objects for critical test flows')
    console.log('   3. Add existence checks for conditional elements in tests')
    console.log(
      '   4. Consider dynamic extraction for complex runtime-generated content'
    )
    console.log(
      '   5. Improve fragile locators by adding data-testid attributes'
    )

    if (dynamicCount > 0 || conditionalCount > 0) {
      console.log('\n⚡ DYNAMIC/CONDITIONAL ELEMENT RECOMMENDATIONS:')
      console.log(
        '   • For DYNAMIC elements: Use .nth(index) or .count() in tests'
      )
      console.log(
        '   • For CONDITIONAL elements: Use .isVisible() checks before interaction'
      )
      console.log(
        '   • Consider using .waitFor() methods for elements that appear/disappear'
      )
    }
  } catch (error) {
    console.error('❌ Error during extraction:', error)
    process.exit(1)
  }
})()
