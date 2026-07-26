/**
 * 本地文件系统提供者
 * 
 * 用于 Electron 桌面端，直接读写本地文件。
 * 用户可以将此文件夹放入 iCloud Drive / Dropbox / Syncthing 等
 * 第三方同步服务中，实现"手动"多端同步。
 */

import type { CloudProvider } from './types'
import type { FSWatcher } from 'fs'

export class LocalFileSystemProvider implements CloudProvider {
  readonly name = 'Local File System'
  private fs: any = null
  private path: any = null
  private watchers: Map<string, FSWatcher> = new Map()
  private baseDir: string

  constructor(baseDir: string) {
    this.baseDir = baseDir
    try {
      this.fs = require('fs')
      this.path = require('path')
    } catch {
      throw new Error('fs module not available in this environment')
    }
  }

  async initialize(): Promise<void> {
    // 确保目录存在
    if (!this.fs.existsSync(this.baseDir)) {
      this.fs.mkdirSync(this.baseDir, { recursive: true })
    }
    console.log('[LocalFS Provider] Initialized at', this.baseDir)
  }

  async read(path: string): Promise<Uint8Array | null> {
    const fullPath = this.resolve(path)
    try {
      if (!this.fs.existsSync(fullPath)) return null
      return this.fs.readFileSync(fullPath)
    } catch (err) {
      console.error('[LocalFS] Error reading file:', err)
      return null
    }
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    const fullPath = this.resolve(path)
    try {
      const dir = this.path.dirname(fullPath)
      if (!this.fs.existsSync(dir)) {
        this.fs.mkdirSync(dir, { recursive: true })
      }
      this.fs.writeFileSync(fullPath, data)
    } catch (err) {
      console.error('[LocalFS] Error writing file:', err)
      throw err
    }
  }

  async delete(path: string): Promise<void> {
    const fullPath = this.resolve(path)
    try {
      if (this.fs.existsSync(fullPath)) {
        this.fs.unlinkSync(fullPath)
      }
    } catch (err) {
      console.error('[LocalFS] Error deleting file:', err)
    }
  }

  async exists(path: string): Promise<boolean> {
    return this.fs.existsSync(this.resolve(path))
  }

  watch(path: string, callback: (event: 'change' | 'delete') => void): () => void {
    const fullPath = this.resolve(path)

    // 停止现有监视器
    const existing = this.watchers.get(path)
    if (existing) {
      existing.close()
    }

    const watcher = this.fs.watch(fullPath, (eventType: string) => {
      if (eventType === 'change') {
        callback('change')
      } else if (eventType === 'rename') {
        // rename 可能是删除或移动
        if (!this.fs.existsSync(fullPath)) {
          callback('delete')
        } else {
          callback('change')
        }
      }
    })

    this.watchers.set(path, watcher)
    return () => {
      watcher.close()
      this.watchers.delete(path)
    }
  }

  async stat(path: string): Promise<{ size: number; modifiedAt: Date } | null> {
    const fullPath = this.resolve(path)
    try {
      if (!this.fs.existsSync(fullPath)) return null
      const stats = this.fs.statSync(fullPath)
      return {
        size: stats.size,
        modifiedAt: stats.mtime,
      }
    } catch {
      return null
    }
  }

  destroy(): void {
    for (const [path, watcher] of this.watchers) {
      watcher.close()
    }
    this.watchers.clear()
  }

  private resolve(relativePath: string): string {
    return this.path.join(this.baseDir, relativePath)
  }
}
