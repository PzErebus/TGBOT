const fs = require('fs');

const original = fs.readFileSync('D:/开发/TGBOT/worker.js', 'utf8');
const v5 = fs.readFileSync('D:/开发/TGBOT/v5-new/worker.js', 'utf8');

console.log('=== 文件对比分析 ===\n');

console.log('原 worker.js:');
console.log('  行数:', original.split('\n').length);
console.log('  字符:', original.length);

console.log('\nv5-new/worker.js:');
console.log('  行数:', v5.split('\n').length);
console.log('  字符:', v5.length);

console.log('\n=== 原文件功能检查 ===');
const originalFuncs = [
    'loginHtml', 'handleLogin', 'handleRequest', 'getConfig', 'saveConfig',
    'getStats', 'getChartData', 'getAllKnowledge', 'addKnowledge', 'updateKnowledge',
    'deleteKnowledge', 'getAllContext', 'addContext', 'updateContext', 'deleteContext',
    'getUnanswered', 'analyzeKnowledgeGaps', 'getAIResponses', 'correctAIResponse',
    'ignoreAIResponse', 'exportKnowledgeData', 'getBotInfo', 'getRecentMessages'
];

console.log('\n原文件有但v5缺少的功能:');
for (const f of originalFuncs) {
    const inOrig = original.includes(f);
    const inV5 = v5.includes(f);
    if (inOrig && !inV5) {
        console.log('  ❌ 缺少: ' + f);
    } else if (inOrig && inV5) {
        console.log('  ✅ ' + f);
    }
}

console.log('\n=== v5 代码问题分析 ===');

const issues = [];

// 1. HTML被截断
if (!v5.includes('</html>')) {
    issues.push({ severity: 'high', issue: 'HTML被截断，缺少 </html> 结束标签' });
}

// 2. 缺少登录功能
if (!v5.includes('loginHtml') || !v5.includes('handleLogin')) {
    issues.push({ severity: 'high', issue: '缺少登录页面和登录API' });
}

// 3. 缺少知识库管理API
if (!v5.includes('addKnowledge') || !v5.includes('updateKnowledge') || !v5.includes('deleteKnowledge')) {
    issues.push({ severity: 'high', issue: '缺少知识库CRUD管理API' });
}

// 4. 缺少图表API
if (!v5.includes('getChartData')) {
    issues.push({ severity: 'medium', issue: '缺少图表数据API' });
}

// 5. 缺少AI回复纠正
if (!v5.includes('correctAIResponse') || !v5.includes('ignoreAIResponse')) {
    issues.push({ severity: 'medium', issue: '缺少AI回复纠正/忽略功能' });
}

// 6. 缺少操作日志
if (!v5.includes('logOperation')) {
    issues.push({ severity: 'medium', issue: '缺少操作日志记录' });
}

// 7. 缺少配置保存API
if (!v5.includes('saveConfig')) {
    issues.push({ severity: 'medium', issue: '缺少配置保存API' });
}

// 8. 缺少知识库导出
if (!v5.includes('exportKnowledge')) {
    issues.push({ severity: 'low', issue: '缺少知识库导出功能' });
}

// 9. 多轮澄清逻辑问题
if (v5.includes('detectAmbiguous') && !v5.includes('clarifyChoice')) {
    issues.push({ severity: 'medium', issue: '多轮澄清后没有处理用户选择（clarifyChoice）' });
}

// 10. 缓存命中但没更新问题
if (v5.includes('getCache') && v5.match(/if\(!followUp\)\{[^}]*getCache[^}]*\}/)) {
    // 检查是否有重复调用
    const cacheCallMatch = v5.match(/getCache\(env,clean\)/g);
    if (cacheCallMatch && cacheCallMatch.length > 1) {
        issues.push({ severity: 'low', issue: 'getCache被调用多次，可能存在冗余' });
    }
}

console.log('\n发现的问题:');
for (const { severity, issue } of issues) {
    const icon = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
    console.log(`  ${icon} [${severity.toUpperCase()}] ${issue}`);
}

console.log('\n=== 修复建议 ===');
console.log(`
1. 添加登录页面 (loginHtml) 和登录API (handleLogin)
2. 添加知识库CRUD管理API (addKnowledge, updateKnowledge, deleteKnowledge)
3. 添加配置管理API (saveConfig, getConfigApi)
4. 添加图表数据API (getChartData)
5. 添加AI回复纠正API (correctAIResponse, ignoreAIResponse)
6. 添加操作日志API
7. 补全HTML管理界面
8. 修复多轮澄清逻辑（添加clarifyChoice处理）
`);

console.log('\n=== 总结 ===');
console.log(`v5-new/worker.js 缺少 ${issues.filter(i=>i.severity==='high').length} 个高优先级功能`);
console.log(`v5-new/worker.js 缺少 ${issues.filter(i=>i.severity==='medium').length} 个中优先级功能`);
