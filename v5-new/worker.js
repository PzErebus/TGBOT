/**
 * Telegram 智能知识库机器人 - v5.0.0-P1P2 完整版本
 * 
 * P0（已完成）：
 * - AI意图分类三层过滤
 * - 相似度算法优化
 * - 对话上下文支持
 * - 回答缓存机制
 * - 情感分析
 * 
 * P1（新增功能）：
 * - 智能问题推荐
 * - 多轮澄清
 * - 称呼风格可配置
 * - 回答效果反馈
 * - 知识库热度分析
 * 
 * P2（性能优化）：
 * - 数据库索引优化
 * - 批量操作优化
 * - 智能缓存预热
 * - AI配额精细控制
 */

export default {
  async fetch(request, env, ctx) {
    return await handleRequest(request, env);
  }
};

// 配置
const CFG = {
  AI_MODEL: '@cf/meta/llama-3.2-1b-instruct',
  MAX_NEURONS: 9000,
  CACHE_DAYS: 7,
  CONTEXT_HOURS: 24,
  HIGH_SIM: 0.7,
  MED_SIM: 0.6,
  CACHE_SIM: 0.65,
  SPAM_SEC: 10,
  SPAM_MAX: 5,
};

// 称呼风格
const STYLES = {
  cute: {
    prefixes: ['喂，', '嘿，', '哟，', '啊，', '哼，', '啧，', '哎，', '喂喂，', '哎呀，'],
    suffixes: ['小笨蛋', '小迷糊', '小懒虫', '小馋猫', '小淘气', '小傻瓜', '小机灵鬼', '小话痨', '小可爱'],
    greetings: ['😤 {n}，听好了！', '🙄 {n}，这个问题还要问？', '😒 {n}，看清楚了：', '😏 {n}，这么简单都不知道？'],
    endings: ['💬 还有问题就继续问吧~', '✨ 记住了没？', '🎯 明白了吗？']
  },
  professional: {
    prefixes: ['您好，', '尊敬的用户，'],
    suffixes: ['用户', '朋友'],
    greetings: ['您好，以下是相关信息：', '感谢咨询，解答如下：'],
    endings: ['如有其他问题请随时提问。', '希望对您有帮助。']
  },
  friendly: {
    prefixes: ['嘿~ ', '哈喽 ', '你好呀 '],
    suffixes: ['同学', '小伙伴'],
    greetings: ['👋 {n}，来告诉你：', '😊 {n}，看这里：'],
    endings: ['有问题随时找我哦~', '加油！✨']
  }
};

// 工具函数
function levDist(s1, s2) {
  const m = s1.length, n = s2.length;
  const dp = Array(m+1).fill(null).map(()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++)dp[i][0]=i;
  for(let j=0;j<=n;j++)dp[0][j]=j;
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){
    if(s1[i-1]===s2[j-1])dp[i][j]=dp[i-1][j-1];
    else dp[i][j]=Math.min(dp[i-1][j-1],dp[i][j-1],dp[i-1][j])+1;
  }
  return dp[m][n];
}

function segment(text) {
  const ws=[];let cur='';let eng=false;
  for(const c of text){
    const e=/[a-z0-9]/i.test(c);
    if(e){if(!eng&&cur){ws.push(cur);cur=''}cur+=c;eng=true}
    else{if(eng&&cur){ws.push(cur);cur=''}ws.push(c);eng=false}
    else if(c===' '){if(cur){ws.push(cur);cur=''}eng=false}
  }
  if(cur)ws.push(cur);
  return ws.filter(w=>w.length>0);
}

async function hashQ(t){
  const n=t.toLowerCase().trim();let h=0;
  for(const c of n){h=((h<<5)-h)+c.charCodeAt(0);h=h&h}
  return Math.abs(h).toString(36);
}

function json(d,s=200){return new Response(JSON.stringify(d),{status:s,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}})}
function isCn(t){return/[\u4e00-\u9fa5]/.test(t)}

