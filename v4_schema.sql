-- Telegram 智能知识库机器人 v4.7 数据库结构
-- 功能：AI学习知识库回答 + 多问题对应同一答案 + 前言内容管理
-- 时间格式：UTC 存储，北京时间显示 (Asia/Shanghai)

-- 机器人配置表
CREATE TABLE IF NOT EXISTS bot_config (
  id INTEGER PRIMARY KEY,
  bot_enabled INTEGER DEFAULT 1,
  only_mentioned INTEGER DEFAULT 0,
  use_ai_classifier INTEGER DEFAULT 1,
  use_ai_answer INTEGER DEFAULT 1,
  similarity_threshold REAL DEFAULT 0.6,
  max_context_items INTEGER DEFAULT 5,
  ai_daily_limit INTEGER DEFAULT 100,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 知识库答案表（一个答案对应多个问题）
CREATE TABLE IF NOT EXISTS knowledge_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  answer TEXT NOT NULL,
  category TEXT,
  keywords TEXT,
  enabled INTEGER DEFAULT 1,
  use_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 知识库问题表（多个问题指向同一个答案）
CREATE TABLE IF NOT EXISTS knowledge_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  answer_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  keywords TEXT,
  priority INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (answer_id) REFERENCES knowledge_answers(id) ON DELETE CASCADE
);

-- 前言/背景知识表（AI回答时的参考内容）
CREATE TABLE IF NOT EXISTS knowledge_context (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  priority INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
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

-- AI调用记录表
CREATE TABLE IF NOT EXISTS ai_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  intent TEXT,
  confidence REAL,
  prompt_tokens INTEGER,
  response_tokens INTEGER,
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
  answer_type TEXT DEFAULT 'kb',
  similarity REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 未回答问题表
CREATE TABLE IF NOT EXISTS unanswered (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  user_name TEXT,
  message TEXT NOT NULL,
  chat_type TEXT,
  ai_classified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 统计表
CREATE TABLE IF NOT EXISTS bot_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT UNIQUE NOT NULL,
  answers_today INTEGER DEFAULT 0,
  total_answers INTEGER DEFAULT 0,
  ai_calls_today INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认配置
INSERT OR IGNORE INTO bot_config (id, bot_enabled, only_mentioned, use_ai_classifier, use_ai_answer, similarity_threshold, max_context_items, ai_daily_limit) 
VALUES (1, 1, 0, 1, 1, 0.6, 5, 100);

-- 插入今天的统计记录
INSERT OR IGNORE INTO bot_stats (date, answers_today, total_answers, ai_calls_today) 
VALUES (DATE('now'), 0, 0, 0);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_calls_created_at ON ai_calls(created_at);
CREATE INDEX IF NOT EXISTS idx_answers_chat_id ON answers(chat_id);
CREATE INDEX IF NOT EXISTS idx_unanswered_ai_classified ON unanswered(ai_classified);
CREATE INDEX IF NOT EXISTS idx_knowledge_answers_enabled ON knowledge_answers(enabled);
CREATE INDEX IF NOT EXISTS idx_knowledge_questions_answer_id ON knowledge_questions(answer_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_questions_enabled ON knowledge_questions(enabled);
CREATE INDEX IF NOT EXISTS idx_knowledge_context_enabled ON knowledge_context(enabled);
CREATE INDEX IF NOT EXISTS idx_knowledge_context_priority ON knowledge_context(priority);
