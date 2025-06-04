import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';

interface LocatorInfo {
  selector: string;
  type:
    | 'data-testid'
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
}

interface CustomComponentWarning {
  file: string;
  component: string;
  line: number;
  message: string;
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
  'li',
]);

// Custom Vue component patterns
const customComponentPattern = /^[A-Z][a-zA-Z0-9]*$/;

// Robust attributes in priority order
const robustAttributes = ['data-testid', 'data-test', 'id', 'name'];

// Vue directives that make elements dynamic or conditional
const dynamicDirectives = ['v-for', 'v-if', 'v-else-if', 'v-show', 'v-model'];

function detectVueDirectives(attributeString: string): {
  directives: string[];
  isDynamic: boolean;
  isConditional: boolean;
} {
  const directives: string[] = [];
  let isDynamic = false;
  let isConditional = false;

  // Check for Vue directives
  const directiveMatches = attributeString.matchAll(/(v-[\w-]+|@\w+|:\w+)/g);
  for (const match of directiveMatches) {
    directives.push(match[1]);

    if (['v-for'].includes(match[1])) {
      isDynamic = true;
    }

    if (['v-if', 'v-else-if', 'v-show'].includes(match[1])) {
      isConditional = true;
    }
  }

  return { directives, isDynamic, isConditional };
}

function isCustomComponent(tagName: string): boolean {
  return customComponentPattern.test(tagName) || tagName.includes('-');
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
  const beforeMatch = content.substring(0, matchIndex);
  const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;

  // Find parent context by looking backwards for containing elements
  let searchIndex = matchIndex;
  const ancestorDirectives: string[] = [];
  let parentContext = '';
  let depth = 0;

  while (searchIndex > 0) {
    const char = content[searchIndex];
    if (char === '>') depth++;
    if (char === '<') {
      depth--;
      if (depth < 0) {
        // Found a parent tag
        const tagStart = searchIndex;
        let tagEnd = searchIndex;
        while (tagEnd < content.length && content[tagEnd] !== '>') {
          tagEnd++;
        }

        const parentTag = content.substring(tagStart, tagEnd + 1);
        const tagMatch = parentTag.match(/<(\w+)([^>]*)/);

        if (tagMatch) {
          const tagName = tagMatch[1];
          const attributes = tagMatch[2];

          // Check for Vue directives in parent
          const directiveMatches = attributes.matchAll(/(v-[\w-]+)/g);
          for (const match of directiveMatches) {
            ancestorDirectives.push(match[1]);
          }

          if (dynamicDirectives.some((dir) => attributes.includes(dir))) {
            parentContext = `inside ${tagName} with dynamic directives`;
            break;
          }
        }
      }
    }
    searchIndex--;
  }

  return { parentContext, ancestorDirectives, lineNumber };
}