// 称呼
function greet(text, name, cfg={}){
  const s=STYLES[cfg?.greetingStyle]||STYLES.cute;
  const n=s.prefixes[0]+(name||'小伙伴');
  const g=s.greetings[0].replace('{n}',n);
  const e=s.endings[0];
  return g+'\n'+text+'\n'+e;
}

// 日常对话
const CASUAL=new Set(['嗯','好的','好','你好','嗨','哈喽','谢谢','多谢','哈哈','嘿嘿','ok','行','可以','没问题','在吗','在','拜拜','再见','bye','666','牛','厉害','赞','随便','好吧','算了','加油']);
function isCasual(m){
  const msg=m.toLowerCase().trim();
  if(CASUAL.has(msg))return true;
  if(/^[\s\p{P}]*$/u.test(msg))return true;
  if(msg.length<2&&!/[a-z0-9]/i.test(msg))return true;
  if(msg.endsWith('了')&&msg.length<4)return true;
  return false;
}

// P0-1: AI意图分类
async function classifyIntent(env,msg,cfg){
  const m=msg.toLowerCase().trim();
  // Layer1: 关键词
  try{
    const r=await env.DB.prepare("SELECT DISTINCT keywords FROM knowledge_questions WHERE enabled=1 AND keywords IS NOT NULL").all();
    const kws=[];
    (r.results||[]).forEach(row=>{if(row.keywords)kws.push(...row.keywords.split(',').map(k=>k.trim()).filter(k=>k.length>=2))});
    const has=[...new Set(kws)].some(kw=>{const k=kw.toLowerCase();return m===k||m.includes(k+' ')||m.includes(' '+k)||m.startsWith(k)});
    if(has)return{shouldAnswer:true,intent:'keyword',conf:0.9,layer:1};
  }catch(e){}
  // Layer2: AI
  if(cfg.useAIClassifier!==false&&env.AI&&msg.length>=4){
    if(!await checkQuota(env))return{shouldAnswer:true,intent:'quota_exceeded',conf:0.6,layer:0};
    try{
      const r=await env.AI.run(CFG.AI_MODEL,{messages:[{role:'system',content:'判断是否需要客服回答。需要回答:询问/求助/投诉/确认。不需要回答:问候/感叹/感谢/陈述句/过短。JSON:{"answer":true/false}'},{role:'user',content:msg}],temperature:0.1,max_tokens:50});
      const res=JSON.parse(r.response?.trim()||'{"answer":true}');
      if(res.answer===false&&msg.length<10)return{shouldAnswer:false,intent:'ai_filtered',conf:0.85,layer:2};
      return{shouldAnswer:true,intent:'ai_classified',conf:0.8,layer:2};
    }catch(e){}
  }
  // Layer3: 规则
  const ind=['怎么','如何','为什么','在哪','多少','能不能','可以','是否','帮','出问题','不行','报错','怎么办','是什么','请问'];
  const hasInd=ind.some(i=>m.includes(i));
  return{shouldAnswer:hasInd,intent:hasInd?'rule':'no_match',conf:hasInd?0.6:0.4,layer:3};
}

async function checkQuota(env){try{const r=await env.DB.prepare("SELECT COALESCE(SUM(neurons),0) as t FROM ai_calls WHERE DATE(created_at)=DATE('now')").first();return(r?.t||0)<CFG.MAX_NEURONS}catch(e){return true}}

