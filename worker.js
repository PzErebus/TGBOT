// Cloudflare Worker - Telegram 智能知识库机器人 v4.0
// 功能：轻量级AI分类 + 知识库检索，零额度浪费

const INDEX_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>知识库机器人管理 v4.0</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <div class="max-w-5xl mx-auto">
            <!-- 头部 -->
            <header class="mb-8 flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-gray-800 mb-2">
                        <i class="fas fa-book text-indigo-500 mr-3"></i>
                        Telegram 智能知识库机器人
                    </h1>
                    <p class="text-gray-600">轻量级AI分类 + 知识库检索，精准回答</p>
                </div>
                <div class="text-right">
                    <span class="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">v4.0</span>
                </div>
            </header>

            <!-- 统计卡片 -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div class="bg-white rounded-lg shadow p-4">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-indigo-100 text-indigo-500">
                            <i class="fas fa-database text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm text-gray-500">知识库条目</p>
                            <p class="text-2xl font-bold" id="kbCount">-</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow p-4">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-green-100 text-green-500">
                            <i class="fas fa-check-circle text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm text-gray-500">今日回答</p>
                            <p class="text-2xl font-bold" id="todayAnswers">-</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow p-4">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-blue-100 text-blue-500">
                            <i class="fas fa-comments text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm text-gray-500">总消息</p>
                            <p class="text-2xl font-bold" id="totalMessages">-</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow p-4">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-orange-100 text-orange-500">
                            <i class="fas fa-bolt text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm text-gray-500">AI消耗</p>
                            <p class="text-2xl font-bold" id="aiUsage">-</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 机器人配置 -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 class="text-xl font-semibold text-gray-700 mb-4">
                    <i class="fas fa-cog text-indigo-500 mr-2"></i>
                    机器人配置
                </h2>
                <form id="configForm" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="flex items-center space-x-2 mb-2">
                                <input type="checkbox" id="botEnabled" checked
                                       class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                                <span class="text-sm font-medium text-gray-700">启用机器人</span>
                            </label>
                            <p class="text-xs text-gray-500">关闭后机器人不会回复任何消息</p>
                        </div>
                        <div>
                            <label class="flex items-center space-x-2 mb-2">
                                <input type="checkbox" id="onlyMentioned"
                                       class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                                <span class="text-sm font-medium text-gray-700">仅在被 @ 时回复</span>
                            </label>
                            <p class="text-xs text-gray-500">开启后只有被 @ 时才回复，关闭后主动监听所有消息</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="similarityThreshold" class="block text-sm font-medium text-gray-700 mb-1">
                                匹配相似度阈值: <span id="thresholdValue">0.6</span>
                            </label>
                            <input type="range" id="similarityThreshold" min="0.3" max="0.95" step="0.05" value="0.6"
                                   class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer">
                            <p class="text-xs text-gray-500 mt-1">0.3=宽松（容易匹配），0.95=严格（必须很相似）</p>
                        </div>
                        <div>
                            <label for="maxResults" class="block text-sm font-medium text-gray-700 mb-1">最多返回几个答案</label>
                            <input type="number" id="maxResults" value="1" min="1" max="3"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <p class="text-xs text-gray-500 mt-1">超过1个时会列出多个相关答案</p>
                        </div>
                    </div>
                    <button type="submit" 
                            class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700">
                        <i class="fas fa-save mr-2"></i>保存配置
                    </button>
                </form>
            </div>

            <!-- 知识库管理 -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 class="text-xl font-semibold text-gray-700 mb-4">
                    <i class="fas fa-book text-blue-500 mr-2"></i>
                    知识库管理
                </h2>
                <p class="text-sm text-gray-600 mb-4">添加常见问题和答案，机器人会智能匹配相似问题</p>
                
                <form id="kbForm" class="space-y-4 mb-6">
                    <input type="hidden" id="editId" value="">
                    <div>
                        <label for="question" class="block text-sm font-medium text-gray-700 mb-1">问题 *</label>
                        <input type="text" id="question" name="question" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="例如：怎么联系客服？价格是多少？" required>
                    </div>
                    <div>
                        <label for="answer" class="block text-sm font-medium text-gray-700 mb-1">答案 *</label>
                        <textarea id="answer" name="answer" rows="3"
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="输入问题的答案..." required></textarea>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="category" class="block text-sm font-medium text-gray-700 mb-1">分类（可选）</label>
                            <input type="text" id="category" name="category" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                   placeholder="例如：价格、售后、产品">
                        </div>
                        <div>
                            <label for="keywords" class="block text-sm font-medium text-gray-700 mb-1">关键词（可选）</label>
                            <input type="text" id="keywords" name="keywords" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                   placeholder="用逗号分隔，例如：价格,多少钱,费用">
                        </div>
                    </div>
                    <div class="flex space-x-3">
                        <button type="submit" id="submitBtn"
                                class="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700">
                            <i class="fas fa-save mr-2"></i>
                            <span id="submitBtnText">添加知识</span>
                        </button>
                        <button type="button" id="cancelEditBtn" onclick="cancelEdit()"
                                class="hidden inline-flex items-center px-4 py-2 bg-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-400">
                            <i class="fas fa-times mr-2"></i>取消
                        </button>
                    </div>
                </form>

                <!-- 知识库列表 -->
                <div class="flex justify-between items-center mb-4">
                    <input type="text" id="searchKb" placeholder="搜索知识库..."
                           class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-64">
                    <button onclick="loadKnowledgeBase()" 
                            class="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200">
                        <i class="fas fa-sync-alt mr-2"></i>刷新
                    </button>
                </div>
                <div id="kbList" class="space-y-3 max-h-96 overflow-y-auto">
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-spinner fa-spin text-xl mb-2"></i>
                        <p>加载中...</p>
                    </div>
                </div>
            </div>

            <!-- 未回答问题 -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-semibold text-gray-700">
                        <i class="fas fa-question-circle text-orange-500 mr-2"></i>未回答问题
                    </h2>
                    <button onclick="loadUnanswered()" 
                            class="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200">
                        <i class="fas fa-sync-alt mr-2"></i>刷新
                    </button>
                </div>
                <p class="text-sm text-gray-600 mb-4">这些问题没有匹配到知识库答案，可以考虑添加</p>
                <div id="unansweredList" class="space-y-3 max-h-96 overflow-y-auto">
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-spinner fa-spin text-xl mb-2"></i>
                        <p>加载中...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const API_BASE_URL = window.location.origin;

        // 加载统计
        async function loadStats() {
            try {
                const res = await fetch(API_BASE_URL + '/manage/stats');
                const stats = await res.json();
                document.getElementById('kbCount').textContent = stats.kbCount || 0;
                document.getElementById('todayAnswers').textContent = stats.todayAnswers || 0;
                document.getElementById('totalMessages').textContent = stats.totalMessages || 0;
                document.getElementById('aiUsage').textContent = (stats.aiUsage || 0) + ' neurons';
            } catch (e) {
                console.error('加载统计失败:', e);
            }
        }

        // 加载配置
        async function loadConfig() {
            try {
                const res = await fetch(API_BASE_URL + '/manage/config');
                const config = await res.json();
                document.getElementById('botEnabled').checked = config.botEnabled !== false;
                document.getElementById('onlyMentioned').checked = config.onlyMentioned !== false;
                document.getElementById('similarityThreshold').value = config.similarityThreshold || 0.6;
                document.getElementById('thresholdValue').textContent = config.similarityThreshold || 0.6;
                document.getElementById('maxResults').value = config.maxResults || 1;
            } catch (e) {
                console.error('加载配置失败:', e);
            }
        }

        // 阈值滑块
        document.getElementById('similarityThreshold').addEventListener('input', (e) => {
            document.getElementById('thresholdValue').textContent = e.target.value;
        });

        // 保存配置
        document.getElementById('configForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const config = {
                botEnabled: document.getElementById('botEnabled').checked,
                onlyMentioned: document.getElementById('onlyMentioned').checked,
                similarityThreshold: parseFloat(document.getElementById('similarityThreshold').value),
                maxResults: parseInt(document.getElementById('maxResults').value)
            };
            
            try {
                const res = await fetch(API_BASE_URL + '/manage/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });
                if (res.ok) {
                    alert('配置保存成功！');
                } else {
                    alert('保存失败');
                }
            } catch (e) {
                alert('网络错误');
            }
        });

        // 加载知识库
        async function loadKnowledgeBase() {
            try {
                const res = await fetch(API_BASE_URL + '/manage/knowledge');
                const items = await res.json();
                renderKnowledgeBase(items);
            } catch (e) {
                document.getElementById('kbList').innerHTML = '<div class="text-center py-8 text-red-500">加载失败</div>';
            }
        }

        function renderKnowledgeBase(items) {
            const list = document.getElementById('kbList');
            const searchTerm = document.getElementById('searchKb').value.toLowerCase();
            
            const filtered = items.filter(item => 
                item.question.toLowerCase().includes(searchTerm) || 
                item.answer.toLowerCase().includes(searchTerm) ||
                (item.category && item.category.toLowerCase().includes(searchTerm))
            );
            
            if (filtered.length === 0) {
                list.innerHTML = '<div class="text-center py-8 text-gray-500">暂无知识库条目</div>';
                return;
            }
            
            list.innerHTML = filtered.map(item => {
                return '<div class="border border-gray-200 rounded-lg p-4">' +
                    '<div class="flex justify-between items-start">' +
                        '<div class="flex-1">' +
                            '<div class="font-medium text-gray-900 mb-1">' + escapeHtml(item.question) + '</div>' +
                            (item.category ? '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">' + escapeHtml(item.category) + '</span>' : '') +
                            '<div class="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">' + escapeHtml(item.answer) + '</div>' +
                        '</div>' +
                        '<div class="space-x-2 ml-4">' +
                            '<button onclick="editItem(' + item.id + ')" class="text-blue-500 hover:text-blue-700"><i class="fas fa-edit"></i></button>' +
                            '<button onclick="deleteItem(' + item.id + ')" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            }).join('');
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // 搜索知识库
        document.getElementById('searchKb').addEventListener('input', () => {
            loadKnowledgeBase();
        });

        // 添加/编辑知识
        document.getElementById('kbForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('editId').value;
            const data = {
                question: document.getElementById('question').value.trim(),
                answer: document.getElementById('answer').value.trim(),
                category: document.getElementById('category').value.trim(),
                keywords: document.getElementById('keywords').value.trim()
            };
            
            try {
                const url = editId ? API_BASE_URL + '/manage/knowledge/' + editId : API_BASE_URL + '/manage/knowledge';
                const method = editId ? 'PUT' : 'POST';
                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    alert(editId ? '修改成功！' : '添加成功！');
                    cancelEdit();
                    loadKnowledgeBase();
                }
            } catch (e) {
                alert('操作失败');
            }
        });

        async function editItem(id) {
            try {
                const res = await fetch(API_BASE_URL + '/manage/knowledge/' + id);
                const item = await res.json();
                document.getElementById('editId').value = item.id;
                document.getElementById('question').value = item.question;
                document.getElementById('answer').value = item.answer;
                document.getElementById('category').value = item.category || '';
                document.getElementById('keywords').value = item.keywords || '';
                document.getElementById('submitBtnText').textContent = '保存修改';
                document.getElementById('cancelEditBtn').classList.remove('hidden');
            } catch (e) {
                alert('加载失败');
            }
        }

        async function deleteItem(id) {
            if (!confirm('确定删除这条知识？')) return;
            try {
                await fetch(API_BASE_URL + '/manage/knowledge/' + id, { method: 'DELETE' });
                loadKnowledgeBase();
            } catch (e) {
                alert('删除失败');
            }
        }

        function cancelEdit() {
            document.getElementById('editId').value = '';
            document.getElementById('kbForm').reset();
            document.getElementById('submitBtnText').textContent = '添加知识';
            document.getElementById('cancelEditBtn').classList.add('hidden');
        }

        // 加载未回答问题
        async function loadUnanswered() {
            try {
                const res = await fetch(API_BASE_URL + '/manage/unanswered');
                const items = await res.json();
                renderUnanswered(items);
            } catch (e) {
                document.getElementById('unansweredList').innerHTML = '<div class="text-center text-red-500">加载失败</div>';
            }
        }

        function renderUnanswered(items) {
            const list = document.getElementById('unansweredList');
            if (items.length === 0) {
                list.innerHTML = '<div class="text-center py-8 text-gray-500">暂无未回答问题</div>';
                return;
            }
            list.innerHTML = items.map(item => {
                return '<div class="border border-gray-200 rounded-lg p-4 flex justify-between items-center">' +
                    '<div>' +
                        '<div class="font-medium text-gray-900">' + escapeHtml(item.message) + '</div>' +
                        '<div class="text-sm text-gray-500">' + new Date(item.created_at).toLocaleString('zh-CN') + '</div>' +
                    '</div>' +
                    '<button onclick="addFromUnanswered(' + item.id + ')" class="text-blue-500 hover:text-blue-700">' +
                        '<i class="fas fa-plus mr-1"></i>添加到知识库' +
                    '</button>' +
                '</div>';
            }).join('');
        }

        async function addFromUnanswered(id) {
            // 简化实现，实际应该填充表单
            alert('请手动复制问题到知识库表单中添加');
        }

        // 页面加载
        window.onload = () => {
            loadStats();
            loadConfig();
            loadKnowledgeBase();
            loadUnanswered();
        };
    </script>
</body>
</html>`;

// 配置缓存
let configCache = null;

// 主处理函数
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  if (request.method === 'OPTIONS') {
    return handleCORS();
  }
  
  // Telegram Webhook
  if (request.method === 'POST' && path === '/webhook') {
    return await handleTelegramWebhook(request, env);
  }
  
  // 统计
  if (request.method === 'GET' && path === '/manage/stats') {
    return await getStats(env);
  }
  
  // 配置
  if (path === '/manage/config') {
    if (request.method === 'GET') {
      return await getConfig(env);
    }
    if (request.method === 'POST') {
      return await saveConfig(request, env);
    }
  }
  
  // 知识库
  if (path === '/manage/knowledge') {
    if (request.method === 'GET') {
      return await getAllKnowledge(env);
    }
    if (request.method === 'POST') {
      return await addKnowledge(request, env);
    }
  }
  
  const knowledgeMatch = path.match(/^\/manage\/knowledge\/(\d+)$/);
  if (knowledgeMatch) {
    const id = parseInt(knowledgeMatch[1]);
    if (request.method === 'GET') {
      return await getKnowledge(id, env);
    }
    if (request.method === 'PUT') {
      return await updateKnowledge(id, request, env);
    }
    if (request.method === 'DELETE') {
      return await deleteKnowledge(id, env);
    }
  }
  
  // 未回答问题
  if (request.method === 'GET' && path === '/manage/unanswered') {
    return await getUnanswered(env);
  }
  
  // 管理界面
  if (request.method === 'GET' && path === '/') {
    return new Response(INDEX_HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
  
  return new Response('Telegram Knowledge Bot v4.0 is running!', { status: 200 });
}

function handleCORS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// 获取配置
async function getConfig(env) {
  try {
    const config = await env.DB.prepare('SELECT * FROM bot_config WHERE id = 1').first();
    if (config) {
      configCache = {
        botEnabled: config.bot_enabled === 1,
        onlyMentioned: config.only_mentioned === 1,
        similarityThreshold: config.similarity_threshold || 0.6,
        maxResults: config.max_results || 1
      };
    } else {
      configCache = {
        botEnabled: true,
        onlyMentioned: false,
        similarityThreshold: 0.6,
        maxResults: 1
      };
    }
    return jsonResponse(configCache);
  } catch (error) {
    return jsonResponse({
      botEnabled: true,
      onlyMentioned: false,
      similarityThreshold: 0.6,
      maxResults: 1
    });
  }
}

// 保存配置
async function saveConfig(request, env) {
  try {
    const body = await request.json();
    const { botEnabled, onlyMentioned, similarityThreshold, maxResults } = body;
    
    await env.DB.prepare(
      'INSERT OR REPLACE INTO bot_config (id, bot_enabled, only_mentioned, similarity_threshold, max_results, updated_at) VALUES (1, ?, ?, ?, ?, ?)'
    ).bind(
      botEnabled ? 1 : 0,
      onlyMentioned ? 1 : 0,
      similarityThreshold,
      maxResults,
      new Date().toISOString()
    ).run();
    
    configCache = { botEnabled, onlyMentioned, similarityThreshold, maxResults };
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

// 处理 Telegram Webhook
async function handleTelegramWebhook(request, env) {
  try {
    const update = await request.json();
    
    console.log('Webhook received:', JSON.stringify(update));
    
    if (!update.message) {
      return new Response('OK', { status: 200 });
    }
    
    const message = update.message;
    const chatId = message.chat.id;
    const chatType = message.chat.type;
    const messageText = message.text || '';
    const userId = message.from.id;
    const userName = message.from.username || message.from.first_name || 'Unknown';
    
    console.log('Processing message:', messageText, 'from:', userName);
    
    if (!messageText.trim()) {
      return new Response('OK', { status: 200 });
    }
    
    // 记录消息
    await env.DB.prepare(
      'INSERT INTO messages (chat_id, user_id, user_name, message, chat_type, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(chatId, userId, userName, messageText, chatType, new Date().toISOString()).run();
    
    // 获取配置
    if (!configCache) {
      await getConfig(env);
    }
    
    // 检查机器人是否启用
    if (!configCache.botEnabled) {
      return new Response('OK', { status: 200 });
    }
    
    // 检查是否被 @
    const botInfo = await getBotInfo(env.TELEGRAM_BOT_TOKEN);
    const botUsername = botInfo?.result?.username || '';
    const isMentioned = messageText.includes('@' + botUsername) || chatType === 'private';
    
    // 如果设置了仅在被 @ 时回复，且没有被 @，则不回复
    if (configCache.onlyMentioned && !isMentioned && chatType !== 'private') {
      return new Response('OK', { status: 200 });
    }
    
    // 清理消息文本
    let cleanText = messageText.replace(new RegExp('@' + botUsername, 'g'), '').trim();
    
    // 在知识库中搜索最匹配的问题
    const matches = await findBestMatches(env, cleanText, configCache.maxResults || 1);
    
    console.log('Matches found:', matches.length, 'best similarity:', matches[0]?.similarity);
    
    if (matches.length > 0 && matches[0].similarity >= (configCache.similarityThreshold || 0.6)) {
      // 找到匹配答案
      let responseText;
      if (matches.length === 1) {
        responseText = matches[0].answer;
      } else {
        // 多个匹配结果
        responseText = '找到以下相关答案：\n\n';
        matches.forEach((match, index) => {
          responseText += (index + 1) + '. ' + match.question + '\n' + match.answer + '\n\n';
        });
      }
      
      await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, responseText, message.message_id);
      await recordAnswer(env, chatId, userId, userName, cleanText, responseText, matches[0].similarity);
      
      // 更新使用统计
      await env.DB.prepare(
        'UPDATE bot_stats SET answers_today = answers_today + 1, total_answers = total_answers + 1 WHERE date = ?'
      ).bind(new Date().toISOString().split('T')[0]).run();
    } else {
      // 未找到匹配，记录到未回答问题
      await env.DB.prepare(
        'INSERT INTO unanswered (chat_id, user_id, user_name, message, chat_type, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(chatId, userId, userName, cleanText, chatType, new Date().toISOString()).run();
    }
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// 在知识库中查找最佳匹配
async function findBestMatches(env, query, maxResults = 1) {
  try {
    // 获取所有知识库条目
    const allKnowledge = await env.DB.prepare('SELECT * FROM knowledge_base WHERE enabled = 1').all();
    
    if (!allKnowledge.results || allKnowledge.results.length === 0) {
      return [];
    }
    
    // 计算相似度并排序
    const scored = allKnowledge.results.map(item => {
      const similarity = calculateSimilarity(query, item.question, item.keywords);
      return { ...item, similarity };
    });
    
    scored.sort((a, b) => b.similarity - a.similarity);
    
    return scored.slice(0, maxResults);
  } catch (error) {
    console.error('Find matches error:', error);
    return [];
  }
}

// 计算相似度（简化版，使用关键词匹配 + 编辑距离）
function calculateSimilarity(query, question, keywords) {
  const queryLower = query.toLowerCase();
  const questionLower = question.toLowerCase();
  
  // 1. 精确匹配
  if (queryLower === questionLower) return 1.0;
  
  // 2. 包含匹配
  if (questionLower.includes(queryLower) || queryLower.includes(questionLower)) {
    return 0.9;
  }
  
  // 3. 关键词匹配
  if (keywords) {
    const keywordList = keywords.toLowerCase().split(',').map(k => k.trim());
    for (const keyword of keywordList) {
      if (queryLower.includes(keyword)) {
        return 0.85;
      }
    }
  }
  
  // 4. 计算编辑距离相似度
  const distance = levenshteinDistance(queryLower, questionLower);
  const maxLen = Math.max(queryLower.length, questionLower.length);
  const similarity = 1 - (distance / maxLen);
  
  return similarity;
}

// 编辑距离算法
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j] + 1
        );
      }
    }
  }
  
  return dp[m][n];
}

// 获取机器人信息
async function getBotInfo(botToken) {
  try {
    const response = await fetch('https://api.telegram.org/bot' + botToken + '/getMe');
    return await response.json();
  } catch (e) {
    return null;
  }
}

// 发送消息
async function sendTelegramMessage(botToken, chatId, text, replyToMessageId) {
  const url = 'https://api.telegram.org/bot' + botToken + '/sendMessage';
  const payload = { chat_id: chatId, text: text };
  if (replyToMessageId) payload.reply_to_message_id = replyToMessageId;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  return response.ok;
}

// 记录回答
async function recordAnswer(env, chatId, userId, userName, question, answer, similarity) {
  try {
    await env.DB.prepare(
      'INSERT INTO answers (chat_id, user_id, user_name, question, answer, similarity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(chatId, userId, userName, question, answer, similarity, new Date().toISOString()).run();
  } catch (e) {
    console.error('Record answer error:', e);
  }
}

// 获取统计
async function getStats(env) {
  try {
    const kbResult = await env.DB.prepare('SELECT COUNT(*) as count FROM knowledge_base WHERE enabled = 1').first();
    const today = new Date().toISOString().split('T')[0];
    const todayResult = await env.DB.prepare('SELECT answers_today FROM bot_stats WHERE date = ?').bind(today).first();
    const totalResult = await env.DB.prepare('SELECT SUM(total_answers) as count FROM bot_stats').first();
    const messagesResult = await env.DB.prepare('SELECT COUNT(*) as count FROM messages').first();
    
    return jsonResponse({
      kbCount: kbResult?.count || 0,
      todayAnswers: todayResult?.answers_today || 0,
      totalMessages: messagesResult?.count || 0,
      aiUsage: 0 // 本版本不使用AI，纯知识库匹配
    });
  } catch (error) {
    return jsonResponse({ kbCount: 0, todayAnswers: 0, totalMessages: 0, aiUsage: 0 });
  }
}

// 获取所有知识库条目
async function getAllKnowledge(env) {
  try {
    const items = await env.DB.prepare('SELECT * FROM knowledge_base ORDER BY created_at DESC').all();
    return jsonResponse(items.results || []);
  } catch (error) {
    return jsonResponse([]);
  }
}

// 获取单个知识库条目
async function getKnowledge(id, env) {
  try {
    const item = await env.DB.prepare('SELECT * FROM knowledge_base WHERE id = ?').bind(id).first();
    return jsonResponse(item);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

// 添加知识库条目
async function addKnowledge(request, env) {
  try {
    const body = await request.json();
    const { question, answer, category, keywords } = body;
    
    if (!question || !answer) {
      return jsonResponse({ error: 'question and answer are required' }, 400);
    }
    
    const result = await env.DB.prepare(
      'INSERT INTO knowledge_base (question, answer, category, keywords, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(question, answer, category || '', keywords || '', new Date().toISOString()).run();
    
    return jsonResponse({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

// 更新知识库条目
async function updateKnowledge(id, request, env) {
  try {
    const body = await request.json();
    const { question, answer, category, keywords } = body;
    
    await env.DB.prepare(
      'UPDATE knowledge_base SET question = ?, answer = ?, category = ?, keywords = ? WHERE id = ?'
    ).bind(question, answer, category, keywords, id).run();
    
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

// 删除知识库条目
async function deleteKnowledge(id, env) {
  try {
    await env.DB.prepare('DELETE FROM knowledge_base WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

// 获取未回答问题
async function getUnanswered(env) {
  try {
    const items = await env.DB.prepare(
      'SELECT * FROM unanswered ORDER BY created_at DESC LIMIT 50'
    ).all();
    return jsonResponse(items.results || []);
  } catch (error) {
    return jsonResponse([]);
  }
}

// Worker 入口
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  },
};
