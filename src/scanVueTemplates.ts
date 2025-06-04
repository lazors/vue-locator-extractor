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

// Robust attributes in priority order
const robustAttributes = ['data-testid', 'data-test', 'id', 'name'];

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
  // Scan only Vue files for Page Object Model locator extraction
  const templateFiles = await fg(['**/*.vue'], {
    cwd: baseDir,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.output/**',
      '**/build/**',
    ],
  });

  const groupedLocators: Record<string, Record<string, LocatorInfo>> = {};
  const warnings: string[] = [];

  for (const file of templateFiles) {
    const relative = path.relative(baseDir, file);
    const keyGroup = relative.replace(/\\/g, '/');
    const content = await fs.readFile(file, 'utf-8');

    // Extract the <template> section from Vue files
    const templateMatch = content.match(
      /<template[^>]*>([\s\S]*?)<\/template>/
    );
    if (!templateMatch) {
      // Skip Vue files without <template> sections
      continue;
    }

    const templateContent = templateMatch[1];

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

    // Extract element context for better POM documentation
    const extractElementWithAttributes = (
      match: RegExpMatchArray,
      content: string
    ): { element: string; attributes: Record<string, string> } => {
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

      // Parse attributes
      const attributes: Record<string, string> = {};
      const attrMatches = attributeString.matchAll(/(\w+(?:-\w+)*)="([^"]*)"/g);
      for (const attrMatch of attrMatches) {
        attributes[attrMatch[1]] = attrMatch[2];
      }

      return { element, attributes };
    };

    for (const { pattern, type, selector } of locatorPatterns) {
      const matches = [...templateContent.matchAll(pattern)];

      for (const match of matches) {
        const rawValue = match[1];
        const { element, attributes } = extractElementWithAttributes(
          match,
          templateContent
        );

        // Generate the selector
        const selectorResult = selector(rawValue);

        // Skip if selector generation failed (e.g., complex expressions)
        if (selectorResult === null) {
          continue;
        }

        // Classify element
        const { robustness, testRelevance } = classifyElement(
          element,
          attributes
        );

        // Skip low relevance elements (decorative)
        if (testRelevance === 'low') {
          continue;
        }

        // Generate warning for fragile locators
        let warning: string | undefined;
        if (robustness === 'fragile' && testRelevance === 'high') {
          warning = generateFragileWarning(element, rawValue, type);
          warnings.push(`${keyGroup}: ${warning}`);
        }

        // Generate clean key for POM usage
        let key = rawValue
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');

        // Handle special cases for better POM naming
        if (type === 'class') {
          // For classes, use a more descriptive key
          key = `class_${key}`;
        } else if (type === 'role') {
          key = `${rawValue.toLowerCase()}_role`;
        } else if (type === 'placeholder') {
          key = `${key}_input`;
        } else if (type === 'xpath') {
          key = `xpath_${key}`;
        }

        // Ensure unique keys within the same file
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
        };
      }
    }
  }

  return { groupedLocators, warnings };
}
