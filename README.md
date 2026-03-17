# Telegram 智能知识库机器人 v4.6

基于 Cloudflare Workers + D1 数据库 + AI 的 Telegram 智能问答机器人，采用**AI学习知识库 + 多问题对应同一答案**架构。

## ✨ 核心特性

- 🤖 **AI意图识别** - 使用 Llama 3.2 1B 判断用户是否在问知识库问题
- 🧠 **AI学习知识库回答** - AI参考知识库内容生成回答，更智能自然
- 📝 **多问题对应同一答案** - 支持同义词/变体，一个答案可对应多个问法
- 💰 **超低AI消耗** - 轻量级模型，每次调用仅约 15 neurons
- 🎯 **精准过滤** - AI先过滤闲聊，只对相关问题搜索知识库
- 📊 **统计分析** - 记录AI调用、回答情况、发现知识库缺口
- 🎛️ **灵活配置** - 可开关AI分类器/AI回答、调整匹配阈值
- 🌐 **Web管理** - 可视化知识库管理，支持批量添加问题变体

## 🏗️ 架构设计

```
用户消息 → AI意图分类器 → 判断是否需要回答
    ↓
需要回答 → 知识库多问题匹配 → 找到最相似的条目
    ↓
高相似度(≥0.95) → 直接返回知识库答案
中相似度(0.6-0.95) → AI学习知识库生成回答
低相似度(<0.6) → 记录到未回答问题
```

### 知识库结构

```
答案A
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
| 意图识别 | 4000 次 × 15 neurons = 60,000 neurons |
| AI生成回答(20%) | 800 次 × 100 neurons = 80,000 neurons |
| **每天总消耗** | **约 140,000 neurons** |
| 免费额度 | 10,000 neurons/天 |
| 超出费用 | 约 $0.0014/天（可忽略）|

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
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://your-worker.your-subdomain.workers.dev/webhook\"}"
```

## 📖 使用指南

### 管理界面

访问 Worker 域名即可打开管理界面：

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

**知识库管理：**
- 添加答案
- 添加多个问题变体（每行一个）
- 设置分类和关键词
- 编辑/删除条目

### 添加知识示例

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

1. **AI意图识别** - 判断是否在问知识库问题
2. **多问题匹配** - 在所有问题变体中找最相似的
3. **相似度判断：**
   - ≥0.95：直接返回知识库答案
   - 0.6-0.95：AI参考知识库生成回答
   - <0.6：记录到未回答问题

## 📁 文件说明

```
.
├── worker.js          # 主程序代码
├── v4_schema.sql      # 数据库结构
├── wrangler.toml      # Cloudflare 配置
├── package.json       # 项目依赖
└── README.md          # 项目说明
```

## 🔧 技术栈

- **Cloudflare Workers** - 边缘计算平台
- **Cloudflare D1** - SQLite 边缘数据库
- **Cloudflare Workers AI** - Llama 3.2 1B 模型
- **Telegram Bot API** - 消息接口
- **Levenshtein Distance** - 文本相似度算法

## � 更新日志

### v4.6 (2025-03-17)
- ✨ AI学习知识库生成回答
- ✨ 支持多问题对应同一答案
- ✨ 新增AI参考知识数量配置
- � 优化知识库数据结构

### v4.5 (2025-03-17)
- ✨ 新增AI意图识别功能
- 🎯 使用 Llama 3.2 1B 轻量级模型
- 📊 新增AI调用统计和消耗监控

### v4.0 (2025-03-17)
- ✨ 全新知识库匹配系统
- 💰 零 AI 消耗版本
- 📊 统计分析功能

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
