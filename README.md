# Node KV Storage

Wrapper around [`node-persist`](https://www.npmjs.com/package/node-persist) that implements the [`std:kv-storage`](https://wicg.github.io/kv-storage/) interface.

## Why

* Standardized API
* Easier code sharing with frontend
* No `await init()`

## How

```js
const { default: storage, NodeStorageArea } = require('node-kv-storage')

;(async () => {
  await storage.set('test', { a: 3 })
  assert.deepStrictEqual(await storage.get('test'), { a: 3})

  // Compatible with node-persist for string keys
  await nodePersist.init()
  await nodePersist.setItem('foo', { b: 4 })
  assert.deepStrictEqual(await storage.get('foo'), { b: 4})

  // Also allows Number keys
  await storage.set(3, { f: 8 })
  assert.deepStrictEqual(await storage.get(3), { f: 8 })

  // Also allows Date keys
  const d = new Date(0)
  await storage.set(d, { c: 5 })
  assert.deepStrictEqual(await storage.get(d), { c: 5 })

  // Also allows complex keys
  await storage.set(['foo', 3, d], { c: 6 })
  assert.deepStrictEqual(await storage.get(['foo', 3, d]), { c: 6 })

  // Use multiple storage areas
  const other = new NodeStorageArea('other_area')
  await other.set('test', { i: 11 })
  assert.deepStrictEqual(await other.get('test'), { i: 11 })
})()
```

## API

* [Google Developers Tutorial](https://developers.google.com/web/updates/2019/03/kv-storage)
* [Spec](https://wicg.github.io/kv-storage/)
