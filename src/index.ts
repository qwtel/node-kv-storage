import { StorageArea, AllowedKey, RoundTripKey, throwForDisallowedKey, encodeKey, decodeKey } from '@werker/kv-storage-interface';

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
  if (!s.match(/^[a-z0-9-_][a-z0-9-_.]*$/))
    return md5(s);
  return s;
}

export class NodeStorageArea implements StorageArea<Promise<LocalStorage>> {
  #dbp: Promise<LocalStorage>;

  constructor(name: string, opts: InitOptions = {}) {
    const {
      dir = process.env.NODE_KV_STORAGE_DIR ?? global['NODE_KV_STORAGE_DIR'] ?? `${process.cwd()}/.node-persist`,
      stringify = JSON.stringify.bind(JSON),
      parse = JSON.parse.bind(JSON),
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

  async *keys(): AsyncGenerator<RoundTripKey> {
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

  async *entries<T>(): AsyncGenerator<[RoundTripKey, T]> {
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

// export interface KVPacker {
//   set(kv: KVNamespace, key: string, tson: any, opts?: any): Promise<void>;
//   get(kv: KVNamespace, key: string, opts?: any): Promise<any>;
// }

// export class JSONPacker implements KVPacker {
//   async set(kv: KVNamespace, key: string, tson: any, opts?: KVPutOptions) { 
//     await kv.put(key, JSON.stringify(tson), opts);
//   }
//   async get(kv: KVNamespace, key: string) { 
//     return await kv.get(key, 'json');
//   }
// }

// export interface KVOptions {
//   packer?: KVPacker
// }

// export interface KVPutOptions {
//   expiration?: string | number;
//   expirationTtl?: string | number;
// }

// export interface KVListOptions {
//   prefix?: string
// }

const storage = new NodeStorageArea('storage');

export default storage;

export * from '@werker/kv-storage-interface';
