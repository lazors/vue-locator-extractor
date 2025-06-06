import { extractLocatorsFromVue } from '../scanVueTemplates'
import path from 'path';

(async () => {
  const abs = path.resolve('./test-vue-src')
  const result = await extractLocatorsFromVue(abs)
  console.log('Test run result:', JSON.stringify(result, null, 2))
})()
