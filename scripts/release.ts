import fs from 'node:fs';
import path from 'node:path';
import semver from 'semver';
import shell from 'shelljs';
import { simpleGit } from 'simple-git';
import {
  CACHE_COLLECTION_PATH,
  COLLECTION_NAME,
  COLLECTION_PATH,
  IExtension,
  readJson,
  ROOT,
  writeJson,
} from './utils';

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

function getGitMessage(pkg) {
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

  const messages: string[] = [];

  if (addList.length) {
    messages.push(`Add:\n${addList.join('\n')}`);
  }
  if (updateList.length) {
    messages.push(`Update:\n${updateList.join('\n')}`);
  }
  if (removeList.length) {
    messages.push(`Remove:\n${removeList.join('\n')}`);
  }

  return `chore: release v${pkg.version}\n\n` + messages.join('\n');
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
  const sv = semver.parse(pkg.version)!;
  pkg.version = sv.inc('patch').version;
  writeJson(path.join(ROOT, 'package.json'), pkg);

  // publish
  const result = shell.exec(`npm publish`);
  if (result.code !== 0) {
    return;
  }

  await git.add('.');
  await git.commit(getGitMessage(pkg));
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
