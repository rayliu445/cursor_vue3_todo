# TinyDo - 发布说明

## v0.1.12（2026-08-06）—— ★ iOS 同步问题的真正根因修复

### 修复：iOS 上本地数据库从未初始化成功（Database not initialized）

- **根因（终于找到）**：iOS（Capacitor）的本地服务器对 `.wasm` 文件返回的
  `Content-Type` 不是 `application/wasm`，导致 `WebAssembly.instantiateStreaming`
  失败 → sql.js（SQLite WASM）初始化失败 → 本地数据库永远是 null →
  **所有数据操作抛 "Database not initialized"**。
- **连锁后果**：云端数据即使下载成功（1204 个任务）也**写不进本地数据库**，
  所以任务永远显示不出来——这就是"同步正常却拉不到数据"的真正原因。
- **修复**：`sqlite-db.ts` 改为手动 `fetch` WASM 为 `ArrayBuffer`，通过
  `wasmBinary` 选项传给 `initSqlJs`（走 `WebAssembly.instantiate(ArrayBuffer)`，
  **不校验 MIME**），跨平台可靠；fetch 失败自动回退原方式。
- **验证**：Node 中 `wasmBinary` 方式建表/插入/查询全部成功；浏览器中通过
  Vite 加载真实 `sqlite-db.ts`，`initialize()` 成功（ready=true）。
- 附带：上一版（v0.1.11）的设置页同步状态响应式修复 + 同步诊断面板。

---

## 历史版本

### v0.1.11（2026-08-06）

- 修复设置页同步状态"假正常"：syncState 改为响应式订阅，设置页实时显示真实状态
- 新增「同步诊断」面板（云端文件大小、云端/本地任务数、失败阶段与错误）

### v0.1.10（2026-08-06）

- 修复启动自动同步（initialSync）失败被静默吞掉的问题：失败时明确报错
- 新增「同步诊断」数据结构（云端/本地任务数、失败阶段与错误）

### v0.1.9（2026-08-06）

- 原生平台下载改为 64KB 分片 Range，规避超大 base64 响应问题；失败回退一次性下载
- `read()` 失败不再静默返回 null（区分云端无文件 612 与读取失败）
- `syncNow` 云端读取失败时中止同步，绝不用本地数据覆盖云端（防数据丢失）

### v0.1.8（2026-08-05）

- 修复 iOS 同步大文件 base64 解码分块（避免 atob 栈溢出）。

### v0.1.7（2026-08-05）

- 七牛云同步 iOS/Android 直连（CapacitorHttp 绕过 CORS）。

### v0.1.6（2026-08-05）

- 窄屏侧边栏响应式 + 添加栏日期换行修复。

### v0.1.5（2026-08-05）

- 详情面板布局修复 + iOS 更新检查 + 安装文档更新。

### v0.1.4（2026-08-05）

- iOS 移动端布局适配。

### v0.1.3（2026-08-05）

- 空状态教学收尾 + 类型清理。

---

## 早期版本（0.0.x）

- 版本号：0.0.3
- 发布日期：2026 年 7 月 27 日
- 平台：macOS (ARM64)

## 应用简介

TinyDo 是一个现代化的待办事项管理应用，基于 Vue 3、TypeScript 和 Electron 构建，包含完整的前后端架构。该应用提供了一个美观且功能完善的界面，帮助用户管理日常任务。

## 功能特点

- 添加、编辑、删除待办事项
- 标记任务完成状态
- 搜索过滤功能
- 数据本地持久化存储
- 响应式界面设计
- 内置多级别日志功能，便于调试问题

## 安装说明

1. 双击 `TinyDo.dmg` 文件以挂载安装镜像
2. 将 "TinyDo" 图标拖拽至 "Applications" 文件夹
3. 打开 "Applications" 文件夹，双击 "TinyDo" 启动应用

## 系统要求

- macOS 10.12 或更高版本
- 至少 2GB 可用存储空间

## 项目结构

```
project-root/
├── electron/           # Electron 主进程和预加载脚本
│   ├── main.js       # 主进程代码
│   └── preload.js    # 预加载脚本
├── server/             # 后端服务代码
│   └── server.js     # JSON Server 后端服务
├── src/                # 前端源代码
│   ├── components/   # Vue 组件
│   ├── views/        # 页面视图
│   ├── stores/       # Pinia 状态管理
│   └── router/       # Vue Router 路由
├── dist/               # 构建后的前端资源
└── db.json             # 本地数据文件
```

## 架构说明

- 前端：使用 Vue 3 + TypeScript + Tailwind CSS + daisyUI
- 后端：使用 json-server 提供 REST API 服务
- 桌面应用：使用 Electron 将 Web 应用封装为桌面应用
- 数据存储：本地 db.json 文件存储

## 日志配置

应用运行时会根据配置文件设置日志行为：

- 默认启用日志记录，日志级别为 `INFO`
- 可通过外部 `config.json` 文件控制日志行为：
  - `enableLogging`: 是否启用日志 (true/false)
  - `logLevel`: 日志级别 (ERROR, WARN, INFO, DEBUG)
- 日志文件保存在: `~/Library/Application Support/tinydo/logs/app-[YYYY-MM-DD].log`

## 重新构建说明

要重新构建应用，可以使用项目根目录下的 `rebuild-dmg.sh` 脚本：

1. 确保已在项目根目录
2. 运行 `chmod +x rebuild-dmg.sh` 给脚本添加执行权限
3. 运行 `./rebuild-dmg.sh` 开始构建流程

该脚本将自动执行以下步骤：

- 构建前端项目
- 更新资源引用
- 复制必要文件
- 创建新的 DMG 文件
- 将 DMG 文件保存到 release 目录

## 注意事项

- 首次运行时，系统可能会提示您确认安装来源，请按提示操作
- 应用数据将保存在本地，不会上传到云端
- 如遇权限问题，请在系统偏好设置 > 安全性与隐私中允许应用运行

## 技术说明

- 使用 Electron 构建，可在 macOS 上原生运行
- 内置 json-server 后端服务，提供 REST API
- 数据存储使用本地文件系统，无需网络连接
- 前端使用 Vue 3 + TypeScript + Tailwind CSS + daisyUI
- 内置多级别日志记录功能，便于调试问题

## 已知问题

- 应用首次启动可能需要几秒钟的加载时间（等待后端服务器启动）
- 在某些 macOS 版本上可能需要额外的安全许可

## 更新日志

- v0.0.3 (2026-07-27): 品牌重命名 + 架构重构
  - 应用正式更名为 TinyDo
  - 数据引擎从 CRDT 重构为 SQLite (sql.js) + IndexedDB 持久化
  - 云同步从 WebDAV 切换为七牛云 Kodo（10GB 免费额度）
  - 新增日历视图（月视图/周视图/日视图）
  - 新增四象限视图（重要/紧急矩阵）
  - 新增搜索功能
  - 主题系统支持自定义 CSS 变量
  - SVG 图标组件化重构
  - 路由从 History 模式改为 Hash 模式
  - 全新首页界面设计
  - 设置页面全面升级
  - 完善文档体系（ADR、术语表、实施路线图）

- v0.0.0 (2026-01-31): 前后端完整版
  - 保留前端后端完整架构
  - 修复白屏问题
  - 后端服务在打包后自动启动
  - 添加多级别日志功能，便于调试
  - 优化用户界面和交互体验
  - 恢复正确的项目目录结构
