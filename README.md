# Telegram 智能知识库机器人 v4.5

基于 Cloudflare Workers + D1 数据库 + AI 的 Telegram 智能问答机器人，采用**轻量级AI意图识别 + 知识库检索**架构，精准且省额度。

## ✨ 核心特性

- 🤖 **AI意图识别** - 使用 Llama 3.2 1B 模型判断用户是否在问知识库问题
- 📚 **智能知识库匹配** - 自动匹配用户问题与知识库答案
- 💰 **超低AI消耗** - 每次AI调用仅约 10-15 neurons，4000条消息/天仅需约 60,000 neurons
- 🎯 **精准过滤** - AI先过滤闲聊，只对相关问题搜索知识库
- 📊 **统计分析** - 记录AI调用、回答情况，发现知识库缺口
- 🎛️ **灵活配置** - 可开关AI分类器、调整匹配阈值
- 🌐 **Web管理** - 可视化知识库管理界面

## 🏗️ 架构设计

```
用户消息 → AI意图分类器 → 判断是否需要回答
    ↓
需要回答 → 知识库相似度匹配 → 返回最佳答案
不需要回答 → 忽略消息
```

**AI消耗计算：**
- 每天 4000 条消息
- 假设 20% 是知识库相关问题 → 800 次AI调用
- Llama 3.2 1B 每次约 15 neurons
- **每天消耗约 12,000 neurons**
- Cloudflare Workers AI 免费额度：每天 10,000 neurons
- 超出部分：$0.011 / 1M neurons（几乎免费）

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
- 查看统计：知识库数量、今日回答、AI调用次数、AI消耗
- 配置机器人：开关AI分类器、设置匹配阈值
- 管理知识库：添加、编辑、删除问题和答案
- 查看未回答问题：AI判断需要回答但没匹配到的问题

### 配置选项

| 选项 | 说明 | 推荐值 |
|------|------|--------|
| 启用机器人 | 总开关 | 开启 |
| 仅在被@时回复 | 减少误触发 | 关闭（群组）/ 开启（大群） |
| 使用AI意图识别 | 先用AI过滤 | 开启 |
| 匹配相似度阈值 | 0.3-0.95 | 0.6 |

### 知识库匹配算法

| 匹配类型 | 相似度 | 说明 |
|----------|--------|------|
| 精确匹配 | 1.0 | 完全相同 |
| 包含匹配 | 0.9 | 问题包含查询词 |
| 关键词匹配 | 0.85 | 匹配设置的关键词 |
| 编辑距离 | 动态计算 | 计算文本相似度 |

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

## 💰 免费额度

Cloudflare Workers 免费套餐：
- 每天 100,000 次请求
- D1 数据库 500MB 存储
- Workers AI 每天 10,000 neurons

对于 4000 条消息/天的群组：
- AI调用：约 800 次/天（20%问题率）
- AI消耗：约 12,000 neurons/天
- 超出部分费用：约 $0.00013/天（可忽略）

## 📝 更新日志

### v4.5 (2025-03-17)
- ✨ 新增AI意图识别功能
- 🎯 使用 Llama 3.2 1B 轻量级模型
- 📊 新增AI调用统计和消耗监控
- 🔧 优化匹配算法和配置选项

### v4.0 (2025-03-17)
- ✨ 全新知识库匹配系统
- 💰 零 AI 消耗版本
- 📊 统计分析功能
- 🎛️ 灵活的配置选项

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
