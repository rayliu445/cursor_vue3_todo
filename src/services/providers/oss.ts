/**
 * 阿里云 OSS 提供者
 *
 * 基于阿里云 OSS S3-compatible API 实现跨平台数据同步。
 * 使用 AccessKey + SecretKey 认证，无需 OAuth。
 *
 * 配置步骤详见 docs/aliyun-oss-guide.md
 */

import type { CloudProvider } from './types'

// ============ 常量 ============

/** OSS 默认 Region */
const DEFAULT_REGION = 'oss-cn-hangzhou'

// ============ 签名工具 ============

/** 计算 HMAC-SHA1 签名（OSS 认证） */
async function signHmacSHA1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw', encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

/** 生成 OSS 认证头 */
async function buildOSSHeaders(
  method: string,
  bucketEndpoint: string,
  resource: string,
  accessKeyId: string,
  accessKeySecret: string,
  contentMd5 = '',
  contentType = '',
): Promise<Record<string, string>> {
  const date = new Date().toUTCString()
  const canonicalizedOSS = ''
  const canonicalizedResource = `/${resource}`
  const stringToSign = `${method}\n${contentMd5}\n${contentType}\n${date}\n${canonicalizedOSS}${canonicalizedResource}`
  const signature = await signHmacSHA1(accessKeySecret, stringToSign)

  return {
    Authorization: `OSS ${accessKeyId}:${signature}`,
    Date: date,
    ...(contentMd5 ? { 'Content-MD5': contentMd5 } : {}),
    ...(contentType ? { 'Content-Type': contentType } : {}),
  }
}

// ============ OSS Provider ============

export interface OSSConfig {
  /** 阿里云 AccessKey ID */
  accessKeyId: string
  /** 阿里云 AccessKey Secret */
  accessKeySecret: string
  /** OSS Region，如 oss-cn-hangzhou */
  region?: string
  /** OSS Bucket 名称 */
  bucket: string
  /** 基础路径 */
  basePath?: string
}

export class OSSProvider implements CloudProvider {
  readonly name = '阿里云 OSS'
  private config: OSSConfig
  private pollIntervals: Map<string, number> = new Map()
  private _initialized = false
  private etagCache: Map<string, string | null> = new Map()

  constructor(config: OSSConfig) {
    this.config = {
      ...config,
      region: config.region || DEFAULT_REGION,
      basePath: config.basePath || 'TinyDo',
    }
  }

  /** OSS Bucket 的 endpoint URL */
  private get endpoint(): string {
    return `https://${this.config.bucket}.${this.config.region}.aliyuncs.com`
  }

  // ============ CloudProvider 接口实现 ============

  async initialize(): Promise<void> {
    // 验证连接：尝试列出 bucket 中的文件
    try {
      const headers = await buildOSSHeaders(
        'GET',
        this.endpoint,
        `${this.config.basePath}/`,
        this.config.accessKeyId,
        this.config.accessKeySecret,
      )
      const res = await fetch(`${this.endpoint}/${this.config.basePath}/`, {
        method: 'GET',
        headers,
      })
      if (res.status === 403) throw new Error('AccessKey 无权访问此 Bucket')
      if (res.status === 404) {
        // Bucket 或路径不存在，但不影响初始化（会在首次写入时创建）
        this._initialized = true
        return
      }
      if (!res.ok) throw new Error(`OSS 连接失败: ${res.status}`)
      this._initialized = true
    } catch (err) {
      console.error('[OSS] Initialize error:', err)
      throw err
    }
  }

  async read(path: string): Promise<Uint8Array | null> {
    const ossPath = `${this.config.basePath}/${path}`
    try {
      const headers = await buildOSSHeaders(
        'GET', this.endpoint, ossPath,
        this.config.accessKeyId, this.config.accessKeySecret,
      )
      const res = await fetch(`${this.endpoint}/${ossPath}`, {
        method: 'GET',
        headers,
      })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`OSS read failed: ${res.status}`)
      return new Uint8Array(await res.arrayBuffer())
    } catch (err) {
      console.error('[OSS] Read error:', err)
      return null
    }
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    const ossPath = `${this.config.basePath}/${path}`
    try {
      const md5 = await md5Base64(data)
      const headers = await buildOSSHeaders(
        'PUT', this.endpoint, ossPath,
        this.config.accessKeyId, this.config.accessKeySecret,
        md5, 'application/octet-stream',
      )
      headers['Content-Type'] = 'application/octet-stream'

      const res = await fetch(`${this.endpoint}/${ossPath}`, {
        method: 'PUT',
        headers,
        body: new Blob([data], { type: 'application/octet-stream' }),
      })
      if (!res.ok) throw new Error(`OSS write failed: ${res.status}`)
    } catch (err) {
      console.error('[OSS] Write error:', err)
      throw err
    }
  }

  async delete(path: string): Promise<void> {
    const ossPath = `${this.config.basePath}/${path}`
    try {
      const headers = await buildOSSHeaders(
        'DELETE', this.endpoint, ossPath,
        this.config.accessKeyId, this.config.accessKeySecret,
      )
      const res = await fetch(`${this.endpoint}/${ossPath}`, {
        method: 'DELETE',
        headers,
      })
      if (res.status === 404) return
      if (!res.ok) throw new Error(`OSS delete failed: ${res.status}`)
    } catch (err) {
      console.error('[OSS] Delete error:', err)
    }
  }

  async exists(path: string): Promise<boolean> {
    const ossPath = `${this.config.basePath}/${path}`
    try {
      const headers = await buildOSSHeaders(
        'HEAD', this.endpoint, ossPath,
        this.config.accessKeyId, this.config.accessKeySecret,
      )
      const res = await fetch(`${this.endpoint}/${ossPath}`, {
        method: 'HEAD',
        headers,
      })
      return res.ok
    } catch {
      return false
    }
  }

  watch(path: string, callback: (event: 'change' | 'delete') => void): () => void {
    // OSS 没有原生文件监听，使用轮询 + ETag
    const interval = window.setInterval(async () => {
      try {
        const ossPath = `${this.config.basePath}/${path}`
        const headers = await buildOSSHeaders(
          'HEAD', this.endpoint, ossPath,
          this.config.accessKeyId, this.config.accessKeySecret,
        )
        const res = await fetch(`${this.endpoint}/${ossPath}`, {
          method: 'HEAD',
          headers,
        })

        if (res.status === 404) {
          const prev = this.etagCache.get(path)
          if (prev !== null) { callback('delete'); this.etagCache.set(path, null) }
          return
        }

        const etag = res.headers.get('etag')
        const prev = this.etagCache.get(path)
        if (etag && etag !== prev) {
          this.etagCache.set(path, etag)
          callback('change')
        }
      } catch { /* silent */ }
    }, 30000)

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
    this.etagCache.clear()
    this._initialized = false
  }

  /** 测试连接（供 UI 调用） */
  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.initialize()
      return { ok: true, message: '连接成功' }
    } catch (err: any) {
      return { ok: false, message: err.message || '连接失败' }
    }
  }
}

// ============ 工具函数 ============

/** 计算二进制数据的 MD5 Base64 */
async function md5Base64(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('MD5', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
}
