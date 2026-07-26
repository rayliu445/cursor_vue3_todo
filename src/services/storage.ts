/**
 * 存储抽象层
 * 
 * 统一本地持久化接口：
 * - Electron: 使用 Node.js fs 模块
 * - 浏览器/Capacitor: 使用 IndexedDB (localForage)
 * - 移动端: 使用 Capacitor FileSystem 插件
 */

import type { CRDTDoc } from './crdt-doc'
import { saveDoc, loadDoc, createEmptyDoc } from './crdt-doc'

// ============ 类型 ============

export interface StorageAdapter {
  /** 读取二进制数据 */
  read(): Promise<Uint8Array | null>
  /** 写入二进制数据 */
  write(data: Uint8Array): Promise<void>
  /** 删除数据 */
  delete(): Promise<void>
  /** 检查数据是否存在 */
  exists(): Promise<boolean>
}

export type StorageType = 'electron-fs' | 'indexeddb' | 'capacitor-fs'

// ============ Electron Node.js fs 适配器 ============

let electronFsAdapter: StorageAdapter | null = null

/**
 * 创建 Electron fs 存储适配器
 */
export function createElectronFsAdapter(dbPath: string): StorageAdapter {
  let fs: any = null
  let path: any = null

  try {
    fs = require('fs')
    path = require('path')
  } catch {
    throw new Error('fs module not available (not in Electron/Node.js environment)')
  }

  electronFsAdapter = {
    async read(): Promise<Uint8Array | null> {
      try {
        if (!fs.existsSync(dbPath)) return null
        return fs.readFileSync(dbPath)
      } catch (err) {
        console.error('[Storage] Error reading file:', err)
        return null
      }
    },

    async write(data: Uint8Array): Promise<void> {
      try {
        const dir = path.dirname(dbPath)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        fs.writeFileSync(dbPath, data)
      } catch (err) {
        console.error('[Storage] Error writing file:', err)
        throw err
      }
    },

    async delete(): Promise<void> {
      try {
        if (fs.existsSync(dbPath)) {
          fs.unlinkSync(dbPath)
        }
      } catch (err) {
        console.error('[Storage] Error deleting file:', err)
      }
    },

    async exists(): Promise<boolean> {
      return fs.existsSync(dbPath)
    },
  }

  return electronFsAdapter
}

// ============ IndexedDB 适配器 (浏览器/Web) ============

let indexedDBAdapter: StorageAdapter | null = null

function openDB(dbName: string, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function createIndexedDBAdapter(
  dbName: string = 'todo-app',
  storeName: string = 'crdt-doc',
): StorageAdapter {
  let dbPromise: Promise<IDBDatabase> | null = null

  function getDB(): Promise<IDBDatabase> {
    if (!dbPromise) {
      dbPromise = openDB(dbName, storeName)
    }
    return dbPromise
  }

  indexedDBAdapter = {
    async read(): Promise<Uint8Array | null> {
      try {
        const db = await getDB()
        return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readonly')
          const store = tx.objectStore(storeName)
          const request = store.get('doc')
          request.onsuccess = () => {
            const data = request.result
            if (data) {
              resolve(new Uint8Array(data))
            } else {
              resolve(null)
            }
          }
          request.onerror = () => reject(request.error)
        })
      } catch (err) {
        console.error('[Storage IndexedDB] Error reading:', err)
        return null
      }
    },

    async write(data: Uint8Array): Promise<void> {
      try {
        const db = await getDB()
        return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite')
          const store = tx.objectStore(storeName)
          store.put(data, 'doc')
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        })
      } catch (err) {
        console.error('[Storage IndexedDB] Error writing:', err)
        throw err
      }
    },

    async delete(): Promise<void> {
      try {
        const db = await getDB()
        return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite')
          const store = tx.objectStore(storeName)
          store.delete('doc')
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        })
      } catch (err) {
        console.error('[Storage IndexedDB] Error deleting:', err)
      }
    },

    async exists(): Promise<boolean> {
      const data = await this.read()
      return data !== null
    },
  }

  return indexedDBAdapter
}

// ============ 统一存储管理器 ============

export interface DocManager {
  /** 加载 CRDT 文档（从存储） */
  load(): Promise<CRDTDoc>
  /** 保存 CRDT 文档（到存储） */
  save(doc: CRDTDoc): Promise<void>
  /** 检查文档是否存在 */
  exists(): Promise<boolean>
  /** 删除存储的文档 */
  delete(): Promise<void>
}