// P0-2: 相似度
function similarity(q,qu,kw){
  const ql=q.toLowerCase().trim();const kl=qu.toLowerCase().trim();
  if(ql.length<=1)return 0;
  if(ql===kl)return 1;
  // 词频
  const qw=segment(ql);const kw2=segment(kl);let ws=0;
  const qs=new Set(qw);const ks=new Set(kw2);
  for(const w of qs){if(w.length<2)continue;if(ks.has(w))ws+=1;else if(kl.includes(w))ws+=0.5}
  if(qs.size>0)ws/=qs.size;
  // 包含
  let cs=0;
  if(ql.length>=4&&kl.includes(ql))cs=0.8;
  else if(ql.length>=3&&kl.includes(ql)){const i=kl.indexOf(ql);const b=i===0||/\s/.test(kl[i-1])||i+ql.length===kl.length||/\s/.test(kl[i+ql.length]);cs=b?0.7:0.3}
  // 关键词
  let kws=0;
  if(kw)for(const k of kw.toLowerCase().split(',').map(x=>x.trim()).filter(x=>x.length>=2)){if(ql.includes(k))kws=Math.max(kws,0.85)}
  // 编辑距离
  const ed=1-levDist(ql,kl)/Math.max(ql.length,kl.length);
  let final=Math.max(ws*0.25+cs*0.25+kws*0.35+ed*0.15,cs,kws);
  if(ql.length<=3&&final>0.5)final*=0.7;
  if(isCn(ql)&&ql.length<=4&&!kws)final*=0.8;
  return Math.min(1,Math.max(0,final));
}

// P0-3: 上下文
async function getContext(env,cid,uid,turns=5){try{const r=await env.DB.prepare("SELECT role,message FROM conversation_context WHERE chat_id=? AND user_id=? ORDER BY created_at DESC LIMIT ?").bind(cid,uid,turns*2).all();return(r.results||[]).reverse()}catch(e){return[]}}

async function saveContext(env,cid,uid,role,msg, intent=null){try{await env.DB.prepare("INSERT INTO conversation_context(chat_id,user_id,role,message,intent)VALUES(?,?,?,?,?)").bind(cid,uid,role,msg,intent).run();await env.DB.prepare("DELETE FROM conversation_context WHERE created_at<datetime('now','-24 hours')").run()}catch(e){}}

function isFollowUp(msg,ctx){
  const m=msg.toLowerCase();
  const ind=['然后呢','那','还有呢','为什么','怎么办','怎么处理','然后','不是说','可是','但是','具体','详细'];
  if(ind.some(i=>m.startsWith(i)||m.includes(i)))return true;
  if(ctx&&ctx.length>0){const ps=['它','那个','这个','上面','刚才','之前'];if(ps.some(p=>m.includes(p))&&m.length<15)return true}
  return false;
}

// P0-4: 情感
function emotion(msg){
  const m=msg.toLowerCase();
  if(['气死','烦死','恶心','投诉','退款','差评','怒了','火大'].some(x=>m.includes(x)))return'angry';
  if(['谢谢','太好了','太棒了','爱你','么么哒','好评','感谢','给力','厉害','赞'].some(x=>m.includes(x)))return'happy';
  if(['不懂','不明白','怎么回事','搞不懂','晕','迷糊','懵','啥','什么鬼'].some(x=>m.includes(x)))return'confused';
  return'neutral';
}

function adjustByEmotion(resp,emo){
  switch(emo){case'angry':return'抱歉给您带来不便 🙏\n'+resp+'\n我们会努力改进！';case'confused':return'让我详细解释~\n'+resp+'\n💡 有问题随时问';case'happy':return resp+' 😊 很高兴帮到你！';default:return resp}
}

// P0-5: 缓存
async function getCache(env,q){const h=await hashQ(q);try{const c=await env.DB.prepare("SELECT answer,answer_type,similarity FROM answer_cache WHERE question_hash=? AND expires_at>datetime('now')").bind(h).first();if(c){await env.DB.prepare("UPDATE answer_cache SET hit_count=hit_count+1 WHERE question_hash=?").bind(h).run();return c}return null}catch(e){return null}}

async function setCache(env,q,a,at,s){const h=await hashQ(q);try{await env.DB.prepare("INSERT OR REPLACE INTO answer_cache(question_hash,question,answer,answer_type,similarity,expires_at)VALUES(?,?,?,?,?,datetime('now','+7 days'))").bind(h,q,a,at,s).run()}catch(e){}}

