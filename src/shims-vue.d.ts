declare module '*.vue' {
  import { Component } from 'vue'
  const _default: Component
  export default _default
}

// 全局注入：由 vite.config.js 的 define 提供（读取自 package.json 的 version）
declare const __APP_VERSION__: string
