# TinyDo 安装指南

## macOS

### 方式一：DMG 安装包（推荐）

1. 从 [Releases 页面](https://github.com/your-repo/releases) 下载 `.dmg` 文件
2. 双击打开 `.dmg`，将 `TinyDo` 拖入 `Applications` 文件夹
3. 首次打开时，如果系统提示"无法验证开发者"，请前往：
   **系统设置 → 隐私与安全性 → 仍要打开**
4. 之后即可在启动台中找到 TinyDo

### 方式二：开发模式

```bash
git clone <仓库地址>
cd tinydo
npm install
npm run dev:all
# 访问 http://localhost:3000
```

---

## iOS

### 方式一：AltStore 安装（免费，无需开发者账号）

AltStore 是目前最方便的 iOS 侧载方案。

#### 电脑端准备（仅首次需要）

1. 访问 [altstore.io](https://altstore.io) 下载 AltStore for macOS
2. 安装并打开 AltStore
3. 点击菜单栏 AltStore 图标 → **Install AltStore** → 选择您的 iPhone
4. 输入您的 Apple ID（用于签名，不会泄露）

#### iPhone 端安装 TinyDo

5. 在 iPhone 上打开 **AltStore**
6. 下载我们的 `.ipa` 文件到 iPhone（通过 AirDrop 或文件 App）
7. 在 AltStore 中点击 **My Apps** → **+** → 选择 `.ipa` 文件
8. 等待安装完成

#### 信任应用

9. 前往 **设置 → 通用 → VPN 与设备管理**
10. 点击您的 Apple ID → **信任**

#### 自动续签

AltStore 会在后台自动为应用续签（7 天有效期）。
确保 iPhone 和 Mac 在同一网络下即可。

### 方式二：Ad-hoc 安装（需要开发者账号）

如果您有 Apple Developer Program 账号（$99/年）：
1. 将您设备的 UDID 发送给我们
2. 我们会生成专用的安装链接
3. 在 Safari 中打开链接即可安装
4. **有效期 1 年**，无需每周续签

### 方式三：SideStore（AltStore 替代品）

1. 访问 [sidestore.io](https://sidestore.io) 安装 SideStore
2. 通过 SideStore 安装 `.ipa` 文件
3. 同样每 7 天需要续签

### 方式四：Sideloadly（通过电脑安装）

1. 下载 [Sideloadly](https://sideloadly.io)
2. 连接 iPhone 到电脑
3. 将 `.ipa` 文件拖入 Sideloadly
4. 输入 Apple ID 签名并安装

---

## Android

### 方式一：直接 APK 安装（推荐）

1. 从 [Releases 页面](https://github.com/your-repo/releases) 下载 `.apk` 文件
2. 在手机上打开文件
3. 如果提示"禁止安装未知来源应用"，请前往：
   **设置 → 安全 → 安装未知应用** → 允许文件管理器
4. 点击安装

### 方式二：Google Play（即将支持）

搜索 **TinyDo** 即可安装。

---

## Web 版（无需安装）

直接访问部署后的网页地址（如 Vercel/Netlify），
在浏览器中使用全部功能（数据存储在浏览器本地）。

---

## 数据同步配置

安装后，建议配置 WebDAV 同步，实现多端数据互通：

1. 打开应用 → 点击 ⚙️ 设置 → **同步** Tab
2. 选择 **WebDAV**
3. 填写您的云存储信息（以坚果云为例）：
   - 服务器地址：`https://dav.jianguoyun.com/dav/`
   - 用户名：您的坚果云邮箱
   - 密码：**应用密码**（不是登录密码）
4. 点击 **连接**
5. 在其他设备上重复以上步骤（使用相同的 WebDAV 账号）

> 获取坚果云应用密码：登录坚果云网页 → 账户信息 → 安全选项 → 添加应用密码
