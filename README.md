# Telegram 智能知识库机器人

基于 Cloudflare Workers + D1 数据库 + AI 的 Telegram 智能问答机器人，采用**AI学习知识库 + 多问题对应同一答案 + 前言内容管理**架构。

## ✨ 核心特性

- 🤖 **AI意图识别** - 使用 Llama 3.2 1B 判断用户是否在问知识库问题
- 🧠 **AI学习知识库回答** - AI参考知识库内容生成回答，更智能自然
- 📝 **多问题对应同一答案** - 支持同义词/变体，一个答案可对应多个问法
- 🎲 **多答案随机回复** - 同一问题可设置多个答案，随机选择回复
- 💰 **AI配额控制** - 每日限额设置，避免超出免费套餐
- ⚡ **响应优化** - 多级缓存机制，快速响应常见问题
- 🎯 **精准过滤** - AI先过滤闲聊，只对相关问题搜索知识库
- 🛡️ **智能防刷屏** - 10秒内重复消息超过5次自动过滤
- 💬 **日常对话过滤** - 自动过滤"嗯"、"好的"、"你好"等日常对话
- 📊 **统计分析** - 记录AI调用、回答情况、发现知识库缺口
- 🔍 **一键查重** - 快速检测重复问题和答案，支持批量删除
- 🎛️ **灵活配置** - 可开关AI分类器/AI回答、调整匹配阈值、设置AI限额
- 🌐 **Web管理** - 可视化知识库管理，支持批量添加问题变体
- 📥 **导入导出** - 支持知识库的导入导出，方便备份和迁移
- 🕐 **北京时间显示** - 所有时间按北京时间 (Asia/Shanghai) 显示

## 🏗️ 架构设计

```
用户消息 → AI意图分类器 → 判断是否需要回答
    ↓
需要回答 → 知识库多问题匹配 → 找到最相似的条目
    ↓
高相似度(≥0.85) → 直接返回知识库答案
中相似度(0.6-0.85) → AI学习知识库+前言内容生成回答
低相似度(<0.6) → 记录到未回答问题
```

### 知识库结构

```
前言内容（AI回答时参考）
├── 公司介绍
├── 产品说明
├── 服务条款
└── 联系方式

答案A（多个答案随机回复）
├── 答案1：客服电话是400-123-4567，工作时间为周一至周五9:00-18:00。
├── 答案2：您可以拨打400-123-4567联系我们的客服团队。
└── 答案3：如有问题请致电400-123-4567，我们会竭诚为您服务。
    ├── 问题1：怎么联系客服？
    ├── 问题2：客服电话是多少？
    ├── 问题3：如何联系你们？
    └── 问题4：有客服吗？

答案B
├── 问题1：价格是多少？
├── 问题2：多少钱？
└── 问题3：怎么收费？
```

## 💰 AI消耗计算

| 项目 | 数值 |
|------|------|
| 每天消息 | 4000 条 |
| 关键词/疑问词匹配 | 约 3000 条（跳过AI）|
| AI意图识别 | 约 1000 次 × 15 neurons = 15,000 neurons |
| AI生成回答(20%) | 约 200 次 × 100 neurons = 20,000 neurons |
| **每天总消耗** | **约 35,000 neurons** |
| 免费额度 | 10,000 neurons/天 |
| AI每日限额 | 可设置 10-500 次（默认100）|

## 🚀 快速部署

### 1. 创建 Telegram Bot

在 Telegram 中搜索 @BotFather，创建新机器人并获取 Bot Token。

### 2. 配置 Cloudflare

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare
npx wrangler login

# 创建 D1 数据库
npx wrangler d1 create telegram-kb-db
```

### 3. 配置 wrangler.toml

```toml
name = "telegram-kb-bot"
main = "worker.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "telegram-kb-db"
database_id = "your-database-id"

[ai]
binding = "AI"

[vars]
TELEGRAM_BOT_TOKEN = "your-bot-token"
ADMIN_TOKEN = "your-admin-token"
```

### 4. 初始化数据库

```bash
npx wrangler d1 execute telegram-kb-db --file=v4_schema.sql --remote
```

### 5. 部署

```bash
npx wrangler deploy
```

### 6. 设置 Webhook

```bash
# 使用 PowerShell
$botToken = "your-bot-token"
$webhookUrl = "https://your-worker.your-subdomain.workers.dev/webhook"
Invoke-RestMethod -Uri "https://api.telegram.org/bot$botToken/setWebhook?url=$webhookUrl" -Method Post

