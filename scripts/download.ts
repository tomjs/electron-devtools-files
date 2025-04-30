import fs from 'node:fs';
import path from 'node:path';
import {
  CACHE_COLLECTION_PATH,
  CACHE_PATH,
  COLLECTION_PATH,
  downloadChromeExtension,
  EXTENSION_PATH,
  IExtension,
  mkdirp,
  readJson,
  writeJson,
} from './utils';

const extensionIds = [
  // Angular Devtools
  'ienfalfjdbdpebioblfackkekamfmbnh',
  // Apollo Client Devtools
  'jdkknkkbebbapilgoeccciglkfbmbnfm',
  // Backbone Debugger
  'bhljhndlimiafopmmhjlgfpnnchjjbhd',
  // Ember Inspector
  'bmdblncegkenkacieihfhpjfppoconhi',
  // MobX Devtools
  'pfgnfdagidkfgccljigdamigbcnndkod',
  // Preact Developer Devtools
  'ilcajpmogmhpliinlbcdebhbcanbghmd',
  // React Developer Devtools
  'fmkadmapgofadopljbjfkapdkoienihi',
  // Redux Devtools
  'lmhkpmbekcpmknklioeibfkpmmfibljd',
  // Solid Devtools
  'kmcfjchnmmaeeagadbhoofajiopoceel',
  // Svelte DevTools
  'kfidecgcdjjfpeckbblhmfkhmlgecoff',
  // Vue.js Devtools
  'nhdogjmejiglipccpnnnanhbledajbpd',
  // Vue.js Devtools (beta)
  'ljjemllljcmogpfapbkkighbhhppjdbg',
  // Vue.js Devtools (v5)
  'hkddcnbhifppgmfgflgaelippbigjpjo',
  // Vue.js Devtools (v6)
  'iaajmlceplecbljialhhkmedjlpdblhp',
];

async function download() {
  const collections: IExtension[] = [];

  mkdirp(CACHE_PATH);
  if (fs.existsSync(COLLECTION_PATH)) {
    fs.copyFileSync(COLLECTION_PATH, path.join(CACHE_COLLECTION_PATH));
  }

  for (let i = 0; i < extensionIds.length; i++) {
    const id = extensionIds[i];

    const start = Date.now();
    console.log(`downloading ${id}`);
    await downloadChromeExtension(id, { outPath: EXTENSION_PATH, force: true, unzip: true });
    console.log(`downloaded ${id} to ${EXTENSION_PATH}, time: ${Date.now() - start}ms`);
    const manifest = readJson(path.join(EXTENSION_PATH, id, 'manifest.json')) || {};

    collections.push({
      id,
      name: manifest.name,
      version: manifest.version,
      manifest_version: manifest.manifest_version,
      minimum_chrome_version: manifest.minimum_chrome_version,
    });

    fs.rmSync(path.join(EXTENSION_PATH, id), { recursive: true, force: true });
  }

  writeJson(COLLECTION_PATH, collections);
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
