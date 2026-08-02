#!/bin/bash
# ============================================
# TinyDo - 一键安装脚本
# ============================================
# 使用方法：双击此文件，选择"打开"即可
# 需要管理员权限来移除 Gatekeeper 隔离属性
# ============================================

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="TinyDo.app"
APP_PATH="$SCRIPT_DIR/$APP_NAME"
INSTALL_PATH="/Applications/$APP_NAME"

# 先解除脚本自身的隔离属性（防止脚本被 Gatekeeper 判定为"不安全"）
if command -v xattr &>/dev/null; then
  xattr -cr "$SCRIPT_DIR" 2>/dev/null || true
  xattr -cr "$0" 2>/dev/null || true
fi

echo "========================================"
echo "  TinyDo 安装程序"
echo "========================================"
echo ""

# 检查 .app 是否存在
if [ ! -d "$APP_PATH" ]; then
  echo "❌ 错误：未找到 $APP_NAME"
  echo "   请在 DMG 镜像中运行此脚本"
  echo ""
  read -p "按 Enter 键退出..." _
  exit 1
fi

# 检查是否已安装
if [ -d "$INSTALL_PATH" ]; then
  echo "⚠️  检测到已安装的版本，正在覆盖..."
  echo "   ✅ 您的任务数据与同步配置会保留（位于 ~/Library/Application Support/TinyDo）"
  rm -rf "$INSTALL_PATH"
fi

echo "📦 正在复制应用到 /Applications ..."
cp -R "$APP_PATH" "$INSTALL_PATH"
echo "   ✅ 复制完成"

echo ""
echo "🔓 正在移除 Gatekeeper 隔离属性..."
sudo xattr -rd com.apple.quarantine "$INSTALL_PATH" 2>/dev/null
echo "   ✅ 已解除隔离"

echo ""
echo "🚀 正在启动 TinyDo ..."
open "$INSTALL_PATH"

echo ""
echo "✅ 安装完成！应用已启动。"
echo "   如果仍然有问题，请尝试："
echo "   系统设置 → 隐私与安全性 → 仍要打开"
echo ""

read -p "按 Enter 键退出..." _
