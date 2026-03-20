// Telegram 智能知识库机器人
// v4.11.0 - 添加用户权限系统
// 移除全局变量缓存，适配 Cloudflare Workers 执行模型

export default {
  async fetch(request, env, ctx) {
    return await handleRequest(request, env);
  }
};

// 登录页面
const loginHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>登录 - Telegram 知识库机器人</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .dark body {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        }
    </style>
</head>
<body class="flex items-center justify-center p-4">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
                <i class="fas fa-robot text-3xl text-blue-600 dark:text-blue-400"></i>
            </div>
            <h1 class="text-2xl font-bold text-gray-800 dark:text-white">Telegram 知识库机器人</h1>
            <p class="text-gray-500 dark:text-gray-400 mt-2">请登录以访问管理面板</p>
        </div>
        
        <form id="loginForm" class="space-y-6">
            <div>
                <label class="block text-gray-700 dark:text-gray-300 mb-2">用户名</label>
                <div class="relative">
                    <i class="fas fa-user absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input type="text" id="username" required
                        class="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="请输入用户名">
                </div>
            </div>
            
            <div>
                <label class="block text-gray-700 dark:text-gray-300 mb-2">密码</label>
                <div class="relative">
                    <i class="fas fa-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input type="password" id="password" required
                        class="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="请输入密码">
                </div>
            </div>
            
            <div id="errorMsg" class="hidden text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <i class="fas fa-exclamation-circle mr-2"></i><span id="errorText"></span>
            </div>
            
            <button type="submit" id="loginBtn"
                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center">
                <i class="fas fa-sign-in-alt mr-2"></i>登录
            </button>
        </form>
        
        <div class="mt-6 text-center text-gray-500 dark:text-gray-400 text-sm">
            <p><i class="fas fa-info-circle mr-1"></i>普通用户: user / user</p>
            <p class="mt-1"><i class="fas fa-shield-alt mr-1"></i>管理员: admin / 请联系管理员</p>
        </div>
    </div>
    
    <script>
        // 初始化主题
        if (localStorage.getItem('darkMode') === 'true') {
            document.documentElement.classList.add('dark');
        }
        
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const loginBtn = document.getElementById('loginBtn');
            const errorMsg = document.getElementById('errorMsg');
            const errorText = document.getElementById('errorText');
            
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>登录中...';
            errorMsg.classList.add('hidden');
            
            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await res.json();
                
                if (res.ok && data.success) {
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('userRole', data.role);
                    localStorage.setItem('username', data.username);
                    window.location.href = '/manage';
                } else {
                    errorText.textContent = data.error || '登录失败';
                    errorMsg.classList.remove('hidden');
                }
            } catch (err) {
                errorText.textContent = '网络错误，请重试';
                errorMsg.classList.remove('hidden');
            }
            
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>登录';
        });
    </script>
