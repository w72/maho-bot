import vm from 'vm';
import fs from 'fs';
import path from 'path';

import glob from 'glob-promise';
import fetch from 'node-fetch';
import type { Response } from 'node-fetch';
import type { IOptions } from 'glob';

const { readFile, writeFile, access, unlink } = fs.promises;

function parseJs(script: string) {
  const context = {};
  vm.createContext(context);
  vm.runInContext(script, context);
  return context;
}

function toBase64(buffer: Buffer) {
  return `base64://${buffer.toString('base64')}`;
}

export class Asset {
  constructor(public path: string) {}

  get uri(): string {
    return `file:///${this.path}`;
  }

  get name(): string {
    return path.basename(this.path);
  }

  text(): Promise<string> {
    return readFile(this.path, 'utf8');
  }

  async js(): Promise<any> {
    const script = await this.text();
    return parseJs(script);
  }

  async json(): Promise<any> {
    const r = await this.text();
    return JSON.parse(r);
  }

  buffer(): Promise<Buffer> {
    return readFile(this.path);
  }

  glob(pattern = '*', options?: IOptions): Promise<string[]> {
    return glob(path.join(this.path, pattern), options);
  }

  async base64(): Promise<string> {
    const buffer = await readFile(this.path);
    return toBase64(buffer);
  }

  async exists(): Promise<boolean> {
    try {
      await access(this.path, fs.constants.F_OK);
      return true;
    } catch (e) {
      return false;
    }
  }

  async notExists(): Promise<boolean> {
    return !(await this.exists());
  }

  delete(): Promise<void> {
    return unlink(this.path);
  }

  save(data: string | Buffer): Promise<void> {
    return writeFile(this.path, data);
  }

  async saveIfNotExists(data: string | Buffer): Promise<void> {
    if (await this.notExists()) return await writeFile(this.path, data);
  }

  saveJson(data: string): Promise<any> {
    return writeFile(this.path, JSON.stringify(data));
  }

  async saveJsonIfNotExists(data: string): Promise<any> {
    try {
      return access(this.path, fs.constants.F_OK);
    } catch (e) {
      return await writeFile(this.path, JSON.stringify(data));
    }
  }

  async fetchText(...args: Parameters<typeof fetch>): Promise<any> {
    const r = await fetch(...args);
    const data = await r.text();
    return await writeFile(this.path, data);
  }

  async fetchTextIfNotExists(...args: Parameters<typeof fetch>): Promise<any> {
    try {
      return access(this.path, fs.constants.F_OK);
    } catch (e) {
      const r = await fetch(...args);
      const data = await r.text();
      return await writeFile(this.path, data);
    }
  }

  async fetchBinary(...args: Parameters<typeof fetch>): Promise<any> {
    const r = await fetch(...args);
    const data = await r.buffer();
    return await writeFile(this.path, data);
  }

  async fetchBinaryIfNotExists(
    ...args: Parameters<typeof fetch>
  ): Promise<any> {
    try {
      return access(this.path, fs.constants.F_OK);
    } catch (e) {
      const r = await fetch(...args);
      const data = await r.buffer();
      return await writeFile(this.path, data);
    }
  }

  static fromResPath(file = './'): Asset {
    const filePath = path.join(__dirname, '../res', file);
    return new Asset(filePath);
  }

  static fromAppPath(appId: string, file = './'): Asset {
    return Asset.fromResPath(path.join(appId, file));
  }
}

class RemoteAsset {
  fetch: () => Promise<Response>;

  constructor(...args: Parameters<typeof fetch>) {
    this.fetch = () => fetch(...args);
  }

  async js() {
    const script = await (await this.fetch()).text();
    return parseJs(script);
  }

  async json() {
    return await (await this.fetch()).json();
  }

  async text() {
    return await (await this.fetch()).text();
  }

  async buffer() {
    return await (await this.fetch()).buffer();
  }

  async base64() {
    const buffer = await (await this.fetch()).buffer();
    return toBase64(buffer);
  }

  async exists() {
    return (await this.fetch()).ok;
  }
}

interface Assets {
  (appId: string, file?: string): Asset;
  path(p: string): Asset;
  res(file?: string): Asset;
  pcr(p: string): Asset;
  pcrData(p: string): Asset;
  font(p: string): Asset;
  test(p: string): Asset;
  remote(url: string): RemoteAsset;
  avatar(id: string): RemoteAsset;
}

const assets = Asset.fromAppPath as Assets;
assets.path = (p) => new Asset(p);
assets.res = Asset.fromResPath;
assets.pcr = (p) => Asset.fromResPath(path.join('pcr', p));
assets.pcrData = (p) => Asset.fromResPath(path.join('pcr-data', p));
assets.font = (p) => Asset.fromResPath(path.join('font', p));
assets.test = (p) => Asset.fromResPath(path.join('test', p));
assets.remote = (url) => new RemoteAsset(url);
assets.avatar = (id) =>
  new RemoteAsset(`'http://q1.qlogo.cn/g?b=qq&nk=${id}&s=160'`);

export default assets;
