#!/bin/bash
# ============================================
# TinyDo - iOS 侧载 .ipa 构建脚本
# 无需 Apple 开发者账号，产出 ad-hoc 签名 .ipa
# 可用 AltStore / Sideloadly / SideStore 免费安装
#
# 用法:
#   bash scripts/build-ios.sh
# 或:
#   npm run mobile:build:ios:adhoc
# ============================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VERSION=$(node -e "console.log(require('$PROJECT_DIR/package.json').version)")
IOS_DIR="$PROJECT_DIR/ios/App"
BUILD_DIR="$PROJECT_DIR/ios/build"
IPA_NAME="TinyDo-v$VERSION-ios.ipa"

echo "==================== TinyDo iOS Build v$VERSION ===================="
echo ""

# 1. 环境检查
if ! command -v xcodebuild &>/dev/null; then
  echo "❌ 未检测到 Xcode，请先安装 Xcode 及 Command Line Tools"
  exit 1
fi
if [ ! -d "$IOS_DIR/App.xcworkspace" ]; then
  echo "❌ 未找到 iOS 工程 (ios/App)"
  echo "   请先运行: npx cap add ios && npx cap sync ios"
  exit 1
fi

# 2. 构建前端
echo "[1/4] Building web assets..."
cd "$PROJECT_DIR"
npm run build

# 3. 同步到 iOS 工程
echo "[2/4] Syncing to iOS project..."
npx cap sync ios

# 4. 编译原生工程（不签名，编译后再统一 ad-hoc 签名）
echo "[3/4] Building native app (unsigned)..."
rm -rf "$BUILD_DIR"
cd "$IOS_DIR"
xcodebuild -workspace App.xcworkspace -scheme App -configuration Release \
  -sdk iphoneos -derivedDataPath "$BUILD_DIR/derived" \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" \
  build 2>&1 | tail -5

APP_PATH="$BUILD_DIR/derived/Build/Products/Release-iphoneos/App.app"
if [ ! -d "$APP_PATH" ]; then
  echo "❌ 编译失败：未找到产物 $APP_PATH"
  exit 1
fi

# 5. Ad-hoc 签名 + 打包 .ipa
echo "[4/4] Ad-hoc signing & packaging .ipa..."
codesign --force --deep --sign - "$APP_PATH"

rm -rf "$BUILD_DIR/ipa"
mkdir -p "$BUILD_DIR/ipa/Payload"
cp -R "$APP_PATH" "$BUILD_DIR/ipa/Payload/"
cd "$BUILD_DIR/ipa"
rm -f "$IPA_NAME"
# -y 保留符号链接（iOS framework 依赖）
zip -qry "$IPA_NAME" Payload
cd "$PROJECT_DIR"

# 复制到 release 目录
RELEASE_DIR="$PROJECT_DIR/release/v$VERSION"
mkdir -p "$RELEASE_DIR"
cp "$BUILD_DIR/ipa/$IPA_NAME" "$RELEASE_DIR/"

echo ""
echo "✅ iOS .ipa 构建完成:"
echo "   $RELEASE_DIR/$IPA_NAME"
echo ""
echo "安装方式（任选其一，均无需开发者账号）："
echo "   1. AltStore   → 将 .ipa 传输到 iPhone，在 AltStore 中 My Apps → + 选择安装"
echo "   2. Sideloadly → iPhone 连接电脑，拖入 .ipa，输入 Apple ID 签名安装"
echo "   3. SideStore  → 在 SideStore 中导入 .ipa"
echo ""
echo "⚠️  免费 Apple ID 签名的应用每 7 天需要续签一次（AltStore 可自动续签）"
