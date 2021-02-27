import assert from 'assert';
import nodePersist from 'node-persist';
import storage, { NodeStorageArea } from '../index.js';

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