/**
 * 七牛云 Kodo 提供者
 *
 * 基于七牛云对象存储 API 实现跨平台数据同步。
 * 使用 AccessKey + SecretKey 认证，无需 OAuth。
 *
 * 免费额度：10GB 存储 + 10万次写请求/月 + 100万次读请求/月
 * 配置步骤详见 docs/qiniu-kodo-guide.md
 */

import type { CloudProvider } from './types'

// ============ 常量 ============

/** 七牛云 Kodo Endpoint 映射 */
const REGION_ENDPOINTS: Record<string, string> = {
  'cn-east-1': 's3.cn-east-1.qiniucs.com',     // 华东
  'cn-east-2': 's3.cn-east-2.qiniucs.com',     // 华东2
  'cn-north-1': 's3.cn-north-1.qiniucs.com',   // 华北
  'cn-south-1': 's3.cn-south-1.qiniucs.com',   // 华南
  'us-north-1': 's3.us-north-1.qiniucs.com',   // 北美
  'ap-southeast-1': 's3.ap-southeast-1.qiniucs.com', // 东南亚
}

const DEFAULT_REGION = 'cn-east-1'

// ============ 签名工具 ============

/** HMAC-SHA1 签名 */
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

/** 七牛云 S3 兼容 API 签名头部 */
async function buildS3Headers(
  method: string,
  canonicalUri: string,
  accessKeyId: string,
  accessKeySecret: string,
  headers: Record<string, string> = {},
): Promise<Record<string, string>> {
  const date = new Date().toUTCString()
  const allHeaders = { ...headers, Date: date, Host: '', 'x-amz-date': '' }

  // S3 兼容签名简化版（七牛实际只需要 Date 和 Authorization）
  // 格式: Authorization = "Qiniu " + AccessKey + ":" + URLSafeBase64(HMAC-SHA1(SecretKey, "<Method>\n<Date>\n<Path>"))
  const signStr = `${method}\n${date}\n${canonicalUri}`
  const signature = await signHmacSHA1(accessKeySecret, signStr)
  const encodedSig = btoa(signature)

  return {
    ...allHeaders,
    Date: date,
    Authorization: `Qiniu ${accessKeyId}:${encodedSig}`,
  }
}

// ============ Kodo Provider ============

export interface KodoConfig {
  /** 七牛云 AccessKey */
  accessKeyId: string
  /** 七牛云 SecretKey */
  accessKeySecret: string
  /** 存储空间名称（Bucket）*/
  bucket: string
  /** 地域，如 cn-east-1（华东）*/
  region?: string
  /** 基础路径 */
  basePath?: string
}

export class KodoProvider implements CloudProvider {
  readonly name = '七牛云 Kodo'
  private config: KodoConfig
  private pollIntervals: Map<string, number> = new Map()
  private _initialized = false
  private etagCache: Map<string, string | null> = new Map()

  constructor(config: KodoConfig) {
    this.config = {
      ...config,
      region: config.region || DEFAULT_REGION,
      basePath: config.basePath || 'TodoApp',
    }
  }

  /** 获取 S3 兼容 Endpoint */
  private get endpoint(): string {
    return REGION_ENDPOINTS[this.config.region!] || REGION_ENDPOINTS[DEFAULT_REGION]
  }

  private objectUrl(path: string): string {
    return `https://${this.endpoint}/${this.config.bucket}/${this.config.basePath}/${path}`
  }

  // ============ CloudProvider 接口实现 ============

  async initialize(): Promise<void> {
    try {
      // 验证：尝试列出 Bucket 中文件
      const uri = `/${this.config.bucket}?list`
      const headers = await buildS3Headers('GET', uri, this.config.accessKeyId, this.config.accessKeySecret)
      const res = await fetch(`https://${this.endpoint}${uri}`, { method: 'GET', headers })
      if (res.status === 403) throw new Error('AccessKey 无权访问此 Bucket')
      if (res.status === 404) throw new Error(`Bucket "${this.config.bucket}" 不存在`)
      this._initialized = true
    } catch (err) {
      console.error('[Kodo] Initialize error:', err)
      throw err
    }
  }

  async read(path: string): Promise<Uint8Array | null> {
    const objectPath = `${this.config.basePath}/${path}`
    try {
      const uri = `/${this.config.bucket}/${objectPath}`
      const headers = await buildS3Headers('GET', uri, this.config.accessKeyId, this.config.accessKeySecret)
      const res = await fetch(`https://${this.endpoint}${uri}`, { method: 'GET', headers })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`Read failed: ${res.status}`)
      return new Uint8Array(await res.arrayBuffer())
    } catch (err) {
      console.error('[Kodo] Read error:', err)
      return null
    }
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    const objectPath = `${this.config.basePath}/${path}`
    try {
      const uri = `/${this.config.bucket}/${objectPath}`
      const headers = await buildS3Headers('PUT', uri, this.config.accessKeyId, this.config.accessKeySecret, {
        'Content-Type': 'application/octet-stream',
      })
      headers['Content-Type'] = 'application/octet-stream'

      const res = await fetch(`https://${this.endpoint}${uri}`, {
        method: 'PUT',
        headers,
        body: new Blob([data], { type: 'application/octet-stream' }),
      })
      if (!res.ok) throw new Error(`Write failed: ${res.status}`)
    } catch (err) {
      console.error('[Kodo] Write error:', err)
      throw err
    }
  }

  async delete(path: string): Promise<void> {
    const objectPath = `${this.config.basePath}/${path}`
    try {
      const uri = `/${this.config.bucket}/${objectPath}`
      const headers = await buildS3Headers('DELETE', uri, this.config.accessKeyId, this.config.accessKeySecret)
      const res = await fetch(`https://${this.endpoint}${uri}`, { method: 'DELETE', headers })
      if (res.status === 404) return
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
    } catch (err) {
      console.error('[Kodo] Delete error:', err)
    }
  }

  async exists(path: string): Promise<boolean> {
    const objectPath = `${this.config.basePath}/${path}`
    try {
      const uri = `/${this.config.bucket}/${objectPath}`
      const headers = await buildS3Headers('HEAD', uri, this.config.accessKeyId, this.config.accessKeySecret)
      const res = await fetch(`https://${this.endpoint}${uri}`, { method: 'HEAD', headers })
      return res.ok
    } catch {
      return false
    }
  }

  watch(path: string, callback: (event: 'change' | 'delete') => void): () => void {
    const interval = window.setInterval(async () => {
      try {
        const objectPath = `${this.config.basePath}/${path}`
        const uri = `/${this.config.bucket}/${objectPath}`
        const headers = await buildS3Headers('HEAD', uri, this.config.accessKeyId, this.config.accessKeySecret)
        const res = await fetch(`https://${this.endpoint}${uri}`, { method: 'HEAD', headers })

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

  /** 测试连接 */
  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.initialize()
      return { ok: true, message: '连接成功' }
    } catch (err: any) {
      return { ok: false, message: err.message || '连接失败' }
    }
  }
}
