#!/bin/bash
# ============================================
# macOS 应用修复脚本
# 对未签名的 .app 进行 ad-hoc 签名
# 解决 "已损坏，无法打开" 的 Gatekeeper 报错
# ============================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_DIR/dist-electron"

echo "🔧 macOS App 签名修复"
echo "========================"

# 查找构建输出的 .app 文件
# electron-builder dmg 输出在 dist-electron/ 下
# dir 输出在 dist-electron/mac-arm64/ 或 dist-electron/mac/ 下

APP_PATH=""

# 先找 DMG 旁边的 .app（dmg target 会把 app 放在同目录的 mac/ 或 mac-arm64/ 下）
for dir in "$BUILD_DIR/mac-arm64" "$BUILD_DIR/mac" "$BUILD_DIR"; do
  found_app=$(find "$dir" -maxdepth 1 -name "*.app" -type d 2>/dev/null | head -1)
  if [ -n "$found_app" ]; then
    APP_PATH="$found_app"
    break
  fi
done

if [ -z "$APP_PATH" ]; then
  echo "❌ 未找到 .app 文件"
  echo "   查找路径: $BUILD_DIR"
  ls -la "$BUILD_DIR" 2>/dev/null || true
  find "$BUILD_DIR" -name "*.app" -maxdepth 3 2>/dev/null || true
  exit 1
fi

echo "📦 找到应用: $APP_PATH"

# 1. 移除 quarantine 属性
echo "⏳ 移除 quarantine 属性..."
xattr -cr "$APP_PATH" 2>/dev/null || true
echo "   ✅ 已清除扩展属性"

# 2. Ad-hoc 签名（使用空白签名，不需要 Apple Developer 证书）
echo "⏳ 执行 ad-hoc 签名..."
codesign --force --deep --sign - "$APP_PATH" 2>&1
echo "   ✅ Ad-hoc 签名完成"

# 3. 验证签名
echo "⏳ 验证签名..."
codesign -dvv "$APP_PATH" 2>&1 | head -5
echo "   ✅ 签名验证通过"

# 4. 创建 DMG（electron-builder 的 hdiutil 在 arm64 上有兼容问题）
echo "⏳ 创建 DMG..."
cd "$BUILD_DIR"
APP_NAME=$(basename "$APP_PATH")
VERSION=$(node -e "console.log(require('$PROJECT_DIR/package.json').version)")
DMG_NAME="Todo-App-v$VERSION-mac-arm64.dmg"
hdiutil create -size 500m -fs APFS -volname "Todo App" \
  -srcfolder "$APP_NAME" -format UDZO -ov "$DMG_NAME" 2>&1 | tail -1
echo "   ✅ DMG 创建完成: $DMG_NAME"

echo ""
echo "✅ 完成！应用已签名，DMG 已生成。"
echo "   如果仍然报错，请运行: sudo xattr -rd com.apple.quarantine \"$APP_PATH\""
