/**
 * 同步引擎
 * 
 * 核心同步逻辑，负责：
 * 1. 启动时从云存储加载并合并
 * 2. 本地变更后自动写入云存储
 * 3. 监听云文件变化并合并到本地
 * 4. 提供同步状态和错误处理
 */

import type { CloudProvider, SyncConfig, SyncState, SyncResult } from './providers/types'
import { DEFAULT_SYNC_CONFIG } from './providers/types'
import { getDataAccess, type Todo } from './data-access'
import { fromJS, loadDoc, saveDoc, getDocSnapshot } from './crdt-doc'

export class SyncEngine {
  private provider: CloudProvider | null = null
  private config: SyncConfig
  private state: SyncState
  private unwatch: (() => void) | null = null
  private syncTimer: number | null = null
  private writeTimer: number | null = null
  private stateListeners: Set<(state: SyncState) => void> = new Set()
  private _initialized = false

  // 防抖：500ms 内多次写入只触发一次
  private pendingWrite = false
  private readonly WRITE_DEBOUNCE_MS = 500
  // 云文件路径
  private readonly CLOUD_FILE = 'data.automerge'

  constructor(config?: Partial<SyncConfig>) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config }
    this.state = {
      status: 'idle',
      lastSyncTime: null,
      lastError: null,
      isOnline: navigator?.onLine ?? true,
    }

    // 监听网络状态
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.state.isOnline = true
        this.notifyState()
        if (this.config.autoSync) {
          this.syncNow().catch(console.error)
        }
      })
      window.addEventListener('offline', () => {
        this.state.isOnline = false
        this.state.status = 'offline'
        this.notifyState()
      })
    }
  }

  // ============ 初始化 ============

  /**
   * 设置云存储提供者并初始化同步
   */
  async setProvider(provider: CloudProvider): Promise<void> {
    // 清理旧的提供者
    this.destroy()

    this.provider = provider
    await provider.initialize()

    // 首次同步：从云加载并合并
    await this.initialSync()

    // 启动文件监听
    this.startWatching()

    // 启动定时同步
    if (this.config.autoSync) {
      this.startAutoSync()
    }

    this._initialized = true
    console.log('[SyncEngine] Initialized with provider:', provider.name)
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config }

    // 如果自动同步设置变化，重启定时器
    if (this.syncTimer !== null) {
      this.stopAutoSync()
    }
    if (this.config.autoSync && this._initialized) {
      this.startAutoSync()
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): SyncConfig {
    return { ...this.config }
  }

  // ============ 核心同步 ============

  /**
   * 手动触发同步
   */
  async syncNow(): Promise<SyncResult> {
    if (!this.provider || !this.config.enabled) {
      return {
        success: false,
        merged: false,
        changesIncoming: 0,
        changesOutgoing: 0,
        duration: 0,
        error: 'Sync not configured',
      }
    }

    const startTime = Date.now()
    this.state.status = 'syncing'
    this.notifyState()

    try {
      const dataAccess = getDataAccess()

      // 1. 本地数据（SQLite 是数据源）
      const localTodos = dataAccess.getTodos()

      // 2. 云端数据（CRDT 文档）
      let cloudTodos: Todo[] = []
      const cloudData = await this.provider.read(this.CLOUD_FILE)
      if (cloudData) {
        const cloudDoc = loadDoc(cloudData)
        const snap = getDocSnapshot(cloudDoc)
        cloudTodos = Object.values(snap.todos) as Todo[]
      }

      // 3. LWW 合并：updated_at 更晚者胜，各自独有的都保留
      const mergedTodos = mergeTodosByUpdatedAt(localTodos, cloudTodos)
      const changesIncoming = Math.max(0, mergedTodos.length - localTodos.length)

      // 4. 合并结果写回本地 SQLite，并通知 UI 刷新
      dataAccess.replaceAll(mergedTodos)
      await dataAccess.save()

      // 5. 合并结果上传云端（云端始终是权威副本）
      const doc = fromJS({ todos: mergedTodos })
      await this.provider.write(this.CLOUD_FILE, saveDoc(doc))

      // 更新状态
      this.state.status = 'idle'
      this.state.lastSyncTime = new Date().toISOString()
      this.state.lastError = null
      this.notifyState()

      return {
        success: true,
        merged: changesIncoming > 0,
        changesIncoming,
        changesOutgoing: 0, // 简化处理
        duration: Date.now() - startTime,
      }
    } catch (err) {
      this.state.status = 'error'
      this.state.lastError = err instanceof Error ? err.message : 'Unknown sync error'
      this.notifyState()

      return {
        success: false,
        merged: false,
        changesIncoming: 0,
        changesOutgoing: 0,
        duration: Date.now() - startTime,
        error: this.state.lastError!,
      }
    }
  }

  /**
   * 调度写入（用户编辑后调用，防抖）
   */
  scheduleWrite(): void {
    if (!this.config.enabled || !this.provider) return

    if (this.writeTimer !== null) {
      window.clearTimeout(this.writeTimer)
    }

    this.pendingWrite = true
    this.writeTimer = window.setTimeout(async () => {
      this.pendingWrite = false
      await this.syncNow()
    }, this.WRITE_DEBOUNCE_MS)
  }

  // ============ 状态查询 ============

  /**
   * 获取当前同步状态
   */
  getState(): SyncState {
    return { ...this.state }
  }

  /**
   * 监听同步状态变化
   */
  onStateChange(callback: (state: SyncState) => void): () => void {
    this.stateListeners.add(callback)
    return () => this.stateListeners.delete(callback)
  }

  /**
   * 是否已初始化
   */
  get initialized(): boolean {
    return this._initialized
  }

  // ============ 销毁 ============

  /**
   * 停止同步，清理资源
   */
  destroy(): void {
    if (this.unwatch) {
      this.unwatch()
      this.unwatch = null
    }
    this.stopAutoSync()
    if (this.writeTimer !== null) {
      window.clearTimeout(this.writeTimer)
      this.writeTimer = null
    }
    if (this.provider) {
      this.provider.destroy()
      this.provider = null
    }
    this._initialized = false
  }

  // ============ 私有方法 ============

  private async initialSync(): Promise<void> {
    if (!this.provider) return

    try {
      const dataAccess = getDataAccess()
      const localTodos = dataAccess.getTodos()

      let cloudTodos: Todo[] = []
      const cloudData = await this.provider.read(this.CLOUD_FILE)
      if (cloudData) {
        const cloudDoc = loadDoc(cloudData)
        const snap = getDocSnapshot(cloudDoc)
        cloudTodos = Object.values(snap.todos) as Todo[]
      }

      // 与云端做 LWW 合并后写回本地（拉取其他端的数据）
      const mergedTodos = mergeTodosByUpdatedAt(localTodos, cloudTodos)
      dataAccess.replaceAll(mergedTodos)
      await dataAccess.save()
      console.log('[SyncEngine] Initial sync completed, todos:', mergedTodos.length)
    } catch (err) {
      console.warn('[SyncEngine] Initial sync failed (first time?):', err)
    }
  }

  private startWatching(): void {
    if (!this.provider) return

    this.unwatch = this.provider.watch(this.CLOUD_FILE, async (event) => {
      if (event === 'change') {
        console.log('[SyncEngine] Cloud file changed, syncing...')
        await this.syncNow()
      }
    })
  }

  private startAutoSync(): void {
    if (this.syncTimer !== null) return

    this.syncTimer = window.setInterval(async () => {
      if (this.config.enabled && this.state.isOnline) {
        await this.syncNow()
      }
    }, this.config.syncIntervalMs)

    console.log('[SyncEngine] Auto sync started every', this.config.syncIntervalMs, 'ms')
  }

  private stopAutoSync(): void {
    if (this.syncTimer !== null) {
      window.clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  }

  private notifyState(): void {
    this.stateListeners.forEach(cb => cb(this.state))
  }
}

