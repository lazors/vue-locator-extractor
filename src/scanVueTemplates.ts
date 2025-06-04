import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';

interface LocatorInfo {
  selector: string;
  type:
    | 'data-testid'
    | 'id'
    | 'class'
    | 'aria-label'
    | 'role'
    | 'name'
    | 'placeholder'
    | 'xpath';
  element?: string;
  rawValue: string;
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
    const extractElementContext = (
      match: RegExpMatchArray,
      content: string
    ): string => {
      const matchIndex = match.index || 0;
      const before = content.substring(
        Math.max(0, matchIndex - 50),
        matchIndex
      );
      const tagMatch = before.match(/<(\w+)[^>]*$/);
      return tagMatch ? tagMatch[1] : 'element';
    };

    for (const { pattern, type, selector } of locatorPatterns) {
      const matches = [...templateContent.matchAll(pattern)];

      for (const match of matches) {
        const rawValue = match[1];
        const element = extractElementContext(match, templateContent);

        // Generate the selector
        const selectorResult = selector(rawValue);

        // Skip if selector generation failed (e.g., complex expressions)
        if (selectorResult === null) {
          continue;
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
        };
      }
    }
  }

  return groupedLocators;
}
