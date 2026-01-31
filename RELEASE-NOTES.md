# Cursor Vue3 Todo - 发布说明

## 版本信息

- 版本号：0.0.0
- 发布日期：2026 年 1 月 31 日
- 平台：macOS (ARM64)

## 应用简介

Cursor Vue3 Todo 是一个现代化的待办事项管理应用，基于 Vue 3、TypeScript 和 Electron 构建，包含完整的前后端架构。该应用提供了一个美观且功能完善的界面，帮助用户管理日常任务。

## 功能特点

- 添加、编辑、删除待办事项
- 标记任务完成状态
- 搜索过滤功能
- 数据本地持久化存储
- 响应式界面设计
- 内置多级别日志功能，便于调试问题

## 安装说明

1. 双击 `Cursor-Vue3-Todo-Proper-Structure.dmg` 文件以挂载安装镜像
2. 将 "Cursor Vue3 Todo" 图标拖拽至 "Applications" 文件夹
3. 打开 "Applications" 文件夹，双击 "Cursor Vue3 Todo" 启动应用

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
- 日志文件保存在: `~/Library/Application Support/Cursor Vue3 Todo/logs/app-[YYYY-MM-DD].log`

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

- v0.0.0 (2026-01-31): 前后端完整版
  - 保留前端后端完整架构
  - 修复白屏问题
  - 后端服务在打包后自动启动
  - 添加多级别日志功能，便于调试
  - 优化用户界面和交互体验
  - 恢复正确的项目目录结构