function classifyElement(
  element: string,
  attributes: Record<string, string>
): {
  robustness: 'robust' | 'fragile';
  testRelevance: 'high' | 'medium' | 'low';
} {
  // Check if element has robust attributes
  const hasRobustAttribute = robustAttributes.some((attr) => attributes[attr]);

  // Special case for XPath locators targeting interactive elements
  let robustness: 'robust' | 'fragile' = hasRobustAttribute
    ? 'robust'
    : 'fragile';

  // Check for robust patterns in XPath and class attributes
  if (!hasRobustAttribute) {
    const xpathValue = attributes['data-xpath'] || attributes['xpath'];
    const classValue = attributes['class'] || '';

    if (xpathValue) {
      // XPath targeting input, button, or btn elements is considered robust
      const robustXPathPatterns = [
        /\/\/input/i, // //input[@name='search']
        /\/\/button/i, // //button[contains(@class,'submit')]
        /\[@.*btn.*\]/i, // //div[@class='submit-btn']
        /button\[/i, // //div//button[text()='Submit']
        /input\[/i, // //form//input[@type='text']
        /btn/i, // Any XPath containing 'btn' (e.g., //div[contains(@class,'submit-btn')])
      ];

      if (robustXPathPatterns.some((pattern) => pattern.test(xpathValue))) {
        robustness = 'robust';
      }
    }

    // Check for robust patterns in class attributes (btn-related classes)
    if (classValue && /btn/i.test(classValue)) {
      robustness = 'robust';
    }
  }

  // Determine test relevance
  let testRelevance: 'high' | 'medium' | 'low' = 'low';

  if (testRelevantElements.has(element)) {
    // Interactive elements are high relevance
    if (
      ['button', 'input', 'textarea', 'select', 'a', 'form'].includes(element)
    ) {
      testRelevance = 'high';
    }
    // Headers and structural elements are medium relevance
    else if (
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr'].includes(element)
    ) {
      testRelevance = 'medium';
    }
    // Other elements are medium relevance
    else {
      testRelevance = 'medium';
    }
  }

  // Check for decorative indicators (lower relevance)
  const classValue = attributes['class'] || '';
  const decorativeClasses = [
    'icon',
    'decoration',
    'separator',
    'spacer',
    'divider',
  ];
  if (decorativeClasses.some((cls) => classValue.includes(cls))) {
    testRelevance = 'low';
  }

  return { robustness, testRelevance };
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
    `Alternative: data-test="${rawValue
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}"`,
    `Or add a unique id="${rawValue
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}"`,
  ];

  return `FRAGILE LOCATOR WARNING: ${element} with ${type}="${rawValue}" lacks stable test attributes. ${suggestions.join(
    ' | '
  )}`;
}

export async function extractLocatorsFromVue(baseDir: string) {
  // Scan Vue files and also JS/TS files that might generate elements
  const vueFiles = await fg(['**/*.vue'], {
    cwd: baseDir,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.output/**',
      '**/build/**',
    ],
  });

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
      '**/__tests__/**',
    ],
  });

  console.log(
    `🔍 Found ${vueFiles.length} Vue files and ${jsFiles.length} JS/TS files:`
  );
  [...vueFiles, ...jsFiles].forEach((file) => {
    const relative = path.relative(baseDir, file);
    console.log(`   📄 ${relative}`);
  });

  const groupedLocators: Record<string, Record<string, LocatorInfo>> = {};
  const warnings: string[] = [];
  const customComponentWarnings: CustomComponentWarning[] = [];

  // Process Vue files
  for (const file of vueFiles) {
    const relative = path.relative(baseDir, file);
    const keyGroup = relative.replace(/\\/g, '/');
    const content = await fs.readFile(file, 'utf-8');

    console.log(`\n🔍 Processing Vue file: ${relative}`);

    // Extract the <template> section from Vue files
    const templateMatch = content.match(
      /<template[^>]*>([\s\S]*?)<\/template>/
    );
    if (!templateMatch) {
      console.log(`   ⚠️  No <template> section found, skipping`);
      continue;
    }

    const templateContent = templateMatch[1];
    console.log(
      `   ✅ Found <template> section (${templateContent.length} chars)`
    );

    await processTemplateContent(
      templateContent,
      keyGroup,
      groupedLocators,
      warnings,
      customComponentWarnings,
      relative
    );
  }

  // Process JS/TS files for createElement or template strings
  for (const file of jsFiles) {
    const relative = path.relative(baseDir, file);
    const keyGroup = `${relative.replace(/\\/g, '/')} (JS/TS)`;
    const content = await fs.readFile(file, 'utf-8');

    console.log(`\n🔍 Processing JS/TS file: ${relative}`);

    await processJavaScriptContent(
      content,
      keyGroup,
      groupedLocators,
      warnings,
      relative
    );
  }

  return { groupedLocators, warnings, customComponentWarnings };
}

async function processTemplateContent(
  templateContent: string,
  keyGroup: string,
  groupedLocators: Record<string, Record<string, LocatorInfo>>,
  warnings: string[],
  customComponentWarnings: CustomComponentWarning[],
  filename: string
) {
  // Check for custom components first
  const customComponentMatches = templateContent.matchAll(
    /<([A-Z][a-zA-Z0-9-]*)[^>]*>/g
  );
  for (const match of customComponentMatches) {
    const componentName = match[1];
    const context = analyzeElementContext(templateContent, match.index || 0);

    customComponentWarnings.push({
      file: filename,
      component: componentName,
      line: context.lineNumber,
      message: `Custom component <${componentName}> at line ${context.lineNumber} — locator not extracted. Review component source or ensure it passes data-testid down to root element.`,
    });
  }

  // Extract various locator patterns for Page Object Model
  const locatorPatterns = [
    // data-testid (preferred for testing)
    {
      pattern: /data-testid="([^"]+)"/g,
      type: 'data-testid' as const,
      selector: (val: string) => `[data-testid="${val}"]`,
    },
    // data-test (alternative testing attribute)
    {
      pattern: /data-test="([^"]+)"/g,
      type: 'data-test' as const,
      selector: (val: string) => `[data-test="${val}"]`,
    },
    // id attributes
    {
      pattern: /id="([^"]+)"/g,
      type: 'id' as const,
      selector: (val: string) => `#${val}`,
    },
    // class attributes (extract individual classes)
    {
      pattern: /class="([^"]+)"/g,
      type: 'class' as const,
      selector: (val: string) => {
        // Sanitize complex Vue expressions and dynamic class bindings
        if (val.includes('[') || val.includes('{{') || val.includes('${')) {
          // Skip complex expressions that can't be converted to valid CSS selectors
          return null;
        }
        return `.${val.split(/\s+/).join('.')}`;
      },
    },
    // name attributes (for form elements)
    {
      pattern: /name="([^"]+)"/g,
      type: 'name' as const,
      selector: (val: string) => `[name="${val}"]`,
    },
    // placeholder text
    {
      pattern: /placeholder="([^"]+)"/g,
      type: 'placeholder' as const,
      selector: (val: string) => `[placeholder="${val}"]`,
    },
    // aria-label for accessibility
    {
      pattern: /aria-label="([^"]+)"/g,
      type: 'aria-label' as const,
      selector: (val: string) => `[aria-label="${val}"]`,
    },
    // role attributes
    {
      pattern: /role="([^"]+)"/g,
      type: 'role' as const,
      selector: (val: string) => `[role="${val}"]`,
    },
    // xpath attributes (custom XPath expressions)
    {
      pattern: /data-xpath="([^"]+)"/g,
      type: 'xpath' as const,
      selector: (val: string) => val,
    },
    // Alternative xpath attribute syntax
    {
      pattern: /xpath="([^"]+)"/g,
      type: 'xpath' as const,
      selector: (val: string) => val,
    },
  ];

  for (const { pattern, type, selector } of locatorPatterns) {
    const matches = [...templateContent.matchAll(pattern)];

    for (const match of matches) {
      const rawValue = match[1];
      const context = analyzeElementContext(templateContent, match.index || 0);
      const { element, attributes } = extractElementWithAttributes(
        match,
        templateContent
      );

      // Detect Vue directives
      const { directives, isDynamic, isConditional } = detectVueDirectives(
        attributes.fullAttributeString || ''
      );

      // Check if this is a custom component
      const customComponent = isCustomComponent(element);

      // Generate the selector
      const selectorResult = selector(rawValue);

      // Skip if selector generation failed
      if (selectorResult === null) {
        continue;
      }

      // Classify element
      const { robustness, testRelevance } = classifyElement(
        element,
        attributes
      );

      // Skip low relevance elements unless they're in dynamic contexts
      if (testRelevance === 'low' && !isDynamic && !isConditional) {
        continue;
      }

      // Generate enhanced warnings
      let warning: string | undefined;
      if (robustness === 'fragile' && testRelevance === 'high') {
        warning = generateFragileWarning(element, rawValue, type);

        // Add dynamic/conditional context to warning
        if (isDynamic) {
          warning += ` | Element may be repeated (v-for detected)`;
        }
        if (isConditional) {
          warning += ` | Element may not always be present (conditional rendering detected)`;
        }

        warnings.push(`${keyGroup}: ${warning}`);
      }

      // Generate enhanced key
      let key = generateEnhancedKey(rawValue, type, isDynamic, isConditional);

      // Ensure unique keys
      let uniqueKey = key;
      let counter = 1;
      while (groupedLocators[keyGroup]?.[uniqueKey]) {
        uniqueKey = `${key}_${counter}`;
        counter++;
      }

      if (!groupedLocators[keyGroup]) groupedLocators[keyGroup] = {};

      groupedLocators[keyGroup][uniqueKey] = {
        selector: selectorResult,
        type,
        element,
        rawValue,
        robustness,
        testRelevance,
        warning,
        isDynamic,
        isConditional,
        vueDirectives: directives,
        customComponent,
        parentContext: context.parentContext,
      };
    }
  }
}

async function processJavaScriptContent(
  content: string,
  keyGroup: string,
  groupedLocators: Record<string, Record<string, LocatorInfo>>,
  warnings: string[],
  filename: string
) {
  console.log(
    `   🔍 Scanning for createElement patterns and template strings...`
  );

  // Pattern for Vue h() function calls and createElement
  const createElementPatterns = [
    /h\(\s*['"`](\w+)['"`]\s*,\s*{([^}]*)}/g,
    /createElement\(\s*['"`](\w+)['"`]\s*,\s*{([^}]*)}/g,
  ];

  // Pattern for template strings with HTML
  const templateStringPatterns = [
    /`[^`]*<(\w+)[^>]*([^`]*)`/g,
    /'[^']*<(\w+)[^>]*([^']*)'|"[^"]*<(\w+)[^>]*([^"]*)"/g,
  ];

  let foundElements = 0;

  // Process createElement patterns
  for (const pattern of createElementPatterns) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      const element = match[1];
      const propsString = match[2];

      // Extract test-relevant attributes from props
      const testIdMatch = propsString.match(
        /['"`]?data-testid['"`]?\s*:\s*['"`]([^'"`]+)['"`]/
      );
      const idMatch = propsString.match(
        /['"`]?id['"`]?\s*:\s*['"`]([^'"`]+)['"`]/
      );

      if (testIdMatch || idMatch) {
        const rawValue = testIdMatch ? testIdMatch[1] : idMatch![1];
        const type = testIdMatch ? 'data-testid' : 'id';
        const selector =
          type === 'data-testid'
            ? `[data-testid="${rawValue}"]`
            : `#${rawValue}`;

        const key = generateEnhancedKey(rawValue, type as any, false, false);

        if (!groupedLocators[keyGroup]) groupedLocators[keyGroup] = {};

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
          parentContext: 'JS createElement',
        };

        foundElements++;
      }
    }
  }

  // Process template strings (simplified)
  for (const pattern of templateStringPatterns) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      const htmlContent = match[0];

      // Look for test attributes in template strings
      const testIdMatches = htmlContent.matchAll(/data-testid="([^"]+)"/g);
      for (const testIdMatch of testIdMatches) {
        const rawValue = testIdMatch[1];
        const key = generateEnhancedKey(rawValue, 'data-testid', false, false);

        if (!groupedLocators[keyGroup]) groupedLocators[keyGroup] = {};

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
          parentContext: 'JS template string',
        };

        foundElements++;
      }
    }
  }

  console.log(
    `   ${
      foundElements > 0 ? '✅' : '⚠️'
    } Found ${foundElements} test-relevant elements in JS/TS`
  );
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
    .replace(/^_+|_+$/g, '');

  // Add prefixes based on type and characteristics
  if (type === 'class') {
    key = `class_${key}`;
  } else if (type === 'role') {
    key = `${rawValue.toLowerCase()}_role`;
  } else if (type === 'placeholder') {
    key = `${key}_input`;
  } else if (type === 'xpath') {
    key = `xpath_${key}`;
  }

  // Add suffixes for dynamic/conditional elements
  if (isDynamic && isConditional) {
    key = `${key}_dynamic_conditional`;
  } else if (isDynamic) {
    key = `${key}_dynamic`;
  } else if (isConditional) {
    key = `${key}_conditional`;
  }

  return key;
}

// Enhanced element extraction function
const extractElementWithAttributes = (
  match: RegExpMatchArray,
  content: string
): {
  element: string;
  attributes: Record<string, string> & { fullAttributeString?: string };
} => {
  const matchIndex = match.index || 0;

  // Find the opening tag
  let tagStart = matchIndex;
  while (tagStart > 0 && content[tagStart] !== '<') {
    tagStart--;
  }

  let tagEnd = matchIndex;
  while (tagEnd < content.length && content[tagEnd] !== '>') {
    tagEnd++;
  }

  const tagContent = content.substring(tagStart, tagEnd + 1);
  const tagMatch = tagContent.match(/<(\w+)([^>]*)>/);

  if (!tagMatch) return { element: 'element', attributes: {} };

  const element = tagMatch[1];
  const attributeString = tagMatch[2];

  // Parse attributes (enhanced to capture Vue directives)
  const attributes: Record<string, string> & { fullAttributeString?: string } =
    {
      fullAttributeString: attributeString,
    };

  const attrMatches = attributeString.matchAll(
    /(\w+(?:-\w+)*|[@:]\w+(?:-\w+)*)="([^"]*)"/g
  );
  for (const attrMatch of attrMatches) {
    attributes[attrMatch[1]] = attrMatch[2];
  }

  // Also capture Vue directives without values
  const directiveMatches = attributeString.matchAll(
    /(v-[\w-]+|@\w+|:\w+)(?:\s|>|$)/g
  );
  for (const directiveMatch of directiveMatches) {
    attributes[directiveMatch[1]] = '';
  }

  return { element, attributes };
};
