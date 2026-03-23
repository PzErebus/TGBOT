# Telegram Bot 改进方案

## 一、核心逻辑优化

### 1. AI意图分类器重构

**当前问题：** 分类器总是返回 `shouldAnswer: true`，形同虚设

**改进方案：**

```javascript
async function classifyIntent(env, message, config) {
  try {
    const messageLower = message.toLowerCase().trim();
    
    // 第一层：关键词快速匹配（保持快速响应）
    const keywordResult = await env.DB.prepare(
      "SELECT DISTINCT keywords FROM knowledge_questions WHERE enabled = 1 AND keywords IS NOT NULL AND keywords != ''"
    ).all();
    
    const allKeywords = [];
    (keywordResult.results || []).forEach(row => {
      if (row.keywords) {
        const keywords = row.keywords.split(',').map(k => k.trim()).filter(k => k.length >= 2);
        allKeywords.push(...keywords);
      }
    });
    
    // 关键词精确匹配
    const hasExactKeyword = allKeywords.some(kw => {
      const kwLower = kw.toLowerCase();
      // 必须完整匹配关键词，而不是包含
      return messageLower === kwLower || 
             messageLower.includes(kwLower + ' ') || 
             messageLower.includes(' ' + kwLower) ||
             messageLower.startsWith(kwLower) ||
             messageLower.endsWith(kwLower);
    });
    
    if (hasExactKeyword) {
      return { shouldAnswer: true, intent: 'keyword_match', confidence: 0.9 };
    }
    
    // 第二层：AI语义判断（仅对长度>=4的消息启用）
    if (config.useAIClassifier !== false && env.AI && message.length >= 4) {
      // 检查AI配额
      const canUseAI = await checkAIQuota(env);
      if (!canUseAI) {
        return { shouldAnswer: true, intent: 'quota_exceeded', confidence: 0.6 };
      }
      
      try {
        const aiResponse = await env.AI.run('@cf/meta/llama-3.2-1b-instruct', {
          messages: [
            {
              role: 'system',
              content: `你是客服机器人意图识别器。判断用户消息是否需要客服回答。

判断规则：
1. 需要回答的问题类型：
   - 询问信息（怎么、如何、为什么、在哪、多少）
   - 求助（帮帮我、出问题了、不行了、不会）
   - 投诉/反馈（太慢、不好用、有bug）
   - 确认类（能不能、可不可以、是否支持）

2. 不需要回答的类型：
   - 纯问候（你好、嗨、在吗）
   - 感叹/情绪（哈哈、卧槽、太好了）
   - 感谢（谢谢、多谢）
   - 陈述句（今天天气真好）
   - 过短消息（少于3个字）

返回JSON格式：{"answer": true/false, "type": "question/chat/greeting/etc"}
只返回JSON，无其他内容。`
            },
            { role: 'user', content: message }
          ],
          temperature: 0.1,
          max_tokens: 50
        });
        
        const result = JSON.parse(aiResponse.response?.trim() || '{}');
        return {
          shouldAnswer: result.answer !== false, // 默认回答
          intent: result.type || 'ai_classified',
          confidence: 0.8
        };
      } catch (e) {
        console.error('AI classification parse error:', e);
      }
    }
    
    // 第三层：规则判断（兜底）
    const questionIndicators = ['怎么', '如何', '为什么', '在哪', '多少', '能不能', '可以', '是否', '帮', '出问题', '不行', '报错', '错误'];
    const hasQuestionIndicator = questionIndicators.some(ind => messageLower.includes(ind));
    
    return {
      shouldAnswer: hasQuestionIndicator,
      intent: hasQuestionIndicator ? 'rule_match' : 'no_match',
      confidence: 0.5
    };
  } catch (error) {
    console.error('Intent classification error:', error);
    return { shouldAnswer: true, intent: 'error', confidence: 0.5 };
  }
}
```

---

### 2. 相似度计算优化

**当前问题：** 短词匹配过于宽松

**改进方案：**

