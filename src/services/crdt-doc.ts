/**
 * CRDT 文档服务
 * 
 * 基于 Automerge 的本地优先数据层核心。
 * 提供文档的创建、修改、查询、序列化、合并等操作。
 * 
 * 文档结构:
 * {
 *   todos: { [id: string]: Todo },
 *   lists: { [id: string]: List },
 *   settings: { matrixRuleMode, urgentDays }
 * }
 */

import * as Automerge from './automerge-replacement'

// ============ 类型定义 ============

export interface CRDTTodo {
  id: string
  title: string
  completed: boolean
  createdAt: string
  priority: 0 | 1 | 3 | 5
  dueDate?: string
  startDate?: string
  content?: string
  tags?: string[]
  list?: string
  isAllDay?: boolean
  completedTime?: string
  updatedAt?: string
  deleted?: boolean // 软删除标记（tombstone，用于同步删除传播）
}

export interface CRDTList {
  id: string
  name: string
  color: string
  sortOrder: number
}

export interface CRDTSettings {
  matrixRuleMode: 'priority' | 'time-priority'
  urgentDays: number
}

export interface CRDTDocShape {
  todos: { [id: string]: CRDTTodo }
  lists: { [id: string]: CRDTList }
  settings: CRDTSettings
}

import type { Doc } from './automerge-replacement'

export type CRDTDoc = Doc<CRDTDocShape>

// ============ 文档操作 ============

let currentDoc: CRDTDoc | null = null
const listeners: Set<() => void> = new Set()

export function onDocChange(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function notifyListeners(): void {
  listeners.forEach(cb => cb())
}

/**
 * 创建一个空的 CRDT 文档
 */
export function createEmptyDoc(): CRDTDoc {
  const doc = Automerge.from<CRDTDocShape>({
    todos: {},
    lists: {},
    settings: {
      matrixRuleMode: 'priority',
      urgentDays: 1,
    },
  })
  currentDoc = doc
  return doc
}

/**
 * 从二进制数据加载文档
 */
export function loadDoc(data: Uint8Array): CRDTDoc {
  const doc = Automerge.load<CRDTDocShape>(data)
  currentDoc = doc
  return doc
}

/**
 * 从 JS 对象（例如从旧 db.json 迁移）创建文档
 */
export function fromJS(data: {
  todos?: CRDTTodo[]
  lists?: CRDTList[]
  settings?: Partial<CRDTSettings>
}): CRDTDoc {
  const todosMap: { [id: string]: CRDTTodo } = {}
  if (data.todos) {
    for (const todo of data.todos) {
      todosMap[todo.id] = todo
    }
  }
  const listsMap: { [id: string]: CRDTList } = {}
  if (data.lists) {
    for (const list of data.lists) {
      listsMap[list.id] = list
    }
  }

  const doc = Automerge.from<CRDTDocShape>({
    todos: todosMap,
    lists: listsMap,
    settings: {
      matrixRuleMode: data.settings?.matrixRuleMode ?? 'priority',
      urgentDays: data.settings?.urgentDays ?? 1,
    },
  })
  currentDoc = doc
  return doc
}

/**
 * 序列化文档为二进制
 */
export function saveDoc(doc: CRDTDoc): Uint8Array {
  return Automerge.save(doc)
}

/**
 * 获取当前文档的 JS 对象快照
 */
export function getDocSnapshot(doc: CRDTDoc): CRDTDocShape {
  return Automerge.toJS(doc) as CRDTDocShape
}

/**
 * 获取文档中所有 todo
 */
export function getAllTodos(doc: CRDTDoc): CRDTTodo[] {
  const snap = Automerge.toJS(doc) as CRDTDocShape
  return Object.values(snap.todos)
}

/**
 * 按 ID 获取单个 todo
 */
export function getTodoById(doc: CRDTDoc, id: string): CRDTTodo | undefined {
  const snap = Automerge.view(doc)
  return snap.todos[id] as CRDTTodo | undefined
}

/**
 * 修改文档（通用）
 */
export function changeDoc(
  doc: CRDTDoc,
  message: string,
  fn: (doc: CRDTDocShape) => void,
): CRDTDoc {
  const newDoc = Automerge.change<CRDTDocShape>(doc, message, fn) as unknown as CRDTDoc
  currentDoc = newDoc
  notifyListeners()
  return newDoc
}

// ============ Todo CRUD（便捷方法） ============

/**
 * 添加一个 todo
 */
export function addTodo(doc: CRDTDoc, todo: CRDTTodo): CRDTDoc {
  return changeDoc(doc, `add todo: ${todo.title}`, (d) => {
    d.todos[todo.id] = todo
  })
}

/**
 * 批量添加 todos
 */
export function bulkAddTodos(doc: CRDTDoc, todos: CRDTTodo[]): CRDTDoc {
  return changeDoc(doc, `bulk add ${todos.length} todos`, (d) => {
    for (const todo of todos) {
      d.todos[todo.id] = todo
    }
  })
}

/**
 * 更新一个 todo（局部更新）
 */
export function updateTodo(
  doc: CRDTDoc,
  id: string,
  updates: Partial<CRDTTodo>,
): CRDTDoc {
  return changeDoc(doc, `update todo: ${id}`, (d) => {
    if (d.todos[id]) {
      Object.assign(d.todos[id], updates)
    }
  })
}

/**
 * 删除一个 todo
 */
export function removeTodo(doc: CRDTDoc, id: string): CRDTDoc {
  return changeDoc(doc, `remove todo: ${id}`, (d) => {
    delete d.todos[id]
  })
}

/**
 * 切换完成状态
 */
export function toggleTodo(doc: CRDTDoc, id: string): CRDTDoc {
  return changeDoc(doc, `toggle todo: ${id}`, (d) => {
    if (d.todos[id]) {
      d.todos[id].completed = !d.todos[id].completed
      if (d.todos[id].completed) {
        d.todos[id].completedTime = new Date().toISOString()
      } else {
        d.todos[id].completedTime = undefined as any
      }
    }
  })
}

/**
 * 将一个文档合并到另一个文档
 */
export function mergeDoc(target: CRDTDoc, source: CRDTDoc): CRDTDoc {
  const merged = Automerge.merge<CRDTDocShape>(
    target as unknown as Automerge.Doc<CRDTDocShape>,
    source as unknown as Automerge.Doc<CRDTDocShape>,
  ) as unknown as CRDTDoc
  currentDoc = merged
  notifyListeners()
  return merged
}

/**
 * 获取当前文档（用于同步等场景）
 */
export function getCurrentDoc(): CRDTDoc | null {
  return currentDoc
}

/**
 * 获取文档变更历史（可用于审计/回滚）
 */
export function getHistory(doc: CRDTDoc) {
  return Automerge.getHistory(doc)
}

/**
 * 获取文档统计信息
 */
export function getStats(doc: CRDTDoc) {
  return Automerge.stats(doc)
}

/**
 * 将文档导出为可读 JSON
 */
export function exportToJSON(doc: CRDTDoc): string {
  const snap = getDocSnapshot(doc)
  return JSON.stringify(snap, null, 2)
}
