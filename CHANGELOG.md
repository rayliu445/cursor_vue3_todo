# Changelog

## 0.0.1 (2026-07-26)

### Added
- 日历视图（月/周/日）
- 四象限矩阵（艾森豪威尔矩阵）
- 滴答清单数据导入（CSV + JSON）
- CRDT 数据引擎 + SQLite 持久化
- 暗黑模式（亮色/暗黑/跟随系统）
- WebDAV 云同步（坚果云、NextCloud）
- 设置页面（存储/同步/主题）
- 任务优先级、截止日期、标签
- 多平台打包（macOS/Windows/iOS/Android）

### Changed
- 存储引擎从 CRDT 纯内存升级为 SQLite (sql.js)
- UI 从 daisyUI 默认风格改为滴答清单风格
- 数据持久化从单一 IndexedDB 升级为三层架构
- 移除 json-server 后端依赖
