import { readFileSync } from 'node:fs'
import vue from '@vitejs/plugin-vue'

// 从 package.json 读取版本号，注入为全局常量（发布新版本时自动同步，无需改代码）
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

/** @type {import('vite').UserConfig} */
export default {
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    // 浏览器访问七牛云 API 的 CORS 代理：
    // 七牛 rs/up/下载接口均不返回 CORS 头，浏览器端统一走同源路径由 dev server 转发
    proxy: {
      '/qiniu-rs': {
        target: 'https://rs.qiniu.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/qiniu-rs/, ''),
      },
      '/qiniu-up': {
        target: 'https://up.qiniup.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/qiniu-up/, ''),
      },
      '/qiniu-dl': {
        target: 'http://iovip.qbox.me',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/qiniu-dl/, ''),
      },
    },
  },
}