```javascript
function calculateSimilarity(query, question, keywords) {
  const queryLower = query.toLowerCase().trim();
  const questionLower = question.toLowerCase().trim();
  
  // 忽略过短的查询
  if (queryLower.length <= 1) return 0;
  
  // 完全匹配
  if (queryLower === questionLower) return 1.0;
  
  // 分词处理
  const queryWords = segmentWords(queryLower);
  const questionWords = segmentWords(questionLower);
  
  // 1. 词频匹配得分
  let wordMatchScore = 0;
  const queryWordSet = new Set(queryWords);
  const questionWordSet = new Set(questionWords);
  
  for (const word of queryWordSet) {
    if (questionWordSet.has(word)) {
      wordMatchScore += 1;
    } else if (questionLower.includes(word)) {
      wordMatchScore += 0.5; // 部分匹配
    }
  }
  wordMatchScore = wordMatchScore / queryWordSet.size;
  
  // 2. 包含匹配（需要更严格）
  let containScore = 0;
  if (queryLower.length >= 4 && questionLower.includes(queryLower)) {
    containScore = 0.8;
  } else if (queryLower.length >= 3 && questionLower.includes(queryLower)) {
    // 3字查询需要精确边界
    const idx = questionLower.indexOf(queryLower);
    const isWordBoundary = idx === 0 || 
                           /\s/.test(questionLower[idx - 1]) ||
                           idx + queryLower.length === questionLower.length ||
                           /\s/.test(questionLower[idx + queryLower.length]);
    containScore = isWordBoundary ? 0.7 : 0.4;
  }
  
  // 3. 关键词匹配
  let keywordScore = 0;
  if (keywords) {
    const keywordList = keywords.toLowerCase().split(',').map(k => k.trim()).filter(k => k.length >= 2);
    for (const keyword of keywordList) {
      if (queryLower.includes(keyword)) {
        keywordScore = Math.max(keywordScore, keyword.length / queryLower.length * 0.75);
      }
    }
  }
  
  // 4. 编辑距离相似度
  const distance = levenshteinDistance(queryLower, questionLower);
  const maxLen = Math.max(queryLower.length, questionLower.length);
  const editSimilarity = 1 - distance / maxLen;
  
  // 综合评分（加权平均）
  const finalScore = Math.max(
    wordMatchScore * 0.3 + containScore * 0.3 + keywordScore * 0.2 + editSimilarity * 0.2,
    containScore,  // 包含匹配至少保留
    keywordScore   // 关键词匹配至少保留
  );
  
  return Math.min(1.0, finalScore);
}

// 简单分词（中文按字符，英文按空格）
function segmentWords(text) {
  const words = [];
  let currentWord = '';
  let isEnglish = false;
  
  for (const char of text) {
    const isEnglishChar = /[a-z0-9]/i.test(char);
    
    if (isEnglishChar) {
      if (!isEnglish && currentWord) {
        words.push(currentWord);
        currentWord = '';
      }
      currentWord += char;
      isEnglish = true;
    } else if (char === ' ') {
      if (currentWord) {
        words.push(currentWord);
        currentWord = '';
      }
      isEnglish = false;
    } else {
      if (isEnglish && currentWord) {
        words.push(currentWord);
        currentWord = '';
      }
      // 中文字符单独成词
      words.push(char);
      isEnglish = false;
    }
  }
  
  if (currentWord) {
    words.push(currentWord);
  }
  
  return words.filter(w => w.length > 0);
}
```

---

### 3. 添加对话上下文

**新增数据表：**

```sql
-- 对话上下文表
CREATE TABLE IF NOT EXISTS conversation_context (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL,  -- 'user' or 'assistant'
  message TEXT NOT NULL,
  intent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_conversation_chat_user ON conversation_context(chat_id, user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_created ON conversation_context(created_at);
```

**核心函数：**

```javascript
// 获取对话上下文
async function getConversationContext(env, chatId, userId, maxTurns = 5) {
  try {
    const result = await env.DB.prepare(`
      SELECT role, message, intent, created_at
      FROM conversation_context
      WHERE chat_id = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(chatId, userId, maxTurns * 2).all();
    
    return (result.results || []).reverse();
  } catch (e) {
    console.error('Get context error:', e);
    return [];
  }
}

// 保存对话上下文
async function saveConversationContext(env, chatId, userId, role, message, intent = null) {
  try {
    await env.DB.prepare(`
      INSERT INTO conversation_context (chat_id, user_id, role, message, intent)
      VALUES (?, ?, ?, ?, ?)
    `).bind(chatId, userId, role, message, intent).run();
    
    // 清理超过24小时的上下文
    await env.DB.prepare(`
      DELETE FROM conversation_context
      WHERE created_at < datetime('now', '-24 hours')
    `).run();
  } catch (e) {
    console.error('Save context error:', e);
  }
}

