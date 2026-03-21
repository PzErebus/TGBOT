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
- 🔐 **用户权限管理** - 管理员和普通用户分级权限
- 🔄 **AI回复记录** - 记录AI生成的所有回复，支持纠正和忽略
- 🚫 **忽略功能** - 可忽略不需要回答的问题，下次自动跳过

## 🏗️ 架构设计

```
用户消息 → AI意图分类器 → 判断是否需要回答
    ↓
需要回答 → 知识库多问题匹配 → 找到最相似的条目
    ↓
高相似度(≥0.7) → 直接返回知识库答案
中相似度(0.6-0.7) → AI学习知识库+前言内容生成回答
低相似度(<0.6) → 记录到未回答问题
```

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
USER_TOKEN = "your-user-token"
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

```powershell
$botToken = "your-bot-token"
$webhookUrl = "https://your-worker.your-subdomain.workers.dev/webhook"
Invoke-RestMethod -Uri "https://api.telegram.org/bot$botToken/setWebhook?url=$webhookUrl" -Method Post
```

## 📖 使用指南

### 用户权限系统

| 用户类型 | 用户名 | 密码 | 权限范围 |
|---------|-------|------|---------|
| 管理员 | admin | CF环境变量 ADMIN_TOKEN | 全部功能 |
| 普通用户 | user | CF环境变量 USER_TOKEN | 前言管理、知识库管理、未回答问题、知识缺口分析 |

### 管理界面功能

**统计面板：**
- 知识库答案数量
- 今日回答次数
- AI调用次数
- AI消耗估算
- 数据统计图表

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
- 一键查重
- 导入/导出知识库

**AI回复记录：**
- 查看AI生成的所有回复
- 纠正错误的AI回答
- 忽略不需要回答的问题
- 标记状态：待审核/已纠正/已忽略

## 📁 文件说明

```
.
├── worker.js              # 主程序代码（包含前端界面）
├── v4_schema.sql          # 数据库结构
├── wrangler.toml          # Cloudflare 配置
├── package.json           # 项目依赖
├── README.md              # 项目说明
└── qa.md                  # 知识库问答整理文档
```

## 📝 更新日志

### v4.13.0 (2026-03-21)
- 🔄 添加AI回复记录功能
- 🚫 添加忽略功能，可忽略不需要回答的问题
- ✏️ 添加AI回复纠正功能
- 💬 优化日常对话过滤规则
- 🎯 优化短消息处理逻辑（2字关键词也能匹配）

### v4.12.0 (2026-03-20)
- 📄 添加知识库问答整理文档 (qa.md)
- 🧹 清理临时文件，优化项目结构

### v4.11.0 (2026-03-20)
- 🔐 添加用户权限系统
- 🎨 优化登录界面设计
- 🚪 添加退出登录功能

### v4.10.0
- 📱 移动端优化
- 🌙 深色模式支持
- 📊 数据统计图表
- 📋 操作日志记录

### v4.8.0 - v4.9.0
- 🔍 修复查重功能，支持多答案检测
- 🛡️ 添加智能防刷屏功能
- 💬 添加日常对话过滤
- 🎲 添加多答案随机回复功能
- 🎨 优化回答排版
- 添加导出导入功能
- 添加前言/背景知识管理
- 添加AI配额控制
- 北京时间显示

## 📄 许可证

MIT License
