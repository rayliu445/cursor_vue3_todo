# Google Drive 同步集成指南

## 概述

TinyDo 支持通过 Google Drive API v3 进行云同步。本文档说明如何配置 Google Cloud 项目并获取所需的凭据。

## 前置条件

- Google 账号（个人 Gmail 即可）
- TinyDo 桌面端 (Electron)

## 第一步：创建 Google Cloud 项目

1. 打开 [Google Cloud Console](https://console.cloud.google.com/)
2. 点击顶部的项目下拉菜单 → **新建项目**
3. 输入项目名称（如 `TinyDo Sync`）
4. 点击 **创建**

## 第二步：启用 Google Drive API

1. 在项目中，进入 **API 和服务** → **库**
2. 搜索 **Google Drive API**
3. 点击 **启用**

## 第三步：配置 OAuth 同意屏幕

1. 进入 **API 和服务** → **OAuth 同意屏幕**
2. 选择 **外部** 用户类型 → **创建**
3. 填写必填信息：
   - 应用名称：`TinyDo`
   - 用户支持邮箱：你的邮箱
   - 开发者联系信息：你的邮箱
4. 点击 **保存并继续**
5. 范围（Scopes）：点击 **添加或移除范围**
   - 搜索 `drive.file`，勾选 `.../auth/drive.file`（仅访问通过此应用创建的文件）
   - 点击 **更新**
   - 点击 **保存并继续**
6. 测试用户：点击 **添加用户**，输入你的邮箱
   - 点击 **保存并继续**
7. 摘要页面确认无误后点击 **返回控制台**

## 第四步：创建 OAuth 2.0 凭据

1. 进入 **API 和服务** → **凭据**
2. 点击 **+ 创建凭据** → **OAuth 客户端 ID**
3. 应用类型选择 **桌面应用**
4. 名称：`TinyDo Desktop Client`
5. 点击 **创建**
6. 在弹出的窗口中，复制 **客户端 ID**（Client ID）

## 第五步：在 TinyDo 中配置

1. 打开 TinyDo → **设置** → **同步**
2. 找到 **Google Drive** 卡片，展开
3. 填入上一步复制的 **客户端 ID**
4. 点击 **连接**
5. 浏览器会自动打开 Google 登录页面，授权即可

## 工作原理

```
用户点击「连接」
    ↓
打开系统浏览器 → Google OAuth 授权页面
    ↓
用户登录并授权
    ↓
Google 重定向到本地服务器 (localhost)
    ↓
获取 authorization code → 交换 access + refresh token
    ↓
Token 安全存储在本地
    ↓
开始同步数据
```

### 技术细节

- **认证协议**: OAuth 2.0 with PKCE (Proof Key for Code Exchange)
- **令牌存储**: Electron 使用 `safeStorage` 加密存储；Web 使用 `sessionStorage`
- **访问令牌有效期**: 1 小时（自动刷新）
- **刷新令牌有效期**: 永不过期（除非用户撤销授权）
- **API 配额**: 每 100 秒 1000 次请求（远高于需求）
- **免费额度**: 15GB（每条 todo ~1KB，可存储约 1500 万条）

### 文件存储位置

```
Google Drive 中的应用数据文件夹:
  TinyDo/data.automerge    ← CRDT 同步文件
```

## 故障排除

| 问题 | 解决方案 |
|------|---------|
| `redirect_uri_mismatch` | 确保 OAuth 凭据中已添加 `http://localhost:18245/callback` |
| `access_denied` | 检查你的 Google 账号是否已添加为测试用户 |
| Token 过期 | 应用会自动使用 refresh token 刷新 |
| 配额超限 | Google Drive 免费配额极高，正常情况下不会超限 |

## 参考链接

- [Google Drive API v3 文档](https://developers.google.com/drive/api/v3/reference)
- [OAuth 2.0 PKCE 流程](https://developers.google.com/identity/protocols/oauth2/native-app)
- [OAuth 同意屏幕配置](https://support.google.com/cloud/answer/10311615)
