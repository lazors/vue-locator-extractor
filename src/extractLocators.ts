import { extractLocatorsFromVue } from './scanVueTemplates';
import fs from 'fs-extra';
import path from 'path';
import YAML from 'yaml';

const vueProjectPath = process.argv[2] || './test-vue-src';

(async () => {
  try {
    const absPath = path.resolve(vueProjectPath);
    const groupedLocators = await extractLocatorsFromVue(absPath);

    const tsLines = Object.entries(groupedLocators).map(([file, locators]) => {
      const inner = Object.entries(locators).map(([k, v]) => `    ${k}: '${v}'`).join(',\n');
      return `  // File: ${file}\n  '${file}': {\n${inner}\n  }`;
    });

    const tsOutput = `// Auto-generated locator map\nexport const locatorMap = {\n${tsLines.join(',\n')}\n};\n`;
    const jsonOutput = JSON.stringify(groupedLocators, null, 2);
    const yamlOutput = YAML.stringify(groupedLocators);

    await fs.ensureDir('./output');
    await fs.outputFile('./output/locatorMap.ts', tsOutput);
    await fs.outputFile('./output/locatorMap.json', jsonOutput);
    await fs.outputFile('./output/locatorMap.yaml', yamlOutput);

    console.log(`✅ Locators saved as:\n - output/locatorMap.ts\n - output/locatorMap.json\n - output/locatorMap.yaml (source: ${absPath})`);
  } catch (err) {
    console.error('❌ Failed to extract locators:', err);
  }
})();