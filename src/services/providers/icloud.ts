/**
 * iCloud Drive 提供者
 * 
 * 用于 macOS (Electron) 和 iOS (Capacitor) 的 iCloud Drive 同步。
 * 
 * macOS Electron:
 *   iCloud Drive 在文件系统中表现为 ~/Library/Mobile Documents/com~apple~CloudDocs/
 *   可以直接用 fs 模块操作，类似 LocalFileSystemProvider
 * 
 * iOS Capacitor:
 *   需要使用原生插件访问 iCloud Container
 */

import type { CloudProvider } from './types'

/**
 * macOS Electron 上的 iCloud Drive 路径
 * 用户需要在系统偏好设置中启用 iCloud Drive
 */
function getICloudDrivePath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '/Users/current_user'
  return `${home}/Library/Mobile Documents/com~apple~CloudDocs`
}

export class ICloudProvider implements CloudProvider {
  readonly name = 'iCloud Drive'
  private fs: any = null
  private path: any = null
  private baseDir: string
  private isCapacitor: boolean
  private watchers: Map<string, any> = new Map()

  constructor(customPath?: string) {
    this.isCapacitor = typeof (window as any).Capacitor !== 'undefined'

    if (customPath) {
      this.baseDir = customPath
    } else if (!this.isCapacitor) {
      // Electron: 使用 iCloud Drive 路径
      this.baseDir = getICloudDrivePath()
    } else {
      // Capacitor (iOS): 使用 iCloud 容器路径，将在 initialize 中设置
      this.baseDir = ''
    }

    if (!this.isCapacitor) {
      try {
        this.fs = require('fs')
        this.path = require('path')
      } catch {
        throw new Error('fs module not available')
      }
    }
  }

  async initialize(): Promise<void> {
    if (this.isCapacitor) {
      // Capacitor 环境，通过原生插件获取 iCloud 容器路径
      try {
        const Capacitor = (window as any).Capacitor
        const { Preferences } = await import('@capacitor/preferences')
        // 实际项目中使用 @capacitor/filesystem 插件
        // 这里作为示例，存储路径在原生端配置
        console.log('[iCloud] Capacitor iCloud initialized')
      } catch (err) {
        console.error('[iCloud] Capacitor init error:', err)
        throw err
      }
    } else {
      // Electron: 确保目录存在
      if (!this.fs.existsSync(this.baseDir)) {
        console.warn('[iCloud] iCloud Drive directory not found at', this.baseDir)
        console.warn('[iCloud] Make sure iCloud Drive is enabled in System Settings')
      }
    }
  }

  async read(path: string): Promise<Uint8Array | null> {
    if (this.isCapacitor) {
      return this.capacitorRead(path)
    }
    return this.electronRead(path)
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    if (this.isCapacitor) {
      return this.capacitorWrite(path, data)
    }
    return this.electronWrite(path, data)
  }

  async delete(path: string): Promise<void> {
    if (this.isCapacitor) {
      return this.capacitorDelete(path)
    }
    return this.electronDelete(path)
  }

  async exists(path: string): Promise<boolean> {
    if (this.isCapacitor) {
      return this.capacitorExists(path)
    }
    return this.electronExists(path)
  }

  watch(path: string, callback: (event: 'change' | 'delete') => void): () => void {
    if (this.isCapacitor) {
      // Capacitor 中通过 AppState 变化来触发同步检查
      console.log('[iCloud] Watch not directly supported in Capacitor, use poll-based sync')
      const interval = setInterval(async () => {
        const exists = await this.exists(path)
        if (exists) {
          callback('change')
        }
      }, 30000) // 30 秒轮询
      return () => clearInterval(interval)
    }

    const fullPath = this.path.join(this.baseDir, path)
    const watcher = this.fs.watch(fullPath, (eventType: string) => {
      if (eventType === 'change') {
        callback('change')
      }
    })
    this.watchers.set(path, watcher)
    return () => {
      watcher.close()
      this.watchers.delete(path)
    }
  }

  destroy(): void {
    for (const [path, watcher] of this.watchers) {
      watcher.close()
    }
    this.watchers.clear()
  }

  // ============ Electron (fs) 实现 ============

  private resolve(path: string): string {
    return this.path.join(this.baseDir, path)
  }

  private async electronRead(path: string): Promise<Uint8Array | null> {
    const fullPath = this.resolve(path)
    try {
      if (!this.fs.existsSync(fullPath)) return null
      return this.fs.readFileSync(fullPath)
    } catch {
      return null
    }
  }

  private async electronWrite(path: string, data: Uint8Array): Promise<void> {
    const fullPath = this.resolve(path)
    const dir = this.path.dirname(fullPath)
    if (!this.fs.existsSync(dir)) {
      this.fs.mkdirSync(dir, { recursive: true })
    }
    this.fs.writeFileSync(fullPath, data)
  }

  private async electronDelete(path: string): Promise<void> {
    const fullPath = this.resolve(path)
    if (this.fs.existsSync(fullPath)) {
      this.fs.unlinkSync(fullPath)
    }
  }

  private async electronExists(path: string): Promise<boolean> {
    return this.fs.existsSync(this.resolve(path))
  }

  // ============ Capacitor 实现（桩） ============

  private async capacitorRead(path: string): Promise<Uint8Array | null> {
    console.log('[iCloud Capacitor] Read not yet implemented, need @capacitor/filesystem')
    return null
  }

  private async capacitorWrite(path: string, data: Uint8Array): Promise<void> {
    console.log('[iCloud Capacitor] Write not yet implemented, need @capacitor/filesystem')
  }

  private async capacitorDelete(path: string): Promise<void> {
    console.log('[iCloud Capacitor] Delete not yet implemented, need @capacitor/filesystem')
  }

  private async capacitorExists(path: string): Promise<boolean> {
    console.log('[iCloud Capacitor] Exists not yet implemented, need @capacitor/filesystem')
    return false
  }
}