# 或使用 curl
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-worker.your-subdomain.workers.dev/webhook"}'
```

## 📖 使用指南

### 管理界面

访问 Worker 域名即可打开登录页面：

**用户权限系统：**

| 用户类型 | 用户名 | 密码 | 权限范围 |
|---------|-------|------|---------|
| 管理员 | admin | CF环境变量 ADMIN_TOKEN（默认 admin） | 全部功能 |
| 普通用户 | user | user | 前言管理、知识库管理、未回答问题、知识缺口分析 |

**统计面板：**
- 知识库答案数量
- 今日回答次数
- AI调用次数
- AI消耗估算

**配置选项：**

| 选项 | 说明 | 推荐值 |
|------|------|--------|
| 启用机器人 | 总开关 | 开启 |
| 仅在被@时回复 | 减少误触发 | 关闭（小群）/ 开启（大群） |
| 使用AI意图识别 | 先用AI过滤 | 开启 |
| 使用AI生成答案 | AI学习知识库回答 | 开启 |
| 匹配相似度阈值 | 0.3-0.95 | 0.6 |
| AI参考知识数量 | 1-10 | 5 |
| AI每日限额 | 10-500次 | 100（免费套餐）|

**前言内容管理：**
- 添加背景知识（公司介绍、产品说明等）
- 设置分类和优先级
- AI回答时会自动参考这些内容

**知识库管理：**
- 添加答案（支持多个答案，随机选择回复）
- 添加多个问题变体（每行一个）
- 设置分类和关键词
- 编辑/删除条目
- 一键查重（检测重复问题和答案，支持批量删除）
- 导入/导出知识库

### 一键查重功能

点击"查重"按钮，系统会自动检测：
- **重复问题**：相同或相似的问题
- **重复答案**：相同或相似的答案

查重结果会显示重复项列表，支持：
- 单个删除
- 批量删除（勾选后一键删除）
- 全选/取消全选

### 导入导出功能

**导出：**
- 点击"导出"按钮，下载知识库为文本文件
- 格式：`"问题1"|"问题2"|"问题3"=答案内容`

**导入：**
- 点击"导入"按钮
- 粘贴导出格式的文本
- 每行一个条目，格式：`问题1|问题2|问题3=答案`

### 添加知识示例

**前言内容 - 公司介绍：**
```
我们是一家专注于人工智能解决方案的科技公司，成立于2020年，
总部位于北京。我们的使命是让AI技术惠及更多企业和个人。
```

**答案：**
```
我们的客服电话是 400-123-4567，工作时间为周一至周五 9:00-18:00。
```

**问题变体：**
```
怎么联系客服？
客服电话是多少？
如何联系你们？
有客服吗？
客服联系方式
```

### 回答流程

1. **关键词/疑问词快速匹配** - 检查是否包含已知关键词或疑问词
2. **AI意图识别**（配额内）- 判断是否在问知识库问题
3. **多问题匹配** - 在所有问题变体中找最相似的
4. **前言内容加载** - 获取启用的前言内容作为背景知识
5. **相似度判断：**
   - ≥0.85：直接返回知识库答案
   - 0.6-0.85：AI参考知识库+前言内容生成回答
   - <0.6：记录到未回答问题

## 📁 文件说明

```
.
├── worker.js              # 主程序代码（包含前端界面）
├── v4_schema.sql          # 数据库结构
├── test_data.sql          # 测试数据
├── wrangler.toml          # Cloudflare 配置
├── package.json           # 项目依赖
├── README.md              # 项目说明
├── set-webhook.ps1        # 设置 Webhook 脚本
├── check-kb.ps1           # 检查知识库数据脚本
├── check-messages.ps1     # 检查消息记录脚本
└── check-webhook.ps1      # 检查 Webhook 状态脚本
```

## 🔧 管理脚本

### 设置 Webhook
```powershell
# 修改 set-webhook.ps1 中的 botToken 和 webhookUrl，然后运行
.\set-webhook.ps1
```

### 检查知识库数据
```powershell
.\check-kb.ps1
```

### 检查消息记录
```powershell
.\check-messages.ps1
```

### 检查 Webhook 状态
```powershell
.\check-webhook.ps1
```

## 🐛 调试

访问以下端点查看调试信息：

```
https://your-worker.your-subdomain.workers.dev/debug/messages
https://your-worker.your-subdomain.workers.dev/debug/stats
```

## 📝 更新日志

### v4.11.0 (2026-03-20)
- 🔐 添加用户权限系统
  - 管理员账号：admin（密码从 CF 环境变量 ADMIN_TOKEN 获取）
  - 普通用户账号：user / user
  - 普通用户仅可访问：前言管理、知识库管理、未回答问题、知识缺口分析
  - 管理员可访问全部功能
- 🎨 优化登录界面设计
- 🚪 添加退出登录功能

### v4.10.0
- 📱 移动端优化
- 🌙 深色模式支持
- 📊 数据统计图表
- 📋 操作日志记录

### v4.8.0 - v4.9.0
- 🔍 修复查重功能，支持多答案检测
- 🛡️ 添加智能防刷屏功能（10秒内5次重复自动过滤）
- 💬 添加日常对话过滤（"嗯"、"好的"、"你好"等）
- 🎲 添加多答案随机回复功能
- 🎨 优化回答排版，添加个性化称呼
- 修复统计数据不更新的问题
- 添加导出导入功能
- 修复 JavaScript 语法错误
- 优化响应速度
- 添加前言/背景知识管理
- AI回答时参考前言内容
- 添加AI配额控制
- 北京时间显示

## 📄 许可证

MIT License
