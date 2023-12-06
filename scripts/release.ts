import fs from 'node:fs';
import path from 'node:path';
import shell from 'shelljs';
import { simpleGit } from 'simple-git';
import pkg from '../package.json';
import {
  CACHE_COLLECTION_PATH,
  COLLECTION_NAME,
  COLLECTION_PATH,
  IExtension,
  readJson,
  ROOT,
  writeJson,
} from './utils';

// patch version number +1
function patchVersion(version: string) {
  const versions = version.split('.');
  const i = versions.length - 1;
  versions[i] = `${Number(versions[i]) + 1}`;
  return versions.join('.');
}

function arrayToObject(arr: IExtension[]): Record<string, IExtension> {
  if (!Array.isArray(arr)) {
    return {};
  }
  const obj = {};
  arr.forEach(s => {
    obj[s.id] = s;
  });

  return obj;
}

function getGitMessage() {
  const lastCollections: IExtension[] = readJson(CACHE_COLLECTION_PATH) || [];
  const collections: IExtension[] = readJson(COLLECTION_PATH) || [];

  const lastObj = arrayToObject(lastCollections);
  const obj = arrayToObject(collections);

  const addList: string[] = [];
  const updateList: string[] = [];
  const removeList: string[] = [];

  lastCollections.forEach(item => {
    if (!obj[item.id]) {
      removeList.push(`* ${item.name}`);
    }
  });

  collections.forEach(item => {
    const lastItem = lastObj[item.id];
    if (!lastItem) {
      addList.push(`* ${item.name}@${item.version}`);
    } else if (item.version !== lastItem.version) {
      updateList.push(`* ${item.name}@${lastItem.version}=>${item.version}`);
    }
  });

  const changes: string[] = [];
  const messages: string[] = [];

  if (addList.length) {
    changes.push(`add ${addList.length}`);
    messages.push(`Add:\n${addList.join('\n')}`);
  }
  if (updateList.length) {
    changes.push(`update ${updateList.length}`);
    messages.push(`Update:\n${updateList.join('\n')}`);
  }
  if (removeList.length) {
    changes.push(`remove ${removeList.length}`);
    messages.push(`Remove:\n${removeList.join('\n')}`);
  }

  const header = !changes.length ? 'No Extension Change' : `Extensions ${changes.join(' ')}\n\n`;
  return `chore: release v${pkg.version}, ${header}` + messages.join('\n');
}

async function run() {
  // check git status
  const git = simpleGit(ROOT);
  const status = await git.status();

  // console.log('status:', status);

  if (!Array.isArray(status.modified) || !status.modified.find(s => s.includes(COLLECTION_NAME))) {
    console.log('No new version of the extensions can be updated');
    return;
  }

  // patch version +1
  const pkg = readJson(path.join(ROOT, 'package.json'));
  pkg.version = patchVersion(pkg.version);
  writeJson(path.join(ROOT, 'package.json'), pkg);

  // publish
  const result = shell.exec(`npm publish`);
  if (result.code !== 0) {
    return;
  }

  await git.add('.');
  await git.commit(getGitMessage());
  await git.tag([`v${pkg.version}`]);

  if (process.env.GITHUB_ENV) {
    fs.appendFileSync(process.env.GITHUB_ENV, 'ELECTRON_EXTENSION_RELEASE=1', 'utf8');
  }
}

run()
  .then(() => {
    console.log('Done');
  })
  .catch(err => {
    console.error(err);
  })
  .finally(() => {
    process.exit(0);
  });
