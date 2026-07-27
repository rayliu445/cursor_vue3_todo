/**
 * 七牛云 Kodo 提供者
 *
 * 基于七牛云 RS 管理 API + 上传 API 实现跨平台数据同步。
 * 使用 AccessKey + SecretKey 认证，无需 OAuth。
 *
 * 免费额度：10GB 存储 + 10万次写请求/月 + 100万次读请求/月
 * 配置步骤详见 docs/qiniu-kodo-guide.md
 */

import type { CloudProvider } from './types'

// ============ 常量 ============

const DEFAULT_REGION = 'cn-east-1'

// ============ 工具函数 ============

/** URL 安全的 Base64 编码（Qiniu 规范，保留 = 填充） */
function urlsafeBase64(data: string | Uint8Array): string {
  const binary = typeof data === 'string'
    ? btoa(unescape(encodeURIComponent(data)))
    : btoa(String.fromCharCode(...data))
  return binary.replace(/\+/g, '-').replace(/\//g, '_')
}

/** HMAC-SHA1 签名，返回二进制数组 */
async function hmacSha1(key: string, data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw', encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false, ['sign'],
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data)))
}

/** 生成 Qiniu 管理凭证 - 匹配 Qiniu SDK generateAccessToken */
async function buildAccessToken(
  path: string,
  accessKey: string,
  secretKey: string,
): Promise<string> {
  const signingStr = `${path}\n`
  const sign = await hmacSha1(secretKey, signingStr)
  return `QBox ${accessKey}:${urlsafeBase64(sign)}`
}

/** 生成上传凭证 (UploadToken) */
async function buildUploadToken(
  bucket: string,
  key: string,
  accessKey: string,
  secretKey: string,
): Promise<string> {
  const deadline = Math.floor(Date.now() / 1000) + 3600
  const putPolicy = JSON.stringify({
    scope: `${bucket}:${key}`,
    deadline,
  })
  const encodedPutPolicy = urlsafeBase64(putPolicy)
  const sign = await hmacSha1(secretKey, encodedPutPolicy)
  return `${accessKey}:${urlsafeBase64(sign)}:${encodedPutPolicy}`
}

/** 对 EntryURI (bucket:key) 进行编码 */
function encodedEntryURI(bucket: string, key: string): string {
  return urlsafeBase64(`${bucket}:${key}`)
}

// ============ Kodo Provider ============

export interface KodoConfig {
  accessKeyId: string
  accessKeySecret: string
  bucket: string
  region?: string
  basePath?: string
}

export class KodoProvider implements CloudProvider {
  readonly name = '七牛云 Kodo'
  private config: KodoConfig
  private pollIntervals: Map<string, number> = new Map()
  private _initialized = false
  private _etag: string | null = null

  constructor(config: KodoConfig) {
    this.config = {
      ...config,
      region: config.region || DEFAULT_REGION,
      basePath: config.basePath || 'TodoApp',
    }
  }

  private get objectKey(): string {
    return `${this.config.basePath}/data.automerge`
  }

  private get entryURI(): string {
    return encodedEntryURI(this.config.bucket, this.objectKey)
  }

  // ============ CloudProvider 接口实现 ============

  async initialize(): Promise<void> {
    try {
      const path = '/buckets'
      const token = await buildAccessToken(path, this.config.accessKeyId, this.config.accessKeySecret)
      const res = await fetch(`https://rs.qiniu.com${path}`, {
        headers: { Authorization: token },
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.error('[Kodo] API 响应:', res.status, body)
        if (res.status === 401) {
          throw new Error(`认证失败 (${body || 'BadToken'})，请检查 AK/SK 是否正确`)
        }
        throw new Error(`连接失败: ${res.status}`)
      }
      const buckets = await res.json()
      if (!buckets.includes(this.config.bucket)) {
        throw new Error(`Bucket "${this.config.bucket}" 不存在`)
      }
      this._initialized = true
    } catch (err: any) {
      if (err.message?.includes('认证') || err.message?.includes('不存在')) throw err
      console.error('[Kodo] Initialize warning:', err)
      this._initialized = true
    }
  }

  async read(path: string): Promise<Uint8Array | null> {
    try {
      const getPath = `/get/${this.entryURI}`
      const token = await buildAccessToken(getPath, this.config.accessKeyId, this.config.accessKeySecret)
      const res = await fetch(`https://rs.qiniu.com${getPath}`, {
        method: 'GET',
        headers: { Authorization: token },
      })
      if (res.status === 612) return null
      if (!res.ok) return null
      return new Uint8Array(await res.arrayBuffer())
    } catch (err) {
      console.error('[Kodo] Read error:', err)
      return null
    }
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    try {
      const uploadToken = await buildUploadToken(this.config.bucket, this.objectKey, this.config.accessKeyId, this.config.accessKeySecret)
      const base64Data = btoa(String.fromCharCode(...data))
      const encodedKey = urlsafeBase64(this.objectKey)

      const res = await fetch(`https://up.qiniup.com/putb64/${data.length}/key/${encodedKey}`, {
        method: 'POST',
        headers: {
          Authorization: `UpToken ${uploadToken}`,
          'Content-Type': 'application/octet-stream',
        },
        body: base64Data,
      })
      if (!res.ok) {
        const errBody = await res.text().catch(() => '')
        throw new Error(`上传失败 (${res.status}: ${errBody})`)
      }
    } catch (err) {
      console.error('[Kodo] Write error:', err)
      throw err
    }
  }

  async delete(path: string): Promise<void> {
    try {
      const delPath = `/delete/${this.entryURI}`
      const token = await buildAccessToken(delPath, this.config.accessKeyId, this.config.accessKeySecret)
      const res = await fetch(`https://rs.qiniu.com${delPath}`, {
        method: 'POST',
        headers: { Authorization: token },
      })
      if (res.status === 612) return
      if (!res.ok) console.warn('[Kodo] Delete warning:', res.status)
    } catch (err) {
      console.error('[Kodo] Delete error:', err)
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      const statPath = `/stat/${this.entryURI}`
      const token = await buildAccessToken(statPath, this.config.accessKeyId, this.config.accessKeySecret)
      const res = await fetch(`https://rs.qiniu.com${statPath}`, {
        method: 'GET',
        headers: { Authorization: token },
      })
      return res.status === 200
    } catch {
      return false
    }
  }

  watch(path: string, callback: (event: 'change' | 'delete') => void): () => void {
    const interval = window.setInterval(async () => {
      try {
        const statPath = `/stat/${this.entryURI}`
        const token = await buildAccessToken(statPath, this.config.accessKeyId, this.config.accessKeySecret)
        const res = await fetch(`https://rs.qiniu.com${statPath}`, {
          method: 'GET',
          headers: { Authorization: token },
        })
        if (res.status === 612) {
          if (this._etag !== null) { callback('delete'); this._etag = null }
          return
        }
        if (res.ok) {
          const data = await res.json()
          if (this._etag && data.hash !== this._etag) callback('change')
          this._etag = data.hash
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
    this._etag = null
    this._initialized = false
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.initialize()
      if (!this._initialized) throw new Error('连接失败')
      return { ok: true, message: '连接成功' }
    } catch (err: any) {
      return { ok: false, message: err.message || '连接失败' }
    }
  }
}
