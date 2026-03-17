// 本地测试服务器 - 模拟 Cloudflare Worker 环境
const http = require('http');
const fs = require('fs');
const path = require('path');

// 模拟 D1 数据库
class MockDB {
  constructor() {
    this.data = {
      bot_config: [],
      knowledge_answers: [],
      knowledge_questions: [],
      messages: [],
      ai_calls: [],
      answers: [],
      unanswered: [],
      bot_stats: []
    };
    this.idCounters = {
      knowledge_answers: 1,
      knowledge_questions: 1,
      messages: 1,
      ai_calls: 1,
      answers: 1,
      unanswered: 1
    };
  }

  prepare(sql) {
    return {
      bind: (...params) => ({
        run: () => this.execute(sql, params),
        first: () => this.executeFirst(sql, params),
        all: () => this.executeAll(sql, params)
      }),
      first: () => this.executeFirst(sql, []),
      all: () => this.executeAll(sql, [])
    };
  }

  execute(sql, params) {
    console.log('SQL:', sql);
    console.log('Params:', params);

    // INSERT 操作
    if (sql.includes('INSERT INTO knowledge_answers')) {
      const id = this.idCounters.knowledge_answers++;
      const [answer, category, keywords] = params;
      this.data.knowledge_answers.push({
        id, answer, category, keywords,
        enabled: 1, use_count: 0,
        created_at: new Date().toISOString()
      });
      this.lastInsertId = id;
      return { meta: { last_row_id: id } };
    }

    if (sql.includes('INSERT INTO knowledge_questions')) {
      const id = this.idCounters.knowledge_questions++;
      const [answer_id, question, keywords] = params;
      this.data.knowledge_questions.push({
        id, answer_id, question, keywords,
        enabled: 1, priority: 0,
        created_at: new Date().toISOString()
      });
      return { meta: { last_row_id: id } };
    }

    if (sql.includes('INSERT INTO messages')) {
      const id = this.idCounters.messages++;
      const [chat_id, user_id, user_name, message, chat_type] = params;
      this.data.messages.push({
        id, chat_id, user_id, user_name, message, chat_type,
        created_at: new Date().toISOString()
      });
      return { meta: { last_row_id: id } };
    }

    if (sql.includes('INSERT INTO ai_calls')) {
      const id = this.idCounters.ai_calls++;
      const [chat_id, user_id, message, intent, confidence] = params;
      this.data.ai_calls.push({
        id, chat_id, user_id, message, intent, confidence,
        created_at: new Date().toISOString()
      });
      return { meta: { last_row_id: id } };
    }

    if (sql.includes('INSERT INTO answers')) {
      const id = this.idCounters.answers++;
      const [chat_id, user_id, user_name, question, answer, answer_type, similarity] = params;
      this.data.answers.push({
        id, chat_id, user_id, user_name, question, answer, answer_type, similarity,
        created_at: new Date().toISOString()
      });
      return { meta: { last_row_id: id } };
    }

    if (sql.includes('INSERT INTO unanswered')) {
      const id = this.idCounters.unanswered++;
      const [chat_id, user_id, user_name, message, chat_type, ai_classified] = params;
      this.data.unanswered.push({
        id, chat_id, user_id, user_name, message, chat_type, ai_classified,
        created_at: new Date().toISOString()
      });
      return { meta: { last_row_id: id } };
    }

    if (sql.includes('INSERT OR REPLACE INTO bot_config')) {
      const [id, bot_enabled, only_mentioned, use_ai_classifier, use_ai_answer, similarity_threshold, max_context_items] = params;
      this.data.bot_config = [{
        id, bot_enabled, only_mentioned, use_ai_classifier, use_ai_answer,
        similarity_threshold, max_context_items,
        updated_at: new Date().toISOString()
      }];
      return { meta: { changes: 1 } };
    }

    // UPDATE 操作
    if (sql.includes('UPDATE knowledge_answers')) {
      const [answer, category, keywords, id] = params;
      const item = this.data.knowledge_answers.find(a => a.id === id);
      if (item) {
        item.answer = answer;
        item.category = category;
        item.keywords = keywords;
      }
      return { meta: { changes: 1 } };
    }

    if (sql.includes('UPDATE bot_stats')) {
      const [date] = params;
      let stat = this.data.bot_stats.find(s => s.date === date);
      if (!stat) {
        stat = { date, answers_today: 0, total_answers: 0 };
        this.data.bot_stats.push(stat);
      }
      stat.answers_today++;
      stat.total_answers++;
      return { meta: { changes: 1 } };
    }

    // DELETE 操作
    if (sql.includes('DELETE FROM knowledge_answers')) {
      const [id] = params;
      this.data.knowledge_answers = this.data.knowledge_answers.filter(a => a.id !== id);
      this.data.knowledge_questions = this.data.knowledge_questions.filter(q => q.answer_id !== id);
      return { meta: { changes: 1 } };
    }

    if (sql.includes('DELETE FROM knowledge_questions WHERE answer_id')) {
      const [answer_id] = params;
      this.data.knowledge_questions = this.data.knowledge_questions.filter(q => q.answer_id !== answer_id);
      return { meta: { changes: 1 } };
    }

    return { meta: { changes: 0 } };
  }

