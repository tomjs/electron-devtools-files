import fs from 'node:fs';
import path from 'node:path';
import download from 'download';
import { HttpsProxyAgent } from 'hpagent';
import unzip from '@tomjs/unzip-crx';

export const ROOT = path.join(__dirname, '../');

export const EXTENSION_PATH = path.join(ROOT, 'extensions');

export interface IExtension {
  id: string;
  name: string;
  version: string;
  manifest_version: number;
  minimum_chrome_version: string;
}

export function readJson(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(e);
  }

  return;
}

export function writeJson(filePath: string, data: any) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', { encoding: 'utf8' });
}

/**
 * Synchronously creates a directory, like 'mkdir -p'
 * @param path directory path
 */
export function mkdirp(path: string, empty?: boolean) {
  if (fs.existsSync(path)) {
    if (empty) {
      rmSync(path);
    }
    return;
  }

  fs.mkdirSync(path, { recursive: true });
}

/**
 * Synchronously removes files and directories
 * @param path file or directory path
 */
export function rmSync(path: string) {
  if (!fs.existsSync(path)) {
    return;
  }
  fs.rmSync(path, { recursive: true });
}

/**
 * Download extension options
 */
export interface DownloadOptions {
  force?: boolean;
  unzip?: boolean;
  attempts?: number;
  outPath: string;
}

/**
 * download chrome extension
 * @param extensionId extension id
 * @param options download extension options
 * @returns
 */
export async function downloadChromeExtension(
  extensionId: string,
  options?: DownloadOptions,
): Promise<string> {
  const opts = Object.assign({ attempts: 5, unzip: true }, options);
  const attempts = opts.attempts || 5;
  const outPath = opts.outPath;

  mkdirp(outPath);

  const extensionFolder = path.join(outPath, extensionId);

  return new Promise((resolve, reject) => {
    const fileUrl = `https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx2,crx3&x=id%3D${extensionId}%26uc&prodversion=32`;
    const filePath = path.resolve(`${extensionFolder}.crx`);

    if (fs.existsSync(filePath) && !opts.force) {
      return resolve(filePath);
    }

    download(fileUrl, {
      agent: process.env.HTTPS_PROXY
        ? new HttpsProxyAgent({ proxy: process.env.HTTPS_PROXY })
        : undefined,
    })
      .then(binary => {
        fs.writeFileSync(filePath, binary);

        if (!opts.unzip) {
          return resolve(filePath);
        }

        mkdirp(extensionFolder, true);

        unzip(filePath, extensionFolder)
          .then(() => {
            resolve(extensionFolder);
          })
          .catch((err: Error) => {
            if (!fs.existsSync(path.resolve(extensionFolder, 'manifest.json'))) {
              return reject(err);
            }
          });
      })
      .catch(err => {
        console.log(`Failed to fetch extension, trying ${attempts - 1} more times`);
        if (attempts <= 1) {
          return reject(err);
        }
        setTimeout(() => {
          downloadChromeExtension(extensionId, {
            ...opts,
            attempts: attempts - 1,
          })
            .then(resolve)
            .catch(reject);
        }, 200);
      });
  });
}
