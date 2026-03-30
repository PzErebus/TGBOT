# Telegram 智能知识库机器人

基于 Cloudflare Workers + D1 数据库 + AI 的智能客服机器人。

## 功能特性

- 📚 知识库管理（添加、编辑、删除）
- 🤖 AI 意图识别（三层过滤）
- 💬 多答案随机回复
- 🔍 相似度匹配算法
- 📊 使用统计图表
- 🚫 防刷屏机制
- 🗄️ 回答缓存
- 👤 用户权限管理
- 🌍 前言内容管理
- 📝 操作日志

## 部署

### 1. 安装依赖

```bash
npm install
```

### 2. 部署到 Cloudflare Workers

```bash
npx wrangler deploy
```

### 3. 设置环境变量（Secrets）

```bash
# Telegram Bot Token
wrangler secret put TELEGRAM_BOT_TOKEN

# 管理员密码
wrangler secret put ADMIN_TOKEN

# 普通用户密码  
wrangler secret put USER_TOKEN
```

### 4. 初始化数据库

```bash
npx wrangler d1 execute telegram-keywords-db --file=v5.1-schema.sql --remote
```

### 5. 设置 Webhook

```bash
curl -F "url=https://your-worker.workers.dev/webhook" \
  https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

## 访问地址

- 管理面板: `/manage`
- 登录页面: `/login`

## 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | (设置 ADMIN_TOKEN) |
| 普通用户 | user | (设置 USER_TOKEN) |

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/login` | POST | 登录 |
| `/webhook` | POST | Telegram Webhook |
| `/manage/stats` | GET | 统计数据 |
| `/manage/knowledge` | GET/POST | 知识库列表/添加 |
| `/manage/knowledge/:id` | GET/PUT/DELETE | 知识库单项操作 |
| `/manage/config` | GET/POST | 配置管理 |
| `/manage/unanswered` | GET | 未回答问题 |
| `/manage/ai-responses` | GET | AI回复记录 |
| `/manage/context` | GET/POST | 前言内容 |
| `/manage/logs` | GET | 操作日志 |
| `/manage/charts` | GET | 图表数据 |

## 环境变量

通过 `wrangler secret put` 设置：

| 变量 | 说明 |
|------|------|
| TELEGRAM_BOT_TOKEN | Telegram Bot Token |
| ADMIN_TOKEN | 管理员密码 |
| USER_TOKEN | 普通用户密码 |

## License

MIT