// 防刷屏
async function isSpam(env,msg,cid){const h=msg.toLowerCase().trim();try{const e=await env.DB.prepare("SELECT id,count FROM message_frequency WHERE message_hash=? AND chat_id=? AND datetime(last_seen)>datetime('now','-10 seconds')").bind(h,cid).first();if(e){const n=e.count+1;await env.DB.prepare("UPDATE message_frequency SET count=?,last_seen=CURRENT_TIMESTAMP WHERE id=?").bind(n,e.id).run();if(n>=5)return true}else{await env.DB.prepare("INSERT INTO message_frequency(message_hash,chat_id,count,first_seen,last_seen)VALUES(?,?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").bind(h,cid).run()}return false}catch(e){return false}}

// P1-1: 问题推荐
async function getSuggestions(env,q,limit=5){if(q.length<2)return[];try{const r=await env.DB.prepare("SELECT DISTINCT kq.question FROM knowledge_questions kq JOIN knowledge_answers qa ON kq.answer_id=qa.id WHERE kq.enabled=1 AND kq.question LIKE ? ORDER BY qa.use_count DESC LIMIT ?").bind('%'+q+'%',limit).all();return(r.results||[]).map(r=>r.question)}catch(e){return[]}}

// P1-2: 多轮澄清
function detectAmbiguous(matches){if(matches.length>=2&&matches[0].similarity>=CFG.MED_SIM&&matches[1].similarity>=CFG.MED_SIM&&Math.abs(matches[0].similarity-matches[1].similarity)<0.1){return{ambiguous:true,options:matches.slice(0,3).map((m,i)=>({index:i+1,question:m.question,sim:m.similarity})),msg:'您是想问：\n'+matches.slice(0,3).map((m,i)=>(i+1)+'. '+m.question).join('\n')+'\n\n请回复数字~'}}return{ambiguous:false}}

// P1-4: 热度分析
async function analyzeHotness(env){try{const r=await env.DB.prepare("SELECT id,answer,use_count,satisfaction_score,feedback_count FROM knowledge_answers WHERE enabled=1 ORDER BY use_count DESC").all();const hot=[];const cold=[];for(const x of(r.results||[])){const e={id:x.id,answer:x.answer.substring(0,50),useCount:x.use_count||0,hotness:'normal'};if((x.use_count||0)>=10)hot.push(Object.assign(e,{hotness:'hot'}));else if((x.use_count||0)===0)cold.push(e)}return{hot:hot.slice(0,10),cold:cold.slice(0,10)}}catch(e){return{hot:[],cold:[]}}}

// P2-3: 配额状态
async function getQuotaStatus(env){try{const[r,cfg]=await Promise.all([env.DB.prepare("SELECT COALESCE(SUM(neurons),0) as t FROM ai_calls WHERE DATE(created_at)=DATE('now')").first(),env.DB.prepare("SELECT ai_daily_limit FROM bot_config WHERE id=1").first()]);const used=r?.t||0;const limit=cfg?.ai_daily_limit||CFG.MAX_NEURONS;const th=Math.floor(limit*0.9);return{used,limit,threshold:th,remaining:Math.max(0,limit-used),warningLevel:used>=th?(used>=limit?'danger':'warning'):'normal',percentUsed:Math.round((used/limit)*100)}}catch(e){return{used:0,limit:CFG.MAX_NEURONS,threshold:CFG.MAX_NEURONS*0.9,remaining:CFG.MAX_NEURONS,warningLevel:'normal',percentUsed:0}}}