  executeFirst(sql, params) {
    console.log('SQL (first):', sql);
    console.log('Params:', params);

    if (sql.includes('SELECT last_insert_rowid()')) {
      return { id: this.lastInsertId || 1 };
    }

    if (sql.includes('SELECT * FROM bot_config')) {
      return this.data.bot_config[0] || {
        id: 1, bot_enabled: 1, only_mentioned: 0,
        use_ai_classifier: 1, use_ai_answer: 1,
        similarity_threshold: 0.6, max_context_items: 5
      };
    }

    if (sql.includes('COUNT(*)')) {
      let count = 0;
      if (sql.includes('knowledge_answers')) count = this.data.knowledge_answers.filter(a => a.enabled === 1).length;
      else if (sql.includes('ai_calls')) count = this.data.ai_calls.length;
      return { count };
    }

    if (sql.includes('bot_stats WHERE date')) {
      const [date] = params;
      return this.data.bot_stats.find(s => s.date === date) || { answers_today: 0 };
    }

    return null;
  }

  executeAll(sql, params) {
    console.log('SQL (all):', sql);
    console.log('Params:', params);

    if (sql.includes('SELECT kq.id, kq.question, kq.answer_id, kq.keywords, qa.answer FROM knowledge_questions kq JOIN knowledge_answers qa')) {
      return {
        results: this.data.knowledge_questions
          .filter(q => q.enabled === 1)
          .map(q => {
            const answer = this.data.knowledge_answers.find(a => a.id === q.answer_id);
            return { ...q, answer: answer?.answer || '' };
          })
      };
    }

    if (sql.includes('SELECT id, answer, category, keywords FROM knowledge_answers')) {
      return { results: this.data.knowledge_answers.filter(a => a.enabled === 1) };
    }

    if (sql.includes('SELECT question FROM knowledge_questions WHERE answer_id')) {
      const [answerId] = params;
      return { results: this.data.knowledge_questions.filter(q => q.answer_id === answerId && q.enabled === 1) };
    }

    if (sql.includes('SELECT * FROM unanswered')) {
      return { results: this.data.unanswered.filter(u => u.ai_classified === 1).reverse() };
    }

    if (sql.includes('SELECT message, COUNT(*) as count, MAX(created_at) as lastAsked FROM unanswered')) {
      const grouped = {};
      this.data.unanswered.filter(u => u.ai_classified === 1).forEach(u => {
        const key = u.message;
        if (!grouped[key]) {
          grouped[key] = { message: key, count: 0, lastAsked: u.created_at };
        }
        grouped[key].count++;
        if (u.created_at > grouped[key].lastAsked) {
          grouped[key].lastAsked = u.created_at;
        }
      });
      return { results: Object.values(grouped).sort((a, b) => b.count - a.count).slice(0, 20) };
    }

    if (sql.includes('SELECT question FROM knowledge_questions WHERE enabled = 1')) {
      return { results: this.data.knowledge_questions.filter(q => q.enabled === 1) };
    }

    return { results: [] };
  }
}

