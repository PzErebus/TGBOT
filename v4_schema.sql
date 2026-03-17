-- Telegram 知识库机器人 v4.0 数据库结构
-- 纯知识库匹配，零 AI 消耗

-- 机器人配置表
CREATE TABLE IF NOT EXISTS bot_config (
  id INTEGER PRIMARY KEY,
  bot_enabled INTEGER DEFAULT 1,
  only_mentioned INTEGER DEFAULT 1,
  similarity_threshold REAL DEFAULT 0.6,
  max_results INTEGER DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 知识库表
CREATE TABLE IF NOT EXISTS knowledge_base (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  keywords TEXT,
  enabled INTEGER DEFAULT 1,
  use_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 消息记录表
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  user_name TEXT,
  message TEXT NOT NULL,
  chat_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 回答记录表
CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  user_name TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  similarity REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 未回答问题表（用于发现知识库缺口）
CREATE TABLE IF NOT EXISTS unanswered (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  user_name TEXT,
  message TEXT NOT NULL,
  chat_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 统计表
CREATE TABLE IF NOT EXISTS bot_stats (
  date TEXT PRIMARY KEY,
  answers_today INTEGER DEFAULT 0,
  total_answers INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0
);

-- 插入默认配置
INSERT OR IGNORE INTO bot_config (id, bot_enabled, only_mentioned, similarity_threshold, max_results) 
VALUES (1, 1, 1, 0.6, 1);

-- 插入今日统计
INSERT OR IGNORE INTO bot_stats (date, answers_today, total_answers, messages_received) 
VALUES (DATE('now'), 0, 0, 0);

-- 示例知识库数据
INSERT OR IGNORE INTO knowledge_base (question, answer, category, keywords) VALUES 
('怎么联系客服？', '您可以通过以下方式联系我们：\n📧 邮箱：support@example.com\n📱 微信：example_support\n⏰ 工作时间：周一至周五 9:00-18:00', '客服', '联系,客服,帮助,支持'),
('产品价格是多少？', '我们的产品价格如下：\n💎 基础版：¥99/月\n🚀 专业版：¥299/月\n🏢 企业版：¥999/月\n\n首次注册可享受7天免费试用！', '价格', '价格,多少钱,费用,收费'),
('如何退款？', '退款政策：\n✅ 7天内无理由退款\n✅ 联系客服提交退款申请\n✅ 退款将在3-5个工作日内原路返回\n\n注意：已使用超过7天的订单不支持退款', '售后', '退款,退货,退钱'),
('支持哪些支付方式？', '我们支持以下支付方式：\n💳 支付宝\n💳 微信支付\n💳 银行卡\n💳 PayPal（国际用户）', '支付', '支付,付款,怎么买'),
('产品有什么功能？', '我们的产品主要功能包括：\n✨ 智能问答\n✨ 数据分析\n✨ 团队协作\n✨ API 接口\n✨ 自定义配置\n\n详细功能请查看官网文档。', '产品', '功能,特性,能做什么'),
('如何重置密码？', '重置密码步骤：\n1️⃣ 点击登录页面的"忘记密码"\n2️⃣ 输入注册邮箱\n3️⃣ 查收重置邮件\n4️⃣ 点击邮件链接设置新密码\n\n如果收不到邮件，请检查垃圾邮件箱。', '账户', '密码,重置,忘记密码'),
('有手机APP吗？', '📱 目前支持：\n✅ iOS App（App Store搜索下载）\n✅ Android App（各大应用市场）\n✅ 微信小程序\n✅ H5网页版\n\n所有平台数据实时同步！', '产品', 'APP,手机,移动端'),
('如何邀请团队成员？', '邀请团队成员：\n1️⃣ 进入"团队管理"页面\n2️⃣ 点击"邀请成员"\n3️⃣ 输入成员邮箱或手机号\n4️⃣ 设置权限角色\n5️⃣ 发送邀请\n\n被邀请人会收到邮件/短信通知。', '团队', '邀请,成员,团队,协作');