</body>
</html>`;

// HTML 管理界面
const adminHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Telegram 知识库机器人管理</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        /* 深色模式样式 */
        .dark body {
            background-color: #1a1a2e;
            color: #e0e0e0;
        }
        .dark .bg-white {
            background-color: #16213e !important;
        }
        .dark .bg-gray-50 {
            background-color: #1a1a2e !important;
        }
        .dark .bg-gray-100 {
            background-color: #1a1a2e !important;
        }
        .dark .text-gray-500 {
            color: #a0a0a0 !important;
        }
        .dark .text-gray-600 {
            color: #b0b0b0 !important;
        }
        .dark .text-gray-700 {
            color: #c0c0c0 !important;
        }
        .dark .text-gray-800 {
            color: #d0d0d0 !important;
        }
        .dark .text-gray-900 {
            color: #e0e0e0 !important;
        }
        .dark .border {
            border-color: #2d3748 !important;
        }
        .dark .border-b {
            border-color: #2d3748 !important;
        }
        .dark input, .dark textarea {
            background-color: #1a1a2e;
            color: #e0e0e0;
            border-color: #2d3748;
        }
        .dark input::placeholder, .dark textarea::placeholder {
            color: #666;
        }
        /* 平滑过渡 */
        body, .bg-white, .bg-gray-50, .bg-gray-100 {
            transition: background-color 0.3s ease, color 0.3s ease;
        }
    </style>
</head>
<body class="bg-gray-100">
    <div class="container mx-auto px-3 py-4 md:px-4 md:py-8 max-w-6xl">
        <!-- 用户信息栏 -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 p-3 flex justify-between items-center">
            <div class="flex items-center gap-2">
                <i class="fas fa-user-circle text-2xl text-blue-500"></i>
                <div>
                    <span class="font-medium text-gray-800 dark:text-white" id="currentUsername">-</span>
                    <span class="ml-2 text-xs px-2 py-0.5 rounded" id="userRoleBadge">-</span>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="toggleTheme()" id="themeToggle" class="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1.5 md:px-3 md:py-2 rounded-lg transition text-sm" title="切换主题">
                    <i class="fas fa-moon" id="themeIcon"></i>
                </button>
                <button onclick="logout()" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition text-sm">
                    <i class="fas fa-sign-out-alt mr-1"></i>退出
                </button>
            </div>
        </div>
        
        <!-- 移动端优化后的头部 -->
        <div class="flex justify-between items-center mb-4 md:mb-8">
            <div class="flex items-center gap-2">
                <button onclick="toggleMobileMenu()" class="sm:hidden bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg transition" title="菜单">
                    <i class="fas fa-bars"></i>
                </button>
            </div>
            <h1 class="text-lg sm:text-xl md:text-3xl font-bold text-center text-blue-600 flex-1 px-2">
                <i class="fas fa-robot mr-1 md:mr-2"></i><span class="hidden sm:inline">Telegram 知识库机器人管理</span><span class="sm:hidden">TG机器人</span>
            </h1>
            <div class="flex items-center gap-2">
            </div>
        </div>
        
        <!-- 移动端导航菜单 -->
        <div id="mobileMenu" class="hidden sm:hidden mb-4 bg-white dark:bg-gray-800 rounded-lg shadow p-3">
            <div class="grid grid-cols-2 gap-2 text-sm">
                <a href="#config" onclick="scrollToSection('config'); return false;" class="admin-only p-2 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                    <i class="fas fa-cog mr-1"></i>配置
                </a>
                <a href="#context" onclick="scrollToSection('context'); return false;" class="p-2 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                    <i class="fas fa-book-open mr-1"></i>前言
                </a>
                <a href="#knowledge" onclick="scrollToSection('knowledge'); return false;" class="p-2 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                    <i class="fas fa-database mr-1"></i>知识库
                </a>
                <a href="#unanswered" onclick="scrollToSection('unanswered'); return false;" class="p-2 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                    <i class="fas fa-question-circle mr-1"></i>未回答
                </a>
                <a href="#stats" onclick="scrollToSection('stats'); return false;" class="admin-only p-2 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                    <i class="fas fa-chart-bar mr-1"></i>统计
                </a>
                <a href="#logs" onclick="scrollToSection('logs'); return false;" class="admin-only p-2 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                    <i class="fas fa-history mr-1"></i>日志
                </a>
            </div>
        </div>
        
        <!-- 统计信息 -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
            <div class="bg-white rounded-lg shadow p-3 md:p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500 text-xs md:text-sm">知识库条目</p>
                        <p class="text-lg md:text-2xl font-bold text-blue-600" id="kbCount">-</p>
                    </div>
                    <i class="fas fa-database text-xl md:text-3xl text-blue-200"></i>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow p-3 md:p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500 text-xs md:text-sm">今日回答</p>
                        <p class="text-lg md:text-2xl font-bold text-green-600" id="todayAnswers">-</p>
                    </div>
                    <i class="fas fa-comments text-xl md:text-3xl text-green-200"></i>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow p-3 md:p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500 text-xs md:text-sm">今日AI调用</p>
                        <p class="text-lg md:text-2xl font-bold text-purple-600" id="aiCalls">-</p>
                    </div>
                    <i class="fas fa-brain text-xl md:text-3xl text-purple-200"></i>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow p-3 md:p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500 text-xs md:text-sm hidden md:block">AI消耗 ( neurons )</p>
                        <p class="text-gray-500 text-xs md:hidden">AI消耗</p>
                        <p class="text-lg md:text-2xl font-bold text-orange-600" id="aiUsage">-</p>
                    </div>
                    <i class="fas fa-coins text-xl md:text-3xl text-orange-200"></i>
                </div>
            </div>
        </div>

        <!-- 配置面板 -->
        <div id="config" class="admin-only bg-white rounded-lg shadow mb-4 md:mb-8">
            <div class="p-4 md:p-6 border-b">
                <h2 class="text-lg md:text-xl font-semibold"><i class="fas fa-cog mr-2"></i>机器人配置</h2>
            </div>
            <div class="p-4 md:p-6">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div>
                        <label class="flex items-center space-x-2 md:space-x-3 cursor-pointer">
                            <input type="checkbox" id="botEnabled" class="w-4 h-4 md:w-5 md:h-5 text-blue-600 rounded">
                            <span class="text-gray-700 text-sm md:text-base">启用机器人</span>
                        </label>
                    </div>
                    <div>
                        <label class="flex items-center space-x-2 md:space-x-3 cursor-pointer">
                            <input type="checkbox" id="onlyMentioned" class="w-4 h-4 md:w-5 md:h-5 text-blue-600 rounded">
                            <span class="text-gray-700 text-sm md:text-base">仅当被@时回复</span>
                        </label>
                    </div>
                    <div>
                        <label class="flex items-center space-x-2 md:space-x-3 cursor-pointer">
                            <input type="checkbox" id="useAIClassifier" class="w-4 h-4 md:w-5 md:h-5 text-blue-600 rounded" checked>
                            <span class="text-gray-700 text-sm md:text-base">使用AI意图分类</span>
                        </label>
                    </div>
                    <div>
                        <label class="flex items-center space-x-2 md:space-x-3 cursor-pointer">
                            <input type="checkbox" id="useAIAnswer" class="w-4 h-4 md:w-5 md:h-5 text-blue-600 rounded" checked>
                            <span class="text-gray-700 text-sm md:text-base">使用AI生成答案</span>
                        </label>
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">相似度阈值 (0.0-1.0)</label>
                        <input type="number" id="similarityThreshold" min="0" max="1" step="0.1" value="0.6" class="w-full px-3 py-1.5 md:px-4 md:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base">
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">AI每日限额 (10-500)</label>
                        <input type="number" id="aiDailyLimit" min="10" max="500" value="100" class="w-full px-3 py-1.5 md:px-4 md:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base">
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">最大参考知识数 (1-10)</label>
                        <input type="number" id="maxContextItems" min="1" max="10" value="5" class="w-full px-3 py-1.5 md:px-4 md:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base">
                    </div>
                </div>
                <button onclick="saveConfig()" class="mt-4 md:mt-6 bg-blue-500 hover:bg-blue-600 text-white px-4 md:px-6 py-2 rounded-lg transition text-sm md:text-base">
                    <i class="fas fa-save mr-1 md:mr-2"></i>保存配置
                </button>
            </div>
        </div>

        <!-- 前言内容管理 -->
        <div id="context" class="bg-white rounded-lg shadow mb-4 md:mb-8">
            <div class="p-4 md:p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                <h2 class="text-lg md:text-xl font-semibold"><i class="fas fa-book-open mr-2"></i>前言/背景知识管理</h2>
                <button onclick="showContextModal()" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition text-sm md:text-base">
                    <i class="fas fa-plus mr-1 md:mr-2"></i>添加前言
                </button>
            </div>
            <div class="p-4 md:p-6">
                <div id="contextList" class="space-y-3 md:space-y-4"></div>
            </div>
        </div>



        <!-- 知识库管理 -->
        <div id="knowledge" class="bg-white rounded-lg shadow mb-4 md:mb-8">
            <div class="p-4 md:p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                <h2 class="text-lg md:text-xl font-semibold"><i class="fas fa-book mr-2"></i>知识库管理</h2>
                <div class="flex flex-wrap gap-1.5 md:gap-2">
                    <button onclick="checkDuplicates()" class="bg-orange-500 hover:bg-orange-600 text-white px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg transition text-xs md:text-sm">
                        <i class="fas fa-search mr-1"></i><span class="hidden sm:inline">查重</span>
                    </button>
                    <button onclick="exportKnowledge()" class="bg-blue-500 hover:bg-blue-600 text-white px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg transition text-xs md:text-sm">
                        <i class="fas fa-file-export mr-1"></i><span class="hidden sm:inline">导出</span>
                    </button>
                    <button onclick="showBatchImportModal()" class="bg-purple-500 hover:bg-purple-600 text-white px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg transition text-xs md:text-sm">
                        <i class="fas fa-file-import mr-1"></i><span class="hidden sm:inline">导入</span>
                    </button>
                    <button onclick="showKnowledgeModal()" class="bg-green-500 hover:bg-green-600 text-white px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg transition text-xs md:text-sm">
                        <i class="fas fa-plus mr-1"></i><span class="hidden sm:inline">添加知识</span>
                    </button>
                </div>
            </div>
            <div class="p-4 md:p-6">
                <div class="mb-3 md:mb-4">
                    <input type="text" id="searchKb" placeholder="搜索知识库..." class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div id="kbList" class="space-y-3 md:space-y-4 max-h-64 md:max-h-96 overflow-y-auto pr-2"></div>
            </div>
        </div>

        <!-- 未回答问题 -->
        <div id="unanswered" class="bg-white rounded-lg shadow mb-4 md:mb-8">
            <div class="p-4 md:p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                <h2 class="text-lg md:text-xl font-semibold"><i class="fas fa-question-circle mr-2"></i>未回答问题</h2>
                <button onclick="loadUnanswered()" class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition text-sm md:text-base">
                    <i class="fas fa-sync mr-1 md:mr-2"></i>刷新
                </button>
            </div>
            <div class="p-4 md:p-6">
                <div id="unansweredList" class="space-y-2 max-h-48 md:max-h-64 overflow-y-auto pr-2"></div>
            </div>
        </div>

        <!-- 数据统计图表 -->
        <div id="stats" class="admin-only bg-white rounded-lg shadow mb-4 md:mb-8">
            <div class="p-4 md:p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                <h2 class="text-lg md:text-xl font-semibold"><i class="fas fa-chart-bar mr-2"></i>数据统计</h2>
                <button onclick="loadCharts()" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition text-sm md:text-base">
                    <i class="fas fa-sync mr-1 md:mr-2"></i>刷新
                </button>
            </div>
            <div class="p-4 md:p-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    <div>
                        <h3 class="text-sm md:text-base font-medium text-gray-700 mb-2 md:mb-3">近7日问答趋势</h3>
                        <div class="relative h-48 md:h-64">
                            <canvas id="trendChart"></canvas>
                        </div>
                    </div>
                    <div>
                        <h3 class="text-sm md:text-base font-medium text-gray-700 mb-2 md:mb-3">热门问题 TOP5</h3>
                        <div class="relative h-48 md:h-64">
                            <canvas id="hotQuestionsChart"></canvas>
                        </div>
                    </div>
                </div>
                <div class="mt-4 md:mt-6">
                    <h3 class="text-sm md:text-base font-medium text-gray-700 mb-2 md:mb-3">AI 调用 vs 知识库匹配</h3>
                    <div class="relative h-40 md:h-48">
                        <canvas id="sourceChart"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <!-- 知识缺口分析 -->
        <div id="gaps" class="bg-white rounded-lg shadow mb-4 md:mb-8">
            <div class="p-4 md:p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                <h2 class="text-lg md:text-xl font-semibold"><i class="fas fa-chart-line mr-2"></i>知识缺口分析</h2>
                <button onclick="analyzeGaps()" class="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition text-sm md:text-base">
                    <i class="fas fa-search mr-1 md:mr-2"></i>分析缺口
                </button>
            </div>
            <div class="p-4 md:p-6">
                <div id="gapsContainer" class="space-y-3 md:space-y-4"></div>
            </div>
        </div>

        <!-- 操作日志 -->
        <div id="logs" class="admin-only bg-white rounded-lg shadow">
            <div class="p-4 md:p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                <h2 class="text-lg md:text-xl font-semibold"><i class="fas fa-history mr-2"></i>操作日志</h2>
                <div class="flex gap-2">
                    <select id="logFilter" onchange="loadOperationLogs()" class="px-2 py-1 border rounded text-sm">
                        <option value="">全部类型</option>
                        <option value="add">添加</option>
                        <option value="update">修改</option>
                        <option value="delete">删除</option>
                        <option value="config">配置</option>
                    </select>
                    <button onclick="loadOperationLogs()" class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition text-sm md:text-base">
                        <i class="fas fa-sync mr-1"></i>刷新
                    </button>
                </div>
            </div>
            <div class="p-4 md:p-6">
                <div id="operationLogsList" class="space-y-2 max-h-64 overflow-y-auto pr-2">
                    <div class="text-center py-8 text-gray-500">加载中...</div>
                </div>
            </div>
        </div>
    </div>

    <!-- 前言编辑模态框 -->
    <div id="contextModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50 p-2 sm:p-4">
        <div class="bg-white rounded-lg p-4 sm:p-6 md:p-8 max-w-2xl w-full mx-0 sm:mx-4 max-h-[95vh] sm:max-h-screen overflow-y-auto">
            <h3 class="text-lg sm:text-xl font-semibold mb-3 sm:mb-4" id="contextModalTitle">添加前言</h3>
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
                    <label class="block text-gray-700 mb-1 sm:mb-2 text-sm sm:text-base">分类</label>
                    <input type="text" id="contextCategory" class="w-full px-3 py-1.5 sm:px-4 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base">
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                        <label class="block text-gray-700 mb-1 sm:mb-2 text-sm sm:text-base">优先级</label>
                        <input type="number" id="contextPriority" value="0" class="w-full px-3 py-1.5 sm:px-4 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base">
                    </div>
                    <div class="flex items-center">
                        <label class="flex items-center space-x-2 sm:space-x-3 cursor-pointer mt-0 sm:mt-6">
                            <input type="checkbox" id="contextEnabled" class="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 rounded" checked>
                            <span class="text-gray-700 text-sm sm:text-base">启用</span>
                        </label>
                    </div>
                </div>
            </div>
            <div class="mt-4 sm:mt-6 flex justify-end space-x-2 sm:space-x-3">
                <button onclick="closeContextModal()" class="px-3 py-1.5 sm:px-4 sm:py-2 border rounded-lg hover:bg-gray-100 text-sm sm:text-base">取消</button>
                <button onclick="saveContext()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base">保存</button>
            </div>
        </div>
    </div>

    <!-- 知识编辑模态框 -->
    <div id="knowledgeModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50 p-2 sm:p-4">
        <div class="bg-white rounded-lg p-4 sm:p-6 md:p-8 max-w-2xl w-full mx-0 sm:mx-4 max-h-[95vh] sm:max-h-screen overflow-y-auto">
            <h3 class="text-lg sm:text-xl font-semibold mb-3 sm:mb-4" id="modalTitle">添加知识</h3>
            <input type="hidden" id="editAnswerId">
            <div class="space-y-3 sm:space-y-4">
                <div>
                    <label class="block text-gray-700 mb-1 sm:mb-2 text-sm sm:text-base">答案内容（每行一个，机器人会随机选择一个回复）</label>
                    <textarea id="answer" rows="3" sm:rows="4" placeholder="本服无白名单。&#10;哪里来的白名单。你给我啊？&#10;没有白名单这个东西。" class="w-full px-3 py-1.5 sm:px-4 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"></textarea>
                </div>
                <div>
                    <label class="block text-gray-700 mb-1 sm:mb-2 text-sm sm:text-base">问题变体（每行一个）</label>
                    <textarea id="questions" rows="4" sm:rows="6" placeholder="怎么联系客服？
客服电话是多少？
如何联系你们？" class="w-full px-3 py-1.5 sm:px-4 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"></textarea>
                </div>
                <div>
                    <label class="block text-gray-700 mb-1 sm:mb-2 text-sm sm:text-base">分类</label>
                    <input type="text" id="category" class="w-full px-3 py-1.5 sm:px-4 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base">
                </div>
                <div>
                    <label class="block text-gray-700 mb-1 sm:mb-2 text-sm sm:text-base">关键词（逗号分隔，用于快速匹配）</label>
                    <input type="text" id="keywords" placeholder="客服,电话,联系" class="w-full px-3 py-1.5 sm:px-4 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base">
                </div>
            </div>
            <div class="mt-4 sm:mt-6 flex justify-end space-x-2 sm:space-x-3">
                <button onclick="closeKnowledgeModal()" class="px-3 py-1.5 sm:px-4 sm:py-2 border rounded-lg hover:bg-gray-100 text-sm sm:text-base">取消</button>
                <button onclick="saveKnowledge()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base">保存</button>
            </div>
        </div>
    </div>

    <!-- 批量导入模态框 -->
    <div id="batchImportModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50 p-2 sm:p-4">
        <div class="bg-white rounded-lg p-4 sm:p-6 md:p-8 max-w-3xl w-full mx-0 sm:mx-4 max-h-[95vh] sm:max-h-screen overflow-y-auto">
            <h3 class="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">批量导入知识</h3>
            <div class="space-y-3 sm:space-y-4">
                <div>
                    <label class="block text-gray-700 mb-1 sm:mb-2 text-sm sm:text-base">导入格式（每行：问题1|问题2|... = 答案1||答案2||...）</label>
                    <textarea id="batchData" rows="8" sm:rows="12" placeholder="怎么联系客服|客服电话是多少|如何联系你们 = 您可以通过以下方式联系我们：电话 400-123-4567，邮箱 support@example.com
价格是多少|多少钱 = 我们的产品价格从99元起||具体价格请查看官网||可以联系客服咨询详细价格
白名单 = 本服无白名单。||哪里来的白名单。你给我啊？||没有白名单这个东西。" class="w-full px-3 py-1.5 sm:px-4 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs sm:text-sm"></textarea>
                    <p class="text-xs text-gray-500 mt-1 sm:mt-2">提示：多个答案用 || 分隔，机器人会随机选择一个回复</p>
                </div>
            </div>
            <div class="mt-4 sm:mt-6 flex justify-end space-x-2 sm:space-x-3">
                <button onclick="closeBatchImportModal()" class="px-3 py-1.5 sm:px-4 sm:py-2 border rounded-lg hover:bg-gray-100 text-sm sm:text-base">取消</button>
                <button onclick="processBatchImport()" class="bg-purple-500 hover:bg-purple-600 text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base">导入</button>
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
                    const questionsHtml = item.questions.map(q => '<span class="text-xs bg-blue-100 text-blue-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded inline-block mb-1">' + escapeHtml(q) + '</span>').join('');
                    const categoryHtml = item.category ? '<span class="text-xs bg-green-100 text-green-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded mr-1 sm:mr-2 inline-block mb-1">' + escapeHtml(item.category) + '</span>' : '';
                    // 多答案显示
                    const answers = item.answers || [item.answer];
                    const answersHtml = answers.map((a, idx) => '<div class="text-xs sm:text-sm text-gray-600 mt-1 bg-gray-50 p-1.5 sm:p-2 rounded"><span class="text-xs text-gray-400">[' + (idx + 1) + ']</span> ' + escapeHtml(a) + '</div>').join('');
                    const answerCountBadge = answers.length > 1 ? '<span class="text-xs bg-purple-100 text-purple-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ml-1 sm:ml-2 inline-block mb-1">' + answers.length + '个答案</span>' : '';
                    return '<div class="border rounded-lg p-2.5 sm:p-4 hover:bg-gray-50">' +
                        '<div class="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-2 sm:gap-0">' +
                            '<div class="flex-1 w-full sm:w-auto">' +
                                '<div class="mb-1 sm:mb-2">' + categoryHtml + questionsHtml + answerCountBadge + '</div>' +
                                '<div class="mt-1 sm:mt-2">' + answersHtml + '</div>' +
                            '</div>' +
                            '<div class="flex sm:ml-4 space-x-2 sm:space-x-2 self-end sm:self-start">' +
                                '<button onclick="editKnowledge(' + item.id + ')" class="text-blue-500 hover:text-blue-700 p-1"><i class="fas fa-edit text-sm sm:text-base"></i></button>' +
                                '<button onclick="deleteKnowledge(' + item.id + ')" class="text-red-500 hover:text-red-700 p-1"><i class="fas fa-trash text-sm sm:text-base"></i></button>' +
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
                answers: document.getElementById('answer').value.split('\\n').map(a => a.trim()).filter(a => a),
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
                // 支持多答案，用换行分隔
                const answers = data.answers || [data.answer];
                document.getElementById('answer').value = answers.join('\\n');
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
                    // 支持多答案，用 || 分隔
                    const answers = parts[1].split('||').map(a => a.trim()).filter(a => a);
                    if (questions.length > 0 && answers.length > 0) {
                        try {
                            const res = await fetch('/manage/knowledge', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ answers, questions })
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
                    return '<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-2 sm:p-3 bg-gray-50 rounded gap-2 sm:gap-0">' +
                        '<div class="flex-1 w-full sm:w-auto min-w-0">' +
                            '<div class="font-medium text-gray-900 text-sm sm:text-base break-words">' + escapeHtml(item.message) + '</div>' +
                            '<div class="text-xs sm:text-sm text-gray-500">' + (item.beijing_time ? item.beijing_time.replace('T', ' ').substring(0, 19) : '') + '</div>' +
                        '</div>' +
                        '<button onclick="quickAddKnowledge(' + JSON.stringify(item.message).replace(/"/g, '&quot;') + ')" class="sm:ml-4 text-blue-500 hover:text-blue-700 text-xs sm:text-sm whitespace-nowrap flex items-center">' +
                            '<i class="fas fa-plus mr-1"></i><span class="hidden sm:inline">添加知识</span><span class="sm:hidden">添加</span>' +
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
                
                // 查找重复的答案（支持多答案）
                const answerMap = new Map();
                data.forEach(item => {
                    // 获取所有答案（支持answers数组或answer字符串）
                    const answers = item.answers || [item.answer];
                    answers.forEach(ans => {
                        if (!ans) return;
                        const key = ans.toLowerCase().trim();
                        if (answerMap.has(key)) {
                            // 避免重复添加同一个item
                            const alreadyAdded = duplicates.find(d => 
                                d.current.id === item.id && d.type === 'answer'
                            );
                            if (!alreadyAdded) {
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
                });
                
                currentDuplicates = duplicates; // 保存查重结果
                
                if (duplicates.length === 0) {
                    list.innerHTML = '<div class="text-center py-4 text-green-600"><i class="fas fa-check-circle text-xl"></i><p>没有发现重复内容</p></div>';
                    return;
                }
                
                // 显示重复内容，添加全选和批量删除按钮
                let html = '<div class="mb-3 sm:mb-4 p-3 sm:p-4 bg-orange-50 border-l-4 border-orange-400">' +
                    '<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">' +
                        '<div>' +
                            '<p class="font-medium text-orange-800 text-sm sm:text-base">发现 ' + duplicates.length + ' 个重复项</p>' +
                            '<p class="text-xs sm:text-sm text-orange-600">勾选要删除的项，然后点击批量删除</p>' +
                        '</div>' +
                        '<div class="flex space-x-2">' +
                            '<button onclick="toggleSelectAll()" class="bg-gray-500 hover:bg-gray-600 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm">' +
                                '<i class="fas fa-check-square mr-1"></i>全选' +
                            '</button>' +
                            '<button onclick="batchDeleteDuplicates()" class="bg-red-500 hover:bg-red-600 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm">' +
                                '<i class="fas fa-trash mr-1"></i>批量删除' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>';
                
                html += duplicates.map((dup, index) => {
                    return '<div class="border rounded-lg p-2.5 sm:p-4 mb-3 sm:mb-4 bg-red-50 duplicate-item" data-id="' + dup.current.id + '">' +
                        '<div class="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-2 sm:gap-0 mb-1 sm:mb-2">' +
                            '<div class="flex items-start flex-1 w-full sm:w-auto">' +
                                '<input type="checkbox" class="duplicate-checkbox mt-1 mr-2 sm:mr-3 w-4 h-4 text-red-600 rounded flex-shrink-0" value="' + dup.current.id + '">' +
                                '<div class="flex-1 min-w-0">' +
                                    '<div class="text-xs sm:text-sm text-red-600 font-medium mb-1">重复 #' + (index + 1) + '</div>' +
                                    '<div class="text-xs sm:text-sm text-gray-800 mb-1 break-words"><span class="text-gray-500">问题：</span>' + escapeHtml(dup.question || dup.current.questions[0]) + '</div>' +
                                    '<div class="text-xs sm:text-sm text-gray-800 mb-1 break-words"><span class="text-gray-500">答案：</span>' + escapeHtml(dup.current.answer.substring(0, 50)) + (dup.current.answer.length > 50 ? '...' : '') + '</div>' +
                                    '<div class="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">与以下条目重复：</div>' +
                                    '<div class="text-xs sm:text-sm text-gray-800 pl-2 sm:pl-4 border-l-2 border-gray-300 break-words">' + escapeHtml(dup.existing.questions[0]) + '</div>' +
                                '</div>' +
                            '</div>' +
                            '<button onclick="deleteDuplicate(' + dup.current.id + ')" class="sm:ml-4 bg-red-500 hover:bg-red-600 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm self-end sm:self-start flex items-center">' +
                                '<i class="fas fa-trash mr-1"></i><span class="hidden sm:inline">删除</span>' +
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
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
            modal.innerHTML = '<div class="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-0 sm:mx-4">' +
                '<h3 class="text-base sm:text-lg font-semibold mb-3 sm:mb-4">删除中...</h3>' +
                '<div class="w-full bg-gray-200 rounded-full h-3 sm:h-4 mb-2">' +
                    '<div id="progressBar" class="bg-red-500 h-3 sm:h-4 rounded-full transition-all duration-300" style="width: 0%"></div>' +
                '</div>' +
                '<div class="flex justify-between text-xs sm:text-sm text-gray-600">' +
                    '<span id="progressText">0 / ' + total + '</span>' +
                    '<span id="progressPercent">0%</span>' +
                '</div>' +
                '<div id="progressDetails" class="mt-2 text-xs sm:text-sm text-gray-500 max-h-24 sm:max-h-32 overflow-y-auto"></div>' +
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
                            '<div class="flex flex-col gap-2 ml-4">' +
                                '<button onclick="quickAddKnowledge(' + JSON.stringify(gap.message).replace(/"/g, '&quot;') + ')" class="text-blue-500 hover:text-blue-700" title="添加知识">' +
                                    '<i class="fas fa-plus"></i>' +
                                '</button>' +
                                '<button onclick="adoptGap(' + JSON.stringify(gap.message).replace(/"/g, '&quot;') + ')" class="text-green-500 hover:text-green-700" title="采纳">' +
                                    '<i class="fas fa-check"></i>' +
                                '</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
                }).join('');
            } catch (e) {
                container.innerHTML = '<div class="text-center py-4 text-red-500">分析失败：' + e.message + '</div>';
            }
        }

        // 采纳知识缺口
        async function adoptGap(message) {
            if (!confirm('确定要采纳这个问题吗？采纳后将从知识缺口分析中移除。')) {
                return;
            }
            
            try {
                const res = await fetch('/manage/gaps/adopt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: message })
                });
                
                if (res.ok) {
                    analyzeGaps();
                    loadUnanswered();
                } else {
                    alert('采纳失败');
                }
            } catch (e) {
                alert('采纳出错: ' + e.message);
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
                    return '<div class="border rounded-lg p-2.5 sm:p-4 ' + (item.enabled ? 'bg-white' : 'bg-gray-100') + '">' +
                        '<div class="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-2 sm:gap-0">' +
                            '<div class="flex-1 w-full sm:w-auto min-w-0">' +
                                '<div class="flex flex-wrap items-center gap-1 sm:gap-2 mb-1 sm:mb-2">' +
                                    '<span class="font-medium text-gray-900 text-sm sm:text-base">' + escapeHtml(item.title) + '</span>' +
                                    (item.category ? '<span class="text-xs bg-gray-100 text-gray-600 px-1.5 sm:px-2 py-0.5 rounded">' + escapeHtml(item.category) + '</span>' : '') +
                                    (!item.enabled ? '<span class="text-xs bg-red-100 text-red-600 px-1.5 sm:px-2 py-0.5 rounded">已禁用</span>' : '') +
                                '</div>' +
                                '<div class="text-xs sm:text-sm text-gray-600 line-clamp-2">' + escapeHtml(item.content) + '</div>' +
                            '</div>' +
                            '<div class="flex sm:ml-4 space-x-2 self-end sm:self-start">' +
                                '<button onclick="editContext(' + item.id + ')" class="text-blue-500 hover:text-blue-700 p-1"><i class="fas fa-edit text-sm sm:text-base"></i></button>' +
                                '<button onclick="deleteContext(' + item.id + ')" class="text-red-500 hover:text-red-700 p-1"><i class="fas fa-trash text-sm sm:text-base"></i></button>' +
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

        // 图表实例
        let trendChartInstance = null;
        let hotQuestionsChartInstance = null;
        let sourceChartInstance = null;

        // 加载图表数据
        async function loadCharts() {
            try {
                const res = await fetch('/manage/charts');
                const data = await res.json();
                
                renderTrendChart(data.trend);
                renderHotQuestionsChart(data.hotQuestions);
                renderSourceChart(data.sourceStats);
            } catch (e) {
                console.error('Load charts error:', e);
            }
        }

        // 渲染趋势图
        function renderTrendChart(trendData) {
            const ctx = document.getElementById('trendChart').getContext('2d');
            const isDark = document.documentElement.classList.contains('dark');
            const textColor = isDark ? '#e0e0e0' : '#666';
            const gridColor = isDark ? '#2d3748' : '#e5e7eb';
            
            if (trendChartInstance) {
                trendChartInstance.destroy();
            }
            
            trendChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: trendData.dates,
                    datasets: [{
                        label: '回答数',
                        data: trendData.counts,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            ticks: { color: textColor },
                            grid: { color: gridColor }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1, color: textColor },
                            grid: { color: gridColor }
                        }
                    }
                }
            });
        }

        // 渲染热门问题图
        function renderHotQuestionsChart(hotQuestions) {
            const ctx = document.getElementById('hotQuestionsChart').getContext('2d');
            const isDark = document.documentElement.classList.contains('dark');
            const textColor = isDark ? '#e0e0e0' : '#666';
            const gridColor = isDark ? '#2d3748' : '#e5e7eb';
            
            if (hotQuestionsChartInstance) {
                hotQuestionsChartInstance.destroy();
            }
            
            const labels = hotQuestions.map((q, i) => 'TOP' + (i + 1));
            const data = hotQuestions.map(q => q.count);
            
            hotQuestionsChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '提问次数',
                        data: data,
                        backgroundColor: [
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(249, 115, 22, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(16, 185, 129, 0.8)',
                            'rgba(59, 130, 246, 0.8)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                title: function(context) {
                                    const idx = context[0].dataIndex;
                                    return hotQuestions[idx]?.question?.substring(0, 20) + '...' || '';
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: textColor },
                            grid: { color: gridColor }
                        },
                        y: { 
                            beginAtZero: true, 
                            ticks: { stepSize: 1, color: textColor },
                            grid: { color: gridColor }
                        }
                    }
                }
            });
        }

        // 渲染来源统计图
        function renderSourceChart(sourceStats) {
            const ctx = document.getElementById('sourceChart').getContext('2d');
            const isDark = document.documentElement.classList.contains('dark');
            const textColor = isDark ? '#e0e0e0' : '#666';
            
            if (sourceChartInstance) {
                sourceChartInstance.destroy();
            }
            
            const total = sourceStats.ai + sourceStats.knowledgeBase;
            
            sourceChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['AI生成', '知识库'],
                    datasets: [{
                        data: [sourceStats.ai, sourceStats.knowledgeBase],
                        backgroundColor: [
                            'rgba(139, 92, 246, 0.8)',
                            'rgba(16, 185, 129, 0.8)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: textColor,
                                generateLabels: function(chart) {
                                    const data = chart.data;
                                    return data.labels.map(function(label, i) {
                                        const count = data.datasets[0].data[i];
                                        const percent = total > 0 ? Math.round(count / total * 100) : 0;
                                        return {
                                            text: label + ': ' + count + ' (' + percent + '%)',
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            hidden: false,
                                            index: i
                                        };
                                    });
                                }
                            }
                        }
                    }
                }
            });
        }

        // 用户权限控制
        let currentUserRole = 'user';
        
        function checkAuth() {
            const token = localStorage.getItem('authToken');
            const role = localStorage.getItem('userRole');
            const username = localStorage.getItem('username');
            
            if (!token) {
                window.location.href = '/login';
                return false;
            }
            
            currentUserRole = role || 'user';
            
            // 更新用户信息显示
            document.getElementById('currentUsername').textContent = username || '未知用户';
            const roleBadge = document.getElementById('userRoleBadge');
            if (currentUserRole === 'admin') {
                roleBadge.textContent = '管理员';
                roleBadge.className = 'ml-2 text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            } else {
                roleBadge.textContent = '普通用户';
                roleBadge.className = 'ml-2 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            }
            
            // 应用权限控制
            applyPermissions();
            return true;
        }
        
        function applyPermissions() {
            const adminElements = document.querySelectorAll('.admin-only');
            if (currentUserRole !== 'admin') {
                adminElements.forEach(function(el) {
                    el.style.display = 'none';
                });
            } else {
                adminElements.forEach(function(el) {
                    el.style.display = '';
                });
            }
        }
        
        function logout() {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userRole');
            localStorage.removeItem('username');
            window.location.href = '/login';
        }

        // 主题切换功能
        function initTheme() {
            const savedTheme = localStorage.getItem('theme') || 'light';
            const html = document.documentElement;
            const icon = document.getElementById('themeIcon');
            
            if (savedTheme === 'dark') {
                html.classList.add('dark');
                icon.className = 'fas fa-sun';
            } else {
                html.classList.remove('dark');
                icon.className = 'fas fa-moon';
            }
        }
        
        function toggleTheme() {
            const html = document.documentElement;
            const icon = document.getElementById('themeIcon');
            const isDark = html.classList.toggle('dark');
            
            if (isDark) {
                localStorage.setItem('theme', 'dark');
                icon.className = 'fas fa-sun';
            } else {
                localStorage.setItem('theme', 'light');
                icon.className = 'fas fa-moon';
            }
            
            // 更新图表主题
            updateChartsTheme(isDark);
        }
        
        // 更新图表主题色
        function updateChartsTheme(isDark) {
            const textColor = isDark ? '#e0e0e0' : '#666';
            const gridColor = isDark ? '#2d3748' : '#e5e7eb';
            
            [trendChartInstance, hotQuestionsChartInstance, sourceChartInstance].forEach(function(chart) {
                if (chart) {
                    chart.options.plugins.legend.labels.color = textColor;
                    if (chart.options.scales.x) {
                        chart.options.scales.x.ticks.color = textColor;
                        chart.options.scales.x.grid.color = gridColor;
                    }
                    if (chart.options.scales.y) {
                        chart.options.scales.y.ticks.color = textColor;
                        chart.options.scales.y.grid.color = gridColor;
                    }
                    chart.update();
                }
            });
        }

        // 加载操作日志
        async function loadOperationLogs() {
            try {
                const filter = document.getElementById('logFilter').value;
                const res = await fetch('/manage/logs');
                let logs = await res.json();
                
                // 过滤
                if (filter) {
                    logs = logs.filter(function(log) {
                        return log.operation_type.indexOf(filter) !== -1;
                    });
                }
                
                const list = document.getElementById('operationLogsList');
                
                if (logs.length === 0) {
                    list.innerHTML = '<div class="text-center py-8 text-gray-500">暂无操作日志</div>';
                    return;
                }
                
                list.innerHTML = logs.map(function(log) {
                    const typeColors = {
                        'add': 'bg-green-100 text-green-800',
                        'update': 'bg-blue-100 text-blue-800',
                        'delete': 'bg-red-100 text-red-800',
                        'config': 'bg-purple-100 text-purple-800'
                    };
                    const typeNames = {
                        'add': '添加',
                        'update': '修改',
                        'delete': '删除',
                        'config': '配置'
                    };
                    const colorClass = typeColors[log.operation_type] || 'bg-gray-100 text-gray-800';
                    const typeName = typeNames[log.operation_type] || log.operation_type;
                    
                    return '<div class="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded text-xs sm:text-sm">' +
                        '<span class="px-1.5 sm:px-2 py-0.5 rounded text-xs ' + colorClass + ' flex-shrink-0">' + typeName + '</span>' +
                        '<div class="flex-1 min-w-0">' +
                            '<div class="font-medium text-gray-900 break-words">' + escapeHtml(log.operation_desc) + '</div>' +
                            (log.details ? '<div class="text-gray-500 mt-0.5 break-words">' + escapeHtml(log.details) + '</div>' : '') +
                            '<div class="text-gray-400 text-xs mt-1">' + new Date(log.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) + '</div>' +
                        '</div>' +
                    '</div>';
                }).join('');
            } catch (e) {
                document.getElementById('operationLogsList').innerHTML = '<div class="text-center py-8 text-red-500">加载失败</div>';
            }
        }

        // 移动端菜单切换
        function toggleMobileMenu() {
            const menu = document.getElementById('mobileMenu');
            menu.classList.toggle('hidden');
        }
        
        // 滚动到指定区域
        function scrollToSection(sectionId) {
            const element = document.getElementById(sectionId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // 关闭移动端菜单
                document.getElementById('mobileMenu').classList.add('hidden');
            }
        }

        // 下拉刷新支持（移动端）
        let touchStartY = 0;
        let touchEndY = 0;
        const minSwipeDistance = 100;
        
        document.addEventListener('touchstart', function(e) {
            touchStartY = e.changedTouches[0].screenY;
        }, false);
        
        document.addEventListener('touchend', function(e) {
            touchEndY = e.changedTouches[0].screenY;
            handleSwipe();
        }, false);
        
        function handleSwipe() {
            const swipeDistance = touchEndY - touchStartY;
            // 只有在页面顶部下拉时才刷新
            if (swipeDistance > minSwipeDistance && window.scrollY === 0) {
                // 显示刷新提示
                const refreshIndicator = document.createElement('div');
                refreshIndicator.id = 'refreshIndicator';
                refreshIndicator.className = 'fixed top-0 left-0 right-0 bg-blue-500 text-white text-center py-2 z-50 text-sm';
                refreshIndicator.innerHTML = '<i class="fas fa-sync fa-spin mr-2"></i>刷新中...';
                document.body.appendChild(refreshIndicator);
                
                // 刷新所有数据
                Promise.all([
                    loadStats(),
                    loadKnowledgeBase(),
                    loadUnanswered(),
                    loadContext(),
                    loadCharts(),
                    loadOperationLogs()
                ]).then(function() {
                    setTimeout(function() {
                        const indicator = document.getElementById('refreshIndicator');
                        if (indicator) {
                            indicator.remove();
                        }
                    }, 500);
                });
            }
        }
        
        // 添加触摸反馈样式
        const touchFeedbackStyle = document.createElement('style');
        touchFeedbackStyle.textContent = '.touch-feedback:active { transform: scale(0.98); opacity: 0.9; } button, .clickable { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }';
        document.head.appendChild(touchFeedbackStyle);

        // 初始化
        if (!checkAuth()) {
            // 未登录，会自动跳转到登录页面
        } else {
            initTheme();
            loadStats();
            if (currentUserRole === 'admin') {
                loadConfig();
            }
            loadKnowledgeBase();
            loadUnanswered();
            loadContext();
            if (currentUserRole === 'admin') {
                loadCharts();
                loadOperationLogs();
            }
        }
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
  
  // 登录页面
  if (path === '/login' && request.method === 'GET') {
    return new Response(loginHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  
  // 登录 API
  if (path === '/api/login' && request.method === 'POST') {
    return await handleLogin(request, env);
  }
  
  // 管理页面 - 需要验证 token
  if (path === '/manage' && request.method === 'GET') {
    return new Response(adminHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  
  if (request.method === 'POST' && path === '/webhook') {
    return await handleTelegramWebhook(request, env);
  }
  
  if (request.method === 'GET' && path === '/manage/stats') {
    return await getStats(env);
  }

  if (request.method === 'GET' && path === '/manage/charts') {
    return await getChartData(env);
  }

  if (request.method === 'GET' && path === '/manage/logs') {
    return await getOperationLogs(env);
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
      return await deleteKnowledge(id, env, request);
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
  
  // 采纳知识缺口（标记为已处理）
  if (path === '/manage/gaps/adopt' && request.method === 'POST') {
    return await adoptGap(request, env);
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
  
  // 根路径重定向到登录页面
  if (path === '/' || path === '') {
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/login' }
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

// 登录处理
async function handleLogin(request, env) {
  try {
    const body = await request.json();
    const { username, password } = body;
    
    // 从环境变量获取密码
    const adminPassword = env.ADMIN_TOKEN || 'admin';
    const userPassword = env.USER_TOKEN || 'user';
    
    // 验证用户
    if (username === 'admin' && password === adminPassword) {
      const token = 'admin_' + Date.now() + '_' + Math.random().toString(36).substring(2);
      return jsonResponse({
        success: true,
        token: token,
        role: 'admin',
        username: 'admin'
      });
    } else if (username === 'user' && password === userPassword) {
      const token = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2);
      return jsonResponse({
        success: true,
        token: token,
        role: 'user',
        username: 'user'
      });
    } else {
      return jsonResponse({
        success: false,
        error: '用户名或密码错误'
      }, 401);
    }
  } catch (error) {
    return jsonResponse({
      success: false,
      error: '登录请求处理失败'
    }, 500);
  }
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
        similarityThreshold: config.similarity_threshold !== undefined && config.similarity_threshold !== null ? config.similarity_threshold : 0.6,
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
        similarityThreshold: config.similarity_threshold !== undefined && config.similarity_threshold !== null ? config.similarity_threshold : 0.6,
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
      similarityThreshold !== undefined && similarityThreshold !== null ? similarityThreshold : 0.6,
      maxContextItems || 5,
      aiDailyLimit || 100
    ).run();
    
    // 记录操作日志
    const configChanges = [];
    if (botEnabled !== undefined) configChanges.push('机器人: ' + (botEnabled ? '启用' : '禁用'));
    if (similarityThreshold !== undefined) configChanges.push('相似度: ' + similarityThreshold);
    if (aiDailyLimit !== undefined) configChanges.push('AI限额: ' + aiDailyLimit);
    await logOperation(env, 'config', '修改配置', configChanges.join(', '), request);
    
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
    
    // 检查是否为日常对话（不需要记录和回答）
    if (isCasualChat(cleanText)) {
      console.log('Casual chat detected, skipping processing');
      return new Response('OK', { status: 200 });
    }
    
    // 检查是否为刷屏消息（10秒内重复5次以上）
    const isSpam = await isSpamMessage(env, cleanText, chatId);
    if (isSpam) {
      console.log('Spam message detected, skipping processing');
      return new Response('OK', { status: 200 });
    }
    
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
    const threshold = config.similarityThreshold !== undefined && config.similarityThreshold !== null ? config.similarityThreshold : 0.6;
    console.log('Threshold:', threshold);
    
    if (matches.length > 0 && matches[0].similarity >= threshold) {
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
      
      // 添加个性化称呼
      responseText = addPersonalizedGreeting(responseText, userName);
      
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
    
    // 快速路径：直接匹配（收集所有完全匹配的答案）
    const exactMatches = [];
    for (const item of allQuestions) {
      if (item.question.toLowerCase() === queryLower) {
        exactMatches.push({ ...item, similarity: 1.0 });
      }
    }
    
    // 如果有完全匹配，随机选择一个
    if (exactMatches.length > 0) {
      console.log('Found', exactMatches.length, 'exact matches, selecting randomly');
      const randomIndex = Math.floor(Math.random() * exactMatches.length);
      return [exactMatches[randomIndex]];
    }
    
    // 计算相似度
    const scored = allQuestions.map(item => {
      const similarity = calculateSimilarity(query, item.question, item.keywords);
      return { ...item, similarity };
    });
    
    // 按相似度降序排序
    scored.sort((a, b) => b.similarity - a.similarity);
    
    // 获取最高相似度
    const bestSimilarity = scored[0]?.similarity || 0;
    console.log('Best similarity found:', bestSimilarity);
    
    // 返回排序后的所有结果，让主流程决定阈值
    return scored;
  } catch (error) {
    console.error('Find matches error:', error);
    return [];
  }
}

// 检查消息是否在10秒内重复出现5次以上
async function isSpamMessage(env, message, chatId) {
  const messageHash = message.toLowerCase().trim();
  const timeWindowSeconds = 10;
  const maxRepeats = 5;
  
  try {
    // 查找该消息在10秒内的记录
    const existing = await env.DB.prepare(
      `SELECT id, count, first_seen FROM message_frequency 
       WHERE message_hash = ? AND chat_id = ? 
       AND datetime(last_seen) > datetime('now', '-${timeWindowSeconds} seconds')`
    ).bind(messageHash, chatId).first();
    
    if (existing) {
      // 更新计数
      const newCount = existing.count + 1;
      await env.DB.prepare(
        `UPDATE message_frequency SET count = ?, last_seen = CURRENT_TIMESTAMP 
         WHERE id = ?`
      ).bind(newCount, existing.id).run();
      
      console.log(`Message repeat count: ${newCount}/${maxRepeats}`);
      
      // 如果超过阈值，认为是刷屏
      if (newCount >= maxRepeats) {
        console.log('Spam detected: message repeated', newCount, 'times in', timeWindowSeconds, 'seconds');
        return true;
      }
    } else {
      // 插入新记录
      await env.DB.prepare(
        `INSERT INTO message_frequency (message_hash, chat_id, count, first_seen, last_seen) 
         VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(messageHash, chatId).run();
    }
    
    return false;
  } catch (error) {
    console.error('Spam check error:', error);
    return false; // 出错时允许消息通过
  }
}

