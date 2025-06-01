import * as fs from 'fs';
import * as path from 'path';

/**
 * Ensures a directory exists, creating it if necessary
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Reads a file and returns its content as a string
 */
export function readFileContent(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error}`);
  }
}

/**
 * Writes content to a file
 */
export function writeFileContent(filePath: string, content: string): void {
  try {
    ensureDirectoryExists(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error}`);
  }
}

/**
 * Converts a file path to a component name
 */
export function pathToComponentName(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * Sanitizes a string to be used as a JavaScript object key
 */
export function sanitizeKey(key: string): string {
  return key
    .replace(/[^a-zA-Z0-9_$]/g, '_')
    .replace(/^[0-9]/, '_$&')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Extracts the attribute value from a string
 */
export function extractAttributeValue(attributeString: string): string | null {
  const match = attributeString.match(/=["']([^"']+)["']/);
  return match ? match[1] : null;
}

/**
 * Generates a locator name from an attribute value
 */
export function generateLocatorName(
  attributeValue: string,
  elementTag?: string
): string {
  let name = attributeValue
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');

  if (elementTag && !name.toLowerCase().includes(elementTag.toLowerCase())) {
    name = `${name}_${elementTag}`;
  }

  return name || 'element';
}