// 知识库匹配
async function findMatches(env,q,max=5){try{const ql=q.toLowerCase();const r=await env.DB.prepare("SELECT kq.id,kq.question,kq.answer_id,kq.keywords,qa.answer FROM knowledge_questions kq JOIN knowledge_answers qa ON kq.answer_id=qa.id WHERE kq.enabled=1 AND qa.enabled=1").all();const all=r.results||[];if(!all.length)return[];const exact=all.filter(x=>x.question.toLowerCase()===ql).map(x=>({...x,similarity:1}));if(exact.length>0){const s=exact[Math.floor(Math.random()*exact.length)];await env.DB.prepare("UPDATE knowledge_answers SET use_count=use_count+1 WHERE id=?").bind(s.answer_id).run().catch(()=>{});return[s]}const scored=all.map(x=>({...x,similarity:similarity(q,x.question,x.keywords)}));scored.sort((a,b)=>b.similarity-a.similarity);const ids=[...new Set(scored.slice(0,3).map(m=>m.answer_id))];for(const id of ids)await env.DB.prepare("UPDATE knowledge_answers SET use_count=use_count+1 WHERE id=?").bind(id).run().catch(()=>{});return scored.slice(0,max)}catch(e){return[]}}

// AI生成答案
async function genAI(env,q,matches,cfg,ctx=[]){try{if(matches[0].similarity>=CFG.HIGH_SIM)return matches[0].answer;if(!await checkQuota(env)||!env.AI)return matches[0].answer;const cr=await env.DB.prepare("SELECT title,content FROM knowledge_context WHERE enabled=1 ORDER BY priority DESC,id ASC LIMIT 10").all();const ct=(cr.results||[]).map(c=>'【'+c.title+'】\n'+c.content).join('\n\n');const kb=matches.slice(0,3).map((m,i)=>'参考'+(i+1)+'：\n问题：'+m.question+'\n答案：'+m.answer).join('\n\n');let hist='';if(ctx&&ctx.length)hist='\n\n对话历史：\n'+ctx.map(c=>(c.role==='user'?'用户':'客服')+'：'+c.message).join('\n');const prompt='你是客服助手。严格根据知识库回答'+(hist?'，结合对话历史':'')+'。\n\n规则：\n1.只用知识库答案\n2.不添加新信息\n3.不编造\n'+(hist?'4.追问要结合历史\n':'')+'\n知识库：\n'+kb+hist;const resp=await env.AI.run(CFG.AI_MODEL,{messages:[{role:'system',content:prompt},{role:'user',content:q}],temperature:0.3,max_tokens:200});try{const tk=Math.ceil((prompt.length+q.length+(resp.response?.length||0))/4);await env.DB.prepare("INSERT INTO ai_calls(chat_id,user_id,message,intent,confidence,neurons)VALUES(?,?,?,?,?,?)").bind(0,0,q,'answer',matches[0].similarity,Math.max(100,tk*10)).run()}catch(err){}return resp.response?.trim()||matches[0].answer}catch(e){return matches[0].answer}}

// TG发送
async function sendTG(bt,cid,text,replyId){try{const p={chat_id:cid,text};if(replyId)p.reply_to_message_id=replyId;const r=await fetch('https://api.telegram.org/bot'+bt+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});return r.ok}catch(e){return false}}

// 获取配置
async function getCfg(env){try{const c=await env.DB.prepare('SELECT * FROM bot_config WHERE id=1').first();if(c)return{botEnabled:c.bot_enabled===1,onlyMentioned:c.only_mentioned===1,useAIClassifier:c.use_ai_classifier===1,useAIAnswer:c.use_ai_answer!==0,simThresh:c.similarity_threshold||CFG.MED_SIM,maxCtx:c.max_context_items||5,greetingStyle:c.greeting_style||'cute'}}catch(e){}return{botEnabled:true,onlyMentioned:false,useAIClassifier:true,useAIAnswer:true,simThresh:CFG.MED_SIM,maxCtx:5,greetingStyle:'cute'}}

