# ADR-002: 数据存储架构

**日期**: 2026-07-26  
**领域**: 数据持久化

---

## 问题

用户数据应该存储在哪里，既能保证可靠性，又能让用户自己管理和备份？

## 真实项目的做法

| 应用 | 技术 | 存储位置 | 用户可见 |
|------|------|---------|---------|
| **VS Code** | IndexedDB + LevelDB | `~/Library/Application Support/Code/` | ❌ 隐藏 |
| **Slack** | IndexedDB | `~/Library/Application Support/Slack/` | ❌ 隐藏 |
| **1Password** | SQLite + 加密文件 | `~/Library/Application Support/1Password/` | ❌ 隐藏 |
| **Obsidian** | Markdown 文件 | 用户指定的任意目录 | ✅ 用户文件夹 |
| **Bear** | SQLite | `~/Library/Containers/Bear/Data/` | ❌ 隐藏 |
| **Things** | SQLite | `~/Library/Containers/Things/Data/` | ❌ 隐藏 |
| **滴答清单** | SQLite + 云端 | 系统应用沙盒 + 云端服务器 | ❌ 隐藏 |

**关键发现**: 绝大多数应用把数据存在应用沙盒里，用户看不到也碰不到。但新一代的工具（如 Obsidian）开始把数据放在用户能访问的位置。

## 我们的方案

### 分层存储

```
                  ┌──────────────────────┐
                  │     Pinia Store       │  ← 内存中的响应式数据
                  └──────────┬───────────┘
                             │
                  ┌──────────▼───────────┐
                  │   CRDT 文档 (内存)    │  ← 数据变更引擎
                  └──────────┬───────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
   ┌────────────┐   ┌──────────────┐   ┌──────────────┐
   │  IndexedDB  │   │ JSON 文件     │   │  WebDAV 云端  │
   │  (运行时)    │   │ (持久化 + 备份) │   │ (多端同步)     │
   └────────────┘   └──────────────┘   └──────────────┘
```

### 三层存储详解

**第一层: IndexedDB — 运行时数据**
- 位置: 浏览器内置数据库
- 格式: Uint8Array (CRDT 序列化)
- 用途: 快速读写，自动管理
- 优点: 无需额外依赖，所有平台通用

**第二层: JSON 文件 — 用户可见的持久化文件**
- Electron 位置: `~/Library/Application Support/tinydo/data/todo-data.json`
- Web 位置: 通过导出功能下载
- 格式: 纯 JSON，用户可用任何文本编辑器打开
- 用途: 备份、迁移、直接编辑
- 优点: 用户看得见、摸得着、可备份

**第三层: WebDAV — 多端同步**
- 位置: 用户配置的 WebDAV 服务器
- 格式: Uint8Array (与 IndexedDB 相同)
- 用途: 多设备数据同步

### JSON 文件格式

```json
{
  "version": 1,
  "exportedAt": "2026-07-26T...",
  "todos": [
    {
      "id": "todo_123456_abc123",
      "title": "买牛奶",
      "completed": false,
      "priority": 3,
      "dueDate": "2026-07-28T00:00:00.000Z",
      "createdAt": "2026-07-26T10:00:00.000Z",
      "tags": ["购物"],
      "list": "个人"
    }
  ],
  "settings": {
    "matrixRuleMode": "priority",
    "urgentDays": 1
  }
}
```

### 各平台数据目录

| 平台 | 数据目录 |
|------|---------|
| macOS (Electron) | `~/Library/Application Support/tinydo/data/` |
| Windows (Electron) | `%APPDATA%/TinyDo/data/` |
| iOS (Capacitor) | 应用沙盒 Documents/data/ (iCloud 备份) |
| Android (Capacitor) | 内部存储 `/data/data/com.tinydo.app/files/data/` |
| Web (浏览器) | IndexedDB + localStorage，无本地文件 |

### 用户操作

```
导出 → 生成 todo-data.json → 可备份、可编辑、可导入
                                          ↓
                             放入 iCloud Drive / Dropbox
                                          ↓
                             另一台设备的 TinyDo 导入
```

## 决定

1. 采用 **三层存储架构**: IndexedDB(运行时) + JSON文件(持久化) + WebDAV(同步)
2. JSON 文件放置在标准的应用数据目录
3. 文件是纯文本 JSON，用户可以自行查看和编辑
4. 保留导出/导入功能，用户可以手动备份到任何位置