// ============ 多端合并工具 ============

/**
 * LWW（Last-Write-Wins，后写覆盖）合并：
 * - 只在一端存在的任务：直接保留（合并）
 * - 两端都存在的同一任务：updated_at 更晚者胜（后写覆盖）
 *
 * ISO 时间字符串可直接按字典序比较。
 */
function mergeTodosByUpdatedAt<T extends { id: string; updatedAt?: string }>(
  local: T[],
  cloud: T[],
): T[] {
  const byId = new Map<string, T>()
  for (const t of local) byId.set(t.id, t)
  for (const t of cloud) {
    const existing = byId.get(t.id)
    if (!existing) {
      byId.set(t.id, t)
    } else if ((t.updatedAt || '') > (existing.updatedAt || '')) {
      byId.set(t.id, t)
    }
  }
  return Array.from(byId.values())
}

// ============ 单例 ============

let syncEngineInstance: SyncEngine | null = null

export function getSyncEngine(config?: Partial<SyncConfig>): SyncEngine {
  if (!syncEngineInstance) {
    syncEngineInstance = new SyncEngine(config)
  }
  return syncEngineInstance
}

export function resetSyncEngine(): void {
  if (syncEngineInstance) {
    syncEngineInstance.destroy()
    syncEngineInstance = null
  }
}
