import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    vue(),
    // 自定义插件来修改生成的HTML
    {
      name: 'relative-html-path',
      enforce: 'post',
      generateBundle(options, bundle) {
        for (const fileName in bundle) {
          if (fileName.endsWith('.html')) {
            const chunk = bundle[fileName]
            if (chunk && chunk.type === 'asset' && chunk.fileName.endsWith('.html')) {
              // 修改HTML内容中的绝对路径为相对路径
              let htmlContent = chunk.source.toString()
              
              // 将绝对路径转换为相对路径
              htmlContent = htmlContent.replace(/(href|src)="\/([^"]*)"/g, '$1="./$2"')
              
              // 特别处理 favicon 的路径
              htmlContent = htmlContent.replace(/href="\.\/favicon\.ico"/g, 'href="./favicon.ico"')
              
              chunk.source = htmlContent
            }
          }
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  base: './', // 使用相对路径
  server: {
    port: 3000, // 修改为与Electron配置一致的端口
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
  define: {
    __PRODUCTION__: JSON.stringify(process.env.NODE_ENV === 'production'),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
})