# Telegram 智能知识库机器人 v4.0

基于 Cloudflare Workers + D1 数据库的 Telegram 智能问答机器人，支持知识库自动匹配，零 AI 额度消耗。

## ✨ 核心特性

- 🤖 **智能知识库匹配** - 自动匹配用户问题与知识库答案
- 💰 **零 AI 消耗** - 纯本地算法匹配，不调用 AI API
- � **相似度算法** - 支持关键词匹配 + 编辑距离算法
- � **统计分析** - 记录回答情况，发现知识库缺口
- 🎛️ **灵活配置** - 可调整匹配阈值和回复策略
- � **Web 管理** - 可视化知识库管理界面

##  快速部署

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

[vars]
TELEGRAM_BOT_TOKEN = "your-bot-token"
ADMIN_TOKEN = "your-admin-token"
```

### 4. 初始化数据库

```bash
npx wrangler d1 execute telegram-kb-db --file=v4_schema.sql
```

### 5. 部署

```bash
npx wrangler deploy
```

### 6. 设置 Webhook

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-worker.your-subdomain.workers.dev/webhook"}'
```

## � 使用方法

### 管理后台

访问 `https://your-worker.your-subdomain.workers.dev`

### 添加知识库

1. 打开管理后台
2. 在"知识库管理"中添加问题和答案
3. 可设置分类和关键词提高匹配率

### 机器人配置

- **启用机器人** - 总开关
- **仅在被 @ 时回复** - 控制是否主动回复
- **匹配相似度阈值** - 0.3-0.95，越高要求越严格
- **最多返回几个答案** - 可返回多个相关答案

## 🎯 匹配算法

| 匹配类型 | 相似度 | 说明 |
|---------|--------|------|
| 精确匹配 | 1.0 | 问题完全一致 |
| 包含匹配 | 0.9 | 问题互相包含 |
| 关键词匹配 | 0.85 | 匹配设置的关键词 |
| 编辑距离 | 动态计算 | 计算文本相似度 |

## � 文件说明

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
- **Telegram Bot API** - 消息接口
- **Levenshtein Distance** - 文本相似度算法

## � 免费额度

Cloudflare Workers 免费套餐：
- 每天 100,000 次请求
- D1 数据库 500MB 存储
- 完全满足中小型群组使用

## 📝 更新日志

### v4.0 (2025-03-17)
- ✨ 全新知识库匹配系统
- � 零 AI 消耗
- 📊 新增统计分析功能
- 🎛️ 更灵活的配置选项

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