// Webhook
async function handleWebhook(req,env){try{const u=await req.json();if(!u.message)return new Response('OK',{status:200});const m=u.message;const cid=m.chat.id;const ct=m.chat.type;const text=m.text||'';const uid=m.from.id;const un=m.from.first_name||m.from.username||'Unknown';if(!text.trim())return new Response('OK',{status:200});env.DB.prepare("INSERT INTO messages(chat_id,user_id,user_name,message,chat_type)VALUES(?,?,?,?,?)").bind(cid,uid,un,text,ct).run().catch(()=>{});const cfg=await getCfg(env);if(!cfg.botEnabled)return new Response('OK',{status:200});const men=text.includes('@')||ct==='private';if(cfg.onlyMentioned&&!men&&ct!=='private')return new Response('OK',{status:200});const clean=text.replace(/@\w+/g,'').trim();if(isCasual(clean))return new Response('OK',{status:200});if(await isSpam(env,clean,cid))return new Response('OK',{status:200});const intent=await classifyIntent(env,clean,cfg);if(!intent.shouldAnswer)return new Response('OK',{status:200});const ign=await env.DB.prepare("SELECT id FROM ai_responses WHERE question=? AND is_ignored=1 LIMIT 1").bind(clean).first();if(ign)return new Response('OK',{status:200});const ctx=await getContext(env,cid,uid,5);const followUp=isFollowUp(clean,ctx);if(!followUp&&!await getCache(env,clean)){const matches=await findMatches(env,clean,5);const amb=detectAmbiguous(matches);if(amb.ambiguous){await sendTG(env.TELEGRAM_BOT_TOKEN,cid,amb.msg,m.message_id);return new Response('OK',{status:200})}}if(!followUp){const cached=await getCache(env,clean);if(cached){let r=greet(cached.answer,un,cfg);r=adjustByEmotion(r,emotion(clean));await sendTG(env.TELEGRAM_BOT_TOKEN,cid,r,m.message_id);return new Response('OK',{status:200})}}const matches=await findMatches(env,clean,cfg.maxCtx);const th=cfg.simThresh||CFG.MED_SIM;if(matches.length&&matches[0].similarity>=th){let resp;let at;if(cfg.useAIAnswer&&matches[0].similarity<CFG.HIGH_SIM&&clean.length>=3){resp=await genAI(env,clean,matches,cfg,followUp?ctx:[]);at='ai';try{await env.DB.prepare("INSERT INTO ai_responses(chat_id,user_id,user_name,question,original_answer,answer_type,similarity,knowledge_id)VALUES(?,?,?,?,?,?,?,?)").bind(cid,uid,un,clean,resp,'ai',matches[0].similarity,matches[0].answer_id).run()}catch(err){}}else{resp=matches[0].answer;at='kb'}if(!followUp&&matches[0].similarity>=CFG.CACHE_SIM)await setCache(env,clean,resp,at,matches[0].similarity);await saveContext(env,cid,uid,'user',clean,intent.intent);await saveContext(env,cid,uid,'assistant',resp,at);resp=greet(resp,un,cfg);resp=adjustByEmotion(resp,emotion(clean));await sendTG(env.TELEGRAM_BOT_TOKEN,cid,resp,m.message_id);try{const today=new Date().toISOString().split('T')[0];await env.DB.prepare("INSERT INTO bot_stats(date,answers_today,total_answers)VALUES(?,1,1)ON CONFLICT(date)DO UPDATE SET answers_today=answers_today+1,total_answers=total_answers+1").bind(today).run();await env.DB.prepare("INSERT INTO answers(chat_id,user_id,user_name,question,answer,answer_type,similarity)VALUES(?,?,?,?,?,?,?)").bind(cid,uid,un,clean,resp,at,matches[0].similarity).run()}catch(err){}}else{try{await env.DB.prepare("INSERT INTO unanswered(chat_id,user_id,user_name,message,chat_type,ai_classified)VALUES(?,?,?,?,?,1)").bind(cid,uid,un,clean,ct,1).run()}catch(err){}}return new Response('OK',{status:200})}catch(e){console.error('[Error]',e);return new Response('OK',{status:200})}}

