const OS_PROMPT = `SEN KOD YOZUVCHI EMASSAN.
SEN PROFESSIONAL SOFTWARE ENGINEERING SUN'IY INTELLEKTISAN (OmniCode Core Brain v2).
Vibe coding: foydalanuvchi oddiy suhbat qiladi, murakkab jarayonlar fon rejimida.
Mavjud arxitekturani saqla. Minimal o'zgarish. Production-ready.
O'zbekcha yozsa o'zbekcha javob ber.`;

if (typeof AGENT_PROMPTS === 'undefined') {
  var AGENT_PROMPTS = {
    core_brain: OS_PROMPT,
    planner: 'Sen Planner. Reja tuz.',
    project_analyzer: 'Sen Analyzer. Tahlil qil.',
    context_engine: 'Sen Context. Fayl tanla.',
    tool_engine: 'Sen Tools. Amallar ber.',
    code_editor: 'Sen Editor. Minimal kod.',
    reviewer: 'Sen Reviewer. Tekshir.',
    memory_engine: 'Sen Memory. Xotira yoz.'
  };
}

const AGENTS = [
  {i:'🧠',n:'Core Brain',d:'Qaror qabul',k:'core_brain'},
  {i:'📋',n:'Planner',d:'Reja',k:'planner'},
  {i:'🔍',n:'Analyzer',d:'Tahlil',k:'project_analyzer'},
  {i:'📎',n:'Context',d:'Fayllar',k:'context_engine'},
  {i:'🔧',n:'Tools',d:'Git/Terminal',k:'tool_engine'},
  {i:'✏️',n:'Editor',d:'Kod',k:'code_editor'},
  {i:'✅',n:'Reviewer',d:'Review',k:'reviewer'},
  {i:'💾',n:'Memory',d:'Xotira',k:'memory_engine'}
];

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
  custom: [{v:'default',n:'Custom model'}]
};

const SK = 'oc_vibe_v3';
let S = {
  provider:'pollinations', apiKey:'', model:'openai', customUrl:'',
  ghToken:'', ghOwner:'', ghRepo:'',
  maxTokens:8192, mode:'os',
  messages:[], files:{}, curFile:null, projects:{},
  memory:[], stats:{req:0, tok:0}
};

