#!/usr/bin/env node
/**
 * 跨平台 post-build 脚本
 * 修复 index.html 中的路径，使其能在 file:// 协议下工作
 * 替代 macOS 专属的 sed -i '' 命令
 */
const fs = require('fs')
const path = require('path')

const distDir = path.resolve(__dirname, '..', 'dist')
const indexPath = path.join(distDir, 'index.html')

if (!fs.existsSync(indexPath)) {
  console.error(`Error: ${indexPath} not found`)
  process.exit(1)
}

let html = fs.readFileSync(indexPath, 'utf-8')

// 1. 将绝对路径 /assets/... 改为相对路径 ./assets/...
html = html.replace(/(href|src)="\//g, '$1="./')

// 2. 移除 crossorigin 属性
html = html.replace(/\s+crossorigin\s*/g, ' ')

// 3. 确保 favicon 路径正确
html = html.replace(/\.\/favicon\.ico/g, './favicon.ico')

fs.writeFileSync(indexPath, html, 'utf-8')
console.log('✅ index.html paths fixed for file:// protocol')
