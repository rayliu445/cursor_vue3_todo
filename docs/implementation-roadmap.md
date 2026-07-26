# 实施路线图：多端同步 Todo 应用

## 总览

将现有基于 json-server + Electron IPC 的本地应用，改造为 **CRDT 本地优先 + 用户自管云存储** 的多端同步应用。

---

## 阶段一：引入 CRDT 数据层 🔴 (当前)

**目标**：替换 json-server / Electron fs 读写，建立基于 Automerge 的统一数据层。

### 步骤

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 1.1 | 安装 Automerge 依赖 | `package.json` | `npm install @automerge/automerge @automerge/automerge-repo` |
| 1.2 | 创建 CRDT 文档服务 | `src/services/crdt-doc.ts` | 封装 Automerge 文档的创建、修改、查询、合并 |
| 1.3 | 创建存储层 | `src/services/storage.ts` | 封装本地持久化（IndexedDB for Web, fs for Electron） |
| 1.4 | 创建数据访问层 | `src/services/data-access.ts` | 统一的 CRUD 接口，内部调用 CRDT + Storage |
| 1.5 | 重构 Pinia Store | `src/stores/todo.ts` | 将 HTTP/IPC 调用替换为 Data Access Layer |
| 1.6 | 数据迁移脚本 | `src/services/migration.ts` | 将现有 `db.json` 数据一次性导入 CRDT 文档 |
| 1.7 | 更新 Electron IPC | `electron/main.js` | IPC handlers 改为操作 CRDT 文档 |
| 1.8 | 更新 Preload | `electron/preload.js` | 暴露新的 CRDT API |

### 验证标准
- [ ] 应用正常启动，已有数据可读
- [ ] 增删改查操作正常工作
- [ ] 关闭再打开应用，数据持久化
- [ ] Electron 和 dev 模式均正常

---

## 阶段二：云存储同步引擎 🟡

**目标**：实现 CRDT 文档的云存储读写，完成多设备基础同步。

### 步骤

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 2.1 | 创建存储提供者接口 | `src/services/providers/types.ts` | 定义统一的云存储 API 接口 |
| 2.2 | 本地文件系统提供者 | `src/services/providers/local-fs.ts` | macOS Electron 用 fs 直接访问本地文件夹 |
| 2.3 | iCloud Drive 提供者 | `src/services/providers/icloud.ts` | macOS/iOS 使用 iCloud Drive API |
| 2.4 | Google Drive 提供者 | `src/services/providers/gdrive.ts` | Android 使用 Google Drive API |
| 2.5 | WebDAV 提供者（可选） | `src/services/providers/webdav.ts` | 自建/Nutstore 等 |
| 2.6 | 创建同步引擎 | `src/services/sync-engine.ts` | 文件监听 + CRDT 合并 + 定期同步 |
| 2.7 | 同步状态 UI | `src/components/sync/SyncStatus.vue` | 显示同步状态：进行中/成功/冲突 |
| 2.8 | 设置页面 | `src/views/SettingsView.vue` | 用户选择云存储类型、配置路径 |

### 同步引擎逻辑

```
启动时:
  1. 读取云文件 → 如果存在，与本地 CRDT 合并
  2. 读取本地缓存 → 渲染 UI
  3. 启动文件监视器

运行时:
  1. 用户编辑 → CRDT 变更 → 写本地缓存 → 写入云文件
  2. 云文件被其他设备修改 → 文件监视器触发 → 读取云文件 → CRDT 合并 → 更新 UI

冲突处理:
  Automerge 自动合并，无需用户干预。
  如果用户需要，可以提供"查看历史版本"功能。
```

### 验证标准
- [ ] iCloud Drive 同步在 macOS + iOS 之间正常工作
- [ ] 修改在 A 设备上写入后，B 设备打开可见
- [ ] 双设备同时离线编辑后，合并结果正确
- [ ] Google Drive 同步在 Android 上正常工作

---

## 阶段三：Capacitor 移动端 🟢

**目标**：将现有 Vue 3 应用通过 Capacitor 运行在 iOS 和 Android 上。

### 步骤

| # | 任务 | 说明 |
|---|------|------|
| 3.1 | 安装 Capacitor | `npm install @capacitor/core @capacitor/cli` |
| 3.2 | 初始化 Capacitor | `npx cap init` |
| 3.3 | 添加 iOS 平台 | `npx cap add ios` |
| 3.4 | 添加 Android 平台 | `npx cap add android` |
| 3.5 | 配置构建脚本 | `package.json` 添加 `npm run build && npx cap sync` |
| 3.6 | 适配移动端 UI | Tailwind 响应式调整，触控交互优化 |
| 3.7 | 集成 Capacitor 原生插件 | FileSystem, App, Preferences 等 |
| 3.8 | 配置 App Icons & Splash | 移动端图标和启动屏 |
| 3.9 | 测试 iOS 构建 | Xcode 打开 ios/ 目录，真机/模拟器运行 |
| 3.10 | 测试 Android 构建 | Android Studio 打开 android/ 目录 |

### 需要适配的 UI 部分
- 导航栏 → 移动端底部 Tab 导航
- 日历视图 → 触控手势（滑动切换月份）
- 四象限 → 拖拽改为长按拖拽
- 表单输入 → 移动端键盘适配

### 验证标准
- [ ] iOS 模拟器/真机运行正常
- [ ] Android 模拟器/真机运行正常
- [ ] 所有路由和视图可访问
- [ ] 触控交互流畅

---

## 阶段四：打磨与发布 🔵

**目标**：完善体验，准备多平台发布。

### 步骤

| # | 任务 | 说明 |
|---|------|------|
| 4.1 | 数据迁移引导 | 首次启动时从旧 db.json 迁移到 CRDT |
| 4.2 | 云存储首次配置引导 | 引导用户设置云同步 |
| 4.3 | 同步状态指示器 | 全局显示当前同步状态 |
| 4.4 | 错误处理 | 云存储不可用、文件损坏等场景 |
| 4.5 | 性能优化 | CRDT 文档压缩、懒加载 |
| 4.6 | 安全 | 数据加密（可选） |
| 4.7 | macOS 发布 | Electron Builder 打包 |
| 4.8 | iOS 发布 | App Store Connect 提交 |
| 4.9 | Android 发布 | Google Play Store 提交 |

---

## 依赖关系

```
阶段一 ─────────────────────────────────────────────
     │                                                │
     ▼                                                │
阶段二 ──── (可选：与阶段三并行) ────────             │
     │                                                │
     ▼                                                ▼
阶段三 ───────────────────────→ 阶段四 ───────→ 完成
```

- **阶段一** 是基础，必须先完成
- **阶段二** 与 **阶段三** 可并行开发
- **阶段四** 在所有功能完成后进行

---

## 回答你的核心问题

> **这个能实现吗？**

**能。** 而且有成熟的开源方案。

| 你的顾虑 | 方案 |
|----------|------|
| "不想有中心化server" | ✅ 不需要。CRDT + 用户云存储 = 无服务器架构 |
| "用户管理自己数据" | ✅ 数据就是用户云盘里的一个文件。用户可以复制、备份、迁移 |
| "多端互通" | ✅ 文件在云盘里，所有设备读写同一个文件 |
| "离线可用" | ✅ CRDT 离线优先，有网自动合并 |
| "现有代码怎么办" | ✅ Electorn 保留，Capacitor 复用所有 Vue 3 代码 |

### 真实案例
这个架构和 **Obsidian** 原理一致——用户数据就是本地/云盘文件，App 只是一个编辑器。Obsidian 没有服务器，但多端同步工作得很好。
