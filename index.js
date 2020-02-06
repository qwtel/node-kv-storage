const storage = require('node-persist');

function coerceKey (key) {
  const coercedKey = coerceKeyInner(key);
  if (!coercedKey) {
    throw Error('kv-storage: The given value is not allowed as a key');
  }
  return coercedKey.type ? JSON.stringify(coercedKey) : coercedKey;
}

function coerceKeyInner (value) {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return { type: 'Number', data: value };
  }

  if (typeof value === 'object' && value) {
    if (Array.isArray(value)) {
      return { type: 'Array', data: value.map(coerceKeyInner) };
    }

    if ('setUTCFullYear' in value) {
      return { type: 'Date', data: value.toISOString() };
    }

    if (typeof ArrayBuffer === 'function' && ArrayBuffer.isView(value)) {
      return value;
    }

    // isArrayBuffer
    if ('byteLength' in value && 'length' in value) {
      return value;
    }
  }

  return false;
}

function uncoerceKey (key) {
  try { 
    const parsed = JSON.parse(key);
    return uncoerceKeyInner(parsed);
  } catch (e) {
    return key;
  }
}

function uncoerceKeyInner (key) {
  switch (key.type) {
    case 'Number': return key.data;
    case 'Date': return new Date(key.data);
    case 'Array': return key.data.map(uncoerceKeyInner);
    case 'Buffer': return Buffer.from(key.data);
    // FIXME: Restore `Uint8Array`, `Uint16Array`, etc!?
    default: return key;
  }
}

// const _databaseName = new WeakMap();
const _databasePromise = new WeakMap();

const DEFAULT_STORAGE_AREA_NAME = 'default';

// const checkFileExists = (filePath) => fs.promises.access(filePath, fs.F_OK).then(() => true).catch(() => false);

function init(name) {
  const db = storage.create({
    dir: '.node-persist/' + (name === DEFAULT_STORAGE_AREA_NAME ? 'storage' : name),
    stringify: JSON.stringify,
    parse: JSON.parse,
    encoding: 'utf8',
    logging: false,
    ttl: false,
  })
  _databasePromise.set(this, db.init().then(() => db))
}

class StorageArea {
  constructor (name) {
    init.call(this, name);
  }

  async set (key, value) {
    const coercedKey = coerceKey(key);
    const store = await _databasePromise.get(this)

    if (value === undefined) {
      await store.removeItem(coercedKey);
    } else {
      await store.setItem(coercedKey, value);
    }
  }

  async get (key) {
    const coercedKey = coerceKey(key);
    const store = await _databasePromise.get(this)

    return await store.getItem(coercedKey);
  }

  async delete (key) {
    const coercedKey = coerceKey(key);
    const store = await _databasePromise.get(this)
    await store.removeItem(coercedKey);
  }

  async clear () {
    const store = await _databasePromise.get(this)
    await store.clear()
  }

  async *keys () {
    const store = await _databasePromise.get(this)
    // TODO: Do in true async iterative fashion
    const keys = await store.keys()
    for (const key of keys) yield uncoerceKey(key)
  }

  async *values () {
    const store = await _databasePromise.get(this)
    // TODO: Do in true async iterative fashion
    const keys = await store.keys()
    for (const key of keys) yield await store.getItem(key)
  }

  async *entries () {
    const store = await _databasePromise.get(this)
    // TODO: Do in true async iterative fashion
    const keys = await store.keys()
    for (const key of keys) yield [uncoerceKey(key), await store.getItem(key)]
  }

  async *[Symbol.asyncIterator]() {
    const store = await _databasePromise.get(this)
    // TODO: Do in true async iterative fashion
    const keys = await store.keys()
    for (const key of keys) yield [uncoerceKey(key), await store.getItem(key)]
  }
}

module.exports = new StorageArea(DEFAULT_STORAGE_AREA_NAME)
module.exports.StorageArea = StorageArea;