// 检查是否为日常对话（不需要记录和回答）
function isCasualChat(message) {
  const casualWords = [
    '嗯', '嗯嗯', '好的', '好', '你好', '嗨', '哈喽', 'hello', 'hi', 'hey',
    '谢谢', '多谢', '感谢', '不客气', '没事', '没关系',
    '哈哈', '嘿嘿', '呵呵', '嘻嘻', '呵呵呵', '哈哈哈',
    'ok', 'okay', '行', '可以', '没问题', '对的', '是的',
    '拜拜', '再见', 'bye', 'goodbye', 'see you',
    '在吗', '在', '不在', '在的',
    '哦', '哦哦', '知道了', '明白', '了解', '收到',
    '早安', '晚安', '早上好', '晚上好', '中午好'
  ];
  
  const messageLower = message.toLowerCase().trim();
  
  // 如果消息完全匹配日常词汇，或者是单个标点符号
  if (casualWords.includes(messageLower)) {
    return true;
  }
  
  // 如果消息只包含标点符号或空格
  if (/^[\s\p{P}]*$/u.test(messageLower)) {
    return true;
  }
  
  // 如果消息长度小于2且不是字母数字
  if (messageLower.length < 2 && !/[a-z0-9]/i.test(messageLower)) {
    return true;
  }
  
  return false;
}

function calculateSimilarity(query, question, keywords) {
  const queryLower = query.toLowerCase().trim();
  const questionLower = question.toLowerCase().trim();
  
  // 忽略过短的查询（如单个标点符号）
  if (queryLower.length <= 1) return 0;
  
  if (queryLower === questionLower) return 1.0;
  
  // 检查是否包含查询词（但查询词不能太短）
  // 降低包含匹配的相似度，避免误匹配
  if (queryLower.length >= 2) {
    // 查询完全包含问题，或问题完全包含查询
    if (questionLower.includes(queryLower)) return 0.75;
    if (queryLower.includes(questionLower) && questionLower.length >= 3) return 0.75;
  }
  
  if (keywords) {
    const keywordList = keywords.toLowerCase().split(',').map(k => k.trim()).filter(k => k);
    for (const keyword of keywordList) {
      if (keyword.length >= 2 && queryLower.includes(keyword)) {
        return 0.7;
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
    
    // 检查AI每日neurons消耗配额（免费额度10000，超过90%即9000时暂停）
    const FREE_TIER_LIMIT = 10000;
    const WARNING_THRESHOLD = 0.9; // 90%
    const MAX_DAILY_NEURONS = Math.floor(FREE_TIER_LIMIT * WARNING_THRESHOLD); // 9000
    
    const today = new Date().toISOString().split('T')[0];
    
    // 计算今日已使用的neurons
    const aiUsageResult = await env.DB.prepare(
      "SELECT COALESCE(SUM(neurons), 0) as total FROM ai_calls WHERE DATE(created_at) = DATE('now')"
    ).first();
    
    const todayNeurons = aiUsageResult?.total || 0;
    console.log('AI neurons used today:', todayNeurons, 'Limit:', MAX_DAILY_NEURONS);
    
    if (todayNeurons >= MAX_DAILY_NEURONS) {
      console.log('AI daily neurons limit reached (90% of free tier), switching to KB answers only');
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
      
      // 记录AI调用和neurons消耗
      console.log('Recording AI call to database...');
      try {
        // 估算neurons消耗（基于输入输出token）
        const inputTokens = Math.ceil((systemPrompt.length + userQuestion.length) / 4);
        const outputTokens = Math.ceil((response.response?.length || 0) / 4);
        const estimatedNeurons = Math.max(100, (inputTokens + outputTokens) * 10); // 基础100 + token消耗
        
        const insertResult = await env.DB.prepare(
          'INSERT INTO ai_calls (chat_id, user_id, message, intent, confidence, neurons) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(0, 0, userQuestion, 'answer_generation', 0.9, estimatedNeurons).run();
        console.log('AI call recorded successfully, neurons:', estimatedNeurons, 'result:', insertResult);
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

// ==================== 个性化称呼功能 ====================

// 个性化称呼词库（奶凶风格）
const NICKNAME_PREFIXES = [
  '喂，', '嘿，', '哟，', '啊，', '哼，', '啧，', '哎，', '呐，',
  '诶，', '哈，', '哇，', '嘁，', '切，', '呃，', '嗯，', '嘛，',
  '喂喂，', '嘿嘿，', '呀呀，', '哼哼，', '啧啧，', '哎呀，', '哎哟，', '我说，',
  '拜托，', '真是的，', '我的天，', '老天，', '拜托拜托，', '求你了，', '听着，', '注意啦，',
  '咳咳，', '那个，', '话说，', '讲真，', '实话说，', '老实说，', '讲真的，', '说实话，',
  '哎呀呀，', '哎嘿嘿，', '呜呼呼，', '啧啧啧，', '哼唧唧，', '气鼓鼓，', '凶巴巴，', '奶凶凶，'
];

const NICKNAME_SUFFIXES = [
  '小笨蛋', '小迷糊', '小懒虫', '小馋猫', '小淘气', '小傻瓜', '小憨憨', '小屁孩',
  '小机灵鬼', '小捣蛋', '小闹腾', '小磨人精', '小跟班', '小话痨', '小戏精', '小祖宗',
  '小冤家', '小讨债鬼', '小麻烦精', '小粘人精', '小醋坛子', '小哭包', '小懒猪', '小馋鬼',
  '小魔女', '小恶魔', '小天使', '小怪兽', '小迷糊蛋', '小糊涂虫', '小瞌睡虫', '小贪吃鬼',
  '小捣蛋鬼', '小调皮鬼', '小机灵虫', '小滑头', '小坏蛋', '小乖乖', '小宝贝蛋', '小甜心',
  '小可爱', '小萌物', '小团子', '小布丁', '小蛋糕', '小饼干', '小糖果', '小奶茶'
];

// 获取个性化称呼
function getPersonalizedNickname(userName) {
  const prefix = NICKNAME_PREFIXES[Math.floor(Math.random() * NICKNAME_PREFIXES.length)];
  const suffix = NICKNAME_SUFFIXES[Math.floor(Math.random() * NICKNAME_SUFFIXES.length)];
  return prefix + (userName || '小伙伴') + suffix;
}

// 为回答添加个性化称呼前缀（奶凶风格）
function addPersonalizedGreeting(responseText, userName) {
  const nickname = getPersonalizedNickname(userName);
  const greetings = [
    `😤 ${nickname}，听好了！`,
    `🙄 ${nickname}，这个问题还要问？`,
    `😒 ${nickname}，看清楚了：`,
    `😏 ${nickname}，这么简单都不知道？`,
    `😐 ${nickname}，给你说一次：`,
    `😑 ${nickname}，记住了啊：`,
    `🙃 ${nickname}，真是拿你没办法：`,
    `😶 ${nickname}，自己看吧：`,
    `😌 ${nickname}，让我告诉你：`,
    `🤨 ${nickname}，认真听着：`,
    `😬 ${nickname}，别走神啊：`,
    `🫤 ${nickname}，就这一次啊：`,
    `😮‍💨 ${nickname}，叹气...`,
    `🤦 ${nickname}，扶额...`,
    `😵‍💫 ${nickname}，晕...`,
    `🤐 ${nickname}，好吧好吧：`,
    `😡 ${nickname}，气死我了！`,
    `🥺 ${nickname}，求求你用用脑子吧：`,
    `😤 ${nickname}，我要生气了！`,
    `🙃 ${nickname}，你是不是故意的？`,
    `😒 ${nickname}，我怀疑你在耍我：`,
    `🤔 ${nickname}，让我想想怎么说你才能懂：`,
    `😏 ${nickname}，准备好记笔记了吗？`,
    `😐 ${nickname}，我尽量说简单点：`,
    `😌 ${nickname}，深呼吸...不生气：`,
    `🤷 ${nickname}，我也没办法了：`,
    `😅 ${nickname}，这个问题有点意思：`,
    `🙄 ${nickname}，你确定你没问过吗？`,
    `😤 ${nickname}，最后一次了啊！`,
    `😶 ${nickname}，我无语了...`,
    `🫠 ${nickname}，我的耐心正在消失：`,
    `😵 ${nickname}，被你打败了：`,
    `🤦‍♀️ ${nickname}，让我静静...`,
    `😮 ${nickname}，这你都不知道？`,
    `🙃 ${nickname}，我投降了：`,
    `😤 ${nickname}，严肃点！`,
    `🤨 ${nickname}，你认真听了吗？`,
    `😒 ${nickname}，我再说最后一遍：`,
    `🙄 ${nickname}，你是不是没睡醒？`,
    `😌 ${nickname}，慢慢说，不着急：`,
    `🤗 ${nickname}，虽然你很笨，但我还是告诉你吧：`
  ];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];

  const endings = [
    `💬 还有问题就继续问吧~`,
    `✨ 记住了没？`,
    `🎯 明白了吗？`,
    `💡 懂了吗小迷糊？`,
    `😌 这下清楚了吧？`,
    `📝 记在小本本上啊！`,
    `🤗 不客气啦~`,
    `😏 下次别再问这个了哈！`,
    `🙄 再不懂我就...我就再讲一遍！`,
    `😤 这可是最后一次了啊！`,
    `🤨 真的记住了？别骗我哦~`,
    `😒 我讲得这么清楚，再不会打你哦`,
    `🫠 我的耐心快被你耗光了...`,
    `🙃 你这个小迷糊，真拿你没办法`,
    `😮‍💨 叹气...你怎么这么笨呢`,
    `🤦 扶额...我太难了`,
    `😵 被你问得头晕...`,
    `🤐 算了算了，你自己琢磨吧`,
    `😌 终于讲完了，累死我了`,
    `🙏 求求你记住吧，别再问了`,
    `💢 哼！下次自己查！`,
    `🌟 好了好了，去玩吧小淘气`,
    `🎉 恭喜你，又学会了一个知识点！`,
    `🏃 溜了溜了，问别人去吧~`,
    `😤 记住了吗？没记住我也不管了！`,
    `🙄 我真的尽力了...`,
    `😒 你要是再忘，我就...我就哭给你看！`,
    `🤷 反正我说了，听没听随你`,
    `😅 我讲得口干舌燥，你听懂了吗？`,
    `🙃 好了好了，别再折磨我了`,
    `😌 终于解脱了...`,
    `🤗 虽然你很笨，但我还是爱你的~`,
    `😏 下次问点有难度的，这个太简单了`,
    `😐 我怀疑你在测试我的耐心`,
    `😤 最后一次！真的是最后一次！`,
    `🙄 你是不是故意来气我的？`,
    `😒 我再说一遍，这次真的最后一遍！`,
    `🫠 我的天，你怎么还在问这个`,
    `😵 被你打败了，彻底打败了`,
    `🤐 好了，我闭嘴了`,
    `😌 呼...终于说完了`,
    `🙏 拜托拜托，记住吧`,
    `💢 哼！不理你了！`,
    `🌟 乖~记住了就奖励你一颗糖`,
    `🎉 撒花~你又变聪明了一点！`,
    `🏃 拜拜了您嘞~`,
    `😤 记住了啊！下次再问我就生气了！`,
    `🙄 我真的服了你了...`,
    `😒 你要是再记不住，我就...我就...算了`,
    `🤷 随便吧，反正我说了`,
    `😅 哈哈，你是不是觉得我很凶？`,
    `🙃 好了好了，不凶你了`,
    `😌 深呼吸，不生气，不生气`,
    `🤗 抱抱~虽然你笨笨的`,
    `😏 下次记得请我吃糖哦~`,
    `😐 我说完了，你自便`,
    `😤 记住了！记住了！记住了！`,
    `🙄 你是不是在故意逗我玩？`,
    `😒 我累了，真的累了`,
    `🫠 我的耐心值：0%`,
    `😵 被你问得怀疑人生...`,
    `🤐 好了，我去静静`,
    `😌 终于结束了...`,
    `🙏 感谢收听，下次再见`,
    `💢 哼！下次问别人去！`,
    `🌟 好了，去玩吧，别烦我了`,
    `🎉 恭喜毕业！这个问题你学会了！`,
    `🏃 我溜了，你慢慢消化`
  ];
  const ending = endings[Math.floor(Math.random() * endings.length)];

  return `${greeting}\n${responseText}\n${ending}`;
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
    
    const [kbResult, todayResult, aiCallsResult, aiNeuronsResult] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) as count FROM knowledge_answers WHERE enabled = 1').first(),
      env.DB.prepare('SELECT answers_today FROM bot_stats WHERE date = ?').bind(today).first(),
      env.DB.prepare('SELECT COUNT(*) as count FROM ai_calls WHERE DATE(created_at) = DATE("now")').first(),
      env.DB.prepare('SELECT COALESCE(SUM(neurons), 0) as total FROM ai_calls WHERE DATE(created_at) = DATE("now")').first()
    ]);
    
    const todayNeurons = aiNeuronsResult?.total || 0;
    const FREE_TIER_LIMIT = 10000;
    const WARNING_THRESHOLD = 0.9;
    const MAX_DAILY_NEURONS = Math.floor(FREE_TIER_LIMIT * WARNING_THRESHOLD);
    
    return jsonResponse({
      kbCount: kbResult?.count || 0,
      todayAnswers: todayResult?.answers_today || 0,
      aiCalls: aiCallsResult?.count || 0,
      aiUsage: todayNeurons,
      aiLimit: MAX_DAILY_NEURONS,
      aiRemaining: Math.max(0, MAX_DAILY_NEURONS - todayNeurons)
    });
  } catch (error) {
    return jsonResponse({ kbCount: 0, todayAnswers: 0, aiCalls: 0, aiUsage: 0, aiLimit: 9000, aiRemaining: 9000 });
  }
}

// 获取图表数据
async function getChartData(env) {
  try {
    // 获取近7日数据
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];

    // 每日问答趋势
    const dailyStats = await env.DB.prepare(`
      SELECT date, answers_today as count 
      FROM bot_stats 
      WHERE date >= ? 
      ORDER BY date ASC
    `).bind(startDate).all();

    // 填充缺失的日期
    const dates = [];
    const counts = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const displayDate = `${d.getMonth() + 1}/${d.getDate()}`;
      dates.push(displayDate);
      
      const found = dailyStats.results?.find(r => r.date === dateStr);
      counts.push(found ? found.count : 0);
    }

    // 热门问题 TOP5
    const hotQuestions = await env.DB.prepare(`
      SELECT question, COUNT(*) as count 
      FROM answers 
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY question 
      ORDER BY count DESC 
      LIMIT 5
    `).all();

    // AI vs 知识库来源统计（近7天）
    const sourceStats = await env.DB.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN answer_type = 'ai' THEN 1 ELSE 0 END), 0) as ai_count,
        COALESCE(SUM(CASE WHEN answer_type = 'kb' THEN 1 ELSE 0 END), 0) as kb_count
      FROM answers 
      WHERE created_at >= datetime('now', '-7 days')
    `).first();

    return jsonResponse({
      trend: { dates, counts },
      hotQuestions: hotQuestions.results || [],
      sourceStats: {
        ai: sourceStats?.ai_count || 0,
        knowledgeBase: sourceStats?.kb_count || 0
      }
    });
  } catch (error) {
    console.error('Chart data error:', error);
    return jsonResponse({ 
      trend: { dates: [], counts: [] }, 
      hotQuestions: [], 
      sourceStats: { ai: 0, knowledgeBase: 0 } 
    });
  }
}

// 记录操作日志
async function logOperation(env, operationType, operationDesc, details, request) {
  try {
    const ipAddress = request?.headers?.get('CF-Connecting-IP') || '';
    const userAgent = request?.headers?.get('User-Agent') || '';
    
    await env.DB.prepare(`
      INSERT INTO operation_logs (operation_type, operation_desc, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `).bind(operationType, operationDesc, details, ipAddress, userAgent).run();
  } catch (error) {
    console.error('Log operation error:', error);
  }
}

// 获取操作日志
async function getOperationLogs(env) {
  try {
    const logs = await env.DB.prepare(`
      SELECT * FROM operation_logs 
      ORDER BY created_at DESC 
      LIMIT 100
    `).all();
    
    return jsonResponse(logs.results || []);
  } catch (error) {
    console.error('Get operation logs error:', error);
    return jsonResponse([]);
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
    
    // 合并相同问题的答案
    const questionGroups = new Map();
    for (const item of answerMap.values()) {
      const questionKey = item.questions.sort().join('|');
      if (!questionGroups.has(questionKey)) {
        questionGroups.set(questionKey, {
          ids: [],
          answers: [],
          category: item.category,
          keywords: item.keywords,
          questions: item.questions
        });
      }
      questionGroups.get(questionKey).ids.push(item.id);
      questionGroups.get(questionKey).answers.push(item.answer);
    }
    
    // 转换为最终格式
    const mergedResults = [];
    for (const group of questionGroups.values()) {
      mergedResults.push({
        id: group.ids[0], // 使用第一个ID作为主ID
        ids: group.ids,   // 保存所有ID用于编辑
        answer: group.answers.join('\\n'), // 多个答案用换行分隔显示
        answers: group.answers, // 答案数组
        category: group.category,
        keywords: group.keywords,
        questions: group.questions
      });
    }
    
    return jsonResponse(mergedResults);
  } catch (error) {
    return jsonResponse([]);
  }
}

async function getKnowledge(id, env) {
  try {
    // 获取当前答案
    const answer = await env.DB.prepare('SELECT * FROM knowledge_answers WHERE id = ?').bind(id).first();
    if (!answer) return jsonResponse({ error: 'Not found' }, 404);
    
    // 获取当前答案的问题
    const questions = await env.DB.prepare('SELECT question FROM knowledge_questions WHERE answer_id = ? AND enabled = 1').bind(id).all();
    const questionList = questions.results.map(q => q.question);
    
    // 查找所有相同问题的答案
    const allAnswers = await env.DB.prepare(`
      SELECT ka.id, ka.answer
      FROM knowledge_answers ka
      JOIN knowledge_questions kq ON ka.id = kq.answer_id
      WHERE kq.question IN (${questionList.map(() => '?').join(',')})
      AND ka.enabled = 1
      GROUP BY ka.id
    `).bind(...questionList).all();
    
    const answerList = allAnswers.results.map(a => a.answer);
    
    return jsonResponse({
      id: answer.id,
      answer: answer.answer,
      answers: answerList,
      category: answer.category,
      keywords: answer.keywords,
      questions: questionList
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function addKnowledge(request, env) {
  try {
    const body = await request.json();
    const { answers, questions, category, keywords } = body;
    
    // 兼容旧格式（单答案）
    const answerList = answers || (body.answer ? [body.answer] : []);
    
    if (!answerList || answerList.length === 0 || !questions || questions.length === 0) {
      return jsonResponse({ error: 'answers and questions are required' }, 400);
    }
    
    // 输入验证
    for (const answer of answerList) {
      if (answer.length > 2000) {
        return jsonResponse({ error: 'answer too long (max 2000 chars)' }, 400);
      }
    }
    if (questions.length > 50) {
      return jsonResponse({ error: 'too many questions (max 50)' }, 400);
    }
    
    const answerIds = [];
    
    // 为每个答案创建一条记录
    for (const answer of answerList) {
      await env.DB.prepare(
        'INSERT INTO knowledge_answers (answer, category, keywords) VALUES (?, ?, ?)'
      ).bind(answer, category || '', keywords || '').run();
      
      const lastIdResult = await env.DB.prepare('SELECT last_insert_rowid() as id').first();
      const answerId = lastIdResult?.id;
      
      if (!answerId) {
        return jsonResponse({ error: 'Failed to get answer ID' }, 500);
      }
      
      answerIds.push(answerId);
      
      // 为每个答案添加所有问题
      for (const question of questions) {
        if (question.trim()) {
          await env.DB.prepare(
            'INSERT INTO knowledge_questions (answer_id, question, keywords) VALUES (?, ?, ?)'
          ).bind(answerId, question.trim(), keywords || '').run();
        }
      }
    }
    
    // 记录操作日志
    await logOperation(env, 'add', '添加知识库条目', '问题: ' + questions.join(', ').substring(0, 100), request);
    
    return jsonResponse({ success: true, ids: answerIds });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function updateKnowledge(id, request, env) {
  try {
    const body = await request.json();
    const { answers, questions, category, keywords } = body;
    
    // 兼容旧格式（单答案）
    const answerList = answers || (body.answer ? [body.answer] : []);
    
    if (!answerList || answerList.length === 0 || !questions || questions.length === 0) {
      return jsonResponse({ error: 'answers and questions are required' }, 400);
    }
    
    // 获取该答案组的所有相关答案ID
    const existingAnswers = await env.DB.prepare(
      'SELECT id FROM knowledge_answers WHERE id = ? OR id IN (SELECT answer_id FROM knowledge_questions WHERE question IN (SELECT question FROM knowledge_questions WHERE answer_id = ?))'
    ).bind(id, id).all();
    
    const existingIds = existingAnswers.results?.map(r => r.id) || [id];
    
    // 删除所有旧的问题关联
    for (const answerId of existingIds) {
      await env.DB.prepare('DELETE FROM knowledge_questions WHERE answer_id = ?').bind(answerId).run();
    }
    
    // 删除多余的旧答案记录（保留第一个用于更新）
    for (let i = 1; i < existingIds.length; i++) {
      await env.DB.prepare('DELETE FROM knowledge_answers WHERE id = ?').bind(existingIds[i]).run();
    }
    
    // 更新第一个答案
    await env.DB.prepare(
      'UPDATE knowledge_answers SET answer = ?, category = ?, keywords = ? WHERE id = ?'
    ).bind(answerList[0], category, keywords, id).run();
    
    // 为第一个答案添加所有问题
    for (const question of questions) {
      if (question.trim()) {
        await env.DB.prepare(
          'INSERT INTO knowledge_questions (answer_id, question, keywords) VALUES (?, ?, ?)'
        ).bind(id, question.trim(), keywords || '').run();
      }
    }
    
    // 如果有更多答案，创建新的答案记录
    const answerIds = [id];
    for (let i = 1; i < answerList.length; i++) {
      await env.DB.prepare(
        'INSERT INTO knowledge_answers (answer, category, keywords) VALUES (?, ?, ?)'
      ).bind(answerList[i], category || '', keywords || '').run();
      
      const lastIdResult = await env.DB.prepare('SELECT last_insert_rowid() as id').first();
      const newAnswerId = lastIdResult?.id;
      
      if (newAnswerId) {
        answerIds.push(newAnswerId);
        // 为新答案添加所有问题
        for (const question of questions) {
          if (question.trim()) {
            await env.DB.prepare(
              'INSERT INTO knowledge_questions (answer_id, question, keywords) VALUES (?, ?, ?)'
            ).bind(newAnswerId, question.trim(), keywords || '').run();
          }
        }
      }
    }
    
    return jsonResponse({ success: true, ids: answerIds });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function deleteKnowledge(id, env, request) {
  try {
    // 获取删除前的信息用于日志
    const answerInfo = await env.DB.prepare(
      'SELECT answer FROM knowledge_answers WHERE id = ?'
    ).bind(id).first();
    
    await env.DB.prepare('DELETE FROM knowledge_questions WHERE answer_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM knowledge_answers WHERE id = ?').bind(id).run();
    
    // 记录操作日志
    await logOperation(env, 'delete', '删除知识库条目', 'ID: ' + id + (answerInfo ? ', 答案: ' + answerInfo.answer.substring(0, 50) : ''), request);
    
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

// 获取未回答问题（只显示未采纳的，最多50条）
async function getUnanswered(env) {
  try {
    const items = await env.DB.prepare(
      'SELECT *, datetime(created_at, "+8 hours") as beijing_time FROM unanswered WHERE status = 0 ORDER BY created_at DESC LIMIT 50'
    ).all();
    return jsonResponse(items.results || []);
  } catch (error) {
    return jsonResponse([]);
  }
}

// 分析知识缺口（只显示未采纳的，最多5条）
async function analyzeKnowledgeGaps(env) {
  try {
    const items = await env.DB.prepare(
      'SELECT message, COUNT(*) as count FROM unanswered WHERE status = 0 GROUP BY message ORDER BY count DESC LIMIT 5'
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

// 采纳知识缺口（标记为已处理）
async function adoptGap(request, env) {
  try {
    const body = await request.json();
    const { message } = body;
    
    if (!message) {
      return jsonResponse({ error: 'message is required' }, 400);
    }
    
    // 将所有匹配的未回答问题标记为已采纳
    await env.DB.prepare(
      'UPDATE unanswered SET status = 1 WHERE message = ? AND status = 0'
    ).bind(message).run();
    
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}
