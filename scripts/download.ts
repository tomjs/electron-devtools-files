import fs from 'node:fs';
import path from 'node:path';
import { downloadChromeExtension, EXTENSION_PATH, IExtension, readJson, writeJson } from './utils';

const extensionIds = [
  // Angular Devtools
  'ienfalfjdbdpebioblfackkekamfmbnh',
  // Apollo Client Devtools
  'jdkknkkbebbapilgoeccciglkfbmbnfm',
  // Backbone Debugger
  'bhljhndlimiafopmmhjlgfpnnchjjbhd',
  // Ember Inspector
  'bmdblncegkenkacieihfhpjfppoconhi',
  // jQuery Debugger
  'dbhhnnnpaeobfddmlalhnehgclcmjimi',
  // MobX Devtools
  'pfgnfdagidkfgccljigdamigbcnndkod',
  // Redux Devtools
  'lmhkpmbekcpmknklioeibfkpmmfibljd',
  // React Developer Devtools
  'fmkadmapgofadopljbjfkapdkoienihi',
  // Vue.js Devtools
  'nhdogjmejiglipccpnnnanhbledajbpd',
];

async function download() {
  const collectionsPath = path.join(EXTENSION_PATH, 'collections.json');
  const collections: IExtension[] = readJson(collectionsPath) || [];

  for (let i = 0; i < extensionIds.length; i++) {
    const id = extensionIds[i];

    const start = Date.now();
    console.log(`downloading ${id}`);
    await downloadChromeExtension(id, { outPath: EXTENSION_PATH, force: true, unzip: true });
    console.log(`downloaded ${id} to ${EXTENSION_PATH}, time: ${Date.now() - start}ms`);
    const manifest = readJson(path.join(EXTENSION_PATH, id, 'manifest.json')) || {};

    const item = collections.find(item => item.id === id);
    const extension = {
      id,
      name: manifest.name,
      version: manifest.version,
      manifest_version: manifest.manifest_version,
      minimum_chrome_version: manifest.minimum_chrome_version,
    };
    if (item) {
      Object.assign(item, extension);
    } else {
      collections.push(extension);
    }

    fs.rmSync(path.join(EXTENSION_PATH, id), { recursive: true, force: true });
  }

  writeJson(collectionsPath, collections);
}

download()
  .then(() => {
    console.log('download finished');
  })
  .catch(e => {
    console.error(e);
  })
  .finally(() => {
    process.exit(0);
  });