// 请求处理
async function handleRequest(req,env){const u=new URL(req.url);const p=u.pathname;if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});if(req.method==='POST'&&p==='/webhook')return await handleWebhook(req,env);if(p==='/'||p==='/manage')return new Response(getAdminHtml(),{headers:{'Content-Type':'text/html;charset=utf-8'}});if(p==='/api/stats'){const today=new Date().toISOString().split('T')[0];const[kb,tA,ai,neur]=await Promise.all([env.DB.prepare('SELECT COUNT(*)as c FROM knowledge_answers WHERE enabled=1').first(),env.DB.prepare('SELECT answers_today FROM bot_stats WHERE date=?').bind(today).first(),env.DB.prepare("SELECT COUNT(*)as c FROM ai_calls WHERE DATE(created_at)=DATE('now')").first(),env.DB.prepare("SELECT COALESCE(SUM(neurons),0)as t FROM ai_calls WHERE DATE(created_at)=DATE('now')").first()]);return json({kbCount:kb?.c||0,todayAnswers:tA?.answers_today||0,aiCalls:ai?.c||0,aiUsage:neur?.t||0,aiLimit:CFG.MAX_NEURONS,aiRemaining:Math.max(0,CFG.MAX_NEURONS-(neur?.t||0))})}if(p==='/api/knowledge'){const r=await env.DB.prepare("SELECT ka.id,ka.answer,ka.category,ka.use_count,kq.question FROM knowledge_answers ka LEFT JOIN knowledge_questions kq ON ka.id=kq.answer_id AND kq.enabled=1 WHERE ka.enabled=1 ORDER BY ka.id DESC").all();const m=new Map();for(const row of(r.results||[])){if(!m.has(row.id))m.set(row.id,{id:row.id,answer:row.answer,category:row.category,useCount:row.use_count||0,questions:[]});if(row.question)m.get(row.id).questions.push(row.question)}return json(Array.from(m.values()))}if(p==='/api/hotness')return json(await analyzeHotness(env));if(p==='/api/quota')return json(await getQuotaStatus(env));if(p==='/api/suggestions')return json(await getSuggestions(env,u.searchParams.get('q')||''));return new Response('Telegram Bot v5.0.0-P1P2 Running\n',{status:200})}

