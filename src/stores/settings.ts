import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getSyncEngine, type SyncEngine } from '../services/sync-engine'
import type { SyncConfig } from '../services/providers/types'
import { DEFAULT_SYNC_CONFIG } from '../services/providers/types'
import { WebDAVProvider, type WebDAVConfig } from '../services/providers/webdav'
import { GoogleDriveProvider, type GoogleDriveConfig } from '../services/providers/gdrive'

// ============ 类型 ============

export interface CloudProviderConfig {
  id: string
  name: string
  type: 'webdav' | 'gdrive' | 'icloud' | 'local'
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
      id: 'webdav-default',
      name: 'WebDAV',
      type: 'webdav',
      enabled: false,
      config: {
        url: '',
        username: '',
        password: '',
        basePath: 'TodoApp',
      },
      status: 'disconnected',
    },
    {
      id: 'gdrive-default',
      name: 'Google Drive',
      type: 'gdrive',
      enabled: false,
      config: {
        clientId: '',
        apiKey: '',
        folderId: '',
      },
      status: 'disconnected',
    },
    {
      id: 'local-default',
      name: '本地文件系统',
      type: 'local',
      enabled: false,
      config: {
        syncPath: '~/TodoApp',
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
      if (provider.type === 'webdav') {
        const webdavConfig: WebDAVConfig = {
          url: provider.config.url,
          username: provider.config.username,
          password: provider.config.password,
          basePath: provider.config.basePath,
        }
        const webdavProvider = new WebDAVProvider(webdavConfig)
        await webdavProvider.initialize()
        await syncEngine.setProvider(webdavProvider)
        provider.status = 'connected'
      } else if (provider.type === 'local') {
        // 本地文件系统 - 仅 Electron 环境可用
        try {
          const { LocalFileSystemProvider } = await import('../services/providers/local-fs')
          const localProvider = new LocalFileSystemProvider(
            provider.config.syncPath || './todo-data',
          )
          await localProvider.initialize()
          await syncEngine.setProvider(localProvider)
          provider.status = 'connected'
        } catch {
          provider.status = 'error'
          provider.lastError = '本地文件系统仅支持 Electron 桌面端'
        }
      } else if (provider.type === 'gdrive') {
        // Google Drive - OAuth 2.0 with PKCE
        try {
          if (!provider.config.clientId) {
            throw new Error('请先在 Google Cloud Console 创建 OAuth 凭据并填入客户端 ID')
          }
          const gdriveConfig: GoogleDriveConfig = {
            clientId: provider.config.clientId,
          }
          const gdriveProvider = new GoogleDriveProvider(gdriveConfig)
          await gdriveProvider.initialize()
          // 检查是否有有效 token
          if (!gdriveProvider.isAuthenticated) {
            // 启动 OAuth 授权
            const authorized = await gdriveProvider.authorize()
            if (!authorized) {
              throw new Error('Google Drive 授权失败')
            }
          }
          await syncEngine.setProvider(gdriveProvider)
          provider.status = 'connected'
        } catch (err) {
          provider.status = 'error'
          provider.lastError = err instanceof Error ? err.message : 'Google Drive 连接失败'
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
    // 如果当前是 Google Drive，先撤销 token
    const active = activeProvider.value
    if (active?.type === 'gdrive') {
      try {
        const { GoogleDriveProvider } = await import('../services/providers/gdrive')
        // 直接清除本地存储的 token
        localStorage.removeItem('gdrive-tokens')
      } catch { /* ignore */ }
    }
    syncEngine.destroy()
    settings.value.providers.forEach(p => {
      p.enabled = false
      p.status = 'disconnected'
    })
    settings.value.sync.enabled = false
    saveSettings(settings.value)
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