// 模拟 AI
class MockAI {
  async run(model, params) {
    console.log('AI Call:', model, params);
    
    if (params.messages[0].content.includes('意图分类器')) {
      const userMsg = params.messages[1].content;
      // 简单判断：如果包含问句特征，返回 ANSWER
      const isQuestion = /[?？]|怎么|什么|多少|为什么|如何|吗/.test(userMsg);
      return {
        response: isQuestion ? 'ANSWER' : 'IGNORE'
      };
    }

    if (params.messages[0].content.includes('智能客服助手')) {
      // 返回知识库中的第一个答案
      return {
        response: '根据知识库内容，这是一个测试回答。'
      };
    }

    return { response: '' };
  }
}

// 读取 worker.js 的内容
const workerCode = fs.readFileSync(path.join(__dirname, 'worker.js'), 'utf8');

// 提取 HTML 模板
const htmlMatch = workerCode.match(/const INDEX_HTML = `([\s\S]*?)`;/);
const INDEX_HTML = htmlMatch ? htmlMatch[1] : '';

// 创建服务器
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 模拟环境
  const env = {
    DB: new MockDB(),
    AI: new MockAI(),
    TELEGRAM_BOT_TOKEN: 'test-token',
    ADMIN_TOKEN: 'admin'
  };

  // 处理请求
  try {
    // 根路径 - 返回管理界面
    if (path === '/' && req.method === 'GET') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.writeHead(200);
      res.end(INDEX_HTML);
      return;
    }

    // 统计接口
    if (path === '/manage/stats' && req.method === 'GET') {
      const kbResult = await env.DB.prepare('SELECT COUNT(*) as count FROM knowledge_answers WHERE enabled = 1').first();
      const today = new Date().toISOString().split('T')[0];
      const todayResult = await env.DB.prepare('SELECT answers_today FROM bot_stats WHERE date = ?').bind(today).first();
      const aiCallsResult = await env.DB.prepare('SELECT COUNT(*) as count FROM ai_calls WHERE DATE(created_at) = ?').bind(today).first();
      const totalAiCalls = await env.DB.prepare('SELECT COUNT(*) as count FROM ai_calls').first();

      const stats = {
        kbCount: kbResult?.count || 0,
        todayAnswers: todayResult?.answers_today || 0,
        aiCalls: aiCallsResult?.count || 0,
        aiUsage: (totalAiCalls?.count || 0) * 15
      };

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(stats));
      return;
    }

    // 配置接口
    if (path === '/manage/config') {
      if (req.method === 'GET') {
        const config = await env.DB.prepare('SELECT * FROM bot_config WHERE id = 1').first();
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({
          botEnabled: config?.bot_enabled !== 0,
          onlyMentioned: config?.only_mentioned === 1,
          useAIClassifier: config?.use_ai_classifier !== 0,
          useAIAnswer: config?.use_ai_answer !== 0,
          similarityThreshold: config?.similarity_threshold || 0.6,
          maxContextItems: config?.max_context_items || 5
        }));
        return;
      }

      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const data = JSON.parse(body);
          await env.DB.prepare(
            'INSERT OR REPLACE INTO bot_config (id, bot_enabled, only_mentioned, use_ai_classifier, use_ai_answer, similarity_threshold, max_context_items) VALUES (1, ?, ?, ?, ?, ?, ?)'
          ).bind(
            data.botEnabled ? 1 : 0,
            data.onlyMentioned ? 1 : 0,
            data.useAIClassifier ? 1 : 0,
            data.useAIAnswer ? 1 : 0,
            data.similarityThreshold,
            data.maxContextItems
          ).run();

          res.setHeader('Content-Type', 'application/json');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
        });
        return;
      }
    }

    // 知识库接口
    if (path === '/manage/knowledge') {
      if (req.method === 'GET') {
        // 使用与 worker.js 相同的查询方式
        const answersResult = await env.DB.prepare(
          'SELECT id, answer, category, keywords FROM knowledge_answers WHERE enabled = 1 ORDER BY id DESC'
        ).all();

        const items = [];
        for (const answer of (answersResult.results || [])) {
          const questionsResult = await env.DB.prepare(
            'SELECT question FROM knowledge_questions WHERE answer_id = ? AND enabled = 1'
          ).bind(answer.id).all();

          items.push({
            id: answer.id,
            answer: answer.answer,
            category: answer.category,
            keywords: answer.keywords,
            questions: (questionsResult.results || []).map(q => q.question)
          });
        }

        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify(items));
        return;
      }

      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            console.log('Adding knowledge:', data);

            if (!data.answer || !data.questions || data.questions.length === 0) {
              res.setHeader('Content-Type', 'application/json');
              res.writeHead(400);
              res.end(JSON.stringify({ error: 'answer and questions are required' }));
              return;
            }

            // 插入答案
            await env.DB.prepare(
              'INSERT INTO knowledge_answers (answer, category, keywords) VALUES (?, ?, ?)'
            ).bind(data.answer, data.category || '', data.keywords || '').run();

            // 获取最后插入的 ID
            const lastIdResult = await env.DB.prepare('SELECT last_insert_rowid() as id').first();
            const answerId = lastIdResult?.id;

            if (!answerId) {
              res.setHeader('Content-Type', 'application/json');
              res.writeHead(500);
              res.end(JSON.stringify({ error: 'Failed to get answer ID' }));
              return;
            }

            // 插入问题变体
            for (const question of data.questions) {
              if (question.trim()) {
                await env.DB.prepare(
                  'INSERT INTO knowledge_questions (answer_id, question, keywords) VALUES (?, ?, ?)'
                ).bind(answerId, question.trim(), data.keywords || '').run();
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, id: answerId }));
          } catch (error) {
            console.error('Error:', error);
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return;
      }
    }

    // 单个知识库项操作
    const knowledgeMatch = path.match(/^\/manage\/knowledge\/(\d+)$/);
    if (knowledgeMatch) {
      const id = parseInt(knowledgeMatch[1]);

      if (req.method === 'GET') {
        const answer = await env.DB.prepare('SELECT * FROM knowledge_answers WHERE id = ?').bind(id).first();
        const questions = await env.DB.prepare('SELECT question FROM knowledge_questions WHERE answer_id = ?').bind(id).all();

        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({
          ...answer,
          questions: questions.results.map(q => q.question)
        }));
        return;
      }

      if (req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const data = JSON.parse(body);

          await env.DB.prepare(
            'UPDATE knowledge_answers SET answer = ?, category = ?, keywords = ? WHERE id = ?'
          ).bind(data.answer, data.category, data.keywords, id).run();

          await env.DB.prepare('DELETE FROM knowledge_questions WHERE answer_id = ?').bind(id).run();

          for (const question of data.questions) {
            if (question.trim()) {
              await env.DB.prepare(
                'INSERT INTO knowledge_questions (answer_id, question, keywords) VALUES (?, ?, ?)'
              ).bind(id, question.trim(), data.keywords || '').run();
            }
          }

          res.setHeader('Content-Type', 'application/json');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
        });
        return;
      }

      if (req.method === 'DELETE') {
        await env.DB.prepare('DELETE FROM knowledge_answers WHERE id = ?').bind(id).run();
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
      }
    }

    // 未回答问题接口
    if (path === '/manage/unanswered' && req.method === 'GET') {
      const items = await env.DB.prepare('SELECT * FROM unanswered WHERE ai_classified = 1 ORDER BY created_at DESC LIMIT 50').all();
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(items.results || []));
      return;
    }

    // 知识库缺口分析接口
    if (path === '/manage/gap-analysis' && req.method === 'GET') {
      const unanswered = await env.DB.prepare(
        'SELECT message, COUNT(*) as count, MAX(created_at) as lastAsked FROM unanswered WHERE ai_classified = 1 GROUP BY message ORDER BY count DESC LIMIT 20'
      ).all();
      
      const knowledge = await env.DB.prepare(
        'SELECT question FROM knowledge_questions WHERE enabled = 1'
      ).all();
      
      const existingQuestions = new Set(
        (knowledge.results || []).map(k => k.question.toLowerCase())
      );
      
      const gaps = (unanswered.results || [])
        .filter(item => !existingQuestions.has(item.message.toLowerCase()))
        .map(item => ({
          message: item.message,
          count: item.count,
          lastAsked: item.lastAsked,
          suggestion: '建议添加相关知识条目'
        }));
      
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({ gaps }));
      return;
    }

    // 404
    res.writeHead(404);
    res.end('Not Found');

  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: error.message }));
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`测试服务器运行在 http://localhost:${PORT}`);
  console.log('请在浏览器中打开上述地址进行测试');
});