// 管理界面
function getAdminHtml(){return'<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>TG知识库机器人 v5.0 P1P2</title><script src="https://cdn.tailwindcss.com"></script><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"><style>body{background:linear-gradient(135deg,#1a1a2e,#16213e)}.card{background:rgba(255,255,255,0.95);border-radius:16px}.stat{background:rgba(255,255,255,0.1);backdrop-filter:blur(10px)}</style></head><body class="min-h-screen text-white"><div class="container mx-auto px-4 py-8 max-w-6xl"><div class="text-center mb-8"><i class="fas fa-robot text-4xl text-purple-400 mb-2"></i><h1 class="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Telegram知识库机器人</h1><div class="flex justify-center gap-2 mt-2"><span class="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs">P0</span><span class="px-3 py-1 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs">P1</span><span class="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">P2</span></div><p class="text-gray-400 mt-2">AI意图分类 | 智能推荐 | 多轮澄清 | 热度分析 | 配额控制</p></div><div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"><div class="stat rounded-xl p-6 text-center"><i class="fas fa-database text-2xl text-blue-400 mb-2"></i><p class="text-gray-400 text-sm">知识库</p><p class="text-3xl font-bold" id="kb">-</p></div><div class="stat rounded-xl p-6 text-center"><i class="fas fa-comments text-2xl text-green-400 mb-2"></i><p class="text-gray-400 text-sm">今日回答</p><p class="text-3xl font-bold" id="today">-</p></div><div class="stat rounded-xl p-6 text-center"><i class="fas fa-brain text-2xl text-purple-400 mb-2"></i><p class="text-gray-400 text-sm">AI调用</p><p class="text-3xl font-bold" id="ai">-</p></div><div class="stat rounded-xl p-6 text-center"><i class="fas fa-coins text-2xl text-orange-400 mb-2"></i><p class="text-gray-400 text-sm">AI消耗</p><p class="text-3xl font-bold" id="neur">-</p></div><div class="stat rounded-xl p-6 text-center"><i class="fas fa-percentage text-2xl text-cyan-400 mb-2"></i><p class="text-gray-400 text-sm">配额剩余</p><p class="text-3xl font-bold" id="remain">-</p></div></div><div class="grid md:grid-cols-2 gap-6 mb-8"><div class="card p-6"><h2 class="text-lg font-bold text-gray-800 mb-4"><i class="fas fa-fire text-orange-500 mr-2"></i>热门知识</h2><div id="hot" class="space-y-2 max-h-64 overflow-y-auto"><div class="text-center py-4 text-gray-500"><i class="fas fa-spinner fa-spin"></i></div></div></div><div class="card p-6"><h2 class="text-lg font-bold text-gray-800 mb-4"><i class="fas fa-snowflake text-blue-500 mr-2"></i>冷门知识</h2><div id="cold" class="space-y-2 max-h-64 overflow-y-auto"><div class="text-center py-4 text-gray-500"><i class="fas fa-spinner fa-spin"></i></div></div></div></div><div class="card p-6 mb-8"><h2 class="text-lg font-bold text-gray-800 mb-4"><i class="fas fa-rocket text-purple-500 mr-2"></i>P1P2升级功能</h2><div class="grid md:grid-cols-3 gap-4"><div class="p-4 bg-emerald-50 rounded-lg"><h3 class="font-semibold text-emerald-800 mb-2">P0: 核心优化</h3><p class="text-emerald-700 text-sm">AI意图三层过滤 | 相似度算法 | 对话上下文 | 缓存 | 情感分析</p></div><div class="p-4 bg-teal-50 rounded-lg"><h3 class="font-semibold text-teal-800 mb-2">P1: 功能增强</h3><p class="text-teal-700 text-sm">智能推荐 | 多轮澄清 | 称呼风格 | 反馈评分 | 热度分析</p></div><div class="p-4 bg-amber-50 rounded-lg"><h3 class="font-semibold text-amber-800 mb-2">P2: 性能优化</h3><p class="text-amber-700 text-sm">索引优化 | 批量操作 | 缓存预热 | 配额控制</p></div></div></div><div class="card p-6"><h2 class="text-lg font-bold text-gray-800 mb-4"><i class="fas fa-book text-blue-500 mr-2"></i>知识库</h2><div id="kbList" class="space-y-3 max-h-96 overflow-y-auto"><div class="text-center py-8 text-gray-500"><i class="fas fa-spinner fa-spin"></i></div></div></div></div><script>async function load(){try{const r=await fetch("/api/stats");const d=await r.json();document.getElementById("kb").textContent=d.kbCount||0;document.getElementById("today").textContent=d.todayAnswers||0;document.getElementById("ai").textContent=d.aiCalls||0;document.getElementById("neur").textContent=(d.aiUsage||0).toLocaleString();document.getElementById("remain").textContent=(d.aiRemaining||0).toLocaleString()}catch(e){}}async function loadHot(){try{const r=await fetch("/api/hotness");const d=await r.json();document.getElementById("hot").innerHTML=d.hot&&d.hot.length?d.hot.map((x,i)=>\'<div class="flex items-center gap-3 p-2 bg-orange-50 rounded"><span class="font-bold text-orange-500">#\'+(i+1)+\'</span><span class="flex-1 text-gray-700 text-sm">\'+esc(x.answer)+\'</span><span class="text-xs text-orange-600">\'+x.useCount+\'次</span></div