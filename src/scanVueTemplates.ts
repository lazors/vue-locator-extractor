import fs from 'fs-extra'
import path from 'path'
import fg from 'fast-glob'

interface LocatorInfo {
  selector: string;
  type:
    | 'data-testid'
    | 'data-test-id'
    | 'data-test'
    | 'id'
    | 'class'
    | 'aria-label'
    | 'role'
    | 'name'
    | 'placeholder'
    | 'xpath';
  element?: string;
  rawValue: string;
  robustness: 'robust' | 'fragile';
  testRelevance: 'high' | 'medium' | 'low';
  warning?: string;
  isDynamic?: boolean;
  isConditional?: boolean;
  vueDirectives?: string[];
  customComponent?: boolean;
  parentContext?: string;
  resolvedFromConstant?: string; // Track if this was resolved from a constant
}

interface CustomComponentWarning {
  file: string;
  component: string;
  line: number;
  message: string;
}

// Interface for tracking constants
interface ConstantDefinition {
  name: string;
  value: string;
  type: 'role' | 'label' | 'testid' | 'name' | 'placeholder' | 'other';
  file: string;
}

// Elements that are typically relevant for testing
const testRelevantElements = new Set([
  'button',
  'input',
  'textarea',
  'select',
  'a',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'table',
  'tr',
  'td',
  'th',
  'ul',
  'ol',
  'li'
])

// Custom Vue component patterns
const customComponentPattern = /^[A-Z][a-zA-Z0-9]*$/

// Robust attributes in priority order
const robustAttributes = [
  'data-testid',
  'data-test-id',
  'data-test',
  'id',
  'name',
  'role',
  'aria-label',
  'placeholder'
]

// Vue directives that make elements dynamic or conditional
const dynamicDirectives = ['v-for', 'v-if', 'v-else-if', 'v-show', 'v-model']

// Global constants registry
const constantsRegistry: Map<string, ConstantDefinition> = new Map()

function detectVueDirectives(attributeString: string): {
  directives: string[];
  isDynamic: boolean;
  isConditional: boolean;
} {
  const directives: string[] = []
  let isDynamic = false
  let isConditional = false

  // Check for Vue directives
  const directiveMatches = attributeString.matchAll(/(v-[\w-]+|@\w+|:\w+)/g)
  for (const match of directiveMatches) {
    directives.push(match[1])

    if (['v-for'].includes(match[1])) {
      isDynamic = true
    }

    if (['v-if', 'v-else-if', 'v-show'].includes(match[1])) {
      isConditional = true
    }
  }

  return { directives, isDynamic, isConditional }
}

function isCustomComponent(tagName: string): boolean {
  return customComponentPattern.test(tagName) || tagName.includes('-')
}

function analyzeElementContext(
  content: string,
  matchIndex: number
): {
  parentContext: string;
  ancestorDirectives: string[];
  lineNumber: number;
} {
  // Get line number
  const beforeMatch = content.substring(0, matchIndex)
  const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1

  // Find parent context by looking backwards for containing elements
  let searchIndex = matchIndex
  const ancestorDirectives: string[] = []
  let parentContext = ''
  let depth = 0

  while (searchIndex > 0) {
    const char = content[searchIndex]
    if (char === '>') depth++
    if (char === '<') {
      depth--
      if (depth < 0) {
        // Found a parent tag
        const tagStart = searchIndex
        let tagEnd = searchIndex
        while (tagEnd < content.length && content[tagEnd] !== '>') {
          tagEnd++
        }

        const parentTag = content.substring(tagStart, tagEnd + 1)
        const tagMatch = parentTag.match(/<(\w+)([^>]*)/)

        if (tagMatch) {
          const tagName = tagMatch[1]
          const attributes = tagMatch[2]

          // Check for Vue directives in parent
          const directiveMatches = attributes.matchAll(/(v-[\w-]+)/g)
          for (const match of directiveMatches) {
            ancestorDirectives.push(match[1])
          }

          if (dynamicDirectives.some((dir) => attributes.includes(dir))) {
            parentContext = `inside ${tagName} with dynamic directives`
            break
          }
        }
      }
    }
    searchIndex--
  }

  return { parentContext, ancestorDirectives, lineNumber }
}

function classifyElement(
  element: string,
  attributes: Record<string, string>
): {
  robustness: 'robust' | 'fragile';
  testRelevance: 'high' | 'medium' | 'low';
} {
  // Enhanced: Check if element can use any Playwright getBy methods
  const hasRobustAttribute = robustAttributes.some((attr) => attributes[attr])

  // Additional getBy* method compatible attributes that should be considered robust
  const getByCompatibleAttributes = [
    'data-testid', // getByTestId()
    'data-test-id', // getByTestId()
    'data-test', // getByTestId()
    'id', // locator() but considered stable
    'name', // getByLabel() for form elements, locator() for others
    'role', // getByRole()
    'aria-label', // getByLabel()
    'placeholder', // getByPlaceholder()
    'title', // getByTitle()
    'alt' // getByAltText()
  ]

  // Check if element has any getBy* compatible attributes
  const hasGetByCompatible = getByCompatibleAttributes.some(
    (attr) => attributes[attr] && attributes[attr].trim()
  )

  let robustness: 'robust' | 'fragile' = hasGetByCompatible
    ? 'robust'
    : 'fragile'

  // Special handling for specific cases
  if (!hasGetByCompatible) {
    const xpathValue = attributes['data-xpath'] || attributes['xpath']
    const classValue = attributes['class'] || ''

    if (xpathValue) {
      // Enhanced XPath robustness detection - text-based locators for buttons are robust
      const robustXPathPatterns = [
        /\/\/input/i, // //input[@name='search']
        /\/\/button/i, // //button[contains(@class,'submit')]
        /\[@.*btn.*\]/i, // //div[@class='submit-btn']
        /button\[/i, // //div//button[text()='Submit']
        /input\[/i, // //form//input[@type='text']
        /btn/i, // Any XPath containing 'btn' (e.g., //div[contains(@class,'submit-btn')])
        /contains\(text\(\)/i, // XPath with text content - robust for getByText equivalent
        /text\(\)=/i // Direct text matching - robust for getByText equivalent
      ]

      // Additional robustness for interactive elements with text content
      const isInteractiveElementWithText =
        ['button', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(element) &&
        /contains\(text\(\)|text\(\)=/i.test(xpathValue)

      if (
        robustXPathPatterns.some((pattern) => pattern.test(xpathValue)) ||
        isInteractiveElementWithText
      ) {
        robustness = 'robust'
        console.log(
          `   🎯 XPath classified as robust: ${xpathValue.substring(
            0,
            50
          )}... (text-based or interactive)`
        )
      }
    }

    // Check for robust patterns in class attributes (btn-related classes)
    if (classValue && /btn/i.test(classValue)) {
      robustness = 'robust'
    }
  }

  // Determine test relevance based on element type and attributes
  let testRelevance: 'high' | 'medium' | 'low' = 'low'

  if (testRelevantElements.has(element)) {
    // Interactive elements are high relevance
    if (
      ['button', 'input', 'textarea', 'select', 'a', 'form'].includes(element)
    ) {
      testRelevance = 'high'
    }
    // Headers and structural elements are medium relevance
    else if (
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr'].includes(element)
    ) {
      testRelevance = 'medium'
    }
    // Other elements are medium relevance
    else {
      testRelevance = 'medium'
    }
  }

  // Elements with getBy* compatible attributes get higher relevance
  if (hasGetByCompatible && testRelevance === 'low') {
    testRelevance = 'medium'
  }

  // Check for decorative indicators (lower relevance)
  const classValue = attributes['class'] || ''
  const decorativeClasses = [
    'icon',
    'decoration',
    'separator',
    'spacer',
    'divider'
  ]
  if (decorativeClasses.some((cls) => classValue.includes(cls))) {
    testRelevance = 'low'
  }

  return { robustness, testRelevance }
}

function generateFragileWarning(
  element: string,
  rawValue: string,
  type: string
): string {
  const suggestions = [
    `Consider adding data-testid="${rawValue
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}"`,
    `Alternative: data-test-id="${rawValue
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}"`,
    `Alternative: data-test="${rawValue
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}"`,
    `Or add a unique id="${rawValue
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}"`
  ]

  return `FRAGILE LOCATOR WARNING: ${element} with ${type}="${rawValue}" lacks stable test attributes. ${suggestions.join(
    ' | '
  )}`
}

export async function extractLocatorsFromVue(baseDir: string) {
  // Clear previous constants registry
  constantsRegistry.clear()

  // Scan Vue files and also JS/TS files that might generate elements
  const vueFiles = await fg(['**/*.vue'], {
    cwd: baseDir,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.output/**',
      '**/build/**'
    ]
  })

  const jsFiles = await fg(['**/*.{js,ts}', '!**/*.d.ts'], {
    cwd: baseDir,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.output/**',
      '**/build/**',
      '**/tests/**',
      '**/test/**',
      '**/__tests__/**'
    ]
  })

  console.log(
    `🔍 Found ${vueFiles.length} Vue files and ${jsFiles.length} JS/TS files:`
  );
  [...vueFiles, ...jsFiles].forEach((file) => {
    const relative = path.relative(baseDir, file)
    console.log(`   📄 ${relative}`)
  })

  // First pass: Extract constants from all files
  console.log('\n🔧 SCANNING FOR CONSTANTS:')
  for (const file of [...vueFiles, ...jsFiles]) {
    const relative = path.relative(baseDir, file)
    const content = await fs.readFile(file, 'utf-8')
    extractConstants(content, relative)
  }

  if (constantsRegistry.size > 0) {
    console.log(`\n📋 FOUND ${constantsRegistry.size} CONSTANTS:`)
    constantsRegistry.forEach((constant) => {
      console.log(
        `   🔧 ${constant.name} = "${constant.value}" (${constant.type}) - ${constant.file}`
      )
    })
  } else {
    console.log('   ⚠️  No constants found')
  }

  const groupedLocators: Record<string, Record<string, LocatorInfo>> = {}
  const warnings: string[] = []
  const customComponentWarnings: CustomComponentWarning[] = []

  // Second pass: Process Vue files
  console.log('\n🔍 PROCESSING TEMPLATES:')
  for (const file of vueFiles) {
    const relative = path.relative(baseDir, file)
    const keyGroup = relative.replace(/\\/g, '/')
    const content = await fs.readFile(file, 'utf-8')

    console.log(`\n🔍 Processing Vue file: ${relative}`)

    // Extract the <template> section from Vue files
    const templateMatch = content.match(
      /<template[^>]*>([\s\S]*?)<\/template>/
    )
    if (!templateMatch) {
      console.log('   ⚠️  No <template> section found, skipping')
      continue
    }

    const templateContent = templateMatch[1]
    console.log(
      `   ✅ Found <template> section (${templateContent.length} chars)`
    )

    await processTemplateContent(
      templateContent,
      keyGroup,
      groupedLocators,
      warnings,
      customComponentWarnings,
      relative
    )
  }

  // Process JS/TS files for createElement or template strings
  for (const file of jsFiles) {
    const relative = path.relative(baseDir, file)
    const keyGroup = `${relative.replace(/\\/g, '/')} (JS/TS)`
    const content = await fs.readFile(file, 'utf-8')

    console.log(`\n🔍 Processing JS/TS file: ${relative}`)

    await processJavaScriptContent(
      content,
      keyGroup,
      groupedLocators,
      warnings,
      relative
    )
  }

  return { groupedLocators, warnings, customComponentWarnings }
}

/**
 * Normalize template content for better parsing
 */
function normalizeTemplateForParsing(templateContent: string): string {
  const normalized = templateContent
    // Remove Vue comments but preserve structure
    .replace(/<!--[\s\S]*?-->/g, '')
    // Preserve single spaces around attributes - don't collapse to nothing
    .replace(/\s*\n\s*/g, ' ')
    // Normalize excessive whitespace but keep single spaces
    .replace(/\s{2,}/g, ' ')
    // Keep proper attribute formatting - don't insert spaces in attribute names
    .replace(/\s*=\s*/g, '=')
    // Ensure space before attributes but don't break attribute names
    .replace(/([>\s])([a-zA-Z:-]+)=/g, '$1 $2=')

  return normalized.trim()
}

/**
 * Extract base from template literal for partial matching
 */
function extractTemplateLiteralBase(value: string): string {
  // Extract the static part before ${...}
  const beforeTemplate = value.split('${')[0]
  if (beforeTemplate) {
    return beforeTemplate
  }

  // Extract the static part after ${...}
  const afterTemplate = value.split('}').pop()
  if (afterTemplate) {
    return afterTemplate
  }

  return value
}

/**
 * Enhanced element extraction with better multi-line and Vue support
 */
const extractElementWithAttributesEnhanced = (
  match: RegExpMatchArray,
  content: string
): {
  element: string;
  attributes: Record<string, string> & { fullAttributeString?: string };
} => {
  const matchIndex = match.index || 0

  // Look backwards to find the opening tag - enhanced for multi-line
  let tagStart = matchIndex
  let depth = 0
  while (tagStart > 0) {
    const char = content[tagStart]
    if (char === '>') depth++
    if (char === '<') {
      if (depth === 0) break
      depth--
    }
    tagStart--
  }

  // Look forwards to find the closing > - enhanced for multi-line
  let tagEnd = matchIndex
  depth = 0
  while (tagEnd < content.length) {
    const char = content[tagEnd]
    if (char === '<') depth++
    if (char === '>') {
      if (depth === 0) break
      depth--
    }
    tagEnd++
  }

  const tagContent = content.substring(tagStart, tagEnd + 1)

  // Enhanced regex to handle Vue components and self-closing tags
  const tagMatch = tagContent.match(/<([a-zA-Z][a-zA-Z0-9-]*)[^>]*\/?>/s)

  if (!tagMatch) return { element: 'element', attributes: {} }

  const element = tagMatch[1]
  const attributeString = tagContent.substring(element.length + 1, -1)

  // Enhanced attribute parsing with better Vue directive support
  const attributes: Record<string, string> & { fullAttributeString?: string } =
    {
      fullAttributeString: attributeString
    }

  // Parse all attribute patterns including Vue directives
  const attributePatterns = [
    // Standard attributes: name="value"
    /(\w+(?:-\w+)*)\s*=\s*["']([^"']*)["']/g,
    // Vue dynamic attributes: :name="value" or v-bind:name="value"
    /([@:][\w-]+|v-bind:[\w-]+|v-on:[\w-]+)\s*=\s*["']([^"']*)["']/g,
    // Vue directives without values: v-if, v-show, etc.
    /(v-[\w-]+)(?:\s|>|$)/g
  ]

  for (const pattern of attributePatterns) {
    const matches = [...attributeString.matchAll(pattern)]
    for (const attrMatch of matches) {
      attributes[attrMatch[1]] = attrMatch[2] || ''
    }
  }

  return { element, attributes }
}

async function processJavaScriptContent(
  content: string,
  keyGroup: string,
  groupedLocators: Record<string, Record<string, LocatorInfo>>,
  warnings: string[],
  filename: string
) {
  console.log(
    '   🔍 Scanning for createElement patterns and template strings...'
  )

  // Pattern for Vue h() function calls and createElement
  const createElementPatterns = [
    /h\(\s*['"`](\w+)['"`]\s*,\s*{([^}]*)}/g,
    /createElement\(\s*['"`](\w+)['"`]\s*,\s*{([^}]*)}/g
  ]

  // Pattern for template strings with HTML
  const templateStringPatterns = [
    /`[^`]*<(\w+)[^>]*([^`]*)`/g,
    /'[^']*<(\w+)[^>]*([^']*)'|"[^"]*<(\w+)[^>]*([^"]*)"/g
  ]

  let foundElements = 0

  // Process createElement patterns
  for (const pattern of createElementPatterns) {
    const matches = [...content.matchAll(pattern)]
    for (const match of matches) {
      const element = match[1]
      const propsString = match[2]

      // Extract test-relevant attributes from props
      const testIdMatch = propsString.match(
        /['"`]?data-testid['"`]?\s*:\s*['"`]([^'"`]+)['"`]/
      )
      const idMatch = propsString.match(
        /['"`]?id['"`]?\s*:\s*['"`]([^'"`]+)['"`]/
      )

      if (testIdMatch || idMatch) {
        const rawValue = testIdMatch ? testIdMatch[1] : idMatch![1]
        const type = testIdMatch ? 'data-testid' : 'id'
        const selector =
          type === 'data-testid'
            ? `[data-testid="${rawValue}"]`
            : `#${rawValue}`

        const key = generateEnhancedKey(rawValue, type as any, false, false)

        if (!groupedLocators[keyGroup]) groupedLocators[keyGroup] = {}

        groupedLocators[keyGroup][key] = {
          selector,
          type: type as any,
          element,
          rawValue,
          robustness: type === 'data-testid' ? 'robust' : 'robust',
          testRelevance: 'high' as const,
          isDynamic: true, // JS-generated elements are dynamic
          isConditional: false,
          vueDirectives: [],
          customComponent: false,
          parentContext: 'JS createElement'
        }

        foundElements++
      }
    }
  }

  // Process template strings (simplified)
  for (const pattern of templateStringPatterns) {
    const matches = [...content.matchAll(pattern)]
    for (const match of matches) {
      const htmlContent = match[0]

      // Look for test attributes in template strings
      const testIdMatches = htmlContent.matchAll(/data-testid="([^"]+)"/g)
      for (const testIdMatch of testIdMatches) {
        const rawValue = testIdMatch[1]
        const key = generateEnhancedKey(rawValue, 'data-testid', false, false)

        if (!groupedLocators[keyGroup]) groupedLocators[keyGroup] = {}

        groupedLocators[keyGroup][key] = {
          selector: `[data-testid="${rawValue}"]`,
          type: 'data-testid',
          element: 'unknown',
          rawValue,
          robustness: 'robust',
          testRelevance: 'high' as const,
          isDynamic: true,
          isConditional: false,
          vueDirectives: [],
          customComponent: false,
          parentContext: 'JS template string'
        }

        foundElements++
      }
    }
  }

  console.log(
    `   ${
      foundElements > 0 ? '✅' : '⚠️'
    } Found ${foundElements} test-relevant elements in JS/TS`
  )
}

function generateEnhancedKey(
  rawValue: string,
  type: string,
  isDynamic: boolean,
  isConditional: boolean
): string {
  let key = rawValue
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  // Add prefixes based on type and characteristics
  if (type === 'class') {
    key = `class_${key}`
  } else if (type === 'role') {
    key = `${rawValue.toLowerCase()}_role`
  } else if (type === 'placeholder') {
    key = `${key}_input`
  } else if (type === 'xpath') {
    key = `xpath_${key}`
  }

  // Add suffixes for dynamic/conditional elements
  if (isDynamic && isConditional) {
    key = `${key}_dynamic_conditional`
  } else if (isDynamic) {
    key = `${key}_dynamic`
  } else if (isConditional) {
    key = `${key}_conditional`
  }

  return key
}

/**
 * Extract constant definitions from JavaScript/TypeScript content
 */
function extractConstants(content: string, filename: string): void {
  // Pattern for const declarations with role/label/testid related names
  const constPatterns = [
    // const ROLE_BUTTON = 'button';
    /const\s+([A-Z_]+(?:ROLE|LABEL|TESTID|TEST_ID)[A-Z_]*)\s*=\s*['"`]([^'"`]+)['"`]/g,
    // const SUBMIT_ROLE = 'button';
    /const\s+([A-Z_]*(?:ROLE|LABEL|TESTID|TEST_ID)[A-Z_]*)\s*=\s*['"`]([^'"`]+)['"`]/g,
    // const USER_BUTTON_ROLE = 'button';
    /const\s+([A-Z_]+)\s*=\s*['"`](button|link|textbox|heading|banner|navigation|main|complementary|contentinfo|search|form|dialog|alert|status|log|marquee|timer|alertdialog|application|article|cell|columnheader|definition|directory|document|group|img|list|listitem|math|note|presentation|region|row|rowgroup|rowheader|separator|slider|spinbutton|table|tablist|tab|tabpanel|toolbar|tooltip|tree|treegrid|treeitem)['"`]/g,
    // const SUBMIT_LABEL = 'Submit';
    /const\s+([A-Z_]+)\s*=\s*['"`]([A-Za-z0-9\s]+)['"`]/g,
    // const USERNAME_NAME = 'username'; (form field names)
    /const\s+([A-Z_]*(?:NAME|FIELD)[A-Z_]*)\s*=\s*['"`]([^'"`]+)['"`]/g,
    // const EMAIL_PLACEHOLDER = 'Enter your email';
    /const\s+([A-Z_]*(?:PLACEHOLDER|HINT)[A-Z_]*)\s*=\s*['"`]([^'"`]+)['"`]/g
  ]

  for (const pattern of constPatterns) {
    const matches = [...content.matchAll(pattern)]
    for (const match of matches) {
      const constantName = match[1]
      const constantValue = match[2]

      // Determine type based on name and value
      let type: 'role' | 'label' | 'testid' | 'name' | 'placeholder' | 'other' =
        'other'

      if (
        constantName.includes('ROLE') ||
        [
          'button',
          'link',
          'textbox',
          'heading',
          'banner',
          'navigation',
          'main',
          'complementary',
          'contentinfo',
          'search',
          'form',
          'dialog',
          'alert',
          'status',
          'log',
          'marquee',
          'timer',
          'alertdialog',
          'application',
          'article',
          'cell',
          'columnheader',
          'definition',
          'directory',
          'document',
          'group',
          'img',
          'list',
          'listitem',
          'math',
          'note',
          'presentation',
          'region',
          'row',
          'rowgroup',
          'rowheader',
          'separator',
          'slider',
          'spinbutton',
          'table',
          'tablist',
          'tab',
          'tabpanel',
          'toolbar',
          'tooltip',
          'tree',
          'treegrid',
          'treeitem'
        ].includes(constantValue.toLowerCase())
      ) {
        type = 'role'
      } else if (constantName.includes('LABEL')) {
        type = 'label'
      } else if (
        constantName.includes('TESTID') ||
        constantName.includes('TEST_ID')
      ) {
        type = 'testid'
      } else if (
        constantName.includes('NAME') ||
        constantName.includes('FIELD')
      ) {
        type = 'name'
      } else if (
        constantName.includes('PLACEHOLDER') ||
        constantName.includes('HINT')
      ) {
        type = 'placeholder'
      }

      constantsRegistry.set(constantName, {
        name: constantName,
        value: constantValue,
        type: type as
          | 'role'
          | 'label'
          | 'testid'
          | 'name'
          | 'placeholder'
          | 'other',
        file: filename
      })

      console.log(
        `   🔧 Found constant: ${constantName} = "${constantValue}" (${type}) in ${filename}`
      )
    }
  }
}

/**
 * Resolve constant references in attribute values
 */
function resolveConstantReference(value: string): {
  resolved: string;
  constantName?: string;
} {
  // Handle Vue.js constant binding: :role="ROLE_BUTTON" or v-bind:role="ROLE_BUTTON"
  const vueConstantMatch = value.match(/^([A-Z_]+)$/)
  if (vueConstantMatch) {
    const constantName = vueConstantMatch[1]
    const constant = constantsRegistry.get(constantName)
    if (constant) {
      return { resolved: constant.value, constantName }
    }
  }

  // Handle template literal references: ${ROLE_BUTTON}
  const templateLiteralMatch = value.match(/\$\{([A-Z_]+)\}/)
  if (templateLiteralMatch) {
    const constantName = templateLiteralMatch[1]
    const constant = constantsRegistry.get(constantName)
    if (constant) {
      const resolved = value.replace(`\${${constantName}}`, constant.value)
      return { resolved, constantName }
    }
  }

  // Handle JavaScript property access: obj.ROLE_BUTTON
  const propertyMatch = value.match(/\.([A-Z_]+)$/)
  if (propertyMatch) {
    const constantName = propertyMatch[1]
    const constant = constantsRegistry.get(constantName)
    if (constant) {
      return { resolved: constant.value, constantName }
    }
  }

  return { resolved: value }
}

/**
 * Detect interactive elements that lack proper test attributes (fallback strategy)
 */
async function detectElementsWithoutTestAttributes(
  templateContent: string,
  keyGroup: string,
  groupedLocators: Record<string, Record<string, LocatorInfo>>,
  warnings: string[],
  filename: string
) {
  // Target elements that should have test attributes
  const interactiveElementPatterns = [
    // Buttons
    /<(button)[^>]*>([^<]*)<\/button>/gs,
    /<(input)[^>]*type\s*=\s*["'](button|submit|reset)["'][^>]*>/gs,
    // Input fields
    /<(input)[^>]*(?!type\s*=\s*["'](button|submit|reset)["'])[^>]*>/gs,
    /<(textarea)[^>]*>[^<]*<\/textarea>/gs,
    /<(select)[^>]*>[^<]*<\/select>/gs,
    // Links that could be interactive
    /<(a)[^>]*href[^>]*>([^<]*)<\/a>/gs,
    // Headers (important for navigation)
    /<(h[1-6])[^>]*>([^<]*)<\/h[1-6]>/gs
  ]

  for (const pattern of interactiveElementPatterns) {
    const matches = [...templateContent.matchAll(pattern)]

    for (const match of matches) {
      const fullElement = match[0]
      const elementType = match[1]
      const textContent = match[2] || ''

      // Check if this element already has test attributes
      const hasTestAttribute = robustAttributes.some(
        (attr) =>
          fullElement.includes(`${attr}=`) ||
          fullElement.includes(`:${attr}=`) ||
          fullElement.includes(`v-bind:${attr}=`)
      )

      // Skip if already has test attributes
      if (hasTestAttribute) continue

      // Extract basic attributes for XPath generation
      const context = analyzeElementContext(templateContent, match.index || 0)
      const { element, attributes } = extractElementWithAttributesEnhanced(
        match,
        templateContent
      )

      // Generate XPath as fallback locator
      const xpath = generateFallbackXPath(
        element,
        attributes,
        textContent.trim()
      )

      if (!xpath) continue

      // Detect Vue directives
      const { directives, isDynamic, isConditional } = detectVueDirectives(
        attributes.fullAttributeString || ''
      )

      // Create fallback locator entry
      const key = generateEnhancedKey(xpath, 'xpath', isDynamic, isConditional)

      // Check if we already found this xpath
      if (groupedLocators[keyGroup]?.[key]) continue

      // Use classifyElement to properly determine robustness instead of hardcoding as fragile
      const xpathAttributes = { ...attributes, xpath: xpath }
      const { robustness, testRelevance } = classifyElement(
        element,
        xpathAttributes
      )

      const locatorInfo: LocatorInfo = {
        selector: xpath,
        type: 'xpath',
        element,
        rawValue: xpath,
        robustness,
        testRelevance,
        warning:
          robustness === 'fragile'
            ? `FRAGILE LOCATOR WARNING: ${element}${
              textContent ? ` with text="${textContent}"` : ''
            } lacks stable test attributes. Consider adding data-testid="${generateSuggestedTestId(
              element,
              textContent
            )}" | Alternative: data-test-id="${generateSuggestedTestId(
              element,
              textContent
            )}" | Alternative: data-test="${generateSuggestedTestId(
              element,
              textContent
            )}" | Or add a unique id="${generateSuggestedTestId(
              element,
              textContent
            )}"`
            : undefined,
        isDynamic,
        isConditional,
        vueDirectives: directives,
        customComponent: isCustomComponent(element),
        parentContext: context.parentContext
      }

      groupedLocators[keyGroup] = groupedLocators[keyGroup] || {}
      groupedLocators[keyGroup][key] = locatorInfo

      // Log discovery with proper status icon
      const statusIcon = robustness === 'robust' ? '✅' : '🔸'
      const dynamicFlag = isDynamic ? ' [DYNAMIC]' : ''
      const conditionalFlag = isConditional ? ' [CONDITIONAL]' : ''
      const contextFlag = context.parentContext
        ? ` (${context.parentContext})`
        : ''

      console.log(
        `      ${statusIcon} ${key}: xpath="${xpath.substring(
          0,
          60
        )}..."${dynamicFlag}${conditionalFlag}${contextFlag}`
      )
    }
  }
}

/**
 * Generate fallback XPath for elements without test attributes
 */
function generateFallbackXPath(
  element: string,
  attributes: Record<string, string>,
  textContent: string
): string | null {
  const parts: string[] = []

  // Start with element type
  parts.push(`//${element}`)

  // Add attribute-based conditions (prioritize stable attributes)
  const conditions: string[] = []

  // Use class if present and not too generic
  if (
    attributes.class &&
    !attributes.class.includes('{') &&
    attributes.class.split(' ').length <= 3
  ) {
    const classes = attributes.class.split(' ').filter((cls) => cls.length > 2)
    if (classes.length > 0) {
      conditions.push(`contains(@class,'${classes[0]}')`)
    }
  }

  // Use text content for buttons, links, headers
  if (
    textContent &&
    ['button', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(element)
  ) {
    const cleanText = textContent.replace(/['"]/g, '').substring(0, 30)
    if (cleanText) {
      conditions.push(`contains(text(),'${cleanText}')`)
    }
  }

  // Use type for inputs
  if (element === 'input' && attributes.type) {
    conditions.push(`@type='${attributes.type}'`)
  }

  // Use placeholder for inputs/textareas
  if (attributes.placeholder && !attributes.placeholder.includes('{')) {
    conditions.push(`@placeholder='${attributes.placeholder}'`)
  }

  // Use href for links (but only if it's not dynamic)
  if (
    element === 'a' &&
    attributes.href &&
    !attributes.href.includes('{') &&
    !attributes.href.includes('$')
  ) {
    conditions.push(`@href='${attributes.href}'`)
  }

  // Return null if no meaningful conditions found
  if (conditions.length === 0) {
    return null
  }

  // Combine conditions
  if (conditions.length === 1) {
    return `${parts[0]}[${conditions[0]}]`
  } else {
    return `${parts[0]}[${conditions.join(' and ')}]`
  }
}

/**
 * Generate suggested test ID based on element and content
 */
function generateSuggestedTestId(element: string, textContent: string): string {
  // Clean and normalize text content
  const cleanText = textContent
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 20)

  if (cleanText) {
    return `${cleanText}-${element}`
  }

  // Fallback based on element type
  const elementSuggestions = {
    button: 'button',
    input: 'input',
    textarea: 'textarea',
    select: 'select',
    a: 'link',
    h1: 'heading',
    h2: 'heading',
    h3: 'heading',
    h4: 'heading',
    h5: 'heading',
    h6: 'heading'
  }

  return (
    elementSuggestions[element as keyof typeof elementSuggestions] || element
  )
}

/**
 * Get test relevance for element type
 */
function getElementTestRelevance(element: string): 'high' | 'medium' | 'low' {
  const highRelevance = ['button', 'input', 'textarea', 'select', 'a']
  const mediumRelevance = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'form']

  if (highRelevance.includes(element)) return 'high'
  if (mediumRelevance.includes(element)) return 'medium'
  return 'low'
}

/**
 * Enhanced template parsing with better multi-line and Vue directive support
 */
async function processTemplateContent(
  templateContent: string,
  keyGroup: string,
  groupedLocators: Record<string, Record<string, LocatorInfo>>,
  warnings: string[],
  customComponentWarnings: CustomComponentWarning[],
  filename: string
) {
  // Debug: Show what we're working with
  console.log(
    `   🔍 Processing template content (${templateContent.length} chars)...`
  )

  // Check for custom components first
  const customComponentMatches = templateContent.matchAll(
    /<([A-Z][a-zA-Z0-9-]*)[^>]*>/g
  )
  for (const match of customComponentMatches) {
    const componentName = match[1]
    const context = analyzeElementContext(templateContent, match.index || 0)

    customComponentWarnings.push({
      file: filename,
      component: componentName,
      line: context.lineNumber,
      message: `Custom component <${componentName}> at line ${context.lineNumber} — locator not extracted. Review component source or ensure it passes data-testid down to root element.`
    })
  }

  // Enhanced: Pre-process template to handle multi-line elements and normalize whitespace
  const normalizedTemplate = normalizeTemplateForParsing(templateContent)

  // Debug: Show a sample of the normalized content
  console.log(
    `   🔧 Normalized template (${
      normalizedTemplate.length
    } chars, sample): ${normalizedTemplate.substring(0, 200)}...`
  )

  // Enhanced locator patterns with better regex support
  const locatorPatterns = [
    // Static data-testid patterns - more flexible
    {
      pattern: /data-testid\s*=\s*["']([^"']+)["']/gis,
      type: 'data-testid' as const,
      selector: (val: string) => `[data-testid="${val}"]`
    },
    // Vue dynamic data-testid patterns - more flexible
    {
      pattern: /:data-testid\s*=\s*["']([^"']+)["']/gis,
      type: 'data-testid' as const,
      selector: (val: string) => `[data-testid="${val}"]`,
      isDynamic: true
    },
    {
      pattern: /v-bind:data-testid\s*=\s*["']([^"']+)["']/gis,
      type: 'data-testid' as const,
      selector: (val: string) => `[data-testid="${val}"]`,
      isDynamic: true
    },
    // Template literal data-testid patterns - backticks
    {
      pattern: /:data-testid\s*=\s*[`]([^`]*)[`]/gis,
      type: 'data-testid' as const,
      selector: (val: string) =>
        val.includes('${')
          ? `[data-testid*="${extractTemplateLiteralBase(val)}"]`
          : `[data-testid="${val}"]`,
      isDynamic: true
    },
    // data-test-id patterns
    {
      pattern: /data-test-id\s*=\s*["']([^"']+)["']/gis,
      type: 'data-test-id' as const,
      selector: (val: string) => `[data-test-id="${val}"]`
    },
    {
      pattern: /:data-test-id\s*=\s*["']([^"']+)["']/gis,
      type: 'data-test-id' as const,
      selector: (val: string) => `[data-test-id="${val}"]`,
      isDynamic: true
    },
    // data-test patterns
    {
      pattern: /data-test\s*=\s*["']([^"']+)["']/gis,
      type: 'data-test' as const,
      selector: (val: string) => `[data-test="${val}"]`
    },
    {
      pattern: /:data-test\s*=\s*["']([^"']+)["']/gis,
      type: 'data-test' as const,
      selector: (val: string) => `[data-test="${val}"]`,
      isDynamic: true
    },
    // id patterns - enhanced
    {
      pattern: /\bid\s*=\s*["']([^"']+)["']/gis,
      type: 'id' as const,
      selector: (val: string) => `#${val}`
    },
    {
      pattern: /:id\s*=\s*["']([^"']+)["']/gis,
      type: 'id' as const,
      selector: (val: string) => `#${val}`,
      isDynamic: true
    },
    // Template literal id patterns
    {
      pattern: /:id\s*=\s*[`]([^`]*)[`]/gis,
      type: 'id' as const,
      selector: (val: string) =>
        val.includes('${')
          ? `[id*="${extractTemplateLiteralBase(val)}"]`
          : `#${val}`,
      isDynamic: true
    },
    // class patterns - enhanced
    {
      pattern: /\bclass\s*=\s*["']([^"']+)["']/gis,
      type: 'class' as const,
      selector: (val: string) => {
        // Skip complex Vue expressions
        if (
          val.includes('[') ||
          val.includes('{{') ||
          val.includes('${') ||
          val.includes('{')
        ) {
          return null
        }
        return `.${val.split(/\s+/).join('.')}`
      }
    },
    // name patterns - enhanced
    {
      pattern: /\bname\s*=\s*["']([^"']+)["']/gis,
      type: 'name' as const,
      selector: (val: string) => `[name="${val}"]`
    },
    {
      pattern: /:name\s*=\s*["']([^"']+)["']/gis,
      type: 'name' as const,
      selector: (val: string) => `[name="${val}"]`,
      isDynamic: true
    },
    // Template literal name patterns
    {
      pattern: /:name\s*=\s*[`]([^`]*)[`]/gis,
      type: 'name' as const,
      selector: (val: string) =>
        val.includes('${')
          ? `[name*="${extractTemplateLiteralBase(val)}"]`
          : `[name="${val}"]`,
      isDynamic: true
    },
    // placeholder patterns - enhanced
    {
      pattern: /placeholder\s*=\s*["']([^"']+)["']/gis,
      type: 'placeholder' as const,
      selector: (val: string) => `[placeholder="${val}"]`
    },
    {
      pattern: /:placeholder\s*=\s*["']([^"']+)["']/gis,
      type: 'placeholder' as const,
      selector: (val: string) => `[placeholder="${val}"]`,
      isDynamic: true
    },
    // aria-label patterns - enhanced
    {
      pattern: /aria-label\s*=\s*["']([^"']+)["']/gis,
      type: 'aria-label' as const,
      selector: (val: string) => `[aria-label="${val}"]`
    },
    {
      pattern: /:aria-label\s*=\s*["']([^"']+)["']/gis,
      type: 'aria-label' as const,
      selector: (val: string) => `[aria-label="${val}"]`,
      isDynamic: true
    },
    // role patterns - enhanced
    {
      pattern: /\brole\s*=\s*["']([^"']+)["']/gis,
      type: 'role' as const,
      selector: (val: string) => `[role="${val}"]`
    },
    {
      pattern: /:role\s*=\s*["']([^"']+)["']/gis,
      type: 'role' as const,
      selector: (val: string) => `[role="${val}"]`,
      isDynamic: true
    },
    // xpath patterns
    {
      pattern: /data-xpath\s*=\s*["']([^"']+)["']/gis,
      type: 'xpath' as const,
      selector: (val: string) => val
    },
    {
      pattern: /xpath\s*=\s*["']([^"']+)["']/gis,
      type: 'xpath' as const,
      selector: (val: string) => val
    }
  ]

  let totalMatches = 0

  for (const {
    pattern,
    type,
    selector,
    isDynamic: patternIsDynamic
  } of locatorPatterns) {
    const matches = [...normalizedTemplate.matchAll(pattern)]
    totalMatches += matches.length

    // Debug: Show what patterns are matching
    if (matches.length > 0) {
      console.log(`   🎯 Pattern ${type} found ${matches.length} matches`)
    }

    for (const match of matches) {
      let rawValue = match[1]
      let resolvedFromConstant: string | undefined

      // Try to resolve constant references
      const { resolved, constantName } = resolveConstantReference(rawValue)
      if (constantName) {
        resolvedFromConstant = `${constantName} → ${resolved}`
        rawValue = resolved
        console.log(
          `   🔧 Resolved constant: ${constantName} → "${resolved}" for ${type}`
        )
      }

      // Enhanced element extraction with better multi-line support
      const context = analyzeElementContext(
        normalizedTemplate,
        match.index || 0
      )
      const { element, attributes } = extractElementWithAttributesEnhanced(
        match,
        normalizedTemplate
      )

      // Add resolvedFromConstant to attributes for tracking
      if (resolvedFromConstant) {
        attributes.resolvedFromConstant = resolvedFromConstant
      }

      // CRITICAL FIX: Add the current attribute to the attributes object so classifyElement can detect it
      attributes[type] = rawValue

      // Detect Vue directives
      const { directives, isDynamic, isConditional } = detectVueDirectives(
        attributes.fullAttributeString || ''
      )

      // Mark as dynamic if it was a Vue dynamic attribute (e.g., :role)
      const finalIsDynamic = isDynamic || patternIsDynamic || false

      // Check if this is a custom component
      const customComponent = isCustomComponent(element)

      // Generate the selector
      const selectorResult = selector(rawValue)

      // Skip if selector generation failed
      if (selectorResult === null) {
        continue
      }

      // Classify the element
      const { robustness, testRelevance } = classifyElement(
        element,
        attributes
      )

      // Generate a unique key
      const key = generateEnhancedKey(
        rawValue,
        type,
        finalIsDynamic,
        isConditional
      )

      // Create warning for fragile locators
      let warning: string | undefined
      if (robustness === 'fragile') {
        warning = generateFragileWarning(element, rawValue, type)
        if (finalIsDynamic) {
          warning += ' | Element may be repeated (v-for detected)'
        }
        if (isConditional) {
          warning +=
            ' | Element may not always be present (conditional rendering detected)'
        }
      }

      // Create the locator info
      const locatorInfo: LocatorInfo = {
        selector: selectorResult,
        type,
        element,
        rawValue,
        robustness,
        testRelevance,
        warning,
        isDynamic: finalIsDynamic,
        isConditional,
        vueDirectives: directives,
        customComponent,
        parentContext: context.parentContext,
        resolvedFromConstant
      }

      groupedLocators[keyGroup] = groupedLocators[keyGroup] || {}
      groupedLocators[keyGroup][key] = locatorInfo

      // Log discovery
      const statusIcon = robustness === 'robust' ? '✅' : '🔸'
      const dynamicFlag = finalIsDynamic ? ' [DYNAMIC]' : ''
      const conditionalFlag = isConditional ? ' [CONDITIONAL]' : ''
      const componentFlag = customComponent ? ' [CUSTOM COMPONENT]' : ''
      const contextFlag = context.parentContext
        ? ` (${context.parentContext})`
        : ''

      console.log(
        `      ${statusIcon} ${key}: ${type}="${rawValue}"${dynamicFlag}${conditionalFlag}${componentFlag}${contextFlag}`
      )
    }
  }

  // Debug: Show total patterns found
  console.log(`   📊 Total attribute matches found: ${totalMatches}`)

  // Enhanced: Additional fallback detection for elements without test attributes
  await detectElementsWithoutTestAttributes(
    normalizedTemplate,
    keyGroup,
    groupedLocators,
    warnings,
    filename
  )
}
