# 同步引擎设计文档

## 概述

同步引擎负责在用户自选的云存储与本地 SQLite 数据库之间同步数据。

## 核心模型

```
┌──────────────┐     ┌────────────────┐     ┌──────────────┐
│  设备 A      │     │  七牛云 Kodo   │     │  设备 B      │
│  (macOS)     │     │  (对象存储)     │     │  (iOS/Android)│
└──────┬───────┘     └───────┬────────┘     └──────┬───────┘
       │                     │                     │
       │  1. 修改 SQLite     │                     │
       │─────────────────────│                     │
       │  2. 上传云文件       │                     │
       │─────────────────────▶                     │
       │                     │  3. 轮询检测变化     │
       │                     │────────────────────▶│
       │                     │  4. 读取云文件       │
       │                     │◀────────────────────│
       │                     │  5. 写回合并结果     │
       │                     │────────────────────▶│
       │  6. 下次启动时合并   │                     │
       │◀────────────────────│                     │
```

> **数据源**：本地 SQLite (sql.js) 是唯一真实数据源，UI 读写全部经过它。
> CRDT 文档（`crdt-doc.ts`）仅作为**云端序列化容器**，不是数据源，不参与本地读写。

## 数据流

### 1. 写入流程（本地修改 → 云）

```
用户操作 → Pinia Store → DataAccess.updateTodo()
  → SQLite 写入 + db.export()         // 更新数据库并导出二进制快照
  → Storage.save(localCache)          // 立即写本地缓存 (IndexedDB)
  → SyncEngine.scheduleWrite()        // 异步调度写入云
    → debounce(500ms)                 // 防抖
    → syncNow(): 合并后整包上传        // 上传完整快照到云端
```

### 2. 读取流程（云 → 本地）

```
App 启动 → SyncEngine.initialSync() / 手动 syncNow()
  → 读取本地 SQLite                            // 本地数据
  → CloudProvider.read(TinyDo/data.automerge)  // 读取云端 CRDT 文档
  → 反序列化 → mergeTodosByUpdatedAt()         // LWW 合并（按 updated_at）
  → dataAccess.replaceAll(merged)              // 全量写回本地 SQLite
  → dataAccess.onChange → Pinia Store 更新      // UI 响应更新
  → 合并结果写回云端                            // 云端保持权威副本
```

### 3. 实时监听（其他设备写入触发）

```
CloudProvider.watch()                 // Kodo 通过轮询 stat 检测变化
  → onFileChange:
    → 防抖
    → syncNow(): 读取 → LWW 合并 → 写回本地 SQLite
    → dataAccess.onChange → Pinia Store 更新
```

## 同步策略

采用**全量文件替换 + LWW 合并**策略：

- 每次同步上传合并后的完整快照（Uint8Array）
- 冲突解决：按每条 todo 的 `updatedAt` 取较晚者（Last Write Wins），各设备独有的记录全部保留
- 合并结果同时写回本地 SQLite 和云端，云端始终是权威副本
- 适用于单用户多设备场景，数据量小，冲突概率低

## 存储策略

### 本地缓存
```
平台      | 存储方式
Electron  | fs (userData/todo-cache.automerge) + SQLite 文件
iOS       | Capacitor FileSystem 插件
Android   | Capacitor FileSystem 插件
Web (dev) | IndexedDB (via localForage)
```

### 云文件
```
路径: TinyDo/data.automerge

文件格式: CRDT 序列化二进制格式 (.automerge)
备用格式: JSON 导出 (用户可读可备份)
```

### 文件大小预估
```
100 条 todo  ≈ 50KB
1000 条 todo ≈ 500KB
10000 条 todo ≈ 5MB
```

普通用户的任务量通常在 100-500 条，文件体积完全可接受。

## 配置与状态

```typescript
interface SyncConfig {
  provider: 'kodo' | 'none'                            // 云存储类型（当前仅支持七牛云 Kodo）
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
  // 设置提供者并初始化：首次拉取合并、启动监听与定时同步
  async setProvider(provider: CloudProvider): Promise<void>
  
  // 手动触发同步（读本地 → 读云端 → LWW 合并 → 写回本地 → 上传云端）
  async syncNow(): Promise<SyncResult>
  
  // 调度写入（自动防抖 500ms）
  scheduleWrite(): void
  
  // 获取同步状态
  getState(): SyncState
  
  // 监听同步状态变化
  onStateChange(callback: (state: SyncState) => void): void
  
  // 更新同步配置
  updateConfig(config: Partial<SyncConfig>): void
  
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

### 七牛云 Kodo（当前唯一同步方案）
- 通过 `rs.qiniu.com`（管理 API）与 `up.qiniup.com`（上传 API）的 HTTP 接口操作
- 认证：HMAC-SHA1 签名（AccessKey / SecretKey），无需 OAuth
- 云文件 key：`TinyDo/data.automerge`
- 变更检测：轮询 `stat` 接口对比文件哈希/修改时间
- 所有平台（Electron / Capacitor / Web）共用同一套纯 HTTP 实现，无平台差异

### 未来扩展
如需增加其他云存储（如 WebDAV、阿里云 OSS），只需实现 `CloudProvider` 接口
（`read` / `write` / `delete` / `exists` / `watch` / `testConnection`），
并在设置页接入即可，同步引擎无需改动。
