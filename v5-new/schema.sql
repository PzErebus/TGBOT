-- v5.0 P1P2 数据库完整 Schema
-- 执行顺序：先执行此文件，再部署 worker.js

-- P0 表
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
  expires_at DATETIME DEFAULT (datetime('now', '+7 days'))
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

-- P1 表
CREATE TABLE IF NOT EXISTS answer_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  answer_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- P1/P2 字段（ALTER可能失败，忽略即可）
-- ALTER TABLE knowledge_answers ADD COLUMN use_count INTEGER DEFAULT 0;
-- ALTER TABLE knowledge_answers ADD COLUMN satisfaction_score REAL DEFAULT 0;
-- ALTER TABLE knowledge_answers ADD COLUMN feedback_count INTEGER DEFAULT 0;
-- ALTER TABLE bot_config ADD COLUMN greeting_style TEXT DEFAULT 'cute';

-- 索引
CREATE INDEX IF NOT EXISTS idx_conversation_chat_user ON conversation_context(chat_id, user_id);
CREATE INDEX IF NOT EXISTS idx_answer_cache_hash ON answer_cache(question_hash);
CREATE INDEX IF NOT EXISTS idx_knowledge_use_count ON knowledge_answers(use_count);
CREATE INDEX IF NOT EXISTS idx_ai_calls_date ON ai_calls(DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_answers_date ON answers(DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_feedback_answer ON answer_feedback(answer_id);
