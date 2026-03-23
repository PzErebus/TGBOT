-- ============================================================
-- Telegram Bot v5.0.0-P0 数据库升级 SQL
-- ============================================================
-- 使用方法：
-- 1. 登录 Cloudflare Dashboard
-- 2. 进入 D1 数据库
-- 3. 执行此 SQL 脚本
-- ============================================================

-- 对话上下文表（支持多轮对话）
CREATE TABLE IF NOT EXISTS conversation_context (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  message TEXT NOT NULL,
  intent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversation_chat_user ON conversation_context(chat_id, user_id);

-- 回答缓存表（7天有效期）
CREATE TABLE IF NOT EXISTS answer_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_hash TEXT NOT NULL UNIQUE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  answer_type TEXT,
  similarity REAL,
  hit_count INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME DEFAULT (datetime('now', '+7 days'))
);

CREATE INDEX IF NOT EXISTS idx_answer_cache_hash ON answer_cache(question_hash);

-- answers 表（如果不存在）
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

CREATE INDEX IF NOT EXISTS idx_answers_created ON answers(created_at);