/**
 * 创建文档管理器
 */
export function createDocManager(adapter: StorageAdapter): DocManager {
  return {
    async load(): Promise<CRDTDoc> {
      const data = await adapter.read()
      if (data) {
        try {
          return loadDoc(data)
        } catch (err) {
          console.error('[DocManager] Error loading CRDT doc, creating empty:', err)
          return createEmptyDoc()
        }
      }
      return createEmptyDoc()
    },

    async save(doc: CRDTDoc): Promise<void> {
      const data = saveDoc(doc)
      await adapter.write(data)
    },

    async exists(): Promise<boolean> {
      return adapter.exists()
    },

    async delete(): Promise<void> {
      return adapter.delete()
    },
  }
}

/**
 * localStorage 回退适配器
 * 当 IndexedDB 不可用或写入失败时使用
 */
function createLocalStorageAdapter(key: string = 'todo-crdt-data'): StorageAdapter {
  return {
    async read(): Promise<Uint8Array | null> {
      try {
        const raw = localStorage.getItem(key)
        if (!raw) return null
        // localStorage 存的是 base64 字符串
        const binaryStr = atob(raw)
        const bytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i)
        }
        return bytes
      } catch {
        return null
      }
    },

    async write(data: Uint8Array): Promise<void> {
      try {
        // 将 Uint8Array 转为 base64 字符串
        let binary = ''
        for (let i = 0; i < data.length; i++) {
          binary += String.fromCharCode(data[i])
        }
        localStorage.setItem(key, btoa(binary))
      } catch (err) {
        console.error('[Storage localStorage] Error writing:', err)
        throw err
      }
    },

    async delete(): Promise<void> {
      localStorage.removeItem(key)
    },

    async exists(): Promise<boolean> {
      return localStorage.getItem(key) !== null
    },
  }
}

/**
 * 复合适配器：IndexedDB 为主，localStorage 为备份
 * 写操作同时写两个存储，读操作优先读 IndexedDB
 */
function createCompositeAdapter(): StorageAdapter {
  const idb = createIndexedDBAdapter('todo-app', 'crdt-doc')
  const ls = createLocalStorageAdapter()
  let _idbAvailable = true

  return {
    async read(): Promise<Uint8Array | null> {
      // 优先读 IndexedDB
      if (_idbAvailable) {
        try {
          const data = await idb.read()
          if (data) return data
        } catch {
          _idbAvailable = false
          console.warn('[Storage] IndexedDB read failed, falling back to localStorage')
        }
      }
      // 回退到 localStorage
      return ls.read()
    },

    async write(data: Uint8Array): Promise<void> {
      // 同时写入两个存储
      let idbError: Error | null = null
      if (_idbAvailable) {
        try {
          await idb.write(data)
        } catch (err) {
          _idbAvailable = false
          idbError = err instanceof Error ? err : new Error('IndexedDB write failed')
          console.warn('[Storage] IndexedDB write failed, using localStorage only')
        }
      }
      // 总是写入 localStorage 作为备份
      await ls.write(data)
      if (idbError) throw idbError
    },

    async delete(): Promise<void> {
      await Promise.all([
        idb.delete().catch(() => {}),
        ls.delete().catch(() => {}),
      ])
    },

    async exists(): Promise<boolean> {
      if (_idbAvailable) {
        try {
          if (await idb.exists()) return true
        } catch {
          _idbAvailable = false
        }
      }
      return ls.exists()
    },
  }
}

/**
 * 自动检测环境并创建合适的存储适配器
 */
export function createAutoAdapter(): StorageAdapter {
  // Electron 环境（有 window 但不一定是 Electron renderer）
  const isElectron =
    typeof navigator !== 'undefined' &&
    (navigator as any).userAgent?.toLowerCase().includes('electron')

  // Node.js 环境（Electron main process 或测试）
  const hasFs =
    typeof require !== 'undefined' &&
    (typeof process !== 'undefined' && !(process as any).browser)

  if (hasFs && !isElectron) {
    // 在 Electron main 或 Node.js 环境中
    return createElectronFsAdapter('./todo-data.automerge')
  }

  if (isElectron && typeof window !== 'undefined') {
    // Electron renderer - 使用复合适配器
    return createCompositeAdapter()
  }

  // 浏览器环境（Vite dev 或 Capacitor）- 使用复合适配器
  if (typeof window !== 'undefined') {
    return createCompositeAdapter()
  }

  throw new Error('No suitable storage adapter found for this environment')
}
