# ADR-0002: 采用 Capacitor 实现 iOS/Android 跨平台

## 状态
**已接受**

## 日期
2026-07-26

## 背景
需要将现有 Vue 3 应用扩展到 iOS 和 Android 平台。现有代码库使用 Vue 3 + TypeScript + Pinia + Tailwind CSS + daisyUI。

## 决策

### 选择 Capacitor 而非其他方案

| 方案 | 代码复用率 | 学习成本 | 原生能力 | 社区生态 |
|------|-----------|---------|---------|---------|
| **Capacitor** ✅ | ~95% | 低 | 强（插件生态） | 活跃 |
| React Native | 0%（需重写） | 中 | 强 | 活跃 |
| Flutter | 0%（需重写） | 高 | 强 | 活跃 |
| 纯原生（Swift/Kotlin） | 0%（需重写） | 高 | 最强 | — |

### 理由
1. **代码复用**：现有 Vue 3 代码几乎可以不经修改地在 Capacitor 中运行
2. **渐进式增强**：可以通过 Capacitor 插件逐步添加原生功能（文件系统、云存储 API）
3. **共享业务逻辑**：Pinia store、路由、UI 组件全部跨平台共享
4. **与 Electron 并存**：Electron 仍用于 macOS 桌面，Capacitor 覆盖移动端

### Capacitor 集成方式
```
项目根目录/
├── src/              ← 共享的 Vue 3 代码
│   ├── stores/
│   ├── components/
│   ├── views/
│   └── ...
├── electron/         ← Electron 桌面端
│   └── main.js
├── ios/              ← Capacitor 生成的 iOS 项目（Xcode）
├── android/          ← Capacitor 生成的 Android 项目（Android Studio）
└── package.json
```

## 后果
- 需要安装 `@capacitor/core`、`@capacitor/cli` 等依赖
- iOS 开发需要 Xcode + Apple 开发者账号
- Android 开发需要 Android Studio
- 移动端 UI 可能需要针对小屏幕做响应式调整（Tailwind 已支持）