// 检测追问意图
function isFollowUpQuestion(message, context) {
  const followUpIndicators = [
    '然后呢', '那', '还有呢', '之后呢', '结果呢',
    '为什么', '怎么办', '怎么处理', '然后',
    '不是说', '可是', '但是', '那个', '这个'
  ];
  
  const messageLower = message.toLowerCase();
  
  // 检查是否包含追问指示词
  if (followUpIndicators.some(ind => messageLower.startsWith(ind))) {
    return true;
  }
  
  // 检查是否代词引用
  const pronouns = ['它', '那个', '这个', '上面', '刚才'];
  if (pronouns.some(p => messageLower.includes(p))) {
    return true;
  }
  
  return false;
}
```

**修改 handleTelegramWebhook：**

```javascript
// 在生成AI回答时使用上下文
async function generateAIAnswerWithContext(env, userQuestion, matches, config, context = []) {
  // ... 获取前言内容 ...
  
  // 构建上下文历史
  const contextHistory = context.map(c => 
    `${c.role === 'user' ? '用户' : '客服'}: ${c.message}`
  ).join('\n');
  
  const systemPrompt = contextHistory 
    ? `你是客服助手。以下是对话历史：
${contextHistory}

请根据对话历史和知识库回答用户的最新问题。如果用户是在追问，请结合之前的回答给出连贯的回复。

知识库：
${kbContext}`
    : `你是客服助手。请根据知识库回答用户问题。

知识库：
${kbContext}`;
  
  // ... 调用AI ...
}
```

---

### 4. 回答缓存机制

**新增数据表：**

```sql
-- 回答缓存表
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
```

**缓存函数：**

```javascript
// 获取缓存的回答
async function getCachedAnswer(env, question) {
  const hash = await hashQuestion(question);
  
  try {
    const cached = await env.DB.prepare(`
      SELECT answer, answer_type, similarity
      FROM answer_cache
      WHERE question_hash = ? AND expires_at > datetime('now')
    `).bind(hash).first();
    
    if (cached) {
      // 更新命中次数
      await env.DB.prepare(`
        UPDATE answer_cache SET hit_count = hit_count + 1 WHERE question_hash = ?
      `).bind(hash).run();
      
      return cached;
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

// 缓存回答
async function cacheAnswer(env, question, answer, answerType, similarity) {
  const hash = await hashQuestion(question);
  
  try {
    await env.DB.prepare(`
      INSERT OR REPLACE INTO answer_cache 
      (question_hash, question, answer, answer_type, similarity, expires_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', '+7 days'))
    `).bind(hash, question, answer, answerType, similarity).run();
  } catch (e) {
    console.error('Cache answer error:', e);
  }
}

// 简单哈希函数
async function hashQuestion(text) {
  const normalized = text.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
```

---

### 5. 个性化称呼可配置化

**修改配置表：**

```sql
ALTER TABLE bot_config ADD COLUMN nickname_style TEXT DEFAULT 'cute';
-- 可选: 'none', 'cute', 'professional', 'friendly'
```

**修改称呼函数：**

```javascript
function addPersonalizedGreeting(responseText, userName, style = 'cute') {
  if (style === 'none') {
    return responseText;
  }
  
  const styles = {
    cute: {
      prefixes: ['喂，', '嘿，', '哟，', '哼，', '啧，'],
      suffixes: ['小笨蛋', '小迷糊', '小可爱', '小淘气', '小伙伴'],
      greetings: ['😤 {name}，听好了！', '🙄 {name}，这个问题还要问？'],
      endings: ['💬 还有问题就继续问吧~', '✨ 记住了没？']
    },
    professional: {
      prefixes: ['您好，', '尊敬的用户，', ''],
      suffixes: ['用户', '同学', ''],
      greetings: ['您好，以下是相关信息：', '感谢您的咨询：'],
      endings: ['如有其他问题，请随时提问。', '希望对您有帮助。']
    },
    friendly: {
      prefixes: ['嘿~ ', '哈喽 ', '你好呀 '],
      suffixes: ['同学', '小伙伴', '朋友'],
      greetings: ['👋 嘿{name}，来告诉你：', '😊 {name}，看这里：'],
      endings: ['还有问题随时找我哦~', '加油！✨']
    }
  };
  
  const currentStyle = styles[style] || styles.cute;
  // ... 使用 currentStyle 生成问候语 ...
}
```

---

## 二、功能增强

### 1. 智能问题推荐

当用户输入时，自动推荐可能想问的问题：

```javascript
async function suggestQuestions(env, partialQuery) {
  if (partialQuery.length < 2) return [];
  
  const result = await env.DB.prepare(`
    SELECT DISTINCT question 
    FROM knowledge_questions 
    WHERE enabled = 1 AND question LIKE ?
    ORDER BY use_count DESC
    LIMIT 5
  `).bind(`%${partialQuery}%`).all();
  
  return (result.results || []).map(r => r.question);
}
```

### 2. 多轮对话澄清

当问题模糊时，主动询问澄清：

```javascript
async function handleAmbiguousQuestion(env, query, matches) {
  // 如果有多个高相似度匹配，询问用户意图
  if (matches.length >= 2 && 
      matches[0].similarity > 0.6 && 
      matches[1].similarity > 0.6 &&
      Math.abs(matches[0].similarity - matches[1].similarity) < 0.1) {
    
    return {
      needClarification: true,
      message: `您是想问：
1. ${matches[0].question}
2. ${matches[1].question}

请回复数字选择~`
    };
  }
  
  return { needClarification: false };
}
```

### 3. 情感分析

检测用户情绪，调整回复风格：

```javascript
function detectEmotion(message) {
  const angryIndicators = ['气死', '烦死', '恶心', '垃圾', '什么破', '怎么这么', '投诉'];
  const happyIndicators = ['谢谢', '太好了', '太棒了', '爱你', '么么哒', '好评'];
  const confusedIndicators = ['不懂', '不明白', '怎么回事', '搞不懂', '晕'];
  
  const messageLower = message.toLowerCase();
  
  if (angryIndicators.some(ind => messageLower.includes(ind))) {
    return 'angry';
  }
  if (happyIndicators.some(ind => messageLower.includes(ind))) {
    return 'happy';
  }
  if (confusedIndicators.some(ind => messageLower.includes(ind))) {
    return 'confused';
  }
  
  return 'neutral';
}

function adjustResponseByEmotion(response, emotion) {
  switch (emotion) {
    case 'angry':
      return '抱歉给您带来不便 🙏\n' + response + '\n我们会努力改进的！';
    case 'confused':
      return '让我更详细地解释一下~\n' + response;
    case 'happy':
      return response + ' 😊 很高兴能帮到你！';
    default:
      return response;
  }
}
```

---

## 三、管理界面增强

### 1. 知识库批量编辑

### 2. 回答效果统计

### 3. A/B 测试支持

### 4. 知识库版本控制

---

## 四、性能优化

### 1. 添加更多数据库索引

```sql
-- 常用查询优化
CREATE INDEX IF NOT EXISTS idx_knowledge_questions_search 
ON knowledge_questions(enabled, question);

-- 回答统计优化
CREATE INDEX IF NOT EXISTS idx_answers_date_type 
ON answers(date(created_at), answer_type);
```

### 2. 使用 D1 的批量操作

```javascript
// 批量插入知识库
async function batchInsertKnowledge(env, items) {
  const statements = [];
  
  for (const item of items) {
    statements.push(
      env.DB.prepare('INSERT INTO knowledge_answers (answer, category, keywords) VALUES (?, ?, ?)')
        .bind(item.answer, item.category, item.keywords)
    );
  }
  
  await env.DB.batch(statements);
}
```

---

## 五、安全加固

### 1. 输入验证

```javascript
function validateInput(text, maxLength = 2000) {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Invalid input' };
  }
  
  // 移除控制字符
  const sanitized = text.replace(/[\x00-\x1F\x7F]/g, '');
  
  if (sanitized.length > maxLength) {
    return { valid: false, error: `Input too long (max ${maxLength})` };
  }
  
  // 检测潜在注入
  const sqlPatterns = [/SELECT/i, /INSERT/i, /DELETE/i, /DROP/i, /UNION/i];
  if (sqlPatterns.some(p => p.test(sanitized))) {
    // 记录可疑行为
    console.warn('Potential SQL injection detected:', sanitized.substring(0, 100));
  }
  
  return { valid: true, sanitized };
}
```

### 2. 速率限制

```javascript
async function checkRateLimit(env, chatId, userId) {
  const key = `rate:${chatId}:${userId}`;
  const limit = 10; // 每分钟最多10条
  const window = 60; // 60秒窗口
  
  try {
    const result = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM messages
      WHERE chat_id = ? AND user_id = ? AND created_at > datetime('now', '-1 minute')
    `).bind(chatId, userId).first();
    
    if (result && result.count >= limit) {
      return { allowed: false, remaining: 0 };
    }
    
    return { allowed: true, remaining: limit - (result?.count || 0) };
  } catch (e) {
    return { allowed: true, remaining: limit };
  }
}
```

---

## 六、实施优先级

| 优先级 | 改进项 | 预计工作量 | 影响范围 |
|--------|--------|------------|----------|
| P0 | AI意图分类器修复 | 2小时 | 高 |
| P0 | 相似度计算优化 | 3小时 | 高 |
| P1 | 对话上下文 | 4小时 | 中 |
| P1 | 回答缓存 | 2小时 | 中 |
| P2 | 个性化称呼可配置 | 1小时 | 低 |
| P2 | 情感分析 | 3小时 | 中 |
| P3 | 智能推荐 | 4小时 | 低 |
| P3 | 多轮澄清 | 3小时 | 低 |

---

## 七、测试建议

1. **单元测试**：相似度计算、意图分类、情感检测
2. **集成测试**：完整对话流程
3. **压力测试**：高并发场景
4. **A/B测试**：不同回复风格效果对比

---

*文档生成时间：2026-03-23*
