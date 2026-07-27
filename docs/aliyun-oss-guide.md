# 阿里云 OSS 同步配置指南

## 概述

Todo App 支持通过阿里云 OSS（对象存储服务）实现跨设备数据同步。
配置只需 3 步，全程 5 分钟。

## 配置步骤

### 第一步：注册阿里云账号

如果你还没有阿里云账号：
1. 打开 [阿里云官网](https://www.aliyun.com/)
2. 点击右上角 **免费注册**
3. 按提示完成注册（手机号验证）

### 第二步：创建 OSS Bucket

1. 登录阿里云控制台 → 搜索 **OSS** → 进入 **对象存储 OSS**
2. 如果是首次使用，点击 **开通 OSS 服务**（免费开通）
3. 点击左侧 **Bucket 列表** → **创建 Bucket**
4. 填写：
   - **Bucket 名称**：`todo-app-sync`（或你喜欢的名字）
   - **地域**：选择离你最近的，比如 **华东1（杭州）**
   - **存储类型**：**标准存储**
   - **读写权限**：**私有**
5. 点击 **确定**

### 第三步：获取 AccessKey

1. 鼠标悬停在右上角头像上 → 点击 **AccessKey 管理**
2. 点击 **创建 AccessKey**
3. 输入短信验证码验证
4. 创建成功后，**立即复制并保存**：
   - **AccessKey ID**（格式如 `LTAI5txxxxx`）
   - **AccessKey Secret**（格式如 `xxxxxxxxxxxxxxxxxxxxxxxx`）

> ⚠️ **注意**：AccessKey Secret 只在创建时显示一次，关闭窗口后就看不到了。
> 如果丢失，需要删除重建。

### 第四步：在 App 中配置

1. 打开 Todo App → **设置** → **同步**
2. 填写以下信息：

   | 字段 | 值 |
   |------|-----|
   | **Bucket 名称** | 第二步创建的名称，如 `todo-app-sync` |
   | **Region** | 第二步选的地域，如 `oss-cn-hangzhou` |
   | **AccessKey ID** | 第三步复制的 ID |
   | **AccessKey Secret** | 第三步复制的 Secret |

3. 点击 **测试连接**，验证配置是否正确
4. 连接成功后会自动开始同步

## 常见问题

### Q: 需要花钱吗？
免费额度足够个人使用：
- **5GB 存储** — 你的 todo 数据最多几百 KB
- **每月 5GB 下行流量** — 同步一次几十 KB
- 超过免费额度后，0.12 元/GB/月

### Q: 数据安全吗？
- Bucket 权限设为**私有**，只有你有 AccessKey 才能访问
- AccessKey 可随时在阿里云控制台禁用或删除
- 数据传输使用 HTTPS 加密

### Q: 能和其他人共享数据吗？
目前不支持多账号共享。每个用户使用自己的 Bucket。

### Q: 如何更换 Bucket？
在设置页面断开连接，修改 Bucket 名称后重新连接。

## 参考链接

- [阿里云 OSS 产品页](https://www.aliyun.com/product/oss)
- [OSS 计费说明](https://www.aliyun.com/price/product#/oss/detail)
- [创建 AccessKey](https://help.aliyun.com/zh/ram/user-guide/create-an-accesskey)
