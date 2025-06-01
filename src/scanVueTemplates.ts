import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';

export async function extractLocatorsFromVue(baseDir: string) {
  const vueFiles = await fg(['**/*.vue'], {
    cwd: baseDir,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.output/**'],
  });

  const groupedLocators: Record<string, Record<string, string>> = {};

  for (const file of vueFiles) {
    const relative = path.relative(baseDir, file);
    const keyGroup = relative.replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf-8');

    const matches = [
      ...content.matchAll(/data-testid="([^"]+)"/g),
      ...content.matchAll(/id="([^"]+)"/g),
      ...content.matchAll(/aria-label="([^"]+)"/g),
      ...content.matchAll(/role="([^"]+)"/g),
    ];

    for (const match of matches) {
      const raw = match[1];
      const key = raw
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      const value = match[0].includes('data-testid')
        ? `[data-testid="${raw}"]`
        : match[0].includes('id=')
        ? `#${raw}`
        : match[0].includes('aria-label')
        ? `[aria-label="${raw}"]`
        : `[role="${raw}"]`;

      if (!groupedLocators[keyGroup]) groupedLocators[keyGroup] = {};
      if (!groupedLocators[keyGroup][key])
        groupedLocators[keyGroup][key] = value;
    }
  }

  return groupedLocators;
}
