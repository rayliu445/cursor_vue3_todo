/**
 * Google Drive 提供者
 * 
 * 用于 Android (Capacitor) 和可选的 Web 端的 Google Drive 同步。
 * 
 * 注意: Google Drive 集成需要 OAuth 2.0 认证，
 * 需要先在 Google Cloud Console 中创建项目并启用 Google Drive API。
 */

import type { CloudProvider } from './types'

/**
 * Google Drive 提供者
 * 
 * 当前为桩代码，实际集成需要：
 * 1. Google Cloud Console 创建 OAuth 2.0 凭据
 * 2. 使用 Google Drive API v3
 * 3. 在 Android (Capacitor) 中使用 Google Sign-In
 * 
 * 实施步骤详见 docs/google-drive-integration.md
 */
export class GoogleDriveProvider implements CloudProvider {
  readonly name = 'Google Drive'
  private accessToken: string | null = null
  private basePath: string
  private pollIntervals: Map<string, number> = new Map()

  constructor(basePath: string = 'TodoApp') {
    this.basePath = basePath
  }

  async initialize(): Promise<void> {
    // 需要 OAuth 认证获取 accessToken
    // 在 Capacitor 中使用 @capacitor/google-signin 插件
    console.log('[GoogleDrive] Initialization requires OAuth setup')
    // TODO: 实现 Google OAuth 流程
  }

  async read(path: string): Promise<Uint8Array | null> {
    if (!this.accessToken) {
      console.warn('[GoogleDrive] Not authenticated')
      return null
    }
    // TODO: 调用 Google Drive API v3 files.export 或 files.get
    return null
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    if (!this.accessToken) {
      console.warn('[GoogleDrive] Not authenticated')
      return
    }
    // TODO: 调用 Google Drive API v3 files.create/update
    // 将 data (Uint8Array) 作为 multipart/form-data 上传
  }

  async delete(path: string): Promise<void> {
    if (!this.accessToken) {
      console.warn('[GoogleDrive] Not authenticated')
      return
    }
    // TODO: 调用 Google Drive API v3 files.delete
  }

  async exists(path: string): Promise<boolean> {
    if (!this.accessToken) return false
    // TODO: 调用 Google Drive API v3 files.list 查找文件
    return false
  }

  watch(path: string, callback: (event: 'change' | 'delete') => void): () => void {
    // Google Drive 没有原生文件监听
    // 使用轮询策略
    const interval = window.setInterval(async () => {
      const exists = await this.exists(path)
      if (!exists) {
        callback('delete')
      } else {
        callback('change')
      }
    }, 60000) // 60 秒轮询

    this.pollIntervals.set(path, interval)
    return () => {
      window.clearInterval(interval)
      this.pollIntervals.delete(path)
    }
  }

  destroy(): void {
    for (const [, interval] of this.pollIntervals) {
      window.clearInterval(interval)
    }
    this.pollIntervals.clear()
    this.accessToken = null
  }

  /**
   * 设置访问令牌（供外部认证流程调用）
   */
  setAccessToken(token: string): void {
    this.accessToken = token
  }
}
