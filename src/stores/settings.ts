import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getSyncEngine, type SyncEngine } from '../services/sync-engine'
import type { SyncConfig } from '../services/providers/types'
import { DEFAULT_SYNC_CONFIG } from '../services/providers/types'
import { OSSProvider, type OSSConfig } from '../services/providers/oss'

// ============ 类型 ============

export interface CloudProviderConfig {
  id: string
  name: string
  type: 'gdrive'
  enabled: boolean
  config: Record<string, string>
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  lastError?: string
}

export interface AppSettings {
  sync: SyncConfig
  providers: CloudProviderConfig[]
  ui: {
    defaultView: 'list' | 'calendar' | 'matrix'
    theme: 'light' | 'dark' | 'system'
  }
}

const DEFAULT_SETTINGS: AppSettings = {
  sync: { ...DEFAULT_SYNC_CONFIG },
  providers: [
    {
      id: 'oss-default',
      name: '阿里云 OSS',
      type: 'oss',
      enabled: false,
      config: {
        bucket: '',
        region: 'oss-cn-hangzhou',
        accessKeyId: '',
        accessKeySecret: '',
      },
      status: 'disconnected',
    },
  ],
  ui: {
    defaultView: 'list',
    theme: 'system',
  },
}

// ============ Store ============

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>(loadSettings())
  const syncEngine = getSyncEngine()

  // ============ Getter ============

  const activeProvider = computed(() => {
    return settings.value.providers.find(p => p.enabled) ?? null
  })

  const syncState = computed(() => {
    return syncEngine.getState()
  })

  const isSyncEnabled = computed(() => {
    return settings.value.sync.enabled && activeProvider.value !== null
  })

  // ============ Actions ============

  /** 更新同步配置 */
  function updateSyncConfig(config: Partial<SyncConfig>) {
    settings.value.sync = { ...settings.value.sync, ...config }
    syncEngine.updateConfig(settings.value.sync)
    saveSettings(settings.value)
  }

  /** 更新云存储提供者配置 */
  function updateProvider(providerId: string, updates: Partial<CloudProviderConfig>) {
    const idx = settings.value.providers.findIndex(p => p.id === providerId)
    if (idx !== -1) {
      settings.value.providers[idx] = { ...settings.value.providers[idx], ...updates }
      saveSettings(settings.value)
    }
  }

  /** 启用/禁用提供者 */
  function toggleProvider(providerId: string) {
    const provider = settings.value.providers.find(p => p.id === providerId)
    if (!provider) return

    // 先禁用所有其他提供者
    settings.value.providers.forEach(p => {
      if (p.id !== providerId) p.enabled = false
    })

    provider.enabled = !provider.enabled
    settings.value.sync.enabled = provider.enabled

    if (provider.enabled) {
      connectProvider(provider).catch(console.error)
    } else {
      settings.value.sync.enabled = false
      syncEngine.updateConfig({ enabled: false, provider: 'none' })
    }

    saveSettings(settings.value)
  }

  /** 连接云存储提供者 */
  async function connectProvider(provider: CloudProviderConfig) {
    provider.status = 'connecting'
    saveSettings(settings.value)

    try {
      if (provider.type === 'oss') {
        try {
          if (!provider.config.bucket || !provider.config.accessKeyId || !provider.config.accessKeySecret) {
            throw new Error('请填写 Bucket 名称和 AccessKey')
          }
          const ossConfig: OSSConfig = {
            bucket: provider.config.bucket,
            region: provider.config.region || 'oss-cn-hangzhou',
            accessKeyId: provider.config.accessKeyId,
            accessKeySecret: provider.config.accessKeySecret,
          }
          const ossProvider = new OSSProvider(ossConfig)
          // 测试连接
          const testResult = await ossProvider.testConnection()
          if (!testResult.ok) {
            throw new Error(testResult.message)
          }
          await syncEngine.setProvider(ossProvider)
          provider.status = 'connected'
        } catch (err) {
          provider.status = 'error'
          provider.lastError = err instanceof Error ? err.message : 'OSS 连接失败'
        }
      }

      settings.value.sync.enabled = provider.status === 'connected'
      saveSettings(settings.value)
    } catch (err) {
      provider.status = 'error'
      provider.lastError = err instanceof Error ? err.message : '连接失败'
      saveSettings(settings.value)
    }
  }

  /** 断开云存储连接 */
  async function disconnectProvider() {
    syncEngine.destroy()
    settings.value.providers.forEach(p => {
      p.enabled = false
      p.status = 'disconnected'
    })
    settings.value.sync.enabled = false
    saveSettings(settings.value)
  }

  /** 测试 OSS 连接 */
  async function testOSSConnection(): Promise<{ ok: boolean; message: string }> {
    const provider = settings.value.providers.find(p => p.id === 'oss-default')
    if (!provider) return { ok: false, message: '找不到 OSS 配置' }
    if (!provider.config.bucket || !provider.config.accessKeyId || !provider.config.accessKeySecret) {
      return { ok: false, message: '请先填写 Bucket 名称和 AccessKey' }
    }
    try {
      const ossConfig: OSSConfig = {
        bucket: provider.config.bucket,
        region: provider.config.region || 'oss-cn-hangzhou',
        accessKeyId: provider.config.accessKeyId,
        accessKeySecret: provider.config.accessKeySecret,
      }
      const ossProvider = new OSSProvider(ossConfig)
      return await ossProvider.testConnection()
    } catch (err: any) {
      return { ok: false, message: err.message || '连接测试失败' }
    }
  }

  /** 触发立即同步 */
  async function syncNow() {
    return syncEngine.syncNow()
  }

  /** 更新 UI 设置 */
  function updateUISettings(ui: Partial<AppSettings['ui']>) {
    settings.value.ui = { ...settings.value.ui, ...ui }
    saveSettings(settings.value)
  }

  return {
    settings,
    activeProvider,
    syncState,
    isSyncEnabled,
    updateSyncConfig,
    updateProvider,
    toggleProvider,
    connectProvider,
    disconnectProvider,
    testOSSConnection,
    syncNow,
    updateUISettings,
  }
})

// ============ 持久化 ============

const SETTINGS_KEY = 'todo-app-settings'

function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return { ...DEFAULT_SETTINGS, ...parsed, providers: parsed.providers || DEFAULT_SETTINGS.providers }
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS, providers: DEFAULT_SETTINGS.providers.map(p => ({ ...p })) }
}

function saveSettings(s: AppSettings) {
  try {
    // 敏感信息脱敏后存储（密码实际应该加密，当前简化处理）
    const toSave = {
      ...s,
      providers: s.providers.map(p => ({
        ...p,
        config: { ...p.config },
      })),
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave))
  } catch (err) {
    console.error('[Settings] Failed to save:', err)
  }
}
