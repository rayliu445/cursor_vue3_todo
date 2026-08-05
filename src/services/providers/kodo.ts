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
import { Capacitor, CapacitorHttp } from '@capacitor/core'

// ============ 常量 ============

const DEFAULT_REGION = 'cn-east-1'

// ============ 环境判断 ============
// - Electron：通过 webSecurity:false 直连七牛
// - Capacitor 原生（iOS/Android）：用 CapacitorHttp 走原生网络栈（绕过 WKWebView 的 CORS）直连
// - 浏览器（Web dev / 部署平台）：走同源代理解决 CORS（Vite dev proxy / vercel.json / netlify.toml）
function isElectronEnv(): boolean {
  if (typeof window === 'undefined') return false
  if ((window as any).electronAPI) return true
  if (typeof location !== 'undefined' && location.protocol === 'file:') return true
  return false
}

const IS_ELECTRON = isElectronEnv()
const IS_CAPACITOR_NATIVE = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()
const DIRECT = IS_ELECTRON || IS_CAPACITOR_NATIVE

/** 七牛 RS 管理 API 基址 */
const RS_API_BASE = DIRECT ? 'https://rs.qiniu.com' : '/qiniu-rs'
/** 七牛上传 API 基址 */
const UP_API_BASE = DIRECT ? 'https://up.qiniup.com' : '/qiniu-up'
/** 下载链接 host 前缀：浏览器把绝对 url 改写为同源代理 /qiniu-dl */
const DL_HOST_PREFIX = DIRECT ? '' : '/qiniu-dl'

/**
 * 跨平台请求封装：
 * - Capacitor 原生（iOS/Android）：走 CapacitorHttp（原生网络栈，绕过 CORS），
 *   否则打包后 /qiniu-rs 代理不存在，请求打到 app 本地导致同步全部失败。
 * - 其他环境：标准 fetch（Electron 直连 / Web 走同源代理）
 */
async function qiniuFetch(url: string, init?: RequestInit, responseType?: 'arraybuffer' | 'json' | 'text'): Promise<Response> {
  if (IS_CAPACITOR_NATIVE) {
    const headers: Record<string, string> = {}
    const h = init?.headers
    if (h) {
      if (typeof Headers !== 'undefined' && h instanceof Headers) {
        h.forEach((v, k) => { headers[k] = v })
      } else if (Array.isArray(h)) {
        h.forEach(([k, v]) => { headers[k] = String(v) })
      } else {
        Object.assign(headers, h as Record<string, string>)
      }
    }
    const res = await CapacitorHttp.request({
      url,
      method: (init?.method as any) || 'GET',
      headers,
      data: init?.body as any,
      responseType,
      connectTimeout: 20000,
      readTimeout: 60000,
    })
    const ok = res.status >= 200 && res.status < 300
    return {
      ok,
      status: res.status,
      text: async () => (typeof res.data === 'string' ? res.data : JSON.stringify(res.data ?? '')),
      json: async () => (typeof res.data === 'string' ? JSON.parse(res.data) : res.data),
      arrayBuffer: async () => {
        const d = res.data
        if (d == null) return new ArrayBuffer(0)
        if (typeof d === 'string') {
          if (responseType === 'arraybuffer') {
            const bin = atob(d)
            const bytes = new Uint8Array(bin.length)
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
            return bytes.buffer
          }
          return new TextEncoder().encode(d).buffer
        }
        return new ArrayBuffer(0)
      },
    } as unknown as Response
  }
  return fetch(url, init)
}

// ============ 工具函数 ============

