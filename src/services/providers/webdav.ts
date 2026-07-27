/**
 * WebDAV 提供者
 * 
 * 支持 WebDAV 协议的云存储，如：
 * - Nextcloud
 * - 坚果云 (Nutstore)
 * - Synology Drive
 * - ownCloud
 * 
 * WebDAV 的优势：无需原生 SDK，纯 HTTP 实现，所有平台通用。
 */

import type { CloudProvider } from './types'

export interface WebDAVConfig {
  /** WebDAV 服务器 URL */
  url: string
  /** 用户名 */
  username: string
  /** 密码或应用密码 */
  password: string
  /** 基础路径 */
  basePath?: string
}

export class WebDAVProvider implements CloudProvider {
  readonly name = 'WebDAV'
  private config: WebDAVConfig
  private pollingIntervals: Map<string, number> = new Map()
  private lastETags: Map<string, string | null> = new Map()

  constructor(config: WebDAVConfig) {
    this.config = {
      ...config,
      basePath: config.basePath ?? 'TinyDo',
    }
  }

  get baseUrl(): string {
    const base = this.config.url.replace(/\/+$/, '')
    const path = this.config.basePath!.replace(/^\/+/, '')
    return `${base}/${path}`
  }

  async initialize(): Promise<void> {
    // 验证连接
    try {
      const response = await this.request('PROPFIND', '/', {
        headers: { Depth: '0' },
      })
      if (response.status === 401) {
        throw new Error('WebDAV authentication failed')
      }
      if (response.status >= 200 && response.status < 300) {
        console.log('[WebDAV] Connected successfully')
      }
    } catch (err) {
      console.warn('[WebDAV] Connection test failed:', err)
      // 不抛出异常，允许用户稍后重试
    }
  }

  async read(path: string): Promise<Uint8Array | null> {
    try {
      const response = await this.request('GET', path)
      if (response.status === 404) return null
      if (!response.ok) throw new Error(`GET failed: ${response.status}`)

      const buffer = await response.arrayBuffer()
      return new Uint8Array(buffer)
    } catch (err) {
      console.error('[WebDAV] Read error:', err)
      return null
    }
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    try {
      const response = await this.request('PUT', path, {
        body: data,
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      })
      if (!response.ok) throw new Error(`PUT failed: ${response.status}`)
    } catch (err) {
      console.error('[WebDAV] Write error:', err)
      throw err
    }
  }

  async delete(path: string): Promise<void> {
    try {
      const response = await this.request('DELETE', path)
      if (response.status === 404) return
      if (!response.ok) throw new Error(`DELETE failed: ${response.status}`)
    } catch (err) {
      console.error('[WebDAV] Delete error:', err)
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      const response = await this.request('PROPFIND', path, {
        headers: { Depth: '0' },
      })
      return response.ok
    } catch {
      return false
    }
  }

  watch(path: string, callback: (event: 'change' | 'delete') => void): () => void {
    // WebDAV 没有原生文件监听，使用轮询 + ETag
    const interval = window.setInterval(async () => {
      try {
        const response = await this.request('PROPFIND', path, {
          headers: { Depth: '0' },
        })

        if (response.status === 404) {
          const prevEtag = this.lastETags.get(path)
          if (prevEtag !== null) {
            callback('delete')
            this.lastETags.set(path, null)
          }
          return
        }

        const etag = response.headers.get('etag')
        const prevEtag = this.lastETags.get(path)

        if (etag && etag !== prevEtag) {
          this.lastETags.set(path, etag)
          callback('change')
        }
      } catch {
        // 忽略轮询错误
      }
    }, 15000) // 15 秒轮询

    this.pollingIntervals.set(path, interval)
    return () => {
      window.clearInterval(interval)
      this.pollingIntervals.delete(path)
    }
  }

  destroy(): void {
    for (const [, interval] of this.pollingIntervals) {
      window.clearInterval(interval)
    }
    this.pollingIntervals.clear()
    this.lastETags.clear()
  }

  // ============ HTTP 请求封装 ============

  private async request(
    method: string,
    path: string,
    options?: {
      body?: any
      headers?: Record<string, string>
    },
  ): Promise<Response> {
    const url = `${this.baseUrl}/${path.replace(/^\//, '')}`
    const auth = btoa(`${this.config.username}:${this.config.password}`)

    return fetch(url, {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        ...options?.headers,
      },
      body: options?.body,
    })
  }
}
