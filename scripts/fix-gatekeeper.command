#!/bin/bash
# ============================================
# Todo App - Gatekeeper 修复脚本
# 解决 macOS "已损坏，无法打开" 问题
# ============================================
# 使用方法：从 DMG 中双击此文件，点击"打开"
# 脚本会自动复制 app 到 Applications 并修复权限
# ============================================

# 获取此脚本所在目录（DMG 挂载点）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="Todo App.app"
APP_SRC="$SCRIPT_DIR/$APP_NAME"
APP_DST="/Applications/$APP_NAME"

echo ""
echo "  ╔═══════════════════════════════════╗"
echo "  ║       Todo App 安装助手        ║"
echo "  ╚═══════════════════════════════════╝"
echo ""

# 检查 app 是否在脚本旁边
if [ ! -d "$APP_SRC" ]; then
  echo "❌ 错误：未找到 $APP_NAME"
  echo "   请确保此脚本和 $APP_NAME 在同一目录下"
  echo "   （通常直接从 DMG 中运行即可）"
  echo ""
  read -n 1 -s -r -p "按任意键退出..."
  echo ""
  exit 1
fi

echo "📦 正在安装 $APP_NAME ..."
echo ""

# 删除旧版本
if [ -d "$APP_DST" ]; then
  echo "   ⚠️  检测到已安装版本，正在覆盖..."
  rm -rf "$APP_DST"
fi

# 复制到 Applications
echo "   📋 复制到 /Applications ..."
cp -R "$APP_SRC" "$APP_DST"
echo "   ✅ 复制完成"
echo ""

# 移除 quarantine 属性（解决"已损坏"问题）
echo "   🔓 移除 macOS 隔离属性..."
xattr -cr "$APP_DST" 2>/dev/null
echo "   ✅ 隔离已解除"

echo ""
echo "   🚀 正在启动 Todo App ..."
open "$APP_DST"

echo ""
echo "  ╔═══════════════════════════════════╗"
echo "  ║      安装完成！应用已启动       ║"
echo "  ╚═══════════════════════════════════╝"
echo ""
echo "  首次打开后，以后双击即可正常使用"
echo ""

read -n 1 -s -r -p "按任意键退出..."
echo ""
