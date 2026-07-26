#!/bin/bash
# ============================================
# Todo App - 全平台构建脚本
# 自动检测当前系统可构建的平台
# ============================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VERSION=$(node -e "console.log(require('$PROJECT_DIR/package.json').version)")
RELEASE_DIR="$PROJECT_DIR/release/v$VERSION"
BUILD_DIR="$PROJECT_DIR/dist-electron"

echo "==================== Todo App Build v$VERSION ===================="
echo ""

# 1. 编译前端
echo "[1/5] Building web assets..."
cd "$PROJECT_DIR"
npx vite build
echo "  ✅ Web assets built"
echo ""

# 2. macOS
echo "[2/5] Checking macOS build..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  npx electron-builder --mac --publish=never 2>&1 | tail -3
  mkdir -p "$RELEASE_DIR"
  cp "$BUILD_DIR"/*-mac.dmg "$RELEASE_DIR/" 2>/dev/null || true
  cp "$BUILD_DIR"/*-mac.dmg.blockmap "$RELEASE_DIR/" 2>/dev/null || true
  echo "  ✅ macOS .dmg built"
else
  echo "  ⏭️  Skipped (not macOS)"
fi
echo ""

# 3. Windows
echo "[3/5] Checking Windows build..."
if command -v wine64 &>/dev/null || [[ "$OSTYPE" == "msys" ]]; then
  npx electron-builder --win --publish=never 2>&1 | tail -3
  mkdir -p "$RELEASE_DIR"
  cp "$BUILD_DIR"/*-win.exe "$RELEASE_DIR/" 2>/dev/null || true
  cp "$BUILD_DIR"/*-win.zip "$RELEASE_DIR/" 2>/dev/null || true
  echo "  ✅ Windows .exe built"
else
  echo "  ⏭️  Skipped (no wine, not Windows)"
fi
echo ""

# 4. Android
echo "[4/5] Checking Android build..."
if [ -n "$ANDROID_HOME" ] || [ -d "$HOME/Library/Android/sdk" ]; then
  export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
  cd "$PROJECT_DIR/android"
  ./gradlew assembleDebug 2>&1 | tail -3
  mkdir -p "$RELEASE_DIR"
  cp app/build/outputs/apk/debug/app-debug.apk "$RELEASE_DIR/Todo-App-v$VERSION-android.apk"
  echo "  ✅ Android .apk built"
else
  echo "  ⏭️  Skipped (no Android SDK)"
fi
cd "$PROJECT_DIR"
echo ""

# 5. iOS
echo "[5/5] Checking iOS build..."
if command -v xcodebuild &>/dev/null; then
  npx cap sync ios 2>&1 | tail -3
  cd ios/App
  xcodebuild -workspace App.xcworkspace -scheme App -archivePath build/App.xcarchive archive 2>&1 | tail -3
  xcodebuild -exportArchive -archivePath build/App.xcarchive -exportPath build/App.ipa -exportOptionsPlist exportOptions.plist 2>&1 | tail -3
  mkdir -p "$RELEASE_DIR"
  cp build/App.ipa "$RELEASE_DIR/Todo-App-v$VERSION-ios.ipa" 2>/dev/null || true
  echo "  ✅ iOS .ipa built"
else
  echo "  ⏭️  Skipped (no Xcode)"
fi
echo ""

# 生成校验文件
echo "Generating checksums..."
cd "$RELEASE_DIR"
shasum -a 256 * > SHA256SUMS.txt 2>/dev/null || true
echo ""

# 汇总
echo "==================== Build Summary ===================="
ls -lh "$RELEASE_DIR/" 2>/dev/null || echo "(no artifacts)"
echo "======================================================="
