# ADR-0003: 采用 Automerge 作为数据层核心

## 状态
**已接受**

## 日期
2026-07-26

## 背景
需要替换当前基于 `json-server`/`fs.readFile` 的数据持久化方案，改为支持多端离线编辑和自动合并的数据层。

## 决策

### 选择 Automerge

选用 [Automerge](https://automerge.org/) 2.x 作为 CRDT 实现。

### 数据模型映射

```typescript
// CRDT Document 结构
type TodoDoc = {
  todos: {
    [id: string]: {
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
    }
  }
  lists: {
    [id: string]: {
      name: string
      color: string
      sortOrder: number
    }
  }
  settings: {
    matrixRuleMode: 'priority' | 'time-priority'
    urgentDays: number
  }
}
```

### 数据访问层抽象

```
┌──────────────────────────────────────────────────┐
│               Pinia Stores                        │
│  (useTodoStore, useMatrixStore)                   │
├──────────────────────────────────────────────────┤
│              Data Access Layer                    │
│  src/services/data-access.ts                     │
│  - getTodos() / addTodo() / updateTodo()         │
│  - 内部调用 CRDT API                             │
├──────────────────────────────────────────────────┤
│              CRDT Layer (Automerge)               │
│  src/services/crdt-doc.ts                        │
│  - createDoc() / change() / view() / merge()     │
├──────────────────────────────────────────────────┤
│              Storage Layer                        │
│  src/services/storage.ts                         │
│  - load() / save()  (IndexedDB / fs / cloud)     │
└──────────────────────────────────────────────────┘
```

### 变更：Pinia Store 不再直接读写 HTTP/IPC

当前架构：
```
Component → Pinia Store → fetch() → json-server / Electron IPC → db.json
```

新架构：
```
Component → Pinia Store → Data Access Layer → CRDT Doc → Storage (IndexedDB/fs + 云文件)
```

### 与现有 Electron IPC 的关系
- Electron IPC handlers 将改为操作 CRDT 文档而非直接读写 JSON 文件
- 或者：Electron 直接使用同一套 CRDT 库（Automerge 在 Node.js 中可用）

## 后果
- 需要在 Electron 和 Web 两端都使用 Automerge
- Automerge 2.x 是纯 JS，在 Electron 和浏览器中均可运行
- 需要处理 CRDT 文档的序列化/反序列化
- 数据迁移：需要将现有 `db.json` 数据一次性导入 CRDT 文档
