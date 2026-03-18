// Telegram 智能知识库机器人 v4.8 - 修复版
// 移除全局变量缓存，适配 Cloudflare Workers 执行模型

export default {
  async fetch(request, env, ctx) {
    return await handleRequest(request, env);
  }
};

// HTML 管理界面
const adminHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Telegram 知识库机器人管理</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-100">
    <div class="container mx-auto px-4 py-8 max-w-6xl">
        <h1 class="text-3xl font-bold mb-8 text-center text-blue-600">
            <i class="fas fa-robot mr-2"></i>Telegram 知识库机器人管理 v4.8
        </h1>
        
        <!-- 统计信息 -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500 text-sm">知识库条目</p>
                        <p class="text-2xl font-bold text-blue-600" id="kbCount">-</p>
                    </div>
                    <i class="fas fa-database text-3xl text-blue-200"></i>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500 text-sm">今日回答</p>
                        <p class="text-2xl font-bold text-green-600" id="todayAnswers">-</p>
                    </div>
                    <i class="fas fa-comments text-3xl text-green-200"></i>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500 text-sm">今日AI调用</p>
                        <p class="text-2xl font-bold text-purple-600" id="aiCalls">-</p>
                    </div>
                    <i class="fas fa-brain text-3xl text-purple-200"></i>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500 text-sm">AI消耗 ( neurons )</p>
                        <p class="text-2xl font-bold text-orange-600" id="aiUsage">-</p>
                    </div>
                    <i class="fas fa-coins text-3xl text-orange-200"></i>
                </div>
            </div>
        </div>

        <!-- 配置面板 -->
        <div class="bg-white rounded-lg shadow mb-8">
            <div class="p-6 border-b">
                <h2 class="text-xl font-semibold"><i class="fas fa-cog mr-2"></i>机器人配置</h2>
            </div>
            <div class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="flex items-center space-x-3 cursor-pointer">
                            <input type="checkbox" id="botEnabled" class="w-5 h-5 text-blue-600 rounded">
                            <span class="text-gray-700">启用机器人</span>
                        </label>
                    </div>
                    <div>
                        <label class="flex items-center space-x-3 cursor-pointer">
                            <input type="checkbox" id="onlyMentioned" class="w-5 h-5 text-blue-600 rounded">
                            <span class="text-gray-700">仅当被@时回复</span>
                        </label>
                    </div>
                    <div>
                        <label class="flex items-center space-x-3 cursor-pointer">
                            <input type="checkbox" id="useAIClassifier" class="w-5 h-5 text-blue-600 rounded" checked>
                            <span class="text-gray-700">使用AI意图分类</span>
                        </label>
                    </div>
                    <div>
                        <label class="flex items-center space-x-3 cursor-pointer">
                            <input type="checkbox" id="useAIAnswer" class="w-5 h-5 text-blue-600 rounded" checked>
                            <span class="text-gray-700">使用AI生成答案</span>
                        </label>
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">相似度阈值 (0.0-1.0)</label>
                        <input type="number" id="similarityThreshold" min="0" max="1" step="0.1" value="0.6" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">AI每日限额 (10-500)</label>
                        <input type="number" id="aiDailyLimit" min="10" max="500" value="100" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">最大参考知识数 (1-10)</label>
                        <input type="number" id="maxContextItems" min="1" max="10" value="5" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>
                <button onclick="saveConfig()" class="mt-6 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition">
                    <i class="fas fa-save mr-2"></i>保存配置
                </button>
            </div>
        </div>

        <!-- 前言内容管理 -->
        <div class="bg-white rounded-lg shadow mb-8">
            <div class="p-6 border-b flex justify-between items-center">
                <h2 class="text-xl font-semibold"><i class="fas fa-book-open mr-2"></i>前言/背景知识管理</h2>
                <button onclick="showContextModal()" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition">
                    <i class="fas fa-plus mr-2"></i>添加前言
                </button>
            </div>
            <div class="p-6">
                <div id="contextList" class="space-y-4"></div>
            </div>
        </div>

        <!-- 知识库管理 -->
        <div class="bg-white rounded-lg shadow mb-8">
            <div class="p-6 border-b flex justify-between items-center">
                <h2 class="text-xl font-semibold"><i class="fas fa-book mr-2"></i>知识库管理</h2>
                <div class="space-x-2">
                    <button onclick="checkDuplicates()" class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition">
                        <i class="fas fa-search mr-2"></i>查重
                    </button>
                    <button onclick="exportKnowledge()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition">
                        <i class="fas fa-file-export mr-2"></i>导出
                    </button>
                    <button onclick="showBatchImportModal()" class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition">
                        <i class="fas fa-file-import mr-2"></i>导入
                    </button>
                    <button onclick="showKnowledgeModal()" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition">
                        <i class="fas fa-plus mr-2"></i>添加知识
                    </button>
                </div>
            </div>
            <div class="p-6">
                <div class="mb-4">
                    <input type="text" id="searchKb" placeholder="搜索知识库..." class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div id="kbList" class="space-y-4 max-h-96 overflow-y-auto pr-2"></div>
            </div>
        </div>

        <!-- 未回答问题 -->
        <div class="bg-white rounded-lg shadow mb-8">
            <div class="p-6 border-b flex justify-between items-center">
                <h2 class="text-xl font-semibold"><i class="fas fa-question-circle mr-2"></i>未回答问题</h2>
                <button onclick="loadUnanswered()" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition">
                    <i class="fas fa-sync mr-2"></i>刷新
                </button>
            </div>
            <div class="p-6">
                <div id="unansweredList" class="space-y-2 max-h-64 overflow-y-auto pr-2"></div>
            </div>
        </div>

        <!-- 知识缺口分析 -->
        <div class="bg-white rounded-lg shadow">
            <div class="p-6 border-b flex justify-between items-center">
                <h2 class="text-xl font-semibold"><i class="fas fa-chart-line mr-2"></i>知识缺口分析</h2>
                <button onclick="analyzeGaps()" class="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition">
                    <i class="fas fa-search mr-2"></i>分析缺口
                </button>
            </div>
            <div class="p-6">
                <div id="gapsContainer" class="space-y-4"></div>
            </div>
        </div>
    </div>

    <!-- 前言编辑模态框 -->
    <div id="contextModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
        <div class="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <h3 class="text-xl font-semibold mb-4" id="contextModalTitle">添加前言</h3>
            <input type="hidden" id="contextId">
            <div class="space-y-4">
                <div>
                    <label class="block text-gray-700 mb-2">标题</label>
                    <input type="text" id="contextTitle" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">内容</label>
                    <textarea id="contextContent" rows="6" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">分类</label>
                    <input type="text" id="contextCategory" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-gray-700 mb-2">优先级</label>
                        <input type="number" id="contextPriority" value="0" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div class="flex items-center">
                        <label class="flex items-center space-x-3 cursor-pointer mt-6">
                            <input type="checkbox" id="contextEnabled" class="w-5 h-5 text-blue-600 rounded" checked>
                            <span class="text-gray-700">启用</span>
                        </label>
                    </div>
                </div>
            </div>
            <div class="mt-6 flex justify-end space-x-3">
                <button onclick="closeContextModal()" class="px-4 py-2 border rounded-lg hover:bg-gray-100">取消</button>
                <button onclick="saveContext()" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg">保存</button>
            </div>
        </div>
    </div>

    <!-- 知识编辑模态框 -->
    <div id="knowledgeModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
        <div class="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <h3 class="text-xl font-semibold mb-4" id="modalTitle">添加知识</h3>
            <input type="hidden" id="editAnswerId">
            <div class="space-y-4">
                <div>
                    <label class="block text-gray-700 mb-2">答案内容</label>
                    <textarea id="answer" rows="4" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">问题变体（每行一个）</label>
                    <textarea id="questions" rows="6" placeholder="怎么联系客服？
客服电话是多少？
如何联系你们？" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">分类</label>
                    <input type="text" id="category" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">关键词（逗号分隔，用于快速匹配）</label>
                    <input type="text" id="keywords" placeholder="客服,电话,联系" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
            </div>
            <div class="mt-6 flex justify-end space-x-3">
                <button onclick="closeKnowledgeModal()" class="px-4 py-2 border rounded-lg hover:bg-gray-100">取消</button>
                <button onclick="saveKnowledge()" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg">保存</button>
            </div>
        </div>
    </div>

    <!-- 批量导入模态框 -->
    <div id="batchImportModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
        <div class="bg-white rounded-lg p-8 max-w-3xl w-full mx-4 max-h-screen overflow-y-auto">
            <h3 class="text-xl font-semibold mb-4">批量导入知识</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-gray-700 mb-2">导入格式（每行：问题1|问题2|... = 答案）</label>
                    <textarea id="batchData" rows="12" placeholder="怎么联系客服|客服电话是多少|如何联系你们 = 您可以通过以下方式联系我们：电话 400-123-4567，邮箱 support@example.com
价格是多少|多少钱 = 我们的产品价格从99元起，具体请查看官网" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"></textarea>
                </div>
            </div>
            <div class="mt-6 flex justify-end space-x-3">
                <button onclick="closeBatchImportModal()" class="px-4 py-2 border rounded-lg hover:bg-gray-100">取消</button>
                <button onclick="processBatchImport()" class="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg">导入</button>
            </div>
        </div>
    </div>

    <script>
        // 加载统计数据
        async function loadStats() {
            try {
                const res = await fetch('/manage/stats');
                const data = await res.json();
                document.getElementById('kbCount').textContent = data.kbCount;
                document.getElementById('todayAnswers').textContent = data.todayAnswers;
                document.getElementById('aiCalls').textContent = data.aiCalls;
                document.getElementById('aiUsage').textContent = data.aiUsage;
            } catch (e) {
                console.error('Load stats error:', e);
            }
        }

        // 加载配置
        async function loadConfig() {
            try {
                const res = await fetch('/manage/config');
                const config = await res.json();
                document.getElementById('botEnabled').checked = config.botEnabled;
                document.getElementById('onlyMentioned').checked = config.onlyMentioned;
                document.getElementById('useAIClassifier').checked = config.useAIClassifier;
                document.getElementById('useAIAnswer').checked = config.useAIAnswer;
                document.getElementById('similarityThreshold').value = config.similarityThreshold;
                document.getElementById('maxContextItems').value = config.maxContextItems;
                document.getElementById('aiDailyLimit').value = config.aiDailyLimit;
            } catch (e) {
                console.error('Load config error:', e);
            }
        }

        // 保存配置
        async function saveConfig() {
            const config = {
                botEnabled: document.getElementById('botEnabled').checked,
                onlyMentioned: document.getElementById('onlyMentioned').checked,
                useAIClassifier: document.getElementById('useAIClassifier').checked,
                useAIAnswer: document.getElementById('useAIAnswer').checked,
                similarityThreshold: parseFloat(document.getElementById('similarityThreshold').value),
                maxContextItems: parseInt(document.getElementById('maxContextItems').value),
                aiDailyLimit: parseInt(document.getElementById('aiDailyLimit').value)
            };
            
            try {
                const res = await fetch('/manage/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });
                if (res.ok) {
                    alert('配置已保存');
                } else {
                    alert('保存失败');
                }
            } catch (e) {
                alert('保存出错: ' + e.message);
            }
        }

        // 知识库管理
        async function loadKnowledgeBase() {
            try {
                const res = await fetch('/manage/knowledge');
                const data = await res.json();
                const list = document.getElementById('kbList');
                const search = document.getElementById('searchKb').value.toLowerCase();
                
                const filtered = search ? data.filter(item => 
                    item.answer.toLowerCase().includes(search) ||
                    item.questions.some(q => q.toLowerCase().includes(search))
                ) : data;
                
                if (filtered.length === 0) {
                    list.innerHTML = '<div class="text-center py-8 text-gray-500">暂无知识库条目</div>';
                    return;
                }
                
                list.innerHTML = filtered.map(item => {
                    const questionsHtml = item.questions.map(q => '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">' + escapeHtml(q) + '</span>').join('');
                    const categoryHtml = item.category ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded mr-2">' + escapeHtml(item.category) + '</span>' : '';
                    return '<div class="border rounded-lg p-4 hover:bg-gray-50">' +
                        '<div class="flex justify-between items-start">' +
                            '<div class="flex-1">' +
                                '<div class="mb-2">' + categoryHtml + questionsHtml + '</div>' +
                                '<div class="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">' + escapeHtml(item.answer) + '</div>' +
                            '</div>' +
                            '<div class="ml-4 space-x-2">' +
                                '<button onclick="editKnowledge(' + item.id + ')" class="text-blue-500 hover:text-blue-700"><i class="fas fa-edit"></i></button>' +
                                '<button onclick="deleteKnowledge(' + item.id + ')" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
                }).join('');
            } catch (e) {
                document.getElementById('kbList').innerHTML = '<div class="text-center py-8 text-red-500">加载失败</div>';
            }
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        document.getElementById('searchKb').addEventListener('input', () => {
            loadKnowledgeBase();
        });

        // 保存知识
        async function saveKnowledge() {
            const editId = document.getElementById('editAnswerId').value;
            const data = {
                answer: document.getElementById('answer').value.trim(),
                questions: document.getElementById('questions').value.split('\\n').map(q => q.trim()).filter(q => q),
                category: document.getElementById('category').value.trim(),
                keywords: document.getElementById('keywords').value.trim()
            };
            
            try {
                const url = editId ? '/manage/knowledge/' + editId : '/manage/knowledge';
                const method = editId ? 'PUT' : 'POST';
                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    closeKnowledgeModal();
                    loadKnowledgeBase();
                    loadStats();
                } else {
                    const err = await res.json();
                    alert('保存失败: ' + (err.error || '未知错误'));
                }
            } catch (e) {
                alert('保存出错: ' + e.message);
            }
        }

        function showKnowledgeModal() {
            document.getElementById('modalTitle').textContent = '添加知识';
            document.getElementById('editAnswerId').value = '';
            document.getElementById('answer').value = '';
            document.getElementById('questions').value = '';
            document.getElementById('category').value = '';
            document.getElementById('keywords').value = '';
            document.getElementById('knowledgeModal').classList.remove('hidden');
            document.getElementById('knowledgeModal').classList.add('flex');
        }

        function closeKnowledgeModal() {
            document.getElementById('knowledgeModal').classList.add('hidden');
            document.getElementById('knowledgeModal').classList.remove('flex');
        }

        async function editKnowledge(id) {
            try {
                const res = await fetch('/manage/knowledge/' + id);
                const data = await res.json();
                document.getElementById('modalTitle').textContent = '编辑知识';
                document.getElementById('editAnswerId').value = id;
                document.getElementById('answer').value = data.answer;
                document.getElementById('questions').value = data.questions.join('\\n');
                document.getElementById('category').value = data.category || '';
                document.getElementById('keywords').value = data.keywords || '';
                document.getElementById('knowledgeModal').classList.remove('hidden');
                document.getElementById('knowledgeModal').classList.add('flex');
            } catch (e) {
                alert('加载失败');
            }
        }

        async function deleteKnowledge(id) {
            if (!confirm('确定要删除这条知识吗？')) return;
            try {
                const res = await fetch('/manage/knowledge/' + id, { method: 'DELETE' });
                if (res.ok) {
                    loadKnowledgeBase();
                    loadStats();
                } else {
                    alert('删除失败');
                }
            } catch (e) {
                alert('删除出错');
            }
        }

        // 导出知识库
        async function exportKnowledge() {
            try {
                const res = await fetch('/manage/export');
                if (!res.ok) throw new Error('导出失败');
                
                const data = await res.json();
                let exportText = '';
                
                data.forEach(item => {
                    const questions = item.questions.map(q => String.fromCharCode(34) + q + String.fromCharCode(34)).join(String.fromCharCode(124));
                    exportText += questions + String.fromCharCode(61) + item.answer + String.fromCharCode(10);
                });
                
                // 创建下载
                const blob = new Blob([exportText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'knowledge_export_' + new Date().toISOString().split('T')[0] + '.txt';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (e) {
                alert('导出失败: ' + e.message);
            }
        }

        // 批量导入
        function showBatchImportModal() {
            document.getElementById('batchImportModal').classList.remove('hidden');
            document.getElementById('batchImportModal').classList.add('flex');
        }

        function closeBatchImportModal() {
            document.getElementById('batchImportModal').classList.add('hidden');
            document.getElementById('batchImportModal').classList.remove('flex');
        }

        async function processBatchImport() {
            const text = document.getElementById('batchData').value.trim();
            if (!text) {
                alert('请输入导入数据');
                return;
            }
            
            const lines = text.split('\\n').filter(l => l.trim());
            let success = 0, failed = 0;
            
            for (const line of lines) {
                const parts = line.split('=');
                if (parts.length === 2) {
                    const questions = parts[0].split('|').map(q => q.replace(/"/g, '').trim()).filter(q => q);
                    const answer = parts[1].trim();
                    if (questions.length > 0 && answer) {
                        try {
                            const res = await fetch('/manage/knowledge', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ answer, questions })
                            });
                            if (res.ok) success++;
                            else failed++;
                        } catch (e) {
                            failed++;
                        }
                    }
                }
            }
            
            alert('导入完成: ' + success + ' 成功, ' + failed + ' 失败');
            closeBatchImportModal();
            loadKnowledgeBase();
            loadStats();
        }

        // 未回答问题
        async function loadUnanswered() {
            try {
                const res = await fetch('/manage/unanswered');
                const items = await res.json();
                const list = document.getElementById('unansweredList');
                
                if (items.length === 0) {
                    list.innerHTML = '<div class="text-center py-8 text-gray-500">暂无未回答问题</div>';
                    return;
                }
                
                list.innerHTML = items.map(item => {
                    return '<div class="flex justify-between items-center p-3 bg-gray-50 rounded">' +
                        '<div class="flex-1">' +
                            '<div class="font-medium text-gray-900">' + escapeHtml(item.message) + '</div>' +
                            '<div class="text-sm text-gray-500">' + new Date(item.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) + '</div>' +
                        '</div>' +
                        '<button onclick="quickAddKnowledge(' + JSON.stringify(item.message).replace(/"/g, '&quot;') + ')" class="ml-4 text-blue-500 hover:text-blue-700">' +
                            '<i class="fas fa-plus"></i> 添加知识' +
                        '</button>' +
                    '</div>';
                }).join('');
            } catch (e) {
                document.getElementById('unansweredList').innerHTML = '<div class="text-center text-red-500">加载失败</div>';
            }
        }

        function quickAddKnowledge(question) {
            showKnowledgeModal();
            document.getElementById('questions').value = question;
        }

        // 查重功能
        let currentDuplicates = []; // 存储当前查重结果
        
        async function checkDuplicates() {
            const list = document.getElementById('kbList');
            list.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-xl"></i><p>正在检查重复...</p></div>';
            
            try {
                const res = await fetch('/manage/knowledge');
                const data = await res.json();
                
                // 查找重复的问题
                const questionMap = new Map();
                const duplicates = [];
                
                data.forEach(item => {
                    item.questions.forEach(q => {
                        const key = q.toLowerCase().trim();
                        if (questionMap.has(key)) {
                            duplicates.push({
                                question: q,
                                existing: questionMap.get(key),
                                current: item
                            });
                        } else {
                            questionMap.set(key, item);
                        }
                    });
                });
                
                // 查找重复的答案
                const answerMap = new Map();
                data.forEach(item => {
                    const key = item.answer.toLowerCase().trim();
                    if (answerMap.has(key)) {
                        if (!duplicates.find(d => d.current.id === item.id)) {
                            duplicates.push({
                                type: 'answer',
                                question: item.questions[0],
                                existing: answerMap.get(key),
                                current: item
                            });
                        }
                    } else {
                        answerMap.set(key, item);
                    }
                });
                
                currentDuplicates = duplicates; // 保存查重结果
                
                if (duplicates.length === 0) {
                    list.innerHTML = '<div class="text-center py-4 text-green-600"><i class="fas fa-check-circle text-xl"></i><p>没有发现重复内容</p></div>';
                    return;
                }
                
                // 显示重复内容，添加全选和批量删除按钮
                let html = '<div class="mb-4 p-4 bg-orange-50 border-l-4 border-orange-400">' +
                    '<div class="flex justify-between items-center">' +
                        '<div>' +
                            '<p class="font-medium text-orange-800">发现 ' + duplicates.length + ' 个重复项</p>' +
                            '<p class="text-sm text-orange-600">勾选要删除的项，然后点击批量删除</p>' +
                        '</div>' +
                        '<div class="space-x-2">' +
                            '<button onclick="toggleSelectAll()" class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm">' +
                                '<i class="fas fa-check-square mr-1"></i>全选' +
                            '</button>' +
                            '<button onclick="batchDeleteDuplicates()" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm">' +
                                '<i class="fas fa-trash mr-1"></i>批量删除' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>';
                
                html += duplicates.map((dup, index) => {
                    return '<div class="border rounded-lg p-4 mb-4 bg-red-50 duplicate-item" data-id="' + dup.current.id + '">' +
                        '<div class="flex justify-between items-start mb-2">' +
                            '<div class="flex items-start flex-1">' +
                                '<input type="checkbox" class="duplicate-checkbox mt-1 mr-3 w-4 h-4 text-red-600 rounded" value="' + dup.current.id + '">' +
                                '<div class="flex-1">' +
                                    '<div class="text-sm text-red-600 font-medium mb-1">重复 #' + (index + 1) + '</div>' +
                                    '<div class="text-gray-800 mb-1"><span class="text-gray-500">问题：</span>' + escapeHtml(dup.question || dup.current.questions[0]) + '</div>' +
                                    '<div class="text-gray-800 mb-1"><span class="text-gray-500">答案：</span>' + escapeHtml(dup.current.answer.substring(0, 50)) + (dup.current.answer.length > 50 ? '...' : '') + '</div>' +
                                    '<div class="text-sm text-gray-500 mt-2">与以下条目重复：</div>' +
                                    '<div class="text-gray-800 pl-4 border-l-2 border-gray-300">' + escapeHtml(dup.existing.questions[0]) + '</div>' +
                                '</div>' +
                            '</div>' +
                            '<button onclick="deleteDuplicate(' + dup.current.id + ')" class="ml-4 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm">' +
                                '<i class="fas fa-trash mr-1"></i>删除' +
                            '</button>' +
                        '</div>' +
                    '</div>';
                }).join('');
                
                list.innerHTML = html;
            } catch (e) {
                list.innerHTML = '<div class="text-center py-4 text-red-500">查重失败：' + e.message + '</div>';
            }
        }
        
        // 全选/取消全选
        function toggleSelectAll() {
            const checkboxes = document.querySelectorAll('.duplicate-checkbox');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !allChecked);
        }
        
        // 批量删除重复项
        async function batchDeleteDuplicates() {
            const checkboxes = document.querySelectorAll('.duplicate-checkbox:checked');
            if (checkboxes.length === 0) {
                alert('Please select items to delete');
                return;
            }
            
            if (!confirm('Delete ' + checkboxes.length + ' selected items?')) return;
            
            const ids = Array.from(checkboxes).map(cb => parseInt(cb.value));
            const total = ids.length;
            let successCount = 0;
            let failCount = 0;
            
            // Create progress modal
            const modal = document.createElement('div');
            modal.id = 'deleteProgress';
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = '<div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">' +
                '<h3 class="text-lg font-semibold mb-4">Deleting...</h3>' +
                '<div class="w-full bg-gray-200 rounded-full h-4 mb-2">' +
                    '<div id="progressBar" class="bg-red-500 h-4 rounded-full transition-all duration-300" style="width: 0%"></div>' +
                '</div>' +
                '<div class="flex justify-between text-sm text-gray-600">' +
                    '<span id="progressText">0 / ' + total + '</span>' +
                    '<span id="progressPercent">0%</span>' +
                '</div>' +
                '<div id="progressDetails" class="mt-2 text-sm text-gray-500 max-h-32 overflow-y-auto"></div>' +
            '</div>';
            document.body.appendChild(modal);
            
            const progressBar = document.getElementById('progressBar');
            const progressText = document.getElementById('progressText');
            const progressPercent = document.getElementById('progressPercent');
            const progressDetails = document.getElementById('progressDetails');
            
            for (let i = 0; i < ids.length; i++) {
                const id = ids[i];
                const dup = currentDuplicates.find(d => d.current.id === id);
                const question = dup ? (dup.question || dup.current.questions[0]) : 'ID: ' + id;
                
                try {
                    const res = await fetch('/manage/knowledge/' + id, { method: 'DELETE' });
                    const div = document.createElement('div');
                    if (res.ok) {
                        successCount++;
                        div.className = 'text-green-600';
                        div.textContent = '[OK] ' + question.substring(0, 30);
                    } else {
                        failCount++;
                        div.className = 'text-red-600';
                        div.textContent = '[FAIL] ' + question.substring(0, 30);
                    }
                    progressDetails.appendChild(div);
                } catch (e) {
                    failCount++;
                    const div = document.createElement('div');
                    div.className = 'text-red-600';
                    div.textContent = '[ERR] ' + question.substring(0, 30);
                    progressDetails.appendChild(div);
                }
                
                // Update progress
                const percent = Math.round(((i + 1) / total) * 100);
                progressBar.style.width = percent + '%';
                progressText.textContent = (i + 1) + ' / ' + total;
                progressPercent.textContent = percent + '%';
                progressDetails.scrollTop = progressDetails.scrollHeight;
            }
            
            // Show completion
            setTimeout(() => {
                document.getElementById('deleteProgress').remove();
                alert('Done! Success: ' + successCount + ', Failed: ' + failCount);
                checkDuplicates();
            }, 500);
        }
        
        // 删除重复项
        async function deleteDuplicate(id) {
            if (!confirm('确定要删除这个重复的知识条目吗？')) return;
            
            try {
                const res = await fetch('/manage/knowledge/' + id, { method: 'DELETE' });
                if (res.ok) {
                    alert('删除成功');
                    checkDuplicates(); // 重新查重
                } else {
                    alert('删除失败');
                }
            } catch (e) {
                alert('删除失败：' + e.message);
            }
        }

        // 知识缺口分析
        async function analyzeGaps() {
            const container = document.getElementById('gapsContainer');
            container.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-xl"></i><p>分析中...</p></div>';
            
            try {
                const res = await fetch('/manage/gaps');
                const data = await res.json();
                
                if (data.gaps.length === 0) {
                    container.innerHTML = '<div class="text-center py-4 text-green-600"><i class="fas fa-check-circle text-xl"></i><p>知识库覆盖良好，暂无明显缺口</p></div>';
                    return;
                }
                
                container.innerHTML = data.gaps.map(gap => {
                    return '<div class="border-l-4 border-yellow-400 bg-yellow-50 p-4">' +
                        '<div class="flex justify-between items-start">' +
                            '<div class="flex-1">' +
                                '<div class="font-medium text-gray-900 mb-1">' + escapeHtml(gap.message) + '</div>' +
                                '<div class="text-sm text-gray-600">出现次数: ' + gap.count + '</div>' +
                                '<div class="text-sm text-yellow-700 mt-1">建议添加: ' + escapeHtml(gap.suggestion) + '</div>' +
                            '</div>' +
                            '<button onclick="quickAddKnowledge(' + JSON.stringify(gap.message).replace(/"/g, '&quot;') + ')" class="ml-4 text-blue-500 hover:text-blue-700">' +
                                '<i class="fas fa-plus"></i>' +
                            '</button>' +
                        '</div>' +
                    '</div>';
                }).join('');
            } catch (e) {
                container.innerHTML = '<div class="text-center py-4 text-red-500">分析失败：' + e.message + '</div>';
            }
        }

        // 前言内容管理
        async function loadContext() {
            try {
                const res = await fetch('/manage/context');
                const items = await res.json();
                const container = document.getElementById('contextList');
                
                if (items.length === 0) {
                    container.innerHTML = '<div class="text-center py-8 text-gray-500">暂无内容，请添加</div>';
                    return;
                }
                
                container.innerHTML = items.map(item => {
                    return '<div class="border rounded-lg p-4 ' + (item.enabled ? 'bg-white' : 'bg-gray-100') + '">' +
                        '<div class="flex justify-between items-start">' +
                            '<div class="flex-1">' +
                                '<div class="flex items-center space-x-2 mb-2">' +
                                    '<span class="font-medium text-gray-900">' + escapeHtml(item.title) + '</span>' +
                                    (item.category ? '<span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">' + escapeHtml(item.category) + '</span>' : '') +
                                    (!item.enabled ? '<span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">已禁用</span>' : '') +
                                '</div>' +
                                '<div class="text-sm text-gray-600 line-clamp-2">' + escapeHtml(item.content) + '</div>' +
                            '</div>' +
                            '<div class="ml-4 space-x-2">' +
                                '<button onclick="editContext(' + item.id + ')" class="text-blue-500 hover:text-blue-700"><i class="fas fa-edit"></i></button>' +
                                '<button onclick="deleteContext(' + item.id + ')" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
                }).join('');
            } catch (e) {
                document.getElementById('contextList').innerHTML = '<div class="text-center py-8 text-red-500">加载失败</div>';
            }
        }

        function showContextModal() {
            document.getElementById('contextModalTitle').textContent = '添加前言';
            document.getElementById('contextId').value = '';
            document.getElementById('contextTitle').value = '';
            document.getElementById('contextContent').value = '';
            document.getElementById('contextCategory').value = '';
            document.getElementById('contextPriority').value = '0';
            document.getElementById('contextEnabled').checked = true;
            document.getElementById('contextModal').classList.remove('hidden');
            document.getElementById('contextModal').classList.add('flex');
        }

        function closeContextModal() {
            document.getElementById('contextModal').classList.add('hidden');
            document.getElementById('contextModal').classList.remove('flex');
        }

        async function editContext(id) {
            try {
                const res = await fetch('/manage/context/' + id);
                const data = await res.json();
                document.getElementById('contextModalTitle').textContent = '编辑前言';
                document.getElementById('contextId').value = id;
                document.getElementById('contextTitle').value = data.title;
                document.getElementById('contextContent').value = data.content;
                document.getElementById('contextCategory').value = data.category || '';
                document.getElementById('contextPriority').value = data.priority;
                document.getElementById('contextEnabled').checked = data.enabled === 1;
                document.getElementById('contextModal').classList.remove('hidden');
                document.getElementById('contextModal').classList.add('flex');
            } catch (e) {
                alert('加载失败');
            }
        }

        async function saveContext() {
            const id = document.getElementById('contextId').value;
            const data = {
                title: document.getElementById('contextTitle').value.trim(),
                content: document.getElementById('contextContent').value.trim(),
                category: document.getElementById('contextCategory').value.trim(),
                priority: parseInt(document.getElementById('contextPriority').value) || 0,
                enabled: document.getElementById('contextEnabled').checked
            };
            
            try {
                const url = id ? '/manage/context/' + id : '/manage/context';
                const method = id ? 'PUT' : 'POST';
                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    closeContextModal();
                    loadContext();
                } else {
                    const err = await res.json();
                    alert('保存失败: ' + (err.error || '未知错误'));
                }
            } catch (e) {
                alert('保存出错: ' + e.message);
            }
        }

        async function deleteContext(id) {
            if (!confirm('确定要删除这条前言吗？')) return;
            try {
                const res = await fetch('/manage/context/' + id, { method: 'DELETE' });
                if (res.ok) {
                    loadContext();
                } else {
                    alert('删除失败');
                }
            } catch (e) {
                alert('删除出错');
            }
        }

        // 初始化
        loadStats();
        loadConfig();
        loadKnowledgeBase();
        loadUnanswered();
        loadContext();
    </script>
</body>
</html>`;

// 请求处理主函数
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
      return await getConfigApi(env);
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
  
  if (path === '/manage/export') {
    return await exportKnowledgeData(env);
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
  
  if (path === '/manage/unanswered') {
    if (request.method === 'GET') {
      return await getUnanswered(env);
    }
  }
  
  if (path === '/manage/gaps') {
    if (request.method === 'GET') {
      return await analyzeKnowledgeGaps(env);
    }
  }
  
  if (path === '/manage/context') {
    if (request.method === 'GET') {
      return await getAllContext(env);
    }
    if (request.method === 'POST') {
      return await addContext(request, env);
    }
  }
  
  const contextMatch = path.match(/^\/manage\/context\/(\d+)$/);
  if (contextMatch) {
    const id = parseInt(contextMatch[1]);
    if (request.method === 'GET') {
      return await getContext(id, env);
    }
    if (request.method === 'PUT') {
      return await updateContext(id, request, env);
    }
    if (request.method === 'DELETE') {
      return await deleteContext(id, env);
    }
  }
  
  if (path === '/manage' || path === '/manage/') {
    return new Response(adminHtml, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }

  // 查看最近消息（调试用）
  if (path === '/debug/messages') {
    return await getRecentMessages(env);
  }
  
  // 查看统计数据（调试用）
  if (path === '/debug/stats') {
    return await getDebugStats(env);
  }
  
  // 根路径重定向到管理界面
  if (path === '/' || path === '') {
    return new Response(adminHtml, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }

  return new Response('Not Found: ' + path, { status: 404 });
}

function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// 获取配置 - 每次都从数据库读取
async function getConfig(env) {
  try {
    const config = await env.DB.prepare('SELECT * FROM bot_config WHERE id = 1').first();
    if (config) {
      return {
        botEnabled: config.bot_enabled === 1,
        onlyMentioned: config.only_mentioned === 1,
        useAIClassifier: config.use_ai_classifier === 1,
        useAIAnswer: config.use_ai_answer === 1,
        similarityThreshold: config.similarity_threshold || 0.6,
        maxContextItems: config.max_context_items || 5,
        aiDailyLimit: config.ai_daily_limit || 100
      };
    } else {
      return {
        botEnabled: true,
        onlyMentioned: false,
        useAIClassifier: true,
        useAIAnswer: true,
        similarityThreshold: 0.6,
        maxContextItems: 5,
        aiDailyLimit: 100
      };
    }
  } catch (error) {
    console.error('getConfig error:', error);
    return {
      botEnabled: true,
      onlyMentioned: false,
      useAIClassifier: true,
      useAIAnswer: true,
      similarityThreshold: 0.6,
      maxContextItems: 5,
      aiDailyLimit: 100
    };
  }
}

// API 获取配置
async function getConfigApi(env) {
  try {
    const config = await env.DB.prepare('SELECT * FROM bot_config WHERE id = 1').first();
    if (config) {
      return jsonResponse({
        botEnabled: config.bot_enabled === 1,
        onlyMentioned: config.only_mentioned === 1,
        useAIClassifier: config.use_ai_classifier === 1,
        useAIAnswer: config.use_ai_answer === 1,
        similarityThreshold: config.similarity_threshold || 0.6,
        maxContextItems: config.max_context_items || 5,
        aiDailyLimit: config.ai_daily_limit || 100
      });
    } else {
      return jsonResponse({
        botEnabled: true,
        onlyMentioned: false,
        useAIClassifier: true,
        useAIAnswer: true,
        similarityThreshold: 0.6,
        maxContextItems: 5,
        aiDailyLimit: 100
      });
    }
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function saveConfig(request, env) {
  try {
    const body = await request.json();
    const { botEnabled, onlyMentioned, useAIClassifier, useAIAnswer, similarityThreshold, maxContextItems, aiDailyLimit } = body;
    
    await env.DB.prepare(
      `INSERT OR REPLACE INTO bot_config 
       (id, bot_enabled, only_mentioned, use_ai_classifier, use_ai_answer, similarity_threshold, max_context_items, ai_daily_limit, updated_at) 
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).bind(
      botEnabled ? 1 : 0,
      onlyMentioned ? 1 : 0,
      useAIClassifier !== false ? 1 : 0,
      useAIAnswer !== false ? 1 : 0,
      similarityThreshold || 0.6,
      maxContextItems || 5,
      aiDailyLimit || 100
    ).run();
    
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

// Telegram Webhook 处理
async function handleTelegramWebhook(request, env) {
  try {
    const update = await request.json();
    console.log('Webhook received:', JSON.stringify(update));
    
    if (!update.message) {
      console.log('No message in update');
      return new Response('OK', { status: 200 });
    }
    
    const message = update.message;
    const chatId = message.chat.id;
    const chatType = message.chat.type;
    const messageText = message.text || '';
    const userId = message.from.id;
    const userName = message.from.username || message.from.first_name || 'Unknown';
    
    console.log('Processing message:', { chatId, chatType, messageText, userId, userName });
    
    if (!messageText.trim()) {
      console.log('Empty message');
      return new Response('OK', { status: 200 });
    }
    
    // 异步记录消息
    env.DB.prepare(
      'INSERT INTO messages (chat_id, user_id, user_name, message, chat_type) VALUES (?, ?, ?, ?, ?)'
    ).bind(chatId, userId, userName, messageText, chatType).run().catch(() => {});
    
    // 获取配置
    const config = await getConfig(env);
    console.log('Config:', config);
    
    if (!config.botEnabled) {
      console.log('Bot disabled');
      return new Response('OK', { status: 200 });
    }
    
    // 检查是否被@（简化处理，不调用 getBotInfo）
    const isMentioned = messageText.includes('@') || chatType === 'private';
    
    if (config.onlyMentioned && !isMentioned && chatType !== 'private') {
      return new Response('OK', { status: 200 });
    }
    
    // 移除 @用户名
    let cleanText = messageText.replace(/@\w+/g, '').trim();
    
    // 步骤1：AI意图识别
    let shouldAnswer = false;
    
    if (config.useAIClassifier !== false) {
      try {
        const classification = await classifyIntent(env, cleanText, config);
        console.log('Classification result:', classification);
        shouldAnswer = classification.shouldAnswer;
      } catch (aiError) {
        console.error('AI classification failed:', aiError);
        shouldAnswer = true;
      }
    } else {
      shouldAnswer = true;
    }
    
    if (!shouldAnswer) {
      console.log('Should not answer based on classification, recording unanswered');
      // 记录未回答问题（AI判断不需要回答的）
      try {
        await env.DB.prepare(
          'INSERT INTO unanswered (chat_id, user_id, user_name, message, chat_type, ai_classified) VALUES (?, ?, ?, ?, ?, 1)'
        ).bind(chatId, userId, userName, cleanText, chatType).run();
        console.log('Unanswered question recorded successfully');
      } catch (err) {
        console.error('Failed to record unanswered question:', err);
      }
      return new Response('OK', { status: 200 });
    }
    
    // 步骤2：在知识库中搜索最匹配的问题
    console.log('Searching knowledge base for:', cleanText);
    const matches = await findBestMatches(env, cleanText, config.maxContextItems || 5);
    console.log('Matches found:', matches.length, 'Best similarity:', matches[0]?.similarity);
    console.log('Threshold:', config.similarityThreshold || 0.6);
    
    if (matches.length > 0 && matches[0].similarity >= (config.similarityThreshold || 0.6)) {
      console.log('Match found, preparing to send response');
      console.log('Sending response with similarity:', matches[0].similarity);
      let responseText;
      let answerType;
      
      if (config.useAIAnswer !== false && matches[0].similarity < 0.7) {
        // 使用AI生成答案
        responseText = await generateAIAnswer(env, cleanText, matches, config);
        answerType = 'ai';
      } else {
        // 直接使用知识库答案
        responseText = matches[0].answer;
        answerType = 'kb';
      }
      
      // 发送消息
      console.log('Preparing to send message to Telegram');
      console.log('Chat ID:', chatId);
      console.log('Response text length:', responseText.length);
      console.log('Bot token exists:', !!env.TELEGRAM_BOT_TOKEN);
      const sendResult = await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, responseText, message.message_id);
      console.log('Send result:', sendResult);
      
      // 同步记录（确保数据写入）
      try {
        const today = new Date().toISOString().split('T')[0];
        await env.DB.prepare(
          'INSERT INTO bot_stats (date, answers_today, total_answers) VALUES (?, 1, 1) ON CONFLICT(date) DO UPDATE SET answers_today = answers_today + 1, total_answers = total_answers + 1'
        ).bind(today).run();
        console.log('Stats updated successfully');
        
        await recordAnswer(env, chatId, userId, userName, cleanText, responseText, answerType, matches[0].similarity);
        console.log('Answer recorded successfully');
      } catch (err) {
        console.error('Record error:', err);
      }
    } else {
      console.log('No match found or similarity too low, recording unanswered');
      // 记录未回答问题
      try {
        await env.DB.prepare(
          'INSERT INTO unanswered (chat_id, user_id, user_name, message, chat_type, ai_classified) VALUES (?, ?, ?, ?, ?, 1)'
        ).bind(chatId, userId, userName, cleanText, chatType).run();
        console.log('Unanswered question recorded successfully (no match)');
      } catch (err) {
        console.error('Failed to record unanswered question (no match):', err);
      }
    }
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('OK', { status: 200 });
  }
}

// AI意图分类 - 从数据库获取关键词
async function classifyIntent(env, message, config) {
  try {
    const messageLower = message.toLowerCase();
    
    // 从数据库获取所有关键词
    const result = await env.DB.prepare(
      "SELECT DISTINCT keywords FROM knowledge_questions WHERE enabled = 1 AND keywords IS NOT NULL AND keywords != ''"
    ).all();
    
    // 合并所有关键词
    const allKeywords = [];
    (result.results || []).forEach(row => {
      if (row.keywords) {
        const keywords = row.keywords.split(',').map(k => k.trim()).filter(k => k);
        allKeywords.push(...keywords);
      }
    });
    
    // 去重
    const uniqueKeywords = [...new Set(allKeywords)];
    
    // 检查消息是否包含任何关键词
    const hasQuickMatch = uniqueKeywords.some(w => messageLower.includes(w.toLowerCase()));
    
    if (hasQuickMatch) {
      return { shouldAnswer: true, intent: 'quick_match', confidence: 0.8 };
    }
    
    // 没有关键词匹配，但仍然让流程继续到相似度匹配阶段
    // 返回 true 让 findBestMatches 来决定是否回答
    return { shouldAnswer: true, intent: 'no_keyword_match', confidence: 0.5 };
  } catch (error) {
    console.error('AI classification error:', error);
    // 出错时让流程继续，由相似度匹配决定
    return { shouldAnswer: true, intent: 'error_fallback', confidence: 0.5 };
  }
}

// 在知识库中查找最佳匹配
async function findBestMatches(env, query, maxResults = 5) {
  try {
    const queryLower = query.toLowerCase();
    console.log('findBestMatches called with query:', query);
    
    // 直接从数据库查询
    const result = await env.DB.prepare(
      'SELECT kq.id, kq.question, kq.answer_id, kq.keywords, qa.answer FROM knowledge_questions kq JOIN knowledge_answers qa ON kq.answer_id = qa.id WHERE kq.enabled = 1 AND qa.enabled = 1'
    ).all();
    
    const allQuestions = result.results || [];
    console.log('Total questions in DB:', allQuestions.length);
    
    if (allQuestions.length === 0) {
      console.log('No questions found in database');
      return [];
    }
    
    // 快速路径：直接匹配
    for (const item of allQuestions) {
      if (item.question.toLowerCase() === queryLower) {
        return [{ ...item, similarity: 1.0 }];
      }
    }
    
    // 计算相似度
    const scored = allQuestions.map(item => {
      const similarity = calculateSimilarity(query, item.question, item.keywords);
      return { ...item, similarity };
    });
    
    scored.sort((a, b) => b.similarity - a.similarity);
    
    // 去重
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
  const queryLower = query.toLowerCase().trim();
  const questionLower = question.toLowerCase().trim();
  
  // 忽略过短的查询（如单个标点符号）
  if (queryLower.length <= 1) return 0;
  
  if (queryLower === questionLower) return 1.0;
  
  // 检查是否包含查询词（但查询词不能太短）
  if (queryLower.length >= 2) {
    if (questionLower.includes(queryLower)) return 0.9;
    if (queryLower.includes(questionLower) && questionLower.length >= 3) return 0.9;
  }
  
  if (keywords) {
    const keywordList = keywords.toLowerCase().split(',').map(k => k.trim()).filter(k => k);
    for (const keyword of keywordList) {
      if (keyword.length >= 2 && queryLower.includes(keyword)) {
        return 0.85;
      }
    }
  }
  
  // 计算编辑距离相似度
  const maxLen = Math.max(query.length, question.length);
  if (maxLen === 0) return 1.0;
  
  const distance = levenshteinDistance(queryLower, questionLower);
  const similarity = 1 - distance / maxLen;
  
  // 对于非常短的查询，降低相似度权重
  if (queryLower.length <= 3 && similarity > 0.5) {
    return similarity * 0.5;
  }
  
  return similarity;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

// AI生成答案
async function generateAIAnswer(env, userQuestion, matches, config) {
  try {
    console.log('generateAIAnswer called, similarity:', matches[0].similarity);
    
    // 高相似度直接返回答案
    if (matches[0].similarity >= 0.7) {
      console.log('High similarity, skipping AI');
      return matches[0].answer;
    }
    
    // 检查AI配额
    const today = new Date().toISOString().split('T')[0];
    const aiCallsResult = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM ai_calls WHERE DATE(created_at) = DATE('now')"
    ).first();
    
    console.log('AI calls today:', aiCallsResult?.count, 'Limit:', config.aiDailyLimit);
    
    if ((aiCallsResult?.count || 0) >= (config.aiDailyLimit || 100)) {
      console.log('AI daily limit reached');
      return matches[0].answer;
    }
    
    // 获取前言内容
    const contextResult = await env.DB.prepare(
      'SELECT title, content FROM knowledge_context WHERE enabled = 1 ORDER BY priority DESC, id ASC LIMIT 5'
    ).all();
    
    const contextContents = contextResult.results || [];
    const contextText = contextContents.map(c => `【${c.title}】\n${c.content}`).join('\n\n');
    
    // 构建知识库上下文
    const kbContext = matches.slice(0, 2).map((m, i) => {
      return `参考${i + 1}：\n问题：${m.question}\n答案：${m.answer}`;
    }).join('\n\n');
    
    // 如果AI不可用，直接返回知识库答案
    if (!env.AI) {
      console.log('AI not available (env.AI is falsy)');
      return matches[0].answer;
    }
    console.log('AI is available, proceeding with AI call');
    
    let systemPrompt;
    if (contextText) {
      systemPrompt = `你是客服助手。根据以下背景知识和知识库回答用户问题，简洁准确。\n\n背景知识：\n${contextText}\n\n知识库：\n${kbContext}`;
    } else {
      systemPrompt = `你是客服助手。根据知识库回答用户问题，简洁准确。\n\n知识库：\n${kbContext}`;
    }

    try {
      const response = await env.AI.run('@cf/meta/llama-3.2-1b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuestion }
        ],
        temperature: 0.3,
        max_tokens: 200
      });
      
      // 记录AI调用
      console.log('Recording AI call to database...');
      try {
        const insertResult = await env.DB.prepare(
          'INSERT INTO ai_calls (chat_id, user_id, message, intent, confidence) VALUES (?, ?, ?, ?, ?)'
        ).bind(0, 0, userQuestion, 'answer_generation', 0.9).run();
        console.log('AI call recorded successfully, result:', insertResult);
      } catch (err) {
        console.error('Failed to record AI call:', err);
      }
      
      return response.response?.trim() || matches[0].answer;
    } catch (aiError) {
      console.error('AI answer generation error:', aiError);
      return matches[0].answer;
    }
  } catch (error) {
    console.error('Generate AI answer error:', error);
    return matches[0].answer;
  }
}

// 发送Telegram消息
async function sendTelegramMessage(botToken, chatId, text, replyToMessageId) {
  try {
    const url = 'https://api.telegram.org/bot' + botToken + '/sendMessage';
    const payload = { chat_id: chatId, text: text };
    if (replyToMessageId) payload.reply_to_message_id = replyToMessageId;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Send message error:', error);
    return false;
  }
}

// 获取最近消息（调试用）
async function getRecentMessages(env) {
  try {
    const messages = await env.DB.prepare(
      'SELECT * FROM messages ORDER BY created_at DESC LIMIT 20'
    ).all();
    
    const unanswered = await env.DB.prepare(
      'SELECT * FROM unanswered ORDER BY created_at DESC LIMIT 10'
    ).all();
    
    return jsonResponse({
      messages: messages.results || [],
      unanswered: unanswered.results || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

// 获取Bot信息
async function getBotInfo(botToken) {
  try {
    const response = await fetch('https://api.telegram.org/bot' + botToken + '/getMe');
    return await response.json();
  } catch (e) {
    return null;
  }
}

// 记录回答
async function recordAnswer(env, chatId, userId, userName, question, answer, answerType, similarity) {
  try {
    await env.DB.prepare(
      'INSERT INTO answers (chat_id, user_id, user_name, question, answer, answer_type, similarity) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(chatId, userId, userName, question, answer, answerType, similarity).run();
  } catch (e) {
    console.error('Record answer error:', e);
  }
}

// 获取统计
async function getStats(env) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const [kbResult, todayResult, aiCallsResult, totalAiCalls] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) as count FROM knowledge_answers WHERE enabled = 1').first(),
      env.DB.prepare('SELECT answers_today FROM bot_stats WHERE date = ?').bind(today).first(),
      env.DB.prepare('SELECT COUNT(*) as count FROM ai_calls WHERE DATE(created_at) = ?').bind(today).first(),
      env.DB.prepare('SELECT COUNT(*) as count FROM ai_calls').first()
    ]);
    
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

// 调试统计
async function getDebugStats(env) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const [botStats, answers] = await Promise.all([
      env.DB.prepare('SELECT * FROM bot_stats ORDER BY date DESC LIMIT 5').all(),
      env.DB.prepare('SELECT * FROM answers ORDER BY created_at DESC LIMIT 5').all()
    ]);
    
    return jsonResponse({
      today: today,
      botStats: botStats.results || [],
      recentAnswers: answers.results || []
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

// 导出知识库数据
async function exportKnowledgeData(env) {
  try {
    const result = await env.DB.prepare(`
      SELECT 
        ka.id,
        ka.answer,
        ka.category,
        ka.keywords,
        GROUP_CONCAT(kq.question, '|') as questions
      FROM knowledge_answers ka
      LEFT JOIN knowledge_questions kq ON ka.id = kq.answer_id AND kq.enabled = 1
      WHERE ka.enabled = 1
      GROUP BY ka.id
      ORDER BY ka.id
    `).all();
    
    const exportData = (result.results || []).map(row => ({
      answer: row.answer,
      category: row.category,
      keywords: row.keywords,
      questions: row.questions ? row.questions.split('|') : []
    }));
    
    return jsonResponse(exportData);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

// 获取所有知识
async function getAllKnowledge(env) {
  try {
    const result = await env.DB.prepare(`
      SELECT 
        ka.id, 
        ka.answer, 
        ka.category, 
        ka.keywords,
        kq.question
      FROM knowledge_answers ka
      LEFT JOIN knowledge_questions kq ON ka.id = kq.answer_id AND kq.enabled = 1
      WHERE ka.enabled = 1
      ORDER BY ka.id DESC, kq.id ASC
    `).all();
    
    const answerMap = new Map();
    for (const row of (result.results || [])) {
      if (!answerMap.has(row.id)) {
        answerMap.set(row.id, {
          id: row.id,
          answer: row.answer,
          category: row.category,
          keywords: row.keywords,
          questions: []
        });
      }
      if (row.question) {
        answerMap.get(row.id).questions.push(row.question);
      }
    }
    
    return jsonResponse(Array.from(answerMap.values()));
  } catch (error) {
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
    
    // 输入验证
    if (answer.length > 2000) {
      return jsonResponse({ error: 'answer too long (max 2000 chars)' }, 400);
    }
    if (questions.length > 50) {
      return jsonResponse({ error: 'too many questions (max 50)' }, 400);
    }
    
    await env.DB.prepare(
      'INSERT INTO knowledge_answers (answer, category, keywords) VALUES (?, ?, ?)'
    ).bind(answer, category || '', keywords || '').run();
    
    const lastIdResult = await env.DB.prepare('SELECT last_insert_rowid() as id').first();
    const answerId = lastIdResult?.id;
    
    if (!answerId) {
      return jsonResponse({ error: 'Failed to get answer ID' }, 500);
    }
    
    for (const question of questions) {
      if (question.trim()) {
        await env.DB.prepare(
          'INSERT INTO knowledge_questions (answer_id, question, keywords) VALUES (?, ?, ?)'
        ).bind(answerId, question.trim(), keywords || '').run();
      }
    }
    
    return jsonResponse({ success: true, id: answerId });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function updateKnowledge(id, request, env) {
  try {
    const body = await request.json();
    const { answer, questions, category, keywords } = body;
    
    await env.DB.prepare(
      'UPDATE knowledge_answers SET answer = ?, category = ?, keywords = ? WHERE id = ?'
    ).bind(answer, category, keywords, id).run();
    
    await env.DB.prepare('DELETE FROM knowledge_questions WHERE answer_id = ?').bind(id).run();
    
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
    await env.DB.prepare('DELETE FROM knowledge_questions WHERE answer_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM knowledge_answers WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

// 前言内容管理
async function getAllContext(env) {
  try {
    const items = await env.DB.prepare(
      'SELECT id, title, content, category, priority, enabled, created_at FROM knowledge_context ORDER BY priority DESC, id ASC'
    ).all();
    return jsonResponse(items.results || []);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function getContext(id, env) {
  try {
    const item = await env.DB.prepare(
      'SELECT id, title, content, category, priority, enabled FROM knowledge_context WHERE id = ?'
    ).bind(id).first();
    if (item) {
      return jsonResponse(item);
    }
    return jsonResponse({ error: 'Not found' }, 404);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function addContext(request, env) {
  try {
    const body = await request.json();
    const { title, content, category, priority, enabled } = body;
    
    if (!title || !content) {
      return jsonResponse({ error: '标题和内容不能为空' }, 400);
    }
    
    if (title.length > 200) {
      return jsonResponse({ error: '标题过长（最多200字符）' }, 400);
    }
    if (content.length > 5000) {
      return jsonResponse({ error: '内容过长（最多5000字符）' }, 400);
    }
    
    const result = await env.DB.prepare(
      'INSERT INTO knowledge_context (title, content, category, priority, enabled) VALUES (?, ?, ?, ?, ?)'
    ).bind(title, content, category || '', priority || 0, enabled !== false ? 1 : 0).run();
    
    return jsonResponse({ success: true, id: result.meta?.last_row_id });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function updateContext(id, request, env) {
  try {
    const body = await request.json();
    const { title, content, category, priority, enabled } = body;
    
    await env.DB.prepare(
      'UPDATE knowledge_context SET title = ?, content = ?, category = ?, priority = ?, enabled = ? WHERE id = ?'
    ).bind(title, content, category || '', priority || 0, enabled !== false ? 1 : 0, id).run();
    
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function deleteContext(id, env) {
  try {
    await env.DB.prepare('DELETE FROM knowledge_context WHERE id = ?').bind(id).run();
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

// 分析知识缺口
async function analyzeKnowledgeGaps(env) {
  try {
    const items = await env.DB.prepare(
      'SELECT message, COUNT(*) as count FROM unanswered GROUP BY message ORDER BY count DESC LIMIT 20'
    ).all();
    
    const gaps = (items.results || []).map(item => ({
      message: item.message,
      count: item.count,
      suggestion: '添加回答：' + item.message
    }));
    
    return jsonResponse({ gaps });
  } catch (error) {
    return jsonResponse({ gaps: [] });
  }
}
