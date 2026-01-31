#!/bin/bash

# Cursor Vue3 Todo 安装脚本
echo "正在安装 Cursor Vue3 Todo..."

# 获取当前脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 检查DMG文件是否存在
DMG_FILE="$SCRIPT_DIR/release/Cursor-Vue3-Todo-debug-enabled.dmg"
if [ ! -f "$DMG_FILE" ]; then
    echo "错误: 未找到DMG文件: $DMG_FILE"
    exit 1
fi

echo "找到DMG文件: $DMG_FILE"

# 挂载DMG文件
MOUNT_POINT="/Volumes/Cursor-Vue3-Todo-Installer"
if [ -d "$MOUNT_POINT" ]; then
    echo "卸载已存在的挂载点..."
    hdiutil detach "$MOUNT_POINT" 2>/dev/null || true
fi

echo "正在挂载DMG文件..."
MOUNT_RESULT=$(hdiutil attach "$DMG_FILE" -nobrowse -quiet)
if [ $? -ne 0 ]; then
    echo "错误: 无法挂载DMG文件"
    exit 1
fi

# 查找挂载的应用程序
APP_NAME="Cursor Vue3 Todo.app"
SOURCE_APP="$MOUNT_POINT/$APP_NAME"

if [ ! -d "$SOURCE_APP" ]; then
    echo "错误: 未在DMG中找到应用程序: $SOURCE_APP"
    hdiutil detach "$MOUNT_POINT" 2>/dev/null || true
    exit 1
fi

# 安装到应用程序目录
TARGET_DIR="/Applications/$APP_NAME"
if [ -d "$TARGET_DIR" ]; then
    echo "发现现有版本，正在替换..."
    rm -rf "$TARGET_DIR"
fi

echo "正在安装应用程序到 $TARGET_DIR..."
cp -R "$SOURCE_APP" "$TARGET_DIR"

if [ $? -eq 0 ]; then
    echo "安装成功！"
    echo "您可以在 'Applications' 文件夹中找到 Cursor Vue3 Todo，或使用 Spotlight 搜索启动。"
    
    # 卸载DMG
    hdiutil detach "$MOUNT_POINT" 2>/dev/null || true
    
    # 打开应用程序目录
    open -R "$TARGET_DIR"
else
    echo "安装失败"
    hdiutil detach "$MOUNT_POINT" 2>/dev/null || true
    exit 1
fi