Todo App - 跨平台任务管理工具
================================

版本：0.0.1
官网：https://github.com/rayliu445/cursor_vue3_todo

== 首次使用 ==

macOS 打开时提示"已损坏，无法打开"？

请运行同目录下的 `fix-gatekeeper.command` 脚本：
  1. 双击 `fix-gatekeeper.command`
  2. 点击"打开"（如弹出安全提示）
  3. 脚本会自动安装并启动应用

或者手动执行：
  sudo xattr -cr "/Applications/Todo App.app"

== 数据同步 ==

应用支持通过阿里云 OSS 进行多设备数据同步。

配置步骤：
  1. 打开应用 → 设置 → 同步
  2. 填入阿里云 OSS 的 Bucket 名称和 AccessKey
  3. 点击"连接"即可

详细教程：docs/qiniu-kodo-guide.md

== 功能特性 ==

  ✅ 本地持久化（IndexedDB + localStorage 双备份）
  ✅ 日历月/周/日视图
  ✅ 四象限矩阵
  ✅ 滴答清单数据导入（CSV/JSON）
  ✅ 七牛云 Kodo 云同步
  ✅ 暗黑模式 / 跟随系统

== 技术栈 ==

  Vue 3 + Vite + Pinia + Vue Router
  Electron 30 (桌面端)
  TypeScript
  Tailwind CSS + daisyUI
