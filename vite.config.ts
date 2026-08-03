import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { readFileSync } from 'node:fs'

// 注意：__dirname 由 Vite 在加载配置文件时自动注入，无需（也不能）手动声明

// 从 package.json 读取版本号，注入为全局常量（发布新版本时自动同步）
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

export default defineConfig({
  plugins: [
    vue(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __PRODUCTION__: JSON.stringify(process.env.NODE_ENV === 'production'),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  base: './',
  server: {
    port: 3000,
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
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
        },
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
    minify: 'esbuild',
  },
})