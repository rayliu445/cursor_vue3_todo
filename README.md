
TinyDo 是一款对标滴答清单的个人任务管理工具，支持多平台运行和用户自管数据。

## 功能

- 📅 **日历视图** — 月视图 / 周视图 / 日视图，快速添加任务
- 🔲 **四象限矩阵** — 艾森豪威尔矩阵，手动分类 + 自动规则分类
- 📥 **滴答清单导入** — 支持 CSV / JSON 格式导入历史数据
- 💾 **本地持久化** — IndexedDB + localStorage 双备份，数据不丢失
- 🌙 **暗黑模式** — 亮色 / 暗黑 / 跟随系统
- 🔄 **WebDAV 云同步** — 连接坚果云、NextCloud 等，多端数据互通
- ✏️ **任务管理** — 添加 / 编辑 / 删除 / 搜索 / 优先级 / 截止日期
- ⚙️ **设置页面** — 数据导出导入、云存储配置、主题切换

## 平台

| 平台 | 安装包 | 技术 |
|------|--------|------|
| 🖥️ macOS | `.dmg` | Electron 30（未签名，首次安装见下方说明） |
| 🖥️ Windows | `.exe` (Portable) | Electron 30 |
| 📱 iOS | `.ipa` (AltStore 侧载) | Capacitor 8 |
| 📱 Android | `.apk` | Capacitor 8 |
| 🌐 Web | 浏览器直接访问 | Vite 2 |

完整安装指南请查看 [docs/INSTALL.md](docs/INSTALL.md)。

### macOS 首次安装说明

macOS 15+ (Sequoia) 对未签名应用的限制更加严格，无法通过右键→打开绕过。请使用 DMG 内的安装脚本：

1. 打开 DMG
2. 双击 **`fix-gatekeeper.command`**
3. 在弹出的对话框中点击**打开**（仅首次需要）
4. 输入你的 Mac 密码
5. 脚本自动完成：复制到 Applications → 解除系统拦截 → 启动应用

> 如果 `fix-gatekeeper.command` 也被拦截，可以在终端手动执行：
> ```bash
> xattr -cr /Applications/TinyDo.app && open /Applications/TinyDo.app
> ```

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Vue 3 (Composition API + `<script setup>`) |
| 语言 | TypeScript |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 (Hash 模式) |
| 样式 | Tailwind CSS 3 + 自定义 CSS 变量主题 |
| 桌面端 | Electron 30 + electron-builder |
| 移动端 | Capacitor 8 |
| 数据存储 | SQLite (sql.js) + IndexedDB 持久化 |
| 云同步 | 七牛云 Kodo (对象存储) |
| 构建工具 | Vite 2 |

## 数据架构

```
用户数据 → SQLite (sql.js) → IndexedDB 持久化
                           → 七牛云 Kodo 同步（可选）
                           → 完全本地优先，用户自主管理数据
```

所有数据存储在本地，用户可选配七牛云 Kodo 实现多端云同步，
无需注册任何第三方服务平台。

## 快速开始

```bash
# 开发模式
npm install
npm run dev
# 访问 http://localhost:3000

# 构建桌面端
npm run dist          # macOS .dmg
# 或
npm run electron:build  # 构建但不打包

# 构建移动端 (需要 Xcode / Android SDK)
npm run mobile:build:ios
npm run mobile:build:android
```

## 项目结构

```
├── src/
│   ├── views/           # 页面视图
│   ├── components/      # 组件
│   │   ├── icons/       # SVG 图标组件
│   │   ├── calendar/    # 日历视图子组件
│   │   ├── matrix/      # 四象限子组件
│   │   └── layouts/     # 布局组件
│   ├── stores/          # Pinia 状态管理
│   ├── services/        # 服务层 (SQLite / 数据访问 / 同步)
│   └── router/          # 路由配置
├── electron/            # Electron 主进程
├── dist/                # 编译输出
├── docs/                # 文档
│   ├── INSTALL.md       # 安装指南
│   └── adr-*.md         # 架构决策记录
└── release/             # 发布说明
```

## 构建命令

| 命令 | 输出 | 说明 |
|------|------|------|
| `npm run dev` | — | 开发服务器 (localhost:3000) |
| `npm run build` | `dist/` | 编译前端资源 |
| `npm run dist` | `.dmg` | macOS 安装包 |
| `npm run electron:build` | `dist-electron/` | macOS 构建目录 |
| `npm run mobile:sync` | `ios/` `android/` | 同步前端到原生项目 |
| `npm run mobile:build:ios` | `.ipa` | iOS 安装包 (需 Xcode) |
| `npm run mobile:build:android` | `.apk` | Android 安装包 |
| `npm run release:all` | 全部 | 一键全平台构建 |

## 许可证

[MIT](LICENSE)

