#!/bin/bash

# Cursor Vue3 Todo 重新打包脚本
echo "开始重新构建 Cursor Vue3 Todo DMG..."

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "错误: 未在项目根目录中找到 package.json"
    exit 1
fi

# 构建前端项目
echo "正在构建前端项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "错误: 构建前端项目失败"
    exit 1
fi

# 确保构建后的文件存在
if [ ! -f "dist/index.html" ]; then
    echo "错误: 构建后未找到 dist/index.html"
    exit 1
fi

echo "前端项目构建成功"

# 更新 dist/index.html 中的资源引用（如果需要）
ASSETS_DIR="dist/assets"
INDEX_FILE="dist/index.html"

# 查找最新的 JS 和 CSS 文件
JS_FILE=$(ls $ASSETS_DIR/index.*.js 2>/dev/null | head -n 1 | xargs basename)
CSS_FILE=$(ls $ASSETS_DIR/index.*.css 2>/dev/null | head -n 1 | xargs basename)

if [ -n "$JS_FILE" ] && [ -n "$CSS_FILE" ]; then
    echo "更新 index.html 中的资源引用"
    sed -i.bak "s|src=\"./assets/index\.[^.]*\.js\"|src=\"./assets/$JS_FILE\"|" "$INDEX_FILE"
    sed -i.bak "s|href=\"./assets/index\.[^.]*\.css\"|href=\"./assets/$CSS_FILE\"|" "$INDEX_FILE"
    rm -f "$INDEX_FILE.bak"
fi

# 构建 DMG
echo "正在构建 DMG 文件..."
npx electron-builder --mac dmg

if [ $? -ne 0 ]; then
    echo "错误: 构建 DMG 失败"
    exit 1
fi

# 查找生成的 DMG 文件
DMG_PATH=$(find dist-electron -name "*.dmg" -type f | head -n 1)

if [ -z "$DMG_PATH" ]; then
    echo "错误: 未找到生成的 DMG 文件"
    exit 1
fi

echo "DMG 文件已成功构建: $DMG_PATH"

# 将 DMG 文件复制到发布目录
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
NEW_DMG_NAME="Cursor-Vue3-Todo-$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")-$TIMESTAMP.dmg"
cp "$DMG_PATH" "release/$NEW_DMG_NAME"

echo "DMG 文件已复制到: release/$NEW_DMG_NAME"

echo "重新构建流程完成！"
echo ""
echo "新版本的 DMG 文件位于: release/$NEW_DMG_NAME"
echo ""
echo "日志配置说明:"
echo "- 日志功能可通过 config.json 中的 enableLogging 字段控制"
echo "- 日志级别可通过 config.json 中的 logLevel 字段控制 (ERROR, WARN, INFO, DEBUG)"
echo "- 日志文件保存在: ~/Library/Application Support/Cursor Vue3 Todo/logs/"
echo "- 每天的日志会保存在一个单独的文件中，格式为 app-YYYY-MM-DD.log"