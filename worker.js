// Cloudflare Worker - Telegram 智能知识库机器人 v4.6
// 功能：AI学习知识库回答 + 多问题对应同一答案

const INDEX_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>知识库机器人管理 v4.6</title>
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
                        <i class="fas fa-brain text-indigo-500 mr-3"></i>
                        Telegram 智能知识库机器人
                    </h1>
                    <p class="text-gray-600">AI学习知识库 + 多问题智能匹配</p>
                </div>
                <div class="text-right">
                    <span class="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">v4.6</span>
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
                            <p class="text-sm text-gray-500">知识库答案</p>
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
                            <i class="fas fa-robot text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm text-gray-500">AI调用次数</p>
                            <p class="text-2xl font-bold" id="aiCalls">-</p>
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
                            <p class="text-xs text-gray-500">开启后只有被 @ 时才回复</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="flex items-center space-x-2 mb-2">
                                <input type="checkbox" id="useAIClassifier" checked
                                       class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                                <span class="text-sm font-medium text-gray-700">使用AI意图识别</span>
                            </label>
                            <p class="text-xs text-gray-500">先用AI判断是否需要回答</p>
                        </div>
                        <div>
                            <label class="flex items-center space-x-2 mb-2">
                                <input type="checkbox" id="useAIAnswer" checked
                                       class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                                <span class="text-sm font-medium text-gray-700">使用AI生成答案</span>
                            </label>
                            <p class="text-xs text-gray-500">AI学习知识库后生成回答，更智能</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="similarityThreshold" class="block text-sm font-medium text-gray-700 mb-1">
                                匹配相似度阈值: <span id="thresholdValue">0.6</span>
                            </label>
                            <input type="range" id="similarityThreshold" min="0.3" max="0.95" step="0.05" value="0.6"
                                   class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer">
                            <p class="text-xs text-gray-500 mt-1">0.3=宽松，0.95=严格</p>
                        </div>
                        <div>
                            <label for="maxContextItems" class="block text-sm font-medium text-gray-700 mb-1">
                                AI参考知识数量: <span id="contextValue">5</span>
                            </label>
                            <input type="range" id="maxContextItems" min="1" max="10" step="1" value="5"
                                   class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer">
                            <p class="text-xs text-gray-500 mt-1">AI回答时参考的知识库条目数</p>
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
                <p class="text-sm text-gray-600 mb-4">一个答案可以对应多个问题（同义词/变体）</p>
                
                <form id="kbForm" class="space-y-4 mb-6">
                    <input type="hidden" id="editAnswerId" value="">
                    <div>
                        <label for="answer" class="block text-sm font-medium text-gray-700 mb-1">答案 *</label>
                        <textarea id="answer" name="answer" rows="3"
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="输入标准答案..." required></textarea>
                    </div>
                    <div>
                        <label for="questions" class="block text-sm font-medium text-gray-700 mb-1">
                            问题变体 * <span class="text-xs text-gray-500">（每行一个，支持多个问法对应同一答案）</span>
                        </label>
                        <textarea id="questions" name="questions" rows="4"
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="怎么联系客服？\n客服电话是多少？\n如何联系你们？" required></textarea>
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
                                   placeholder="用逗号分隔">
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
                    <div class="flex space-x-2">
                        <button onclick="exportKnowledge()" 
                                class="inline-flex items-center px-3 py-2 bg-green-100 text-green-700 font-medium rounded-md hover:bg-green-200">
                            <i class="fas fa-download mr-2"></i>导出
                        </button>
                        <label class="inline-flex items-center px-3 py-2 bg-purple-100 text-purple-700 font-medium rounded-md hover:bg-purple-200 cursor-pointer">
                            <i class="fas fa-upload mr-2"></i>导入
                            <input type="file" id="importFile" accept=".json,.csv" class="hidden" onchange="importKnowledge(event)">
                        </label>
                        <button onclick="loadKnowledgeBase()" 
                                class="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200">
                            <i class="fas fa-sync-alt mr-2"></i>刷新
                        </button>
                    </div>
                </div>
                <div id="kbList" class="space-y-3 max-h-96 overflow-y-auto">
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-spinner fa-spin text-xl mb-2"></i>
                        <p>加载中...</p>
                    </div>
                </div>
            </div>

            <!-- 知识库缺口分析 -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-8">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-semibold text-gray-700">
                        <i class="fas fa-lightbulb text-yellow-500 mr-2"></i>知识库缺口分析
                    </h2>
                    <button onclick="analyzeGaps()" 
                            class="inline-flex items-center px-3 py-2 bg-yellow-100 text-yellow-700 font-medium rounded-md hover:bg-yellow-200">
                        <i class="fas fa-search mr-2"></i>分析
                    </button>
                </div>
                <p class="text-sm text-gray-600 mb-4">分析未回答问题，发现知识库缺失的内容</p>
                <div id="gapAnalysis" class="space-y-3">
                    <div class="text-center py-4 text-gray-500">
                        <p>点击"分析"按钮开始</p>
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
                <p class="text-sm text-gray-600 mb-4">AI判断为需要回答但没匹配到知识库的问题</p>
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

        async function loadStats() {
            try {
                const res = await fetch(API_BASE_URL + '/manage/stats');
                const stats = await res.json();
                document.getElementById('kbCount').textContent = stats.kbCount || 0;
                document.getElementById('todayAnswers').textContent = stats.todayAnswers || 0;
                document.getElementById('aiCalls').textContent = stats.aiCalls || 0;
                document.getElementById('aiUsage').textContent = (stats.aiUsage || 0) + ' neurons';
            } catch (e) {
                console.error('加载统计失败:', e);
            }
        }

        async function loadConfig() {
            try {
                const res = await fetch(API_BASE_URL + '/manage/config');
                const config = await res.json();
                document.getElementById('botEnabled').checked = config.botEnabled !== false;
                document.getElementById('onlyMentioned').checked = config.onlyMentioned === true;
                document.getElementById('useAIClassifier').checked = config.useAIClassifier !== false;
                document.getElementById('useAIAnswer').checked = config.useAIAnswer !== false;
                document.getElementById('similarityThreshold').value = config.similarityThreshold || 0.6;
                document.getElementById('thresholdValue').textContent = config.similarityThreshold || 0.6;
                document.getElementById('maxContextItems').value = config.maxContextItems || 5;
                document.getElementById('contextValue').textContent = config.maxContextItems || 5;
            } catch (e) {
                console.error('加载配置失败:', e);
            }
        }

        document.getElementById('similarityThreshold').addEventListener('input', (e) => {
            document.getElementById('thresholdValue').textContent = e.target.value;
        });

        document.getElementById('maxContextItems').addEventListener('input', (e) => {
            document.getElementById('contextValue').textContent = e.target.value;
        });

        document.getElementById('configForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const config = {
                botEnabled: document.getElementById('botEnabled').checked,
                onlyMentioned: document.getElementById('onlyMentioned').checked,
                useAIClassifier: document.getElementById('useAIClassifier').checked,
                useAIAnswer: document.getElementById('useAIAnswer').checked,
                similarityThreshold: parseFloat(document.getElementById('similarityThreshold').value),
                maxContextItems: parseInt(document.getElementById('maxContextItems').value)
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
                item.answer.toLowerCase().includes(searchTerm) || 
                item.questions.some(q => q.toLowerCase().includes(searchTerm)) ||
                (item.category && item.category.toLowerCase().includes(searchTerm))
            );
            
            if (filtered.length === 0) {
                list.innerHTML = '<div class="text-center py-8 text-gray-500">暂无知识库条目</div>';
                return;
            }
            
            list.innerHTML = filtered.map(item => {
                const questionsHtml = item.questions.map(q => '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">' + escapeHtml(q) + '</span>').join('');
                const categoryHtml = item.category ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded mr-2">' + escapeHtml(item.category) + '</span>' : '';
                return '<div class="border border-gray-200 rounded-lg p-4">' +
                    '<div class="flex justify-between items-start">' +
                        '<div class="flex-1">' +
                            '<div class="text-sm text-gray-500 mb-1">问题变体：</div>' +
                            '<div class="flex flex-wrap gap-2 mb-2">' + questionsHtml + '</div>' +
                            categoryHtml +
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

        document.getElementById('searchKb').addEventListener('input', () => {
            loadKnowledgeBase();
        });

        document.getElementById('kbForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('editAnswerId').value;
            const data = {
                answer: document.getElementById('answer').value.trim(),
                questions: document.getElementById('questions').value.split('\\n').map(q => q.trim()).filter(q => q),
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
                document.getElementById('editAnswerId').value = item.id;
                document.getElementById('answer').value = item.answer;
                document.getElementById('questions').value = item.questions.join('\\n');
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
            document.getElementById('editAnswerId').value = '';
            document.getElementById('kbForm').reset();
            document.getElementById('submitBtnText').textContent = '添加知识';
            document.getElementById('cancelEditBtn').classList.add('hidden');
        }

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
            alert('请手动复制问题到知识库表单中添加');
        }

        // 导出知识库
        async function exportKnowledge() {
            try {
                const res = await fetch(API_BASE_URL + '/manage/knowledge');
                const items = await res.json();
                
                const exportData = {
                    version: '4.6',
                    exportDate: new Date().toISOString(),
                    items: items
                };
                
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'knowledge-base-' + new Date().toISOString().split('T')[0] + '.json';
                a.click();
                URL.revokeObjectURL(url);
            } catch (e) {
                alert('导出失败：' + e.message);
            }
        }

        // 导入知识库
        async function importKnowledge(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                let items = [];
                
                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(text);
                    items = data.items || data;
                } else if (file.name.endsWith('.csv')) {
                    const lines = text.split('\\n').filter(l => l.trim());
                    for (let i = 1; i < lines.length; i++) {
                        const parts = lines[i].split(',');
                        if (parts.length >= 2) {
                            items.push({
                                answer: parts[0].replace(/"/g, ''),
                                questions: parts[1].split('|').map(q => q.replace(/"/g, '').trim()).filter(q => q),
                                category: parts[2]?.replace(/"/g, '') || '',
                                keywords: parts[3]?.replace(/"/g, '') || ''
                            });
                        }
                    }
                }
                
                if (items.length === 0) {
                    alert('没有找到有效的知识库数据');
                    return;
                }
                
                if (!confirm('将导入 ' + items.length + ' 条知识，是否继续？')) return;
                
                let success = 0, failed = 0;
                for (const item of items) {
                    try {
                        const res = await fetch(API_BASE_URL + '/manage/knowledge', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(item)
                        });
                        if (res.ok) success++;
                        else failed++;
                    } catch (e) {
                        failed++;
                    }
                }
                
                alert('导入完成！成功：' + success + '，失败：' + failed);
                loadKnowledgeBase();
                loadStats();
            } catch (e) {
                alert('导入失败：' + e.message);
            }
            
            event.target.value = '';
        }

        // 知识库缺口分析
        async function analyzeGaps() {
            const container = document.getElementById('gapAnalysis');
            container.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-xl"></i><p>分析中...</p></div>';
            
            try {
                const res = await fetch(API_BASE_URL + '/manage/gap-analysis');
                const data = await res.json();
                
                if (data.gaps.length === 0) {
                    container.innerHTML = '<div class="text-center py-4 text-green-600"><i class="fas fa-check-circle text-xl"></i><p>知识库覆盖良好，暂无明显缺口</p></div>';
                    return;
                }
                
                container.innerHTML = data.gaps.map(gap => {
                    return '<div class="border border-yellow-200 bg-yellow-50 rounded-lg p-4">' +
                        '<div class="flex justify-between items-start">' +
                            '<div class="flex-1">' +
                                '<div class="font-medium text-gray-900 mb-1">' + escapeHtml(gap.message) + '</div>' +
                                '<div class="text-sm text-gray-500">' +
                                    '<span class="mr-3">出现 ' + gap.count + ' 次</span>' +
                                    '<span>最近: ' + new Date(gap.lastAsked).toLocaleDateString('zh-CN') + '</span>' +
                                '</div>' +
                                '<div class="text-sm text-yellow-700 mt-1">建议添加: ' + escapeHtml(gap.suggestion) + '</div>' +
                            '</div>' +
                            '<button onclick="quickAddKnowledge(\\'' + escapeHtml(gap.message.replace(/'/g, "\\\\'")) + '\\')" class="ml-4 text-blue-500 hover:text-blue-700">' +
                                '<i class="fas fa-plus mr-1"></i>快速添加' +
                            '</button>' +
                        '</div>' +
                    '</div>';
                }).join('');
            } catch (e) {
                container.innerHTML = '<div class="text-center py-4 text-red-500">分析失败：' + e.message + '</div>';
            }
        }

        // 快速添加知识
        function quickAddKnowledge(question) {
            document.getElementById('answer').focus();
            document.getElementById('questions').value = question;
            document.getElementById('answer').scrollIntoView({ behavior: 'smooth' });
        }

        window.onload = () => {
            loadStats();
            loadConfig();
            loadKnowledgeBase();
            loadUnanswered();
        };
    </script>
</body>
</html>`;

let configCache = null;

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  if (request.method === 'OPTIONS') {
    return handleCORS();
  }
  
  if (request.method === 'POST' && path === '/webhook') {
    return await handleTelegramWebhook(request, env);
  }
  
  if (request.method === 'GET' && path === '/manage/stats') {
    return await getStats(env);
  }
  
  if (path === '/manage/config') {
    if (request.method === 'GET') {
      return await getConfig(env);
    }
    if (request.method === 'POST') {
      return await saveConfig(request, env);
    }
  }
  
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
  
  if (request.method === 'GET' && path === '/manage/unanswered') {
    return await getUnanswered(env);
  }
  
  if (request.method === 'GET' && path === '/manage/gap-analysis') {
    return await analyzeGaps(env);
  }
  
  if (request.method === 'GET' && path === '/') {
    return new Response(INDEX_HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
  
  return new Response('Telegram Knowledge Bot v4.6 is running!', { status: 200 });
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

async function getConfig(env) {
  try {
    const config = await env.DB.prepare('SELECT * FROM bot_config WHERE id = 1').first();
    if (config) {
      configCache = {
        botEnabled: config.bot_enabled === 1,
        onlyMentioned: config.only_mentioned === 1,
        useAIClassifier: config.use_ai_classifier !== 0,
        useAIAnswer: config.use_ai_answer !== 0,
        similarityThreshold: config.similarity_threshold || 0.6,
        maxContextItems: config.max_context_items || 5
      };
    } else {
      configCache = {
        botEnabled: true,
        onlyMentioned: false,
        useAIClassifier: true,
        useAIAnswer: true,
        similarityThreshold: 0.6,
        maxContextItems: 5
      };
    }
    return jsonResponse(configCache);
  } catch (error) {
    return jsonResponse({
      botEnabled: true,
      onlyMentioned: false,
      useAIClassifier: true,
      useAIAnswer: true,
      similarityThreshold: 0.6,
      maxContextItems: 5
    });
  }
}

async function saveConfig(request, env) {
  try {
    const body = await request.json();
    const { botEnabled, onlyMentioned, useAIClassifier, useAIAnswer, similarityThreshold, maxContextItems } = body;
    
    await env.DB.prepare(
      'INSERT OR REPLACE INTO bot_config (id, bot_enabled, only_mentioned, use_ai_classifier, use_ai_answer, similarity_threshold, max_context_items) VALUES (1, ?, ?, ?, ?, ?, ?)'
    ).bind(
      botEnabled ? 1 : 0,
      onlyMentioned ? 1 : 0,
      useAIClassifier ? 1 : 0,
      useAIAnswer ? 1 : 0,
      similarityThreshold,
      maxContextItems
    ).run();
    
    configCache = { botEnabled, onlyMentioned, useAIClassifier, useAIAnswer, similarityThreshold, maxContextItems };
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function handleTelegramWebhook(request, env) {
  try {
    const update = await request.json();
    
    if (!update.message) {
      return new Response('OK', { status: 200 });
    }
    
    const message = update.message;
    const chatId = message.chat.id;
    const chatType = message.chat.type;
    const messageText = message.text || '';
    const userId = message.from.id;
    const userName = message.from.username || message.from.first_name || 'Unknown';
    
    if (!messageText.trim()) {
      return new Response('OK', { status: 200 });
    }
    
    await env.DB.prepare(
      'INSERT INTO messages (chat_id, user_id, user_name, message, chat_type) VALUES (?, ?, ?, ?, ?)'
    ).bind(chatId, userId, userName, messageText, chatType).run();
    
    if (!configCache) {
      await getConfig(env);
    }
    
    if (!configCache.botEnabled) {
      return new Response('OK', { status: 200 });
    }
    
    const botInfo = await getBotInfo(env.TELEGRAM_BOT_TOKEN);
    const botUsername = botInfo?.result?.username || '';
    const isMentioned = messageText.includes('@' + botUsername) || chatType === 'private';
    
    if (configCache.onlyMentioned && !isMentioned && chatType !== 'private') {
      return new Response('OK', { status: 200 });
    }
    
    let cleanText = messageText.replace(new RegExp('@' + botUsername, 'g'), '').trim();
    
    // 步骤1：AI意图识别
    let shouldAnswer = false;
    
    if (configCache.useAIClassifier !== false) {
      const classification = await classifyIntent(env, cleanText);
      shouldAnswer = classification.shouldAnswer;
      
      await env.DB.prepare(
        'INSERT INTO ai_calls (chat_id, user_id, message, intent, confidence) VALUES (?, ?, ?, ?, ?)'
      ).bind(chatId, userId, cleanText, classification.intent, classification.confidence).run();
    } else {
      shouldAnswer = true;
    }
    
    if (!shouldAnswer) {
      return new Response('OK', { status: 200 });
    }
    
    // 步骤2：在知识库中搜索最匹配的问题
    const matches = await findBestMatches(env, cleanText, configCache.maxContextItems || 5);
    
    if (matches.length > 0 && matches[0].similarity >= (configCache.similarityThreshold || 0.6)) {
      let responseText;
      let answerType;
      
      if (configCache.useAIAnswer !== false && matches[0].similarity < 0.95) {
        // 使用AI生成答案，参考匹配到的知识库
        responseText = await generateAIAnswer(env, cleanText, matches);
        answerType = 'ai';
      } else {
        // 直接使用知识库答案
        responseText = matches[0].answer;
        answerType = 'kb';
      }
      
      await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, responseText, message.message_id);
      await recordAnswer(env, chatId, userId, userName, cleanText, responseText, answerType, matches[0].similarity);
      
      const today = new Date().toISOString().split('T')[0];
      await env.DB.prepare(
        'UPDATE bot_stats SET answers_today = answers_today + 1, total_answers = total_answers + 1 WHERE date = ?'
      ).bind(today).run();
    } else {
      await env.DB.prepare(
        'INSERT INTO unanswered (chat_id, user_id, user_name, message, chat_type, ai_classified) VALUES (?, ?, ?, ?, ?, 1)'
      ).bind(chatId, userId, userName, cleanText, chatType).run();
    }
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// AI意图分类
async function classifyIntent(env, message) {
  try {
    // 获取知识库样本
    const knowledgeBase = await env.DB.prepare(
      'SELECT qa.answer, GROUP_CONCAT(kq.question, "|") as questions FROM knowledge_answers qa JOIN knowledge_questions kq ON qa.id = kq.answer_id WHERE qa.enabled = 1 AND kq.enabled = 1 GROUP BY qa.id LIMIT 5'
    ).all();
    
    const sampleQA = knowledgeBase.results.map(k => {
      const questions = k.questions.split('|').slice(0, 2).join(', ');
      return `问题示例：${questions}`;
    }).join('\n');
    
    const systemPrompt = `你是一个意图分类器。判断用户消息是否在询问以下类型的问题：
${sampleQA}

如果用户在问以上类似的问题，回复：ANSWER
如果用户在闲聊、打招呼或问无关问题，回复：IGNORE
只回复一个单词：ANSWER 或 IGNORE`;

    const response = await env.AI.run('@cf/meta/llama-3.2-1b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.1,
      max_tokens: 10
    });
    
    const result = response.response?.trim().toUpperCase() || 'IGNORE';
    const shouldAnswer = result.includes('ANSWER');
    
    return {
      shouldAnswer,
      intent: shouldAnswer ? 'question' : 'ignore',
      confidence: shouldAnswer ? 0.9 : 0.1
    };
  } catch (error) {
    console.error('AI classification error:', error);
    return { shouldAnswer: true, intent: 'unknown', confidence: 0.5 };
  }
}

// AI生成答案，参考知识库
async function generateAIAnswer(env, userQuestion, matches) {
  try {
    // 构建知识库上下文
    const context = matches.slice(0, 3).map((m, i) => {
      return `参考${i + 1}：\n问题：${m.question}\n答案：${m.answer}`;
    }).join('\n\n');
    
    const systemPrompt = `你是一个智能客服助手。请根据以下知识库内容，回答用户的问题。
如果知识库中有直接匹配的答案，请基于知识库内容回答。
如果知识库中没有完全匹配的答案，请根据最相关的知识进行合理回答。
回答要简洁、准确、友好。

知识库内容：
${context}`;

    const response = await env.AI.run('@cf/meta/llama-3.2-1b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userQuestion }
      ],
      temperature: 0.3,
      max_tokens: 500
    });
    
    return response.response?.trim() || matches[0].answer;
  } catch (error) {
    console.error('AI answer generation error:', error);
    // AI失败时返回最佳匹配的原始答案
    return matches[0].answer;
  }
}

// 在知识库中查找最佳匹配
async function findBestMatches(env, query, maxResults = 5) {
  try {
    const allQuestions = await env.DB.prepare(
      'SELECT kq.id, kq.question, kq.answer_id, kq.keywords, qa.answer FROM knowledge_questions kq JOIN knowledge_answers qa ON kq.answer_id = qa.id WHERE kq.enabled = 1 AND qa.enabled = 1'
    ).all();
    
    if (!allQuestions.results || allQuestions.results.length === 0) {
      return [];
    }
    
    const scored = allQuestions.results.map(item => {
      const similarity = calculateSimilarity(query, item.question, item.keywords);
      return { ...item, similarity };
    });
    
    scored.sort((a, b) => b.similarity - a.similarity);
    
    // 去重，同一答案只保留最佳匹配
    const seenAnswers = new Set();
    const uniqueMatches = [];
    
    for (const item of scored) {
      if (!seenAnswers.has(item.answer_id)) {
        seenAnswers.add(item.answer_id);
        uniqueMatches.push(item);
        if (uniqueMatches.length >= maxResults) break;
      }
    }
    
    return uniqueMatches;
  } catch (error) {
    console.error('Find matches error:', error);
    return [];
  }
}

function calculateSimilarity(query, question, keywords) {
  const queryLower = query.toLowerCase();
  const questionLower = question.toLowerCase();
  
  if (queryLower === questionLower) return 1.0;
  
  if (questionLower.includes(queryLower) || queryLower.includes(questionLower)) {
    return 0.9;
  }
  
  if (keywords) {
    const keywordList = keywords.toLowerCase().split(',').map(k => k.trim());
    for (const keyword of keywordList) {
      if (queryLower.includes(keyword)) {
        return 0.85;
      }
    }
  }
  
  const distance = levenshteinDistance(queryLower, questionLower);
  const maxLen = Math.max(queryLower.length, questionLower.length);
  const similarity = 1 - (distance / maxLen);
  
  return similarity;
}

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

async function getBotInfo(botToken) {
  try {
    const response = await fetch('https://api.telegram.org/bot' + botToken + '/getMe');
    return await response.json();
  } catch (e) {
    return null;
  }
}

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

async function recordAnswer(env, chatId, userId, userName, question, answer, answerType, similarity) {
  try {
    await env.DB.prepare(
      'INSERT INTO answers (chat_id, user_id, user_name, question, answer, answer_type, similarity) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(chatId, userId, userName, question, answer, answerType, similarity).run();
  } catch (e) {
    console.error('Record answer error:', e);
  }
}

async function getStats(env) {
  try {
    const kbResult = await env.DB.prepare('SELECT COUNT(*) as count FROM knowledge_answers WHERE enabled = 1').first();
    const today = new Date().toISOString().split('T')[0];
    const todayResult = await env.DB.prepare('SELECT answers_today FROM bot_stats WHERE date = ?').bind(today).first();
    const aiCallsResult = await env.DB.prepare('SELECT COUNT(*) as count FROM ai_calls WHERE DATE(created_at) = ?').bind(today).first();
    const totalAiCalls = await env.DB.prepare('SELECT COUNT(*) as count FROM ai_calls').first();
    
    const aiUsage = (totalAiCalls?.count || 0) * 15;
    
    return jsonResponse({
      kbCount: kbResult?.count || 0,
      todayAnswers: todayResult?.answers_today || 0,
      aiCalls: aiCallsResult?.count || 0,
      aiUsage: aiUsage
    });
  } catch (error) {
    return jsonResponse({ kbCount: 0, todayAnswers: 0, aiCalls: 0, aiUsage: 0 });
  }
}

async function getAllKnowledge(env) {
  try {
    const answers = await env.DB.prepare(
      'SELECT id, answer, category, keywords FROM knowledge_answers WHERE enabled = 1 ORDER BY id DESC'
    ).all();
    
    const items = [];
    for (const answer of (answers.results || [])) {
      const questions = await env.DB.prepare(
        'SELECT question FROM knowledge_questions WHERE answer_id = ? AND enabled = 1'
      ).bind(answer.id).all();
      
      items.push({
        id: answer.id,
        answer: answer.answer,
        category: answer.category,
        keywords: answer.keywords,
        questions: (questions.results || []).map(q => q.question)
      });
    }
    
    return jsonResponse(items);
  } catch (error) {
    console.error('getAllKnowledge error:', error);
    return jsonResponse([]);
  }
}

async function getKnowledge(id, env) {
  try {
    const answer = await env.DB.prepare('SELECT * FROM knowledge_answers WHERE id = ?').bind(id).first();
    if (!answer) return jsonResponse({ error: 'Not found' }, 404);
    
    const questions = await env.DB.prepare('SELECT question FROM knowledge_questions WHERE answer_id = ? AND enabled = 1').bind(id).all();
    
    return jsonResponse({
      id: answer.id,
      answer: answer.answer,
      category: answer.category,
      keywords: answer.keywords,
      questions: questions.results.map(q => q.question)
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function addKnowledge(request, env) {
  try {
    const body = await request.json();
    const { answer, questions, category, keywords } = body;
    
    if (!answer || !questions || questions.length === 0) {
      return jsonResponse({ error: 'answer and questions are required' }, 400);
    }
    
    // 插入答案 - 使用数据库默认时间戳
    await env.DB.prepare(
      'INSERT INTO knowledge_answers (answer, category, keywords) VALUES (?, ?, ?)'
    ).bind(answer, category || '', keywords || '').run();
    
    // 获取最后插入的 ID
    const lastIdResult = await env.DB.prepare('SELECT last_insert_rowid() as id').first();
    const answerId = lastIdResult?.id;
    
    if (!answerId) {
      return jsonResponse({ error: 'Failed to get answer ID' }, 500);
    }
    
    // 插入问题变体 - 使用数据库默认时间戳
    for (const question of questions) {
      if (question.trim()) {
        await env.DB.prepare(
          'INSERT INTO knowledge_questions (answer_id, question, keywords) VALUES (?, ?, ?)'
        ).bind(answerId, question.trim(), keywords || '').run();
      }
    }
    
    return jsonResponse({ success: true, id: answerId });
  } catch (error) {
    console.error('Add knowledge error:', error);
    return jsonResponse({ error: error.message, stack: error.stack }, 500);
  }
}

async function updateKnowledge(id, request, env) {
  try {
    const body = await request.json();
    const { answer, questions, category, keywords } = body;
    
    // 更新答案
    await env.DB.prepare(
      'UPDATE knowledge_answers SET answer = ?, category = ?, keywords = ? WHERE id = ?'
    ).bind(answer, category, keywords, id).run();
    
    // 删除旧问题
    await env.DB.prepare('DELETE FROM knowledge_questions WHERE answer_id = ?').bind(id).run();
    
    // 插入新问题 - 使用数据库默认时间戳
    for (const question of questions) {
      if (question.trim()) {
        await env.DB.prepare(
          'INSERT INTO knowledge_questions (answer_id, question, keywords) VALUES (?, ?, ?)'
        ).bind(id, question.trim(), keywords || '').run();
      }
    }
    
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function deleteKnowledge(id, env) {
  try {
    // 级联删除会自动删除相关问题
    await env.DB.prepare('DELETE FROM knowledge_answers WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function getUnanswered(env) {
  try {
    const items = await env.DB.prepare(
      'SELECT * FROM unanswered WHERE ai_classified = 1 ORDER BY created_at DESC LIMIT 50'
    ).all();
    return jsonResponse(items.results || []);
  } catch (error) {
    return jsonResponse([]);
  }
}

async function analyzeGaps(env) {
  try {
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
        suggestion: generateSuggestion(item.message)
      }));
    
    return jsonResponse({ gaps });
  } catch (error) {
    return jsonResponse({ gaps: [], error: error.message });
  }
}

function generateSuggestion(message) {
  if (message.includes('价格') || message.includes('多少钱') || message.includes('收费')) {
    return '添加价格相关的知识条目';
  }
  if (message.includes('客服') || message.includes('联系') || message.includes('电话')) {
    return '添加联系方式相关的知识条目';
  }
  if (message.includes('怎么') || message.includes('如何')) {
    return '添加操作指南相关的知识条目';
  }
  if (message.includes('时间') || message.includes('什么时候')) {
    return '添加时间相关的知识条目';
  }
  return '建议添加相关知识条目';
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  },
};