/** Uint8Array → Base64（分块拼接，避免 String.fromCharCode(...) 展开超大数组导致 Maximum call stack size exceeded） */
function bytesToBase64(data: Uint8Array): string {
  let binary = ''
  const CHUNK = 0x8000 // 32KB 分块，远低于 V8 参数上限
  for (let i = 0; i < data.length; i += CHUNK) {
    binary += String.fromCharCode(...data.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/** URL 安全的 Base64 编码（Qiniu 规范，保留 = 填充） */
function urlsafeBase64(data: string | Uint8Array): string {
  const binary = typeof data === 'string'
    ? btoa(unescape(encodeURIComponent(data)))
    : bytesToBase64(data)
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
      basePath: config.basePath || 'TinyDo',
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
    // 注意：这里必须真实连通并校验通过才算成功。
    // 之前 catch 里会吞掉网络错误（断网/CORS/DNS）并置 _initialized=true，
    // 导致"测试连接"在假配置/无法访问时也显示成功。现在一律如实上报，
    // 并且区分不同失败原因，给出可操作的错误提示。

    /** 解析七牛 API 返回的错误详情 */
    function parseQiniuError(bodyText: string): string {
      if (!bodyText) return ''
      try {
        const parsed = JSON.parse(bodyText)
        if (parsed && typeof parsed.error === 'string') return parsed.error
        return bodyText
      } catch {
        return bodyText
      }
    }

    const path = '/buckets'
    const token = await buildAccessToken(path, this.config.accessKeyId, this.config.accessKeySecret)
    let res: Response
    try {
      res = await qiniuFetch(`${RS_API_BASE}${path}`, {
        headers: { Authorization: token },
      })
    } catch (err: any) {
      // 网络层错误：区分离线 / 一般网络错误 / CORS
      console.error('[Kodo] 网络请求失败:', err)
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('当前处于离线状态，无法连接七牛云，请检查网络连接')
      }
      const detail = err && err.message ? `（${err.message}）` : ''
      throw new Error(`无法连接七牛云，请检查网络或稍后重试${detail}`)
    }

    // HTTP 层错误：解析七牛返回的具体错误信息，区分不同原因
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '')
      const qiniuMsg = parseQiniuError(bodyText)
      console.error('[Kodo] API 响应:', res.status, qiniuMsg)
      const suffix = qiniuMsg ? `（${qiniuMsg}）` : ''
      switch (res.status) {
        case 401:
          throw new Error(`认证失败${suffix}，请检查 AccessKey ID / AccessKey Secret 是否正确`)
        case 403:
          throw new Error(`权限不足${suffix}，请确认该密钥有对应空间（bucket）的访问权限`)
        case 400:
          throw new Error(`请求无效${suffix}，请检查配置是否正确`)
        case 404:
          throw new Error(`接口不存在${suffix}`)
        default:
          throw new Error(`连接失败 (HTTP ${res.status})${suffix}`)
      }
    }

    // 鉴权通过但 bucket 不存在
    const buckets = await res.json().catch(() => [] as string[])
    if (!Array.isArray(buckets) || !buckets.includes(this.config.bucket)) {
      const available = Array.isArray(buckets) && buckets.length > 0
        ? `（可用空间：${buckets.slice(0, 5).join('、')}${buckets.length > 5 ? '…' : ''}）`
        : ''
      throw new Error(`Bucket "${this.config.bucket}" 不存在，请检查名称${available}`)
    }
    this._initialized = true
  }

  async read(path: string): Promise<Uint8Array | null> {
    try {
      const getPath = `/get/${this.entryURI}`
      const token = await buildAccessToken(getPath, this.config.accessKeyId, this.config.accessKeySecret)
      const res = await qiniuFetch(`${RS_API_BASE}${getPath}`, {
        method: 'GET',
        headers: { Authorization: token },
      })
      if (res.status === 612) return null
      if (!res.ok) return null
      // 注意：rs.qiniu.com/get/ 返回的是文件元信息 JSON（含临时下载 url），
      // 真正的文件内容需要再请求 meta.url 获取，不能直接把 JSON 当文件内容。
      const meta = await res.json().catch(() => null)
      if (!meta || typeof meta.url !== 'string') return null
      // 浏览器环境把绝对下载链接改写为同源代理路径，规避 iovip.qbox.me 无 CORS 头
      const dlUrl = DL_HOST_PREFIX
        ? meta.url.replace(/^https?:\/\/[^/]+/, DL_HOST_PREFIX)
        : meta.url
      const dlRes = await qiniuFetch(dlUrl, undefined, 'arraybuffer')
      if (!dlRes.ok) return null
      return new Uint8Array(await dlRes.arrayBuffer())
    } catch (err) {
      console.error('[Kodo] Read error:', err)
      return null
    }
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    try {
      const uploadToken = await buildUploadToken(this.config.bucket, this.objectKey, this.config.accessKeyId, this.config.accessKeySecret)
      const base64Data = bytesToBase64(data)
      const encodedKey = urlsafeBase64(this.objectKey)

      const res = await qiniuFetch(`${UP_API_BASE}/putb64/${data.length}/key/${encodedKey}`, {
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
      const res = await qiniuFetch(`${RS_API_BASE}${delPath}`, {
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
      const res = await qiniuFetch(`${RS_API_BASE}${statPath}`, {
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
        const res = await qiniuFetch(`${RS_API_BASE}${statPath}`, {
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
