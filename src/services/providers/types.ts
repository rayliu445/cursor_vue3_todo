/**
 * 云存储提供者接口
 * 
 * 定义了与各类云存储服务交互的统一接口。
 * 每个提供者实现此接口，同步引擎统一调用。
 */

export interface CloudProvider {
  /** 提供者名称 */
  readonly name: string

  /** 初始化（认证、权限检查等） */
  initialize(): Promise<void>

  /** 读取文件 */
  read(path: string): Promise<Uint8Array | null>

  /** 写入文件 */
  write(path: string, data: Uint8Array): Promise<void>

  /** 删除文件 */
  delete(path: string): Promise<void>

  /** 检查文件是否存在 */
  exists(path: string): Promise<boolean>

  /** 监听文件变化 */
  watch(path: string, callback: (event: 'change' | 'delete') => void): () => void

  /** 获取文件信息 */
  stat?(path: string): Promise<{ size: number; modifiedAt: Date } | null>

  /** 获取存储配额信息 */
  getQuota?(): Promise<{ used: number; available: number } | null>

  /** 销毁/断开连接 */
  destroy(): void
}

/**
 * 同步配置
 */
export interface SyncConfig {
  /** 云存储提供者类型 */
  provider: 'icloud' | 'gdrive' | 'webdav' | 'local' | 'none'
  /** 是否启用同步 */
  enabled: boolean
  /** 是否自动同步 */
  autoSync: boolean
  /** 自动同步间隔（毫秒） */
  syncIntervalMs: number
  /** 云存储路径 */
  cloudPath: string
  /** 上次同步时间 */
  lastSyncTime: string | null
  /** 上次同步文件的哈希 */
  lastSyncHash: string | null
}

/**
 * 同步状态
 */
export interface SyncState {
  status: 'idle' | 'syncing' | 'error' | 'offline'
  lastSyncTime: string | null
  lastError: string | null
  isOnline: boolean
}

/**
 * 同步结果
 */
export interface SyncResult {
  success: boolean
  merged: boolean
  changesIncoming: number
  changesOutgoing: number
  duration: number
  error?: string
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  provider: 'none',
  enabled: false,
  autoSync: true,
  syncIntervalMs: 30000, // 30秒
  cloudPath: 'TodoApp/data.automerge',
  lastSyncTime: null,
  lastSyncHash: null,
}
