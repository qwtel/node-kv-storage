import { StorageArea, AllowedKey, Key } from 'kv-storage-interface';
import { throwForDisallowedKey } from './common.js';
import { encodeKey, decodeKey } from './key-encoding.js';

import path from 'path';
import crypto from 'crypto';
import nodePersist, { LocalStorage, InitOptions } from 'node-persist';

import Typeson from 'typeson';
import structuredCloningThrowing from 'typeson-registry/dist/presets/structured-cloning-throwing.js';

// https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
const TSON = new Typeson().register(structuredCloningThrowing);

const md5 = key => crypto.createHash('md5').update(key).digest('hex');

const osSafeDirName = (s: string) => {
  s = s.toLowerCase();
  if (!s.match(/^[a-z0-9-_][a-z0-9-_.]*$/)) return md5(s);
  return s;
}

export class NodeStorageArea implements StorageArea {
  #dbp: Promise<LocalStorage>;

  constructor(name: string, opts: InitOptions = {}) {
    const {
      dir = process.env.NODE_KV_STORAGE_DIR ?? global['NODE_KV_STORAGE_DIR'] ?? `${process.cwd()}/.node-persist`,
      stringify = x => JSON.stringify(x),
      parse = x => JSON.parse(x),
      logging = !!process.env.DEBUG,
      ...rest
    } = opts;
    const storeDir = osSafeDirName(name);
    const db = nodePersist.create({
      dir: path.resolve(dir, storeDir),
      stringify: (d: any) => stringify(TSON.encapsulate(d)),
      parse: (s: string) => TSON.revive(parse(s)),
      encoding: 'utf8',
      logging,
      ...rest,
    })
    this.#dbp = db.init().then(() => db);
  }

  async get<T>(key: AllowedKey): Promise<T> {
    throwForDisallowedKey(key);
    const db = await this.#dbp;
    return db.getItem(encodeKey(key));
  }

  async set<T>(key: AllowedKey, value: T | undefined): Promise<void> {
    throwForDisallowedKey(key);
    const db = await this.#dbp;
    if (value === undefined)
      await db.removeItem(encodeKey(key));
    else {
      await db.setItem(encodeKey(key), value);
    }
  }

  async delete(key: AllowedKey) {
    throwForDisallowedKey(key);
    const db = await this.#dbp;
    await db.removeItem(encodeKey(key));
  }

  async clear() {
    const db = await this.#dbp;
    await db.clear();
  }

  async *keys(): AsyncGenerator<Key> {
    const db = await this.#dbp;
    const keys = await db.keys();
    for (const key of keys) {
      yield decodeKey(key);
    }
  }

  async *values<T>(): AsyncGenerator<T> {
    const db = await this.#dbp;
    const values = await db.values();
    for (const value of values) {
      yield value;
    }
  }

  async *entries<T>(): AsyncGenerator<[Key, T]> {
    const db = await this.#dbp;
    const data = await db.data();
    for (const { key, value } of data) {
      yield [decodeKey(key), value];
    }
  }

  backingStore() {
    return this.#dbp;
  }
}

const storage = new NodeStorageArea('storage');

export default storage;