function load(){ try{ const r=localStorage.getItem(SK); if(r) Object.assign(S,JSON.parse(r)); }catch(e){} }
function save(){ localStorage.setItem(SK, JSON.stringify({...S, messages:S.messages.slice(-40), memory:S.memory.slice(-20)})); }
function toast(m,t=''){ const e=document.getElementById('toast'); e.textContent=m; e.className='toast show '+t; setTimeout(()=>e.classList.remove('show'),2800); }
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
  save(); updDot(); updGhStatus(); toast('Saqlandi','ok');
}
function updDot(){ document.getElementById('dot').className='dot'+(S.provider==='pollinations'||S.apiKey||S.customUrl?'':' off'); }
function updGhStatus(){
  const el=document.getElementById('ghStatus'); if(!el) return;
  if(S.ghToken && S.ghOwner && S.ghRepo) el.textContent='Ulangan · '+S.ghOwner+'/'+S.ghRepo;
  else if(S.ghToken) el.textContent='Token bor · repo kiriting';
  else el.textContent='Ulanmagan';
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
  const body={model:S.model,messages,max_tokens:S.maxTokens,temperature:0.5};
  let url, headers={'Content-Type':'application/json'};
  if(S.provider==='pollinations') url='https://text.pollinations.ai/openai';
  else if(S.provider==='openrouter'){
    if(!S.apiKey) throw new Error('OpenRouter API key kerak (Sozlamalar)');
    url='https://openrouter.ai/api/v1/chat/completions';
    headers['Authorization']='Bearer '+S.apiKey; headers['HTTP-Referer']=location.origin; headers['X-Title']='OmniCode-Vibe';
  } else if(S.provider==='groq'){
    if(!S.apiKey) throw new Error('Groq API key kerak (Sozlamalar)');
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
  S.stats.req++; S.stats.tok+=tokens; save(); return {content,tokens,model:data.model||S.model};
}
function filesContext(){
  const keys=Object.keys(S.files); if(!keys.length) return 'Lokal fayl yo‘q.';
  let s='Fayllar:\n'; keys.forEach(k=>{ s+=`--- ${k} ---\n${(S.files[k]||'').slice(0,1200)}\n`; }); return s;
}
function memContext(){ if(!S.memory.length) return ''; return '\nXotira:\n'+S.memory.slice(-6).map(m=>'- '+m).join('\n'); }
async function runAgent(key, userMsg, agentLabel){
  const prompt = AGENT_PROMPTS[key] || OS_PROMPT;
  const r = await callAI([{role:'user', content:userMsg}], prompt);
  S.messages.push({role:'ai', content:r.content, agent:agentLabel, meta:`~${r.tokens} tok`}); renderMsgs(); return r;
}
async function send(){
  const input=document.getElementById('inp'); const text=input.value.trim(); if(!text) return;
  const btn=document.getElementById('send'); btn.disabled=true; input.value=''; input.style.height='auto';
  S.messages.push({role:'user',content:text}); renderMsgs();
  const tip=document.createElement('div'); tip.className='msg ai'; tip.id='tip';
  tip.innerHTML=`<div class="msg-role">OmniCode</div><div class="typing"><span></span><span></span><span></span></div>`;
  document.getElementById('msgs').appendChild(tip);
  try{
    if(S.mode==='os') await runOS(text);
    else {
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
  const brain = await runAgent('core_brain', `Vazifa:\n${task}\n\n${ctx}\n\nQaror: eng yaxshi yo'l, risk, agentlar.`, 'Core Brain'); step(0,'done');
  step(1,'run'); addTip('Planner');
  const plan = await runAgent('planner', `Vazifa: ${task}\nQaror:\n${brain.content}\n\n${ctx}\n\nReja tuz.`, 'Planner'); step(1,'done');
  step(2,'run'); addTip('Context');
  const ctxR = await runAgent('context_engine', `Vazifa: ${task}\nReja:\n${plan.content}\n\n${ctx}\n\nKerakli fayllarni tanla.`, 'Context');
  addTip('Editor');
  const code = await runAgent('code_editor', `Vazifa: ${task}\nReja:\n${plan.content}\nContext:\n${ctxR.content}\n\n${ctx}\n\nMinimal ishlaydigan kod. Fayl:\n\`\`\`til\n// filename: nom.ext\nkod\n\`\`\``, 'Editor');
  extractFiles(code.content); step(2,'done');
  step(3,'run'); step(4,'run'); addTip('Reviewer');
  const rev = await runAgent('reviewer', `Review:\n${code.content.slice(0,4000)}\n\nXavfsizlik, test, commit msg.`, 'Reviewer');
  const mem = await runAgent('memory_engine', `Xotira:\nVazifa: ${task}\n${plan.content.slice(0,300)}\n${rev.content.slice(0,300)}`, 'Memory');
  S.memory.push(mem.content.slice(0,280)); save(); step(3,'done'); step(4,'done');
}
function addTip(name){
  document.getElementById('tip')?.remove();
  const tip=document.createElement('div'); tip.className='msg ai'; tip.id='tip';
  tip.innerHTML=`<div class="msg-role">OmniCode <span class="badge">${name}</span></div><div class="typing"><span></span><span></span><span></span></div>`;
  document.getElementById('msgs').appendChild(tip); document.getElementById('msgs').scrollTop=99999;
}
function extractFiles(text){
  const re=/```(\w*)\n(?:\/\/\s*filename:\s*([^\n]+)\n)?([\s\S]*?)```/g; let m,c=0;
  while((m=re.exec(text))!==null){
    let name=m[2]?.trim(); const code=m[3].trim();
    if(!name){ const ext={html:'html',css:'css',javascript:'js',js:'js',python:'py',ts:'ts',json:'json'}[m[1]]||'txt'; name=`file${++c}.${ext}`; } else c++;
    S.files[name]=code;
  }
  if(c){ save(); renderFiles(); toast(c+' ta fayl saqlandi','ok'); }
}
async function gh(path, method='GET', body){
  if(!S.ghToken) throw new Error('GitHub token kerak (Sozlamalar)');
  const res=await fetch('https://api.github.com'+path,{ method, headers:{ 'Authorization':'Bearer '+S.ghToken, 'Accept':'application/vnd.github+json', 'Content-Type':'application/json', 'X-GitHub-Api-Version':'2022-11-28' }, body: body?JSON.stringify(body):undefined });
  if(!res.ok){ const t=await res.text().catch(()=>''); throw new Error('GitHub '+res.status+': '+t.slice(0,150)); }
  if(res.status===204) return null; return res.json();
}
async function ghPushFile(path, content, message){
  if(!S.ghOwner||!S.ghRepo) throw new Error('Owner va Repo kiriting');
  let sha; try{ const existing=await gh(`/repos/${S.ghOwner}/${S.ghRepo}/contents/${path}`); sha=existing.sha; }catch(e){}
  const body={ message: message||('OmniCode: update '+path), content: btoa(unescape(encodeURIComponent(content))), branch: 'main' };
  if(sha) body.sha=sha;
  return gh(`/repos/${S.ghOwner}/${S.ghRepo}/contents/${path}`,'PUT',body);
}
async function ghPushAll(){
  const names=Object.keys(S.files); if(!names.length){ toast('Fayl yo‘q','err'); return; }
  if(!confirm(names.length+' ta faylni GitHubga yuborilsinmi?\n'+S.ghOwner+'/'+S.ghRepo)) return;
  toast('Yuborilmoqda...','');
  try{ for(const n of names){ await ghPushFile(n, S.files[n], 'OmniCode: '+n); }
    toast('GitHubga yuborildi ✓','ok');
    S.messages.push({role:'ai',content:`✅ GitHubga yuborildi: ${names.join(', ')}\nhttps://github.com/${S.ghOwner}/${S.ghRepo}`,agent:'Git'}); renderMsgs();
  }catch(e){ toast(e.message,'err'); }
}
async function ghListRepos(){
  if(!S.ghToken){ toast('Token kerak','err'); return; }
  try{ const repos=await gh('/user/repos?per_page=10&sort=updated');
    S.messages.push({role:'ai',content:'GitHub repos:\n'+repos.map(r=>'• '+r.full_name).join('\n'),agent:'Git'}); renderMsgs(); go('chat');
  }catch(e){ toast(e.message,'err'); }
}
function renderAgents(){ document.getElementById('agentList').innerHTML=AGENTS.map(a=>`<div class="agent-row"><span class="ico">${a.i}</span><div class="info"><div class="nm">${a.n}</div><div class="ds">${a.d}</div></div><span class="st">Tayyor</span></div>`).join(''); }
function renderFiles(){
  const list=document.getElementById('fileList'); const names=Object.keys(S.files);
  if(!names.length){ list.innerHTML='<div style="padding:12px;color:var(--text3);font-size:13px">Fayl yo‘q — Agent OS kod yaratadi</div>'; return; }
  list.innerHTML=names.map(n=>`<div class="file-row ${S.curFile===n?'active':''}" onclick="openFile('${n.replace(/'/g,"\\'")}')"><span>📄</span><span class="n">${n}</span></div>`).join('');
}
function newFile(){ const n=prompt('Fayl nomi:'); if(!n?.trim()) return; if(S.files[n.trim()]){ toast('Bor','err'); return; } S.files[n.trim()]=''; S.curFile=n.trim(); document.getElementById('edName').textContent=n.trim(); document.getElementById('ed').value=''; save(); renderFiles(); go('files'); toast('Yaratildi','ok'); }
function openFile(n){ if(S.curFile) S.files[S.curFile]=document.getElementById('ed').value; S.curFile=n; document.getElementById('edName').textContent=n; document.getElementById('ed').value=S.files[n]||''; renderFiles(); }
function saveFile(){ if(!S.curFile){ toast('Fayl tanlang','err'); return; } S.files[S.curFile]=document.getElementById('ed').value; save(); toast('Saqlandi','ok'); }
function dlFile(){ if(!S.curFile) return; const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([document.getElementById('ed').value],{type:'text/plain'})); a.download=S.curFile; a.click(); }
function delFile(){ if(!S.curFile||!confirm('O‘chirish?')) return; delete S.files[S.curFile]; S.curFile=null; document.getElementById('edName').textContent='Fayl tanlanmagan'; document.getElementById('ed').value=''; save(); renderFiles(); toast('O‘chirildi','ok'); }
function renderStats(){ document.getElementById('sReq').textContent=S.stats.req; document.getElementById('sTok').textContent=S.stats.tok.toLocaleString(); document.getElementById('sFil').textContent=Object.keys(S.files).length; document.getElementById('sPrj').textContent=Object.keys(S.projects).length; }
function clearChat(){ if(!confirm('Chatni tozalash?')) return; S.messages=[]; save(); document.getElementById('msgs').innerHTML=`<div class="msg ai"><div class="msg-role">OmniCode</div><div class="msg-body">Chat tozalandi. Vibe coding — vazifa yozing.</div></div>`; toast('Tozalandi','ok'); }
function wipe(){ if(!confirm('Hammasi o‘chadi?')) return; localStorage.removeItem(SK); location.reload(); }
load(); updDot(); renderMsgs(); renderFiles();
