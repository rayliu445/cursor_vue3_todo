/**
 * Google Drive 提供者
 *
 * 基于 OAuth 2.0 with PKCE 认证，调用 Google Drive API v3。
 * 适用于 Electron 桌面端和 Web 端。
 *
 * 使用前需要在 Google Cloud Console 创建 OAuth 2.0 桌面应用凭据。
 * 详见 docs/google-drive-integration.md
 */

import type { CloudProvider } from './types'

// ============ 常量 ============

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_DRIVE_API = 'https://www.googleapis.com/drive/v3'
const GOOGLE_DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3'

const SCOPES = ['https://www.googleapis.com/auth/drive.file']
const TOKEN_STORAGE_KEY = 'gdrive-tokens'

// ============ PKCE 工具 ============

/** 生成 PKCE code_verifier（43~128 个 ASCII 字符） */
function generateCodeVerifier(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const array = new Uint8Array(64)
  crypto.getRandomValues(array)
  return Array.from(array, byte => chars[byte % chars.length]).join('')
}

/** 使用 SHA-256 对 code_verifier 进行哈希，返回 base64url 编码的 challenge */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64urlEncode(new Uint8Array(hash))
}

/** Base64url 编码（无填充） */
function base64urlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** 生成随机 state 参数（防止 CSRF） */
function generateState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

// ============ Token 管理 ============

interface TokenStore {
  accessToken: string
  refreshToken: string
  expiryDate: number
}

function loadTokens(): TokenStore | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveTokens(tokens: TokenStore): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens))
}

function clearTokens(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

// ============ HTTP 工具 ============

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options)
      return res
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
  throw new Error('Request failed')
}

// ============ Google Drive Provider ============

export interface GoogleDriveConfig {
  clientId: string
  folderId?: string
}

export class GoogleDriveProvider implements CloudProvider {
  readonly name = 'Google Drive'
  private config: GoogleDriveConfig
  private tokens: TokenStore | null = null
  private basePath: string
  private pollIntervals: Map<string, number> = new Map()
  private _initialized = false
  private fileIdCache: Map<string, string> = new Map()

  constructor(config: GoogleDriveConfig, basePath: string = 'TodoApp') {
    this.config = config
    this.basePath = basePath
  }

  get isAuthenticated(): boolean {
    return this.tokens !== null && this.tokens.accessToken !== null
  }

  // ============ OAuth 授权流程 ============

  /**
   * 启动 OAuth 授权流程（PKCE 流程）
   *
   * Electron 环境：启动本地 HTTP 服务器接收回调
   * Web 环境：弹出窗口
   */
  async authorize(): Promise<boolean> {
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    const state = generateState()

    sessionStorage.setItem('gdrive-pkce-verifier', codeVerifier)
    sessionStorage.setItem('gdrive-pkce-state', state)

    const isElectron = typeof navigator !== 'undefined' && /Electron/.test(navigator.userAgent)
    return isElectron
      ? this.authorizeElectron(codeChallenge, state)
      : this.authorizeWeb(codeChallenge, state)
  }

