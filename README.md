# Node KV Storage

Wrapper around [`node-persist`](https://www.npmjs.com/package/node-persist) that implements the [`std:kv-storage`](https://wicg.github.io/kv-storage/) interface.

## Why

* Standardized API
* Easier code sharing with frontend
* No `await init()`

## How

```js
const storage = require('node-kv-storage')

;(async () => {
  await storage.set('test', { a: 3 })
  console.log(await storage.get('test'))

  // Compatible with node-persist for string and binary keys
  await require('node-persist').setItem('foo', { b: 4 })
  console.log(await storage.get('foo'))

  await require('node-persist').setItem(Buffer.from([0x1, 0x2]), { d: 6 })
  console.log(await storage.get(Buffer.from([0x1, 0x2])))
  
  // Also allows Number keys
  await storage.set(3, { f: 8 })
  console.log(await storage.get(3))

  // Also allows Date keys
  const d = new Date(0)
  await storage.set(d, { c: 5 })
  console.log(await storage.get(d))

  // Use multiple storage areas
  const { StorageArea } = storage
  const other = new StorageArea('other_area')
  await other.set('test', { i: 11 })
  console.log(await other.get('test'))
})()
```

## API

* [Google Developers Tutorial](https://developers.google.com/web/updates/2019/03/kv-storage)
* [Spec](https://wicg.github.io/kv-storage/)

## Limitations

* Since there is no IndexedDB in node, `backingStore` is not implemented.
* Using typed arrays as keys works, but when using `keys()` or `entries()` they will be returned in the form `JSON.parse(JSON.stringify(yourTypedArray))`. Typically this will look like `{ '0': 255, '1': 255, ... }`.