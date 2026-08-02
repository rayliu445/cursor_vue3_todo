#!/bin/bash
# ============================================
# TinyDo - macOS 一键安装脚本
# 用法:
#   curl -fsSL https://raw.githubusercontent.com/rayliu445/tinydo/main/scripts/install-mac.sh | bash
#   bash scripts/install-mac.sh              (默认安装最新 release)
#   bash scripts/install-mac.sh v0.0.5       (指定版本)
# ============================================
set -e

REPO="rayliu445/tinydo"
APP_NAME="TinyDo"

# 解析版本：默认自动获取最新 release
if [ -z "${1:-}" ]; then
  echo "📦 正在获取最新版本..."
  API="https://api.github.com/repos/$REPO/releases/latest"
  DMG_URL=$(curl -fsSL "$API" | grep '"browser_download_url"' | grep -i 'mac' | grep -i '\.dmg"' | head -1 | sed 's/.*: "\(.*\)",*/\1/')
  VERSION=$(curl -fsSL "$API" | grep '"tag_name"' | head -1 | sed 's/.*: "\(.*\)",*/\1/')
  if [ -z "$DMG_URL" ] || [ -z "$VERSION" ]; then
    echo "❌ 无法获取最新版本，请手动指定版本：bash scripts/install-mac.sh v0.0.5"
    exit 1
  fi
else
  VERSION="$1"
  DMG_URL="https://github.com/$REPO/releases/download/$VERSION/TinyDo-mac-arm64.dmg"
fi

echo "📦 正在下载 TinyDo $VERSION ..."
echo "  下载: $DMG_URL"

TMP_DMG="/tmp/tinydo-$VERSION.dmg"

# 下载
curl -fsSL "$DMG_URL" -o "$TMP_DMG" || {
  echo "❌ 下载失败：请确认版本 $VERSION 已发布"
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
