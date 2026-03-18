-- 插入测试数据

-- 插入答案
INSERT INTO knowledge_answers (answer, category, keywords, enabled) VALUES 
('我们的客服电话是400-123-4567，工作时间是9:00-18:00。', '客服', '客服,电话,帮助', 1);

INSERT INTO knowledge_answers (answer, category, keywords, enabled) VALUES 
('1️⃣ 通过网站 holivator.de 注册
2️⃣ 通过Miniapp @holivator_bot 注册', '注册', '注册,账号', 1);

INSERT INTO knowledge_answers (answer, category, keywords, enabled) VALUES 
('每天签到可以获得积分，连续签到有额外奖励。', '积分', '签到,积分', 1);

-- 插入问题（关联到答案）
INSERT INTO knowledge_questions (answer_id, question, keywords, enabled) VALUES (1, '客服电话是多少？', '客服,电话,帮助', 1);
INSERT INTO knowledge_questions (answer_id, question, keywords, enabled) VALUES (1, '如何联系你们？', '联系,帮助', 1);
INSERT INTO knowledge_questions (answer_id, question, keywords, enabled) VALUES (1, '怎么联系客服？', '客服,联系,帮助', 1);
INSERT INTO knowledge_questions (answer_id, question, keywords, enabled) VALUES (1, '客服', '客服', 1);
INSERT INTO knowledge_questions (answer_id, question, keywords, enabled) VALUES (1, '帮助', '帮助', 1);

INSERT INTO knowledge_questions (answer_id, question, keywords, enabled) VALUES (2, '怎么注册？', '注册', 1);
INSERT INTO knowledge_questions (answer_id, question, keywords, enabled) VALUES (2, '如何注册？', '注册', 1);
INSERT INTO knowledge_questions (answer_id, question, keywords, enabled) VALUES (2, '注册地址', '注册', 1);
INSERT INTO knowledge_questions (answer_id, question, keywords, enabled) VALUES (2, '注册', '注册', 1);

INSERT INTO knowledge_questions (answer_id, question, keywords, enabled) VALUES (3, '签到积分不够续期', '签到,积分,续期', 1);
INSERT INTO knowledge_questions (answer_id, question, keywords, enabled) VALUES (3, '怎么获得积分？', '积分', 1);
INSERT INTO knowledge_questions (answer_id, question, keywords, enabled) VALUES (3, '积分', '积分', 1);
