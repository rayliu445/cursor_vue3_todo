# ADR-001: 多平台打包方案

**日期**: 2026-07-26  
**状态**: 已批准  
**领域**: 构建与分发

---

## 背景

TinyDo 需要支持三个平台：macOS、iOS、Android。目标是用户数据通过 WebDAV/云盘实现多端同步，而非中心化服务器。

## 技术方案

```
┌──────────────────────────────────────────────────────┐
│              共享代码层 (Vue 3 + Pinia)                │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────────┐ │
│  │  macOS    │  │   iOS    │  │      Android        │ │
│  │ Electron  │  │Capacitor │  │     Capacitor       │ │
│  │  WebView  │  │ WKWebView│  │  Android WebView    │ │
│  └────┬─────┘  └────┬─────┘  └──────────┬──────────┘ │
│       └─────────────┼───────────────────┘             │
│                     ▼                                 │
│          ┌────────────────────┐                       │
│          │  编译后的静态资源    │                       │
│          │  (dist/ 目录)      │                       │
│          └────────────────────┘                       │
└──────────────────────────────────────────────────────┘
```

**核心原则**: 一份 Vue 代码，编译为静态资源，分别由各平台的原生壳加载。

---

## 各平台构建方案

### macOS — Electron

| 项目 | 内容 |
|------|------|
| **技术** | Electron 30 + electron-builder |
| **输出** | `.dmg` 安装包 |
| **架构** | arm64 (Apple Silicon) |
| **分发** | 直接下载（无需 Mac App Store）|
| **代码签名** | 可选（推荐但不强制）|
| **现状** | 已有完整配置，已验证可用 |

### iOS — Capacitor

| 项目 | 内容 |
|------|------|
| **技术** | Capacitor 6 + WKWebView |
| **输出** | `.ipa` 安装包 |
| **开发工具** | Xcode 16+ (macOS 必需) |
| **代码** | Vue 编译为静态资源，Capacitor 包装为原生 iOS 应用 |

**签发方式对比**:

| 方式 | 成本 | 设备限制 | 审核 | 适合场景 |
|------|------|---------|------|---------|
| **App Store** | $99/年 | 无限制 | ✅ 需要 | 正式发布 |
| **TestFlight 公开** | $99/年 | 10,000 外部用户 | ⚠️ Beta 审核 | 公测 |
| **TestFlight 内部** | $99/年 | 100 内部成员 | ❌ 无需 | 内部测试 |
| **Ad-hoc** | $99/年 | 100 台设备/年 | ❌ 无需 | 开发测试、亲友 |
| **AltStore** | 免费 | 每7天续签 | ❌ 无需 | 个人使用，无需开发者账号 |
| **SideStore** | 免费 | 每7天续签 | ❌ 无需 | AltStore 替代品 |
| **企业分发** | $299/年 | 内部不限 | ❌ 无需 | 公司内部 |
| **Sideloadly** | 免费 | 每7天续签 | ❌ 无需 | 通过电脑安装 |

### Android — Capacitor

| 项目 | 内容 |
|------|------|
| **技术** | Capacitor 6 + Android WebView |
| **输出** | `.apk` / `.aab` |
| **开发工具** | Android Studio (可选) |
| **分发方式** | 直接 APK 下载 / Google Play |

---

## iOS 免审核安装方案（详细）

对于您关心的「绕过 App Store 审核」问题，以下是可行的方案：

### 方案一：AltStore（推荐，零成本）

AltStore 是一个开源侧载工具，使用用户的 Apple ID 签名应用。

**用户安装步骤**:
1. [下载 AltStore](https://altstore.io) 到 Mac/PC
2. 用数据线连接 iPhone，通过 AltStore 安装 AltStore 到 iPhone
3. 在 iPhone 的「设置 → 通用 → VPN 与设备管理」中信任 AltStore
4. 在 AltStore 中打开我们的 `.ipa` 安装包
5. 应用签名有效期为 7 天，AltStore 可自动续签（联网时）

**优点**: 完全免费，无需开发者账号  
**缺点**: 每 7 天需要续签一次（AltStore 后台自动处理）

### 方案二：Ad-hoc 分发（开发者账号）

1. 在 Apple Developer Console 注册用户设备的 UDID
2. 使用 Ad-hoc 描述文件打包 `.ipa`
3. 用户通过链接下载并安装
4. 有效期为 1 年

**优点**: 1 年有效期，稳定  
**缺点**: 最多 100 台设备，需要 $99/年 开发者账号

### 方案三：开发者模式 + Xcode 安装

1. iPhone 开启「设置 → 隐私与安全性 → 开发者模式」
2. 连接 Mac，通过 Xcode 安装
3. 适合开发者自己和少量测试机

---

## CI/CD 打包流程

```
源代码提交
    ↓
Vite 构建 (npm run build)
    ├── dist/ 静态资源
    │
    ├── macOS: electron-builder → .dmg
    │
    ├── iOS (macOS only):
    │   └── npx cap sync ios
    │   └── xcodebuild → .ipa
    │   └── 签名 + 导出
    │
    └── Android:
        └── npx cap sync android
        └── ./gradlew assembleRelease → .apk
```

---

## 当前构建状态

| 平台 | 状态 | 需要什么 |
|------|------|---------|
| macOS `.dmg` | ✅ **已完成** | `npm run dist` |
| macOS Electron | ✅ **已完成** | `npm run electron:serve` |
| iOS Capacitor | ❌ **未配置** | 安装 Capacitor + iOS 依赖 |
| Android Capacitor | ❌ **未配置** | 安装 Capacitor + Android 依赖 |
| CI/CD | ❌ **未配置** | GitHub Actions |

---

## 决定

1. **桌面端**: 用 Electron（已有），直接输出 `.dmg`
2. **移动端**: 用 Capacitor（需新配置）
3. **iOS 分发**: AltStore 侧载（零成本）作为默认方案，App Store（$99/年）作为正式发布方案
4. **Android 分发**: 直接 APK 下载 + Google Play（$25 一次性）
5. **数据同步**: 通过 WebDAV（坚果云等）实现，不依赖中心化服务器
