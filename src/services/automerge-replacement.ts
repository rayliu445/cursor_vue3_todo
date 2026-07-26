/**
 * Automerge WASM 替代层
 * 
 * 纯 TypeScript 实现的轻量 CRDT 文档引擎。
 * 暴露与 @automerge/automerge 相同的 API 签名，
 * 以便 crdt-doc.ts 无需任何改动即可工作。
 * 
 * 核心设计：
 * - 文档是不可变的 JavaScript 对象
 * - 每个 `change()` 返回一个新的文档副本（结构共享）
 * - `merge()` 执行逐字段合并（叶级 last-write-wins）
 * - 序列化为 Uint8Array（JSON + TextEncoder）
 */

// ============ 类型 ============

// Automerge 兼容的 Doc 类型包装
export interface Doc<T> {
  /** 内部存储的实际数据 */
  __data: T
  /** 文档版本号（用于 merge 冲突解决） */
  __version: number
}

// ============ 工厂方法 ============

/**
 * 从初始状态创建文档 — 对应 Automerge.from()
 */
export function from<T extends Record<string, any>>(initial: T): Doc<T> {
  return {
    __data: deepClone(initial),
    __version: 0,
  }
}

/**
 * 从 Uint8Array 加载文档 — 对应 Automerge.load()
 */
export function load<T>(data: Uint8Array): Doc<T> {
  const decoded = decodeData(data)
  return {
    __data: decoded.data as T,
    __version: decoded.version,
  }
}

/**
 * 将文档保存为 Uint8Array — 对应 Automerge.save()
 */
export function save<T>(doc: Doc<T>): Uint8Array {
  return encodeData(doc.__data, doc.__version)
}

/**
 * 将文档转为普通 JS 对象 — 对应 Automerge.toJS()
 */
export function toJS<T>(doc: Doc<T>): T {
  return deepClone(doc.__data)
}

/**
 * 返回文档的视图（同 toJS）— 对应 Automerge.view()
 * 某些版本的 Automerge 使用 view() 代替 toJS()
 */
export function view<T>(doc: Doc<T>): T {
  return deepClone(doc.__data)
}

// ============ 变更操作 ============

/**
 * 对文档执行变更 — 对应 Automerge.change()
 * 返回一个新的文档副本
 */
export function change<T extends Record<string, any>>(
  doc: Doc<T>,
  message: string,
  fn: (proxy: T) => void,
): Doc<T> {
  // 克隆当前数据
  const newData = deepClone(doc.__data)

  // 执行变更函数
  fn(newData)

  // 返回新文档
  return {
    __data: newData,
    __version: doc.__version + 1,
  }
}

// ============ 合并操作 ============

/**
 * 合并两个文档 — 对应 Automerge.merge()
 * 策略：递归合并，以 source 中的值为优先（last-write-wins）
 */
export function merge<T extends Record<string, any>>(
  target: Doc<T>,
  source: Doc<T>,
): Doc<T> {
  // 如果 source 版本更新，以 source 为准
  if (source.__version > target.__version) {
    const mergedData = deepMerge(target.__data, source.__data)
    return {
      __data: mergedData,
      __version: source.__version,
    }
  }

  // 否则保留 target
  const mergedData = deepMerge(target.__data, source.__data)
  return {
    __data: mergedData,
    __version: target.__version,
  }
}

// ============ 历史与统计 ============

/**
 * 获取历史记录（简化实现）— 对应 Automerge.getHistory()
 * 由于我们不保存完整历史，返回当前文档快照
 */
export function getHistory<T>(doc: Doc<T>): Array<{ change: { message: string }; snapshot: () => T }> {
  return [
    {
      change: { message: 'current snapshot' },
      snapshot: () => deepClone(doc.__data),
    },
  ]
}

/**
 * 获取文档统计 — 对应 Automerge.stats()
 */
export function stats<T>(doc: Doc<T>): { numChanges: number; numOps: number } {
  return {
    numChanges: doc.__version,
    numOps: doc.__version,
  }
}

// ============ 工具函数 ============

/**
 * 深拷贝
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as any
  if (obj instanceof Array) return obj.map(deepClone) as any
  if (obj instanceof Uint8Array) return new Uint8Array(obj) as any

  const cloned: any = {}
  for (const key of Object.keys(obj as any)) {
    cloned[key] = deepClone((obj as any)[key])
  }
  return cloned as T
}

/**
 * 递归合并两个对象
 * target 为基础，source 中的值优先
 */
function deepMerge<T extends Record<string, any>>(target: T, source: T): T {
  const result = deepClone(target)

  for (const key of Object.keys(source)) {
    const srcVal = source[key]
    const tgtVal = (result as any)[key]

    if (
      srcVal !== null &&
      typeof srcVal === 'object' &&
      !(srcVal instanceof Uint8Array) &&
      !(srcVal instanceof Date) &&
      !Array.isArray(srcVal)
    ) {
      // 对象递归合并
      (result as any)[key] = deepMerge(
        tgtVal ?? {} as any,
        srcVal,
      )
    } else {
      // 标量值或数组直接覆盖
      (result as any)[key] = deepClone(srcVal)
    }
  }

  return result
}

/**
 * 将数据编码为 Uint8Array
 * 格式: [版本号(4字节大端)][JSON字节]
 */
function encodeData<T>(data: T, version: number): Uint8Array {
  const jsonStr = JSON.stringify(data)
  const jsonBytes = new TextEncoder().encode(jsonStr)

  const versionBuffer = new ArrayBuffer(4)
  const versionView = new DataView(versionBuffer)
  versionView.setUint32(0, version, false) // 大端序

  const result = new Uint8Array(4 + jsonBytes.length)
  result.set(new Uint8Array(versionBuffer), 0)
  result.set(jsonBytes, 4)

  return result
}

/**
 * 从 Uint8Array 解码数据
 */
function decodeData(data: Uint8Array): { data: any; version: number } {
  if (data.length < 4) {
    return { data: {}, version: 0 }
  }

  const versionView = new DataView(data.buffer, data.byteOffset, 4)
  const version = versionView.getUint32(0, false)

  const jsonBytes = data.slice(4)
  const jsonStr = new TextDecoder().decode(jsonBytes)
  const parsed = JSON.parse(jsonStr)

  return { data: parsed, version }
}
