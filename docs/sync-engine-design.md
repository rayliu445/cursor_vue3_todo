# 同步引擎设计文档

## 概述

同步引擎是整个多端架构的核心组件，负责在用户自选的云存储与本地 CRDT 文档之间同步数据。

## 核心模型

```
┌──────────────┐     ┌────────────────┐     ┌──────────────┐
│  设备 A      │     │  云存储        │     │  设备 B      │
│  (macOS)     │     │  (iCloud/GDrive)│    │  (iOS/Android)│
└──────┬───────┘     └───────┬────────┘     └──────┬───────┘
       │                     │                     │
       │  1. 修改 CRDT Doc   │                     │
       │─────────────────────│                     │
       │  2. 写入云文件       │                     │
       │─────────────────────▶                     │
       │                     │  3. 文件变更通知     │
       │                     │────────────────────▶│
       │                     │  4. 读取云文件       │
       │                     │◀────────────────────│
       │                     │  5. 写回合并结果     │
       │                     │────────────────────▶│
       │  6. 下次启动时合并   │                     │
       │◀────────────────────│                     │
```

## 数据流

### 1. 写入流程（本地修改 → 云）

```
用户操作 → Pinia Store → DataAccess.updateTodo()
  → CRDT Doc.change(doc => { doc.todos[id].completed = true })
  → Storage.save(localCache)          // 立即写本地缓存
  → SyncEngine.scheduleWrite()        // 异步调度写入云
    → debounce(500ms)                 // 防抖
    → CloudProvider.write(file)       // 写入云存储
```

### 2. 读取流程（云 → 本地）

```
App 启动 → SyncEngine.initialize()
  → CloudProvider.read()              // 读取云文件
  → if (存在 && 有变更):
      → CRDT Doc.merge(cloudDoc)      // 合并到本地文档
  → Storage.save(localCache)          // 更新本地缓存
  → Pinia Store 更新                   // UI 响应更新
```

### 3. 实时监听（其他设备写入触发）

```
CloudProvider.watch()                 // 监听文件变化
  → onFileChange:
    → debounce(1000ms)                // 防抖（云盘同步有延迟）
    → CloudProvider.read()
    → CRDT Doc.merge(cloudDoc)
    → Storage.save(localCache)
    → Pinia Store 更新
```

## 冲突解决策略

### CRDT 自动合并（主要策略）
Automerge 使用操作日志和向量时钟：
- 每个修改操作有唯一的因果时间戳
- 所有设备的操作最终合并为一致的文档状态
- 对于同时修改同一字段：按因果序决定最终值（LWW - Last Writer Wins）

### 边界情况处理

| 场景 | 处理方式 |
|------|---------|
| 双设备同时修改同一任务标题 | CRDT 自动合并，保留最后一次写入 |
| 设备 A 删除任务，设备 B 同时修改该任务 | 删除优先（tombstone 机制） |
| 设备离线修改，一周后才上线 | CRDT 操作日志保证所有变更被正确合并 |
| 云文件损坏 | 回退到本地缓存，提示用户 |
| 云文件被手动删除 | 使用本地缓存重新创建云文件 |

## 存储策略

### 本地缓存
```
平台      | 存储方式
Electron  | fs (userData/todo-cache.automerge)
iOS       | Capacitor FileSystem 插件
Android   | Capacitor FileSystem 插件
Web (dev) | IndexedDB (via localForage)
```

### 云文件
```
路径: {cloudRoot}/TodoApp/data.automerge

文件格式: Automerge 序列化二进制格式 (.automerge)
备用格式: JSON 导出 (用户可读可备份)
```

### 文件大小预估
```
100 条 todo  ≈ 50KB
1000 条 todo ≈ 500KB
10000 条 todo ≈ 5MB（含操作日志）
```

普通用户的任务量通常在 100-500 条，文件体积完全可接受。

## 配置与状态

```typescript
interface SyncConfig {
  provider: 'icloud' | 'gdrive' | 'webdav' | 'local'  // 云存储类型
  enabled: boolean                                      // 是否启用同步
  autoSync: boolean                                     // 是否自动同步
  syncIntervalMs: number                               // 自动同步间隔
  cloudPath: string                                     // 云存储路径
  lastSyncTime: string                                  // 上次同步时间
  lastSyncHash: string                                  // 上次同步文件的哈希
}

interface SyncState {
  status: 'idle' | 'syncing' | 'error' | 'offline'
  lastSyncTime: string | null
  lastError: string | null
  isOnline: boolean
}
```

## 同步引擎 API

```typescript
class SyncEngine {
  // 初始化：读取云文件、合并、启动监听
  async initialize(config: SyncConfig): Promise<void>
  
  // 手动触发同步
  async syncNow(): Promise<SyncResult>
  
  // 调度写入（自动防抖）
  scheduleWrite(): void
  
  // 获取同步状态
  getState(): SyncState
  
  // 监听同步状态变化
  onStateChange(callback: (state: SyncState) => void): void
  
  // 切换云存储提供者
  async switchProvider(provider: SyncConfig['provider']): Promise<void>
  
  // 停止同步
  destroy(): void
}

interface SyncResult {
  success: boolean
  merged: boolean       // 是否有新的合并
  changesIncoming: number  // 从云端来的变更数
  changesOutgoing: number  // 写入云端的变更数
  duration: number      // 同步耗时(ms)
  error?: string
}
```

## 各平台云存储实现要点

### macOS (Electron) - iCloud Drive
- iCloud Drive 在 macOS 上表现为本地文件夹 `~/Library/Mobile Documents/com~apple~CloudDocs/`
- Electron 可以用 `fs` 模块直接读写
- 使用 `fs.watchFile()` 监听文件变化

### iOS (Capacitor) - iCloud Drive
- 使用 `UIKit` 的 `NSDocumentPickerViewController`
- 或使用 Capacitor 社区插件 `@capacitor-community/file-opener`
- 应用沙盒内的 iCloud container

### Android - Google Drive
- 使用 Google Drive Android API
- 或 Capacitor 插件 `@capacitor/google-drive`（社区）
- 需要 OAuth 认证

### 备选：WebDAV
- 适用于自建云（Nextcloud）或国内云盘（坚果云）
- 基于 HTTP 的简单文件操作
- 无需各平台原生 SDK，纯 HTTP 实现
