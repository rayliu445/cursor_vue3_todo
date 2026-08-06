# TinyDo 安装指南

> ⚠️ **重要说明**：TinyDo 桌面版使用**未签名的自编译安装包**（未购买 Apple Developer 证书），
> 因此 macOS 会通过 Gatekeeper 拦截首次打开。**这是正常现象，不是应用损坏**，
> 请按照下面的「macOS 常见问题」处理，一般 1 分钟内即可正常使用。

---

## macOS

### 方式一：DMG 安装包（推荐）

1. 从 [Releases 页面](https://github.com/rayliu445/tinydo/releases) 下载 `.dmg` 文件
   （Apple Silicon / M 系列芯片下载 `TinyDo-mac-arm64.dmg`）
2. 双击打开 `.dmg`，里面包含：
   - `TinyDo.app` — 应用本体
   - `fix-gatekeeper.command` — **安装助手脚本（推荐直接双击它）**
3. **推荐**：双击 `fix-gatekeeper.command`，脚本会自动完成：
   复制到 Applications → 解除系统拦截（xattr）→ 启动应用
4. 或者手动安装：将 `TinyDo.app` 拖入 `Applications` 文件夹，
   然后按下方「macOS 常见问题」处理首次打开被拦截的问题

### 方式二：命令行一键安装（终端用户）

```bash
# 自动下载最新 DMG 并安装到 /Applications（会自动解除隔离）
curl -fsSL https://raw.githubusercontent.com/rayliu445/tinydo/main/scripts/install-mac.sh | bash

# 或指定版本
bash scripts/install-mac.sh v0.0.3
```

### 方式三：开发模式

```bash
git clone https://github.com/rayliu445/tinydo.git
cd tinydo
npm install
npm run dev
# 访问 http://localhost:3000
```

### ⚠️ macOS 常见问题（必读）

由于 TinyDo 未签名，macOS 首次打开时可能遇到以下情况，**都不是应用损坏**：

#### 1. 「无法验证开发者」/「无法打开，因为 Apple 无法检查其是否包含恶意软件」

- 前往 **系统设置 → 隐私与安全性 → 安全性** 下方
- 点击 **「仍要打开」** 按钮 → 再次双击应用即可

#### 2. 「已损坏，无法打开。您应该将它移到废纸篓」

这是 Gatekeeper 的隔离属性（quarantine）误报导致的，**应用本身没有损坏**。解决方法：

```bash
xattr -cr /Applications/TinyDo.app && open /Applications/TinyDo.app
```

> 也可以直接双击 DMG 里的 `fix-gatekeeper.command`，效果相同，无需手动输入命令。

#### 3. `fix-gatekeeper.command` 本身被提示「不安全 / 已损坏」

脚本和 App 一样从浏览器下载时也会带上隔离属性，属于正常现象。处理方式：

- **右键 → 打开** 脚本 → 在弹出的对话框中点击**「打开」**（仅需这一次）
- 脚本运行后会**先对自己执行 `xattr` 解除隔离**，之后直接双击即可正常使用
- 如果仍被拦截，在终端手动执行：
  ```bash
  cd /Volumes/TinyDo && bash fix-gatekeeper.command
  ```
- 或者用终端下载（`curl` 下载的文件不会带隔离属性，完全不会触发拦截）：
  ```bash
  curl -fsSL -o /tmp/TinyDo.dmg https://github.com/rayliu445/tinydo/releases/latest/download/TinyDo-mac-arm64.dmg
  ```

#### 4. macOS 15+ (Sequoia) 限制更严格（提示「Apple 无法验证是否包含恶意软件」）

macOS 15+ 对隔离下载的脚本会弹出 **「Apple 无法验证『fix-gatekeeper.command』是否包含可能危害 Mac 安全或泄漏隐私的恶意软件」**，且双击时没有「打开」按钮。这是隔离属性的正常提示，**脚本本身是安全的**。处理方式：

- **最可靠：终端直接运行**（终端不受该拦截影响，`xattr` 先清除隔离再运行）：
  ```bash
  cd /Volumes/TinyDo && xattr -cr fix-gatekeeper.command && bash fix-gatekeeper.command
  ```
- **或手动安装**（等价于脚本做的事，两步搞定）：
  ```bash
  cp -R /Volumes/TinyDo/TinyDo.app /Applications/
  xattr -cr /Applications/TinyDo.app
  open /Applications/TinyDo.app
  ```
- **或改用 curl 一键安装**（curl 下载不带隔离属性，完全不会触发任何拦截）：
  ```bash
  curl -fsSL https://raw.githubusercontent.com/rayliu445/tinydo/main/scripts/install-mac.sh | bash
  ```

#### 5. 首次打开提示「无法打开，因为来自身份不明的开发者」

- 系统设置 → 隐私与安全性 → 点击 **「仍要打开」**

#### 6. 只支持 Apple Silicon（M1/M2/M3/M4）

- 当前仅提供 `arm64` 安装包，Intel Mac 请使用 Web 版或开发模式

### 更新安装会覆盖我的数据吗？

**不会。** 再次安装（覆盖安装）只会替换 `/Applications/TinyDo.app` 应用本体，
您的**任务数据、同步配置、主题设置**都保存在应用数据目录
`~/Library/Application Support/tinydo/`（位于应用外部，脚本不会动它），所以：

- ✅ 覆盖安装后数据原样保留，**不需要重新配置**同步/主题
- ✅ 任务列表、历史记录完全不变
- ✅ 如果担心，可在设置页先「导出数据」备份一份

### macOS 系统要求

- macOS 11.0 或更高版本（Apple Silicon）
- 首次安装需要管理员权限（`fix-gatekeeper.command` 会自动处理）

---

## iOS

> iOS 版以 **未签名** 的 `.ipa` 文件形式发布（**无需开发者账号**即可安装），
> 请从 [Releases 页面](https://github.com/rayliu445/tinydo/releases) 下载
> `TinyDo-vX.X.X-ios.ipa`。
>
> ⚠️ **务必使用未签名包**：Sideloadly 对带 ad-hoc 签名的 `.ipa`
> 会报 “Invalid file”，请用侧载工具自行签名安装。

### iOS 系统要求

- iOS 15.0 或更高版本（iPhone / iPad）
- 安装过程需要一台电脑（macOS 或 Windows）

### 方式一：Sideloadly 安装（推荐，实测最稳定）

Sideloadly 使用现代 Apple 认证，对 **手机号 Apple ID + 双重认证** 支持最好。

1. 下载 [Sideloadly](https://sideloadly.io)（macOS / Windows）
2. 用数据线连接 iPhone 到电脑（解锁并点「信任此电脑」）
3. 将 `TinyDo-vX.X.X-ios.ipa` 拖入 Sideloadly
4. 输入 **Apple ID** 和密码（双重认证账号建议用 **App 专用密码**）
5. 勾选 **Automatically re-sign**（自动续签，7 天免手动）
6. 点 **Start** 签名安装
7. 首次打开前：**设置 → 通用 → VPN 与设备管理 → 信任**

### 方式二：SideStore 安装（可选）

1. 访问 [sidestore.io](https://sidestore.io) 安装 SideStore
2. 在 SideStore 中导入 `.ipa` 文件
3. 每 7 天需续签（SideStore 支持无线自动续签）

### 检查更新（iOS 版专属）

设置 → 关于 → **软件更新**：自动对比 GitHub 最新版本，有新版本时提供 `.ipa` 下载链接，下载后用 Sideloadly 覆盖安装即可（数据保留）。

### iOS 常见问题

#### 提示「无法验证 App」或打不开

- 未完成信任操作：**设置 → 通用 → VPN 与设备管理 → 信任**

#### 提示「已到达 App 数量上限」

- 免费 Apple ID 最多同时安装 **3 个**侧载应用，请先删除不用的应用

#### 应用 7 天后打不开

- 免费签名有效期 7 天，Sideloadly 勾选 **Automatically re-sign** 可自动续签；**数据不会丢失**

#### AltServer 登录失败（手机号 Apple ID）

- AltServer 老认证接口对手机号注册 / 双重认证的 Apple ID 兼容性差。
  建议改用 **Sideloadly（方式一）**，或使用邮箱注册的 Apple ID 签名。

### 开发者账号（可选）

如需 1 年长期签名或上架 App Store（需 $99/年 Apple Developer Program）：

1. 本地打开 iOS 工程：`npm run mobile:open:ios`
2. 在 Xcode 的 **Signing & Capabilities** 中选择您的 Team
3. 连接真机，直接 Run 安装即可

---

## Android

### 方式一：直接 APK 安装（推荐）

1. 从 [Releases 页面](https://github.com/rayliu445/tinydo/releases) 下载 `.apk` 文件
2. 在手机上打开文件
3. 如果提示"禁止安装未知来源应用"，请前往：
   **设置 → 安全 → 安装未知应用** → 允许文件管理器
4. 点击安装

### 方式二：Google Play（即将支持）

搜索 **TinyDo** 即可安装。

---

## Web 版（无需安装）

直接访问部署后的网页地址（如 Vercel/Netlify），
在浏览器中使用全部功能（数据存储在浏览器本地）。

---

## 数据同步配置

安装后，建议配置**七牛云 Kodo** 云同步，实现多端数据互通（macOS / iOS / Android / Web 均可配置同一账号同步）：

1. 打开应用 → 点击 ⚙️ 设置 → **同步** Tab
2. 在**七牛云 Kodo** 卡片中填写您的云存储信息（Bucket 名称、Region、AccessKey、SecretKey）
3. 点击 **测试连接**，验证配置正确
4. 点击 **连接**，连接成功后会自动开始同步
5. 在其他设备上重复以上步骤（使用相同的七牛云账号）

> 📖 详细的七牛云账号注册、Bucket 创建、密钥获取步骤见 [docs/qiniu-kodo-guide.md](qiniu-kodo-guide.md)
