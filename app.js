const OS_PROMPT = `SEN OMNICODE — o'zini o'zi boshqaradigan AI Software Engineering tizimisan.
Core Brain v2: production-ready, minimal o'zgarish, self-review.
O'zbekcha yozsa o'zbekcha javob ber.
Agar foydalanuvchi o'zingni o'zgartir / yangila / UI / agent deb aytsa — o'z kodini (app.js, index.html, agents.js, style.css) GitHub orqali o'qi, tahrir qil, push qil.`;

if (typeof AGENT_PROMPTS === 'undefined') {
  var AGENT_PROMPTS = {
    core_brain: OS_PROMPT,
    planner: 'Sen Planner. 5-8 qadamli aniq reja.',
    project_analyzer: 'Sen Analyzer. Repo tahlili.',
    context_engine: 'Sen Context. Kerakli fayllarni tanla.',
    tool_engine: 'Sen Tools. GitHub amallar.',
    code_editor: 'Sen Editor. Minimal diff. O\'z kodini ham tahrirlay olasan.',
    reviewer: 'Sen Reviewer. Xavfsizlik, commit msg.',
    memory_engine: 'Sen Memory. Qisqa xotira.'
  };
}

const AGENTS = [
  {i:'🧠',n:'Core Brain',d:'Qaror',k:'core_brain'},
  {i:'📋',n:'Planner',d:'Reja',k:'planner'},
  {i:'🔍',n:'Analyzer',d:'Tahlil',k:'project_analyzer'},
  {i:'📎',n:'Context',d:'Fayllar',k:'context_engine'},
  {i:'🔧',n:'Tools',d:'GitHub',k:'tool_engine'},
  {i:'✏️',n:'Editor',d:'Kod',k:'code_editor'},
  {i:'✅',n:'Reviewer',d:'Review',k:'reviewer'},
  {i:'💾',n:'Memory',d:'Xotira',k:'memory_engine'}
];

const SELF_FILES = ['index.html','app.js','agents.js','style.css'];

const MODELS = {
  pollinations: [{v:'openai',n:'Default'},{v:'openai-large',n:'Large'},{v:'qwen-coder',n:'Qwen Coder'}],
  openrouter: [
    {v:'meta-llama/llama-3.3-70b-instruct:free',n:'Llama 3.3 70B free'},
    {v:'deepseek/deepseek-r1:free',n:'DeepSeek R1 free'},
    {v:'qwen/qwen-2.5-72b-instruct:free',n:'Qwen 2.5 72B free'},
    {v:'anthropic/claude-sonnet-4',n:'Claude Sonnet 4'},
    {v:'openai/gpt-4o',n:'GPT-4o'}
  ],
  groq: [{v:'llama-3.3-70b-versatile',n:'Llama 3.3 70B'},{v:'llama-3.1-8b-instant',n:'Llama 8B Fast'}],
  custom: [{v:'default',n:'Custom'}]
};

const SK = 'oc_vibe_v4';
let S = {
  provider:'pollinations', apiKey:'', model:'openai', customUrl:'',
  ghToken:'', ghOwner:'', ghRepo:'', ghBranch:'main',
  maxTokens:8192, mode:'os',
  messages:[], files:{}, curFile:null, projects:{},
  memory:[], stats:{req:0, tok:0}
};

function load(){ try{ const r=localStorage.getItem(SK); if(r) Object.assign(S,JSON.parse(r)); }catch(e){} }
function save(){ localStorage.setItem(SK, JSON.stringify({...S, messages:S.messages.slice(-40), memory:S.memory.slice(-20)})); }
function toast(m,t=''){ const e=document.getElementById('toast'); e.textContent=m; e.className='toast show '+t; setTimeout(()=>e.classList.remove('show'),3000); }
function grow(el){ el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,120)+'px'; }
function onKey(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } }

function go(v){
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  document.getElementById('v-'+v).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.v===v));
  if(v==='agents') renderAgents();
  if(v==='files') renderFiles();
  if(v==='stats') renderStats();
  if(v==='set') applySet();
}
function setMode(m){
  S.mode=m; save();
  document.getElementById('chip-fast').classList.toggle('active', m==='fast');
  document.getElementById('chip-os').classList.toggle('active', m==='os');
}
function onProv(){
  const p=document.getElementById('prov').value;
  document.getElementById('keyBox').style.display = p==='pollinations'?'none':'block';
  document.getElementById('urlBox').style.display = p==='custom'?'block':'none';
  document.getElementById('keyLbl').textContent = p==='openrouter'?'OpenRouter API Key':p==='groq'?'Groq API Key':'API Key';
  const sel=document.getElementById('model'); sel.innerHTML='';
  (MODELS[p]||[]).forEach(m=>{ const o=document.createElement('option'); o.value=m.v; o.textContent=m.n; sel.appendChild(o); });
}
function applySet(){
  document.getElementById('prov').value=S.provider;
  document.getElementById('key').value=S.apiKey;
  document.getElementById('url').value=S.customUrl;
  document.getElementById('maxTok').value=S.maxTokens;
  document.getElementById('ghToken').value=S.ghToken;
  document.getElementById('ghOwner').value=S.ghOwner;
  document.getElementById('ghRepo').value=S.ghRepo;
  const b=document.getElementById('ghBranch'); if(b) b.value=S.ghBranch||'main';
  onProv(); document.getElementById('model').value=S.model; updGhStatus();
}
function saveSet(){
  S.provider=document.getElementById('prov').value;
  S.apiKey=document.getElementById('key').value.trim();
  S.model=document.getElementById('model').value;
  S.customUrl=document.getElementById('url').value.trim();
  S.maxTokens=parseInt(document.getElementById('maxTok').value)||8192;
  S.ghToken=document.getElementById('ghToken').value.trim();
  S.ghOwner=document.getElementById('ghOwner').value.trim();
  S.ghRepo=document.getElementById('ghRepo').value.trim();
  const b=document.getElementById('ghBranch'); S.ghBranch=b?b.value.trim()||'main':'main';
  save(); updDot(); updGhStatus(); toast('Saqlandi','ok');
}
function updDot(){ document.getElementById('dot').className='dot'+(S.provider==='pollinations'||S.apiKey||S.customUrl?'':' off'); }
function updGhStatus(){
  const el=document.getElementById('ghStatus'); if(!el) return;
  if(S.ghToken && S.ghOwner && S.ghRepo) el.textContent='✓ '+S.ghOwner+'/'+S.ghRepo+' @'+(S.ghBranch||'main');
  else if(S.ghToken) el.textContent='Token bor · repo kiriting';
  else el.textContent='Ulanmagan — o\'zini boshqarish uchun kerak';
}
function fmt(t){
  let h=t.replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>');
  h=h.replace(/```(\w*)\n?([\s\S]*?)```/g,(_,l,c)=>`<pre><code>${c.trim()}</code></pre>`);
  h=h.replace(/`([^`]+)`/g,'<code>$1</code>');
  h=h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  h=h.replace(/^### (.+)$/gm,'<h3>$1</h3>'); h=h.replace(/^## (.+)$/gm,'<h2>$1</h2>');
  h=h.replace(/^- (.+)$/gm,'• $1'); h=h.replace(/\n/g,'<br>'); return h;
}
function renderMsgs(){
  const box=document.getElementById('msgs'); if(!S.messages.length) return; box.innerHTML='';
  S.messages.forEach(m=>{
    const d=document.createElement('div'); d.className='msg '+m.role;
    const role=m.role==='user'?'Siz':(m.agent||'OmniCode');
    const badge=m.agent?`<span class="badge">${m.agent}</span>`:'';
    d.innerHTML=`<div class="msg-role">${role} ${badge}</div><div class="msg-body">${m.role==='ai'?fmt(m.content):m.content.replace(/</g,'<').replace(/\n/g,'<br>')}</div>${m.meta?`<div class="msg-meta">${m.meta}</div>`:''}`;
    box.appendChild(d);
  }); box.scrollTop=box.scrollHeight;
}
async function callAI(msgs, systemOverride){
  const sys = systemOverride || OS_PROMPT;
  const messages=[{role:'system',content:sys},...msgs];
  const body={model:S.model,messages,max_tokens:S.maxTokens,temperature:0.45};
  let url, headers={'Content-Type':'application/json'};
  if(S.provider==='pollinations') url='https://text.pollinations.ai/openai';
  else if(S.provider==='openrouter'){
    if(!S.apiKey) throw new Error('OpenRouter API key kerak');
    url='https://openrouter.ai/api/v1/chat/completions';
    headers['Authorization']='Bearer '+S.apiKey; headers['HTTP-Referer']=location.origin; headers['X-Title']='OmniCode-Self';
  } else if(S.provider==='groq'){
    if(!S.apiKey) throw new Error('Groq API key kerak');
    url='https://api.groq.com/openai/v1/chat/completions'; headers['Authorization']='Bearer '+S.apiKey;
  } else if(S.provider==='custom'){
    if(!S.customUrl) throw new Error('Custom URL kerak');
    url=S.customUrl.replace(/\/$/,'')+'/chat/completions';
    if(S.apiKey) headers['Authorization']='Bearer '+S.apiKey;
  } else throw new Error('Provayder tanlang');
  const res=await fetch(url,{method:'POST',headers,body:JSON.stringify(body)});
  if(!res.ok){ const t=await res.text().catch(()=>''); throw new Error('HTTP '+res.status+': '+t.slice(0,120)); }
  const data=await res.json(); const content=data.choices?.[0]?.message?.content;
  if(!content) throw new Error('Bo‘sh javob');
  const tokens=data.usage?.total_tokens||Math.ceil((JSON.stringify(messages)+content).length/4);
  S.stats.req++; S.stats.tok+=tokens; save(); return {content,tokens};
}
async function gh(path, method='GET', body){
  if(!S.ghToken) throw new Error('GitHub token kerak (Sozlamalar)');
  const res=await fetch('https://api.github.com'+path,{ method, headers:{ 'Authorization':'Bearer '+S.ghToken, 'Accept':'application/vnd.github+json', 'Content-Type':'application/json', 'X-GitHub-Api-Version':'2022-11-28' }, body: body?JSON.stringify(body):undefined });
  if(!res.ok){ const t=await res.text().catch(()=>''); throw new Error('GitHub '+res.status+': '+t.slice(0,180)); }
  if(res.status===204) return null; return res.json();
}
async function ghGetFile(path){
  if(!S.ghOwner||!S.ghRepo) throw new Error('Owner/Repo kiriting');
  const ref = S.ghBranch||'main';
  const data = await gh(`/repos/${S.ghOwner}/${S.ghRepo}/contents/${path}?ref=${encodeURIComponent(ref)}`);
  const text = decodeURIComponent(escape(atob(data.content.replace(/\n/g,''))));
  return { content:text, sha:data.sha, path };
}
async function ghPutFile(path, content, message, sha){
  if(!S.ghOwner||!S.ghRepo) throw new Error('Owner/Repo kiriting');
  const body = { message: message || ('OmniCode self-edit: '+path), content: btoa(unescape(encodeURIComponent(content))), branch: S.ghBranch||'main' };
  if(sha) body.sha = sha;
  else { try { const cur = await ghGetFile(path); body.sha = cur.sha; } catch(e){} }
  return gh(`/repos/${S.ghOwner}/${S.ghRepo}/contents/${path}`,'PUT',body);
}
async function ghLoadSelf(){
  toast('O\'z kodim yuklanmoqda...','');
  const loaded = [];
  for(const f of SELF_FILES){
    try{ const {content} = await ghGetFile(f); S.files[f] = content; loaded.push(f); }catch(e){}
  }
  save(); renderFiles(); toast(loaded.length?'Yuklandi: '+loaded.join(', '):'Fayl topilmadi','ok');
  return loaded;
}
async function ghPushAll(){
  const names=Object.keys(S.files); if(!names.length){ toast('Fayl yo‘q','err'); return; }
  if(!confirm(names.length+' ta fayl push?\n'+S.ghOwner+'/'+S.ghRepo)) return;
  toast('Push...','');
  try{
    for(const n of names){ await ghPutFile(n, S.files[n], 'OmniCode: '+n); }
    toast('Push OK ✓','ok');
    S.messages.push({role:'ai',content:`✅ Push: ${names.join(', ')}\nhttps://github.com/${S.ghOwner}/${S.ghRepo}`,agent:'Git'}); renderMsgs();
  }catch(e){ toast(e.message,'err'); }
}
async function ghListRepos(){
  if(!S.ghToken){ toast('Token kerak','err'); return; }
  try{
    const repos=await gh('/user/repos?per_page=12&sort=updated');
    S.messages.push({role:'ai',content:'Repos:\n'+repos.map(r=>'• '+r.full_name).join('\n'),agent:'Git'}); renderMsgs(); go('chat');
  }catch(e){ toast(e.message,'err'); }
}
function isSelfCommand(text){
  const t = text.toLowerCase();
  const keys = ["o'zing","ozing","o‘zing","self","o'z kod","oz kod","yangila o","ui ni","interfeys","app.js","index.html","style.css","agents.js","o'zini","ozini","qayta yoz","pro qil","yaxshila o"];
  return keys.some(k=>t.includes(k));
}
async function runSelfEdit(task){
  if(!S.ghToken||!S.ghOwner||!S.ghRepo) throw new Error('Sozlamalar → GitHub token + owner + repo');
  addTip('Self-Load'); await ghLoadSelf();
  const ctx = SELF_FILES.filter(f=>S.files[f]).map(f=>{
    const body = S.files[f]||'';
    return `=== ${f} (${body.length}) ===\n${body.slice(0,3200)}${body.length>3200?'\n...[truncated]':''}`;
  }).join('\n\n');
  addTip('Core Brain');
  const plan = await runAgent('core_brain', `MENI O'ZGARTIRISH:\n${task}\n\nKODIM:\n${ctx}\n\nQaysi fayllarni qanday o'zgartirish? Minimal, ishlaydigan.`, 'Core Brain');
  addTip('Editor');
  const code = await runAgent('code_editor', `Self-edit: ${task}\n\nReja:\n${plan.content}\n\nKod:\n${ctx}\n\nHar fayl uchun TO'LIQ kontent:\n\`\`\`html\n// filename: index.html\n...\n\`\`\`\n\`\`\`javascript\n// filename: app.js\n...\n\`\`\``, 'Editor');
  extractFiles(code.content);
  addTip('Reviewer');
  await runAgent('reviewer', `Self-edit review:\n${code.content.slice(0,2800)}\n\nXavfsizlik, commit.`, 'Reviewer');
  const t = task.toLowerCase();
  const shouldPush = /push|saqla|qo'lla|apply|yangila|yoz|commit|deploy/.test(t) || confirm('GitHubga push qilaymi?');
  if(shouldPush){
    addTip('Git Push');
    const changed = Object.keys(S.files).filter(f=>SELF_FILES.includes(f));
    for(const f of changed){
      try{ await ghPutFile(f, S.files[f], 'OmniCode self-edit: '+task.slice(0,50)); }
      catch(e){ S.messages.push({role:'ai',content:'❌ '+f+': '+e.message,agent:'Git'}); }
    }
    save();
    S.messages.push({role:'ai',content:`✅ O'z kodim yangilandi.\nFayllar: ${changed.join(', ')}\n1–2 daqiqadan keyin refresh qiling.`,agent:'Git'});
    renderMsgs(); toast('Self-edit OK','ok');
  } else {
    S.messages.push({role:'ai',content:'Lokal saqlandi. Push: Fayllar → GitHub ↑ yoki "push qil".',agent:'Git'}); renderMsgs();
  }
}
function filesContext(){
  const keys=Object.keys(S.files);
  if(!keys.length) return 'Fayl yo‘q. "o\'z kodimni yukla" deb yozing.';
  let s='Fayllar:\n'; keys.forEach(k=>{ s+=`--- ${k} ---\n${(S.files[k]||'').slice(0,1000)}\n`; }); return s;
}
function memContext(){ if(!S.memory.length) return ''; return '\nXotira:\n'+S.memory.slice(-6).map(m=>'- '+m).join('\n'); }
async function runAgent(key, userMsg, agentLabel){
  const prompt = AGENT_PROMPTS[key] || OS_PROMPT;
  const r = await callAI([{role:'user', content:userMsg}], prompt);
  S.messages.push({role:'ai', content:r.content, agent:agentLabel, meta:`~${r.tokens} tok`}); renderMsgs(); return r;
}
function addTip(name){
  document.getElementById('tip')?.remove();
  const tip=document.createElement('div'); tip.className='msg ai'; tip.id='tip';
  tip.innerHTML=`<div class="msg-role">OmniCode <span class="badge">${name}</span></div><div class="typing"><span></span><span></span><span></span></div>`;
  document.getElementById('msgs').appendChild(tip); document.getElementById('msgs').scrollTop=99999;
}
async function send(){
  const input=document.getElementById('inp'); const text=input.value.trim(); if(!text) return;
  const btn=document.getElementById('send'); btn.disabled=true; input.value=''; input.style.height='auto';
  S.messages.push({role:'user',content:text}); renderMsgs();
  const tip=document.createElement('div'); tip.className='msg ai'; tip.id='tip';
  tip.innerHTML=`<div class="msg-role">OmniCode</div><div class="typing"><span></span><span></span><span></span></div>`;
  document.getElementById('msgs').appendChild(tip);
  try{
    const low = text.toLowerCase();
    if(/yukla.*kod|kodimni yukla|load self|o'z fayl|oz fayl/.test(low)){
      document.getElementById('tip')?.remove();
      await ghLoadSelf();
      S.messages.push({role:'ai',content:'O\'z fayllarim yuklandi.',agent:'Git'});
    } else if(isSelfCommand(text) || /o'zingni|ozingni|self.?edit|o'zini yangila|ozini yangila/.test(low)){
      document.getElementById('tip')?.remove();
      await runSelfEdit(text);
    } else if(S.mode==='os'){
      await runOS(text);
    } else {
      const hist=S.messages.filter(m=>m.role==='user'||m.role==='ai').slice(-12).map(m=>({role:m.role==='ai'?'assistant':'user',content:m.content}));
      const r=await callAI(hist); S.messages.push({role:'ai',content:r.content,meta:`${S.provider} · ~${r.tokens} tok`});
    }
  }catch(e){ S.messages.push({role:'ai',content:'❌ '+e.message}); }
  document.getElementById('tip')?.remove(); renderMsgs(); btn.disabled=false; input.focus(); renderStats();
}
async function runOS(task){
  const pipe=document.getElementById('pipe'); pipe.classList.add('show');
  const ids=['ps1','ps2','ps3','ps4','ps5']; ids.forEach(id=>document.getElementById(id).className='ps');
  function step(i,st){ document.getElementById(ids[i]).className='ps '+st; }
  const ctx = filesContext() + memContext();
  step(0,'run'); document.getElementById('tip')?.remove(); addTip('Core Brain');
  const brain = await runAgent('core_brain', `Vazifa:\n${task}\n\n${ctx}\n\nQaror.`, 'Core Brain'); step(0,'done');
  step(1,'run'); addTip('Planner');
  const plan = await runAgent('planner', `Vazifa: ${task}\n${brain.content}\n\n${ctx}\n\nReja.`, 'Planner'); step(1,'done');
  step(2,'run'); addTip('Context');
  const ctxR = await runAgent('context_engine', `Vazifa: ${task}\nReja:\n${plan.content}\n\n${ctx}`, 'Context');
  addTip('Editor');
  const code = await runAgent('code_editor', `Vazifa: ${task}\nReja:\n${plan.content}\nContext:\n${ctxR.content}\n\n${ctx}\n\nKod:\n\`\`\`til\n// filename: nom.ext\nkod\n\`\`\``, 'Editor');
  extractFiles(code.content); step(2,'done');
  step(3,'run'); step(4,'run'); addTip('Reviewer');
  const rev = await runAgent('reviewer', `Review:\n${code.content.slice(0,4000)}`, 'Reviewer');
  const mem = await runAgent('memory_engine', `Xotira: ${task}\n${plan.content.slice(0,250)}`, 'Memory');
  S.memory.push(mem.content.slice(0,280)); save(); step(3,'done'); step(4,'done');
}
function extractFiles(text){
  const re=/```(\w*)\n(?:\/\/\s*filename:\s*([^\n]+)\n)?([\s\S]*?)```/g; let m,c=0;
  while((m=re.exec(text))!==null){
    let name=m[2]?.trim(); const code=m[3].trim();
    if(!name){ const ext={html:'html',css:'css',javascript:'js',js:'js',python:'py',ts:'ts',json:'json'}[m[1]]||'txt'; name=`file${++c}.${ext}`; } else c++;
    S.files[name]=code;
  }
  if(c){ save(); renderFiles(); toast(c+' ta fayl','ok'); }
}
function renderAgents(){ document.getElementById('agentList').innerHTML=AGENTS.map(a=>`<div class="agent-row"><span class="ico">${a.i}</span><div class="info"><div class="nm">${a.n}</div><div class="ds">${a.d}</div></div><span class="st">Tayyor</span></div>`).join(''); }
function renderFiles(){
  const list=document.getElementById('fileList'); const names=Object.keys(S.files);
  if(!names.length){ list.innerHTML='<div style="padding:12px;color:var(--text3);font-size:13px">Fayl yo‘q. "o\'z kodimni yukla" deb yozing.</div>'; return; }
  list.innerHTML=names.map(n=>`<div class="file-row ${S.curFile===n?'active':''}" onclick="openFile('${n.replace(/'/g,"\\'")}')"><span>📄</span><span class="n">${n}</span></div>`).join('');
}
function newFile(){ const n=prompt('Fayl nomi:'); if(!n?.trim()) return; if(S.files[n.trim()]){ toast('Bor','err'); return; } S.files[n.trim()]=''; S.curFile=n.trim(); document.getElementById('edName').textContent=n.trim(); document.getElementById('ed').value=''; save(); renderFiles(); go('files'); toast('OK','ok'); }
function openFile(n){ if(S.curFile) S.files[S.curFile]=document.getElementById('ed').value; S.curFile=n; document.getElementById('edName').textContent=n; document.getElementById('ed').value=S.files[n]||''; renderFiles(); }
function saveFile(){ if(!S.curFile){ toast('Fayl tanlang','err'); return; } S.files[S.curFile]=document.getElementById('ed').value; save(); toast('Saqlandi','ok'); }
function dlFile(){ if(!S.curFile) return; const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([document.getElementById('ed').value],{type:'text/plain'})); a.download=S.curFile; a.click(); }
function delFile(){ if(!S.curFile||!confirm('O‘chirish?')) return; delete S.files[S.curFile]; S.curFile=null; document.getElementById('edName').textContent='—'; document.getElementById('ed').value=''; save(); renderFiles(); toast('OK','ok'); }
function renderStats(){ document.getElementById('sReq').textContent=S.stats.req; document.getElementById('sTok').textContent=S.stats.tok.toLocaleString(); document.getElementById('sFil').textContent=Object.keys(S.files).length; document.getElementById('sPrj').textContent=Object.keys(S.projects).length; }
function clearChat(){ if(!confirm('Tozalash?')) return; S.messages=[]; save(); document.getElementById('msgs').innerHTML=`<div class="msg ai"><div class="msg-role">OmniCode</div><div class="msg-body">Chat tozalandi. Meni o'zgartirish: <em>o'zingni yangila: ...</em></div></div>`; toast('OK','ok'); }
function wipe(){ if(!confirm('Hammasi?')) return; localStorage.removeItem(SK); location.reload(); }
load(); updDot(); renderMsgs(); renderFiles();
