-- v5.1.0 安全版数据库 Schema
-- 执行顺序：先执行此文件，再部署 worker.js

-- 原有表结构（如果不存在则创建）
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

CREATE TABLE IF NOT EXISTS knowledge_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  answer TEXT NOT NULL,
  category TEXT,
  keywords TEXT,
  enabled INTEGER DEFAULT 1,
  use_count INTEGER DEFAULT 0,
  satisfaction_score REAL DEFAULT 0,
  feedback_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  answer_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  keywords TEXT,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (answer_id) REFERENCES knowledge_answers(id)
);

CREATE TABLE IF NOT EXISTS knowledge_context (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  priority INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  user_name TEXT,
  message TEXT NOT NULL,
  chat_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  user_name TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  answer_type TEXT,
  similarity REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS unanswered (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  user_name TEXT,
  message TEXT NOT NULL,
  chat_type TEXT,
  status INTEGER DEFAULT 0,
  ai_classified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  user_name TEXT,
  question TEXT NOT NULL,
  original_answer TEXT NOT NULL,
  corrected_answer TEXT,
  answer_type TEXT DEFAULT 'ai',
  similarity REAL,
  knowledge_id INTEGER,
  is_corrected INTEGER DEFAULT 0,
  is_ignored INTEGER DEFAULT 0,
  corrected_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER DEFAULT 0,
  user_id INTEGER DEFAULT 0,
  message TEXT,
  intent TEXT,
  confidence REAL,
  neurons INTEGER DEFAULT 100,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bot_stats (
  date TEXT PRIMARY KEY,
  answers_today INTEGER DEFAULT 0,
  total_answers INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_type TEXT NOT NULL,
  operation_desc TEXT,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_context (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  message TEXT NOT NULL,
  intent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS answer_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_hash TEXT NOT NULL UNIQUE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  answer_type TEXT,
  similarity REAL,
  hit_count INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME DEFAULT (datetime('now', '+7 days')),
  last_hit DATETIME
);

CREATE TABLE IF NOT EXISTS message_frequency (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_hash TEXT NOT NULL,
  chat_id INTEGER NOT NULL,
  count INTEGER DEFAULT 1,
  first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- v5.1.0 新增安全相关表

-- 速率限制表
CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- 登录尝试记录表
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- 错误日志表
CREATE TABLE IF NOT EXISTS error_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  error_type TEXT,
  error_message TEXT,
  context TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引（性能优化）
CREATE INDEX IF NOT EXISTS idx_conversation_chat_user ON conversation_context(chat_id, user_id);
CREATE INDEX IF NOT EXISTS idx_answer_cache_hash ON answer_cache(question_hash);
CREATE INDEX IF NOT EXISTS idx_knowledge_use_count ON knowledge_answers(use_count);
CREATE INDEX IF NOT EXISTS idx_ai_calls_date ON ai_calls(DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_answers_date ON answers(DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, action);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_message_frequency ON message_frequency(message_hash, chat_id);

-- v5.2.0 新增性能优化索引
CREATE INDEX IF NOT EXISTS idx_kq_answer_id ON knowledge_questions(answer_id);
CREATE INDEX IF NOT EXISTS idx_kq_enabled ON knowledge_questions(enabled);
CREATE INDEX IF NOT EXISTS idx_ka_enabled ON knowledge_answers(enabled);
CREATE INDEX IF NOT EXISTS idx_ai_responses_question ON ai_responses(question);
CREATE INDEX IF NOT EXISTS idx_unanswered_message ON unanswered(message);
CREATE INDEX IF NOT EXISTS idx_kq_keywords ON knowledge_questions(keywords);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at);

-- 初始化配置
INSERT OR IGNORE INTO bot_config (id, bot_enabled, only_mentioned, use_ai_classifier, use_ai_answer, similarity_threshold, max_context_items, ai_daily_limit)
VALUES (1, 1, 0, 1, 1, 0.6, 5, 100);
