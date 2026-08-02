#!/bin/bash
# ============================================
# TinyDo - macOS 一键安装脚本
# 用法:
#   curl -fsSL https://raw.githubusercontent.com/rayliu445/tinydo/main/scripts/install-mac.sh | bash
#   bash scripts/install-mac.sh [版本号]   (默认 v0.0.3)
# ============================================
set -e

REPO="rayliu445/tinydo"
VERSION="${1:-v0.0.3}"
# CI 中 DMG 固定命名为 TinyDo-mac-arm64.dmg
DMG_NAME="TinyDo-mac-arm64.dmg"
DMG_URL="https://github.com/$REPO/releases/download/$VERSION/$DMG_NAME"
APP_NAME="TinyDo"

echo "📦 正在下载 TinyDo $VERSION ..."
echo "  下载: $DMG_URL"

TMP_DMG="/tmp/tinydo-$VERSION.dmg"

# 下载
curl -fsSL "$DMG_URL" -o "$TMP_DMG" || {
  echo "❌ 下载失败：请确认版本 $VERSION 已发布，且包含 $DMG_NAME"
  echo "   可前往 https://github.com/$REPO/releases 查看"
  exit 1
}

# 挂载 DMG
MOUNT="/tmp/tinydo-mount"
rm -rf "$MOUNT"
mkdir -p "$MOUNT"
hdiutil attach "$TMP_DMG" -mountpoint "$MOUNT" -nobrowse -quiet

TARGET="/Applications/$APP_NAME.app"
[ -d "$TARGET" ] && rm -rf "$TARGET"
cp -R "$MOUNT/$APP_NAME.app" "$TARGET"
hdiutil detach "$MOUNT" -quiet 2>/dev/null || true
rm -f "$TMP_DMG"

echo "✅ 已复制到 /Applications"

# 解除 Gatekeeper 隔离（解决"已损坏，无法打开"）
echo "🔓 正在解除 macOS 隔离属性..."
xattr -cr "$TARGET" 2>/dev/null || true

echo ""
echo "✅ 安装完成！正在启动 TinyDo ..."
open "$TARGET"
