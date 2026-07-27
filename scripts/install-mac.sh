#!/bin/bash
# ============================================
# TinyDo - macOS 安装脚本
# 用法: curl -fsSL https://<你的域名>/install.sh | bash
# 或:   bash scripts/install-mac.sh [版本号]
# ============================================
set -e

VERSION="${1:-v0.0.1}"
BASE_URL="https://github.com/<你的用户名>/<仓库名>/releases/download/$VERSION"
APP_NAME="TinyDo"

echo "📦 正在下载 TinyDo $VERSION ..."

# 检测架构
ARCH="arm64"
if [[ "$(uname -m)" == "x86_64" ]]; then
  ARCH="x64"
fi

DMG_URL="$BASE_URL/Todo-App-$VERSION-mac.dmg"
TMP_DMG="/tmp/todo-app-$VERSION.dmg"

# 下载
echo "  下载: $DMG_URL"
curl -fsSL "$DMG_URL" -o "$TMP_DMG"

# 挂载并安装
MOUNT="/tmp/todo-app-mount"
hdiutil attach "$TMP_DMG" -mountpoint "$MOUNT" -nobrowse -quiet
TARGET="/Applications/$APP_NAME.app"
[ -d "$TARGET" ] && rm -rf "$TARGET"
cp -R "$MOUNT/$APP_NAME.app" "$TARGET"
hdiutil detach "$MOUNT" -quiet 2>/dev/null || true
rm -f "$TMP_DMG"

echo "✅ 安装完成！请在启动台或 Applications 中打开"