  /** Electron 环境：启动本地 HTTP 服务器 */
  private authorizeElectron(codeChallenge: string, state: string): Promise<boolean> {
    const http = require('http')
    const port = 18245
    const redirectUri = `http://localhost:${port}/callback`
    const authUrl = this.buildAuthUrl(codeChallenge, state, redirectUri)

    return new Promise<boolean>((resolve, reject) => {
      const server = http.createServer()
      let resolved = false

      server.on('request', async (req: any, res: any) => {
        const url = new URL(req.url!, `http://${req.headers.host}`)

        if (url.pathname === '/callback') {
          const code = url.searchParams.get('code')
          const returnedState = url.searchParams.get('state')
          const errParam = url.searchParams.get('error')

          if (errParam) {
            res.writeHead(400, { 'Content-Type': 'text/html' })
            res.end(`<h1>授权失败</h1><p>${errParam}</p>`)
            if (!resolved) { resolved = true; reject(new Error(errParam)) }
            return
          }

          const savedState = sessionStorage.getItem('gdrive-pkce-state')
          if (returnedState !== savedState) {
            res.writeHead(400, { 'Content-Type': 'text/html' })
            res.end('<h1>State 不匹配，请重试</h1>')
            if (!resolved) { resolved = true; reject(new Error('State mismatch')) }
            return
          }

          try {
            await this.exchangeCodeForTokens(code!, redirectUri)
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end('<h1>✅ 授权成功！请关闭此窗口</h1><script>window.close()</script>')
            if (!resolved) { resolved = true; server.close(); resolve(true) }
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'text/html' })
            res.end(`<h1>❌ Token 交换失败</h1><p>${err.message}</p>`)
            if (!resolved) { resolved = true; server.close(); reject(err) }
          }
        }
      })

      server.listen(port, () => {
        try {
          require('electron').shell.openExternal(authUrl)
        } catch {
          // 降级：在应用内打开
          const { exec } = require('child_process')
          exec(`open "${authUrl}"`)
        }
      })

      setTimeout(() => {
        if (!resolved) {
          resolved = true
          server.close()
          reject(new Error('OAuth 授权超时'))
        }
      }, 120000)
    })
  }

  /** Web 环境：弹出窗口 */
  private authorizeWeb(codeChallenge: string, state: string): Promise<boolean> {
    const redirectUri = window.location.origin + '/gdrive-callback.html'
    const authUrl = this.buildAuthUrl(codeChallenge, state, redirectUri)

    return new Promise<boolean>((resolve, reject) => {
      const popup = window.open(authUrl, 'gdrive-auth', 'width=600,height=700')
      if (!popup) { reject(new Error('弹出窗口被拦截')); return }

      const timer = setInterval(async () => {
        try {
          if (popup.closed) { clearInterval(timer); reject(new Error('用户取消')); return }
          const popupUrl = popup.location.href
          if (popupUrl?.includes('/gdrive-callback.html')) {
            const url = new URL(popupUrl)
            const code = url.searchParams.get('code')
            const returnedState = url.searchParams.get('state')
            const error = url.searchParams.get('error')

            if (error) { clearInterval(timer); popup.close(); reject(new Error(error)); return }
            if (returnedState !== sessionStorage.getItem('gdrive-pkce-state')) {
              clearInterval(timer); popup.close(); reject(new Error('State mismatch')); return
            }
            if (code) {
              clearInterval(timer); popup.close()
              await this.exchangeCodeForTokens(code, redirectUri)
              resolve(true)
            }
          }
        } catch { /* 跨域访问 popup URL 会抛异常，正常 */ }
      }, 500)
    })
  }

  /** 构建 OAuth 授权 URL */
  private buildAuthUrl(codeChallenge: string, state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent',
    })
    return `${GOOGLE_AUTH_URL}?${params}`
  }

  /** 用 authorization code 交换 access + refresh token */
  private async exchangeCodeForTokens(code: string, redirectUri: string): Promise<void> {
    const verifier = sessionStorage.getItem('gdrive-pkce-verifier')
    if (!verifier) throw new Error('PKCE verifier 丢失')

    const body = new URLSearchParams({
      code,
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    })

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Token 交换失败: ${res.status} ${errText}`)
    }

    const data = await res.json()
    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiryDate: Date.now() + (data.expires_in || 3600) * 1000,
    }
    saveTokens(this.tokens)
    sessionStorage.removeItem('gdrive-pkce-verifier')
    sessionStorage.removeItem('gdrive-pkce-state')
  }

  /** 刷新 access token */
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.tokens?.refreshToken) return false
    try {
      const body = new URLSearchParams({
        client_id: this.config.clientId,
        grant_type: 'refresh_token',
        refresh_token: this.tokens.refreshToken,
      })
      const res = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })
      if (!res.ok) { clearTokens(); this.tokens = null; return false }
      const data = await res.json()
      this.tokens.accessToken = data.access_token
      this.tokens.expiryDate = Date.now() + (data.expires_in || 3600) * 1000
      if (data.refresh_token) this.tokens.refreshToken = data.refresh_token
      saveTokens(this.tokens)
      return true
    } catch { return false }
  }

  /** 确保 access token 有效，必要时自动刷新 */
  private async ensureValidToken(): Promise<string | null> {
    if (!this.tokens) this.tokens = loadTokens()
    if (!this.tokens) return null
    if (this.tokens.expiryDate < Date.now() + 300000) {
      const ok = await this.refreshAccessToken()
      if (!ok) return null
    }
    return this.tokens.accessToken
  }

  // ============ CloudProvider 接口实现 ============

  async initialize(): Promise<void> {
    this.tokens = loadTokens()
    if (this.tokens) {
      const token = await this.ensureValidToken()
      if (token) { this._initialized = true; return }
    }
    this._initialized = false
  }

  async read(path: string): Promise<Uint8Array | null> {
    const token = await this.ensureValidToken()
    if (!token) return null
    try {
      const fileId = await this.findFileId(token, path)
      if (!fileId) return null
      const res = await fetchWithRetry(`${GOOGLE_DRIVE_API}/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`Download failed: ${res.status}`)
      return new Uint8Array(await res.arrayBuffer())
    } catch (err) {
      console.error('[GoogleDrive] read error:', err)
      return null
    }
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    const token = await this.ensureValidToken()
    if (!token) throw new Error('Not authenticated')
    try {
      const existingFileId = await this.findFileId(token, path)
      if (existingFileId) {
        await this.updateFile(token, existingFileId, data)
      } else {
        await this.createFile(token, path, data)
      }
      this.fileIdCache.delete(path)
    } catch (err) {
      console.error('[GoogleDrive] write error:', err)
      throw err
    }
  }

  async delete(path: string): Promise<void> {
    const token = await this.ensureValidToken()
    if (!token) return
    try {
      const fileId = await this.findFileId(token, path)
      if (!fileId) return
      await fetchWithRetry(`${GOOGLE_DRIVE_API}/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      this.fileIdCache.delete(path)
    } catch (err) {
      console.error('[GoogleDrive] delete error:', err)
    }
  }

  async exists(path: string): Promise<boolean> {
    const token = await this.ensureValidToken()
    if (!token) return false
    const fileId = await this.findFileId(token, path)
    return fileId !== null
  }

  watch(path: string, callback: (event: 'change' | 'delete') => void): () => void {
    let lastEtag: string | null = null
    const interval = window.setInterval(async () => {
      const token = await this.ensureValidToken()
      if (!token) return
      try {
        const fileId = await this.findFileId(token, path)
        if (!fileId) { callback('delete'); return }
        const res = await fetchWithRetry(
          `${GOOGLE_DRIVE_API}/files/${fileId}?fields=id,etag,modifiedTime`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (res.ok) {
          const meta = await res.json()
          if (lastEtag && meta.etag !== lastEtag) callback('change')
          lastEtag = meta.etag
        }
      } catch { /* silent */ }
    }, 30000)

    this.pollIntervals.set(path, interval)
    return () => {
      window.clearInterval(interval)
      this.pollIntervals.delete(path)
    }
  }

  async stat?(path: string): Promise<{ size: number; modifiedAt: Date } | null> {
    const token = await this.ensureValidToken()
    if (!token) return null
    try {
      const fileId = await this.findFileId(token, path)
      if (!fileId) return null
      const res = await fetchWithRetry(
        `${GOOGLE_DRIVE_API}/files/${fileId}?fields=id,size,modifiedTime`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) return null
      const meta = await res.json()
      return { size: parseInt(meta.size || '0', 10), modifiedAt: new Date(meta.modifiedTime) }
    } catch { return null }
  }

  async getQuota?(): Promise<{ used: number; available: number } | null> {
    const token = await this.ensureValidToken()
    if (!token) return null
    try {
      const res = await fetchWithRetry(
        `${GOOGLE_DRIVE_API}/about?fields=storageQuota`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) return null
      const data = await res.json()
      return {
        used: parseInt(data.storageQuota.usage || '0', 10),
        available: parseInt(data.storageQuota.limit || '16106127360', 10),
      }
    } catch { return null }
  }

  destroy(): void {
    for (const [, interval] of this.pollIntervals) {
      window.clearInterval(interval)
    }
    this.pollIntervals.clear()
    this.fileIdCache.clear()
    this.tokens = null
    this._initialized = false
  }

  /** 断开连接并撤销 token */
  async revoke(): Promise<void> {
    if (this.tokens?.accessToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${this.tokens.accessToken}`, { method: 'POST' })
      } catch { /* ignore */ }
    }
    clearTokens()
    this.destroy()
  }

  // ============ Google Drive API 内部方法 ============

  /** 查找或创建应用数据文件夹 */
  private async ensureAppFolder(token: string): Promise<string> {
    const query = encodeURIComponent(
      `name='${this.basePath}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    )
    const res = await fetchWithRetry(
      `${GOOGLE_DRIVE_API}/files?q=${query}&fields=files(id,name)&pageSize=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (res.ok) {
      const data = await res.json()
      if (data.files?.length > 0) return data.files[0].id
    }
    // 创建文件夹
    const createRes = await fetchWithRetry(`${GOOGLE_DRIVE_API}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: this.basePath, mimeType: 'application/vnd.google-apps.folder' }),
    })
    if (!createRes.ok) throw new Error('Failed to create app folder')
    const folder = await createRes.json()
    return folder.id
  }

  /** 按路径名查找文件 ID */
  private async findFileId(token: string, path: string): Promise<string | null> {
    if (this.fileIdCache.has(path)) return this.fileIdCache.get(path)!
    const folderId = this.config.folderId || await this.ensureAppFolder(token)
    const fileName = path.split('/').pop() || path
    const query = encodeURIComponent(`name='${fileName}' and '${folderId}' in parents and trashed=false`)
    const res = await fetchWithRetry(
      `${GOOGLE_DRIVE_API}/files?q=${query}&fields=files(id,name)&pageSize=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.files?.length > 0) {
      this.fileIdCache.set(path, data.files[0].id)
      return data.files[0].id
    }
    return null
  }

  /** 创建新文件（multipart 上传） */
  private async createFile(token: string, path: string, data: Uint8Array): Promise<void> {
    const folderId = this.config.folderId || await this.ensureAppFolder(token)
    const fileName = path.split('/').pop() || path
    const boundary = `boundary_${Date.now()}`
    const encoder = new TextEncoder()
    const metadata = JSON.stringify({ name: fileName, parents: [folderId] })
    const parts = [
      encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
      encoder.encode(`--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`),
      data,
      encoder.encode(`\r\n--${boundary}--`),
    ]
    const body = new Blob(parts)
    const res = await fetchWithRetry(`${GOOGLE_DRIVE_UPLOAD}/files?uploadType=multipart`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    })
    if (!res.ok) throw new Error(`Create file failed: ${res.status}`)
  }

  /** 更新已有文件 */
  private async updateFile(token: string, fileId: string, data: Uint8Array): Promise<void> {
    const blob = new Blob([data], { type: 'application/octet-stream' })
    const res = await fetchWithRetry(`${GOOGLE_DRIVE_UPLOAD}/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
      body: blob,
    })
    if (!res.ok) throw new Error(`Update file failed: ${res.status}`)
  }
}
