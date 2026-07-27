const OS_PROMPT = `Sen oddiy chatbot emassan. Sen Professional AI Software Engineering Operating Systemsan (OmniCode AI Engine).
Agentlar: Core Brain, Planner, Project Analyzer, Context Engine, Tool Engine, Code Editor, Reviewer, Memory Engine.
Avval mavjud kodni tushun, keyin yaxshila. Arxitekturani buzma. Taxmin qilma.
O'zbekcha yozsa o'zbekcha javob ber. Kod to'liq ishlaydigan bo'lsin.`;

/* AGENT_PROMPTS in agents.js */
if (typeof AGENT_PROMPTS === 'undefined') {
  var AGENT_PROMPTS = {
    core_brain: 'Sen Core Brain. Qaror qabul qil.',
    planner: 'Sen Planner. Reja tuz.',
    project_analyzer: 'Sen Project Analyzer. Loyihani tahlil qil.',
    context_engine: 'Sen Context Engine. Kerakli fayllarni tanla.',
    tool_engine: 'Sen Tool Engine. Amallar rejasini ber.',
    code_editor: 'Sen Code Editor. Minimal kod yoz.',
    reviewer: 'Sen Reviewer. Tekshir va git commit yoz.',
    memory_engine: 'Sen Memory Engine. Qisqa xotira yoz.'
  };
}

const AGENTS = [
  {i:'🧠',n:'Core Brain',d:'Qaror qabul',k:'core_brain'},
  {i:'📋',n:'Planner',d:'Rejalashtirish',k:'planner'},
  {i:'🔍',n:'Analyzer',d:'Loyiha tahlili',k:'project_analyzer'},
  {i:'📎',n:'Context',d:'Fayl tanlash',k:'context_engine'},
  {i:'🔧',n:'Tools',d:'Amallar',k:'tool_engine'},
  {i:'✏️',n:'Editor',d:'Kod tahrir',k:'code_editor'},
  {i:'✅',n:'Reviewer',d:'Tekshiruv',k:'reviewer'},
  {i:'💾',n:'Memory',d:'Xotira',k:'memory_engine'}
];

const MODELS = {
  pollinations: [{v:'openai',n:'Default'},{v:'openai-large',n:'Large'},{v:'qwen-coder',n:'Qwen Coder'}],
  openrouter: [
    {v:'meta-llama/llama-3.3-70b-instruct:free',n:'Llama 3.3 70B'},
    {v:'deepseek/deepseek-r1:free',n:'DeepSeek R1'},
    {v:'qwen/qwen-2.5-72b-instruct:free',n:'Qwen 2.5 72B'}
  ],
  groq: [{v:'llama-3.3-70b-versatile',n:'Llama 3.3 70B'},{v:'llama-3.1-8b-instant',n:'Llama 8B Fast'}],
  custom: [{v:'default',n:'Custom'}]
};

const SK = 'oc_os_mobile_v2';
let S = {
  provider:'pollinations', apiKey:'', model:'openai', customUrl:'',
  maxTokens:8192, mode:'fast',
  messages:[], files:{}, curFile:null, projects:{},
  memory:[], stats:{req:0, tok:0}
};

function load(){ try{ const r=localStorage.getItem(SK); if(r) Object.assign(S,JSON.parse(r)); }catch(e){} }
function save(){ localStorage.setItem(SK, JSON.stringify({...S, messages:S.messages.slice(-40), memory:S.memory.slice(-20)})); }

function toast(m,t=''){ const e=document.getElementById('toast'); e.textContent=m; e.className='toast show '+t; setTimeout(()=>e.classList.remove('show'),2500); }
function grow(el){ el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,100)+'px'; }
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
  S.mode=m;
  document.getElementById('chip-fast').classList.toggle('active', m==='fast');
  document.getElementById('chip-os').classList.toggle('active', m==='os');
}

function onProv(){
  const p=document.getElementById('prov').value;
  document.getElementById('keyBox').style.display = p==='pollinations'?'none':'block';
  document.getElementById('urlBox').style.display = p==='custom'?'block':'none';
  document.getElementById('keyLbl').textContent = p==='openrouter'?'OpenRouter Key':p==='groq'?'Groq Key':'API Key';
  const sel=document.getElementById('model');
  sel.innerHTML='';
  (MODELS[p]||[]).forEach(m=>{ const o=document.createElement('option'); o.value=m.v; o.textContent=m.n; sel.appendChild(o); });
}
function applySet(){
  document.getElementById('prov').value=S.provider;
  document.getElementById('key').value=S.apiKey;
  document.getElementById('url').value=S.customUrl;
  document.getElementById('maxTok').value=S.maxTokens;
  onProv();
  document.getElementById('model').value=S.model;
}
function saveSet(){
  S.provider=document.getElementById('prov').value;
  S.apiKey=document.getElementById('key').value.trim();
  S.model=document.getElementById('model').value;
  S.customUrl=document.getElementById('url').value.trim();
  S.maxTokens=parseInt(document.getElementById('maxTok').value)||8192;
  save(); updDot(); toast('Saqlandi','ok');
}
function updDot(){
  document.getElementById('dot').className='dot'+(S.provider==='pollinations'||S.apiKey||S.customUrl?'':' off');
}

function fmt(t){
  let h=t.replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>');
  h=h.replace(/```(\w*)\n?([\s\S]*?)```/g,(_,l,c)=>`<pre><code>${c.trim()}</code></pre>`);
  h=h.replace(/`([^`]+)`/g,'<code>$1</code>');
  h=h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  h=h.replace(/^### (.+)$/gm,'<h3>$1</h3>');
  h=h.replace(/^## (.+)$/gm,'<h2>$1</h2>');
  h=h.replace(/^- (.+)$/gm,'• $1');
  h=h.replace(/\n/g,'<br>');
  return h;
}

function renderMsgs(){
  const box=document.getElementById('msgs');
  if(!S.messages.length) return;
  box.innerHTML='';
  S.messages.forEach(m=>{
    const d=document.createElement('div');
    d.className='msg '+m.role;
    const role=m.role==='user'?'Siz':(m.agent||'OmniCode AI');
    const badge=m.agent?`<span class="badge">${m.agent}</span>`:'';
    d.innerHTML=`<div class="msg-role">${role} ${badge}</div>
      <div class="msg-body">${m.role==='ai'?fmt(m.content):m.content.replace(/</g,'<').replace(/\n/g,'<br>')}</div>
      ${m.meta?`<div class="msg-meta">${m.meta}</div>`:''}`;
    box.appendChild(d);
  });
  box.scrollTop=box.scrollHeight;
}

async function callAI(msgs, systemOverride){
  const sys = systemOverride || OS_PROMPT;
  const messages=[{role:'system',content:sys},...msgs];
  const body={model:S.model,messages,max_tokens:S.maxTokens,temperature:0.55};
  let url, headers={'Content-Type':'application/json'};
  if(S.provider==='pollinations') url='https://text.pollinations.ai/openai';
  else if(S.provider==='openrouter'){
    if(!S.apiKey) throw new Error('OpenRouter key kerak');
    url='https://openrouter.ai/api/v1/chat/completions';
    headers['Authorization']='Bearer '+S.apiKey;
    headers['HTTP-Referer']=location.origin;
    headers['X-Title']='OmniCode-Mobile';
  } else if(S.provider==='groq'){
    if(!S.apiKey) throw new Error('Groq key kerak');
    url='https://api.groq.com/openai/v1/chat/completions';
    headers['Authorization']='Bearer '+S.apiKey;
  } else if(S.provider==='custom'){
    if(!S.customUrl) throw new Error('URL kerak');
    url=S.customUrl.replace(/\/$/,'')+'/chat/completions';
    if(S.apiKey) headers['Authorization']='Bearer '+S.apiKey;
  } else throw new Error('Provayder tanlang');

  const res=await fetch(url,{method:'POST',headers,body:JSON.stringify(body)});
  if(!res.ok){ const t=await res.text().catch(()=>''); throw new Error('HTTP '+res.status+': '+t.slice(0,100)); }
  const data=await res.json();
  const content=data.choices?.[0]?.message?.content;
  if(!content) throw new Error('Bo‘sh javob');
  const tokens=data.usage?.total_tokens||Math.ceil((JSON.stringify(messages)+content).length/4);
  S.stats.req++; S.stats.tok+=tokens; save();
  return {content,tokens,model:data.model||S.model};
}

function filesContext(){
  const keys=Object.keys(S.files);
  if(!keys.length) return 'Loyihada lokal fayl yo‘q.';
  let s='Mavjud fayllar:\n';
  keys.forEach(k=>{
    const body=S.files[k]||'';
    s+=`--- ${k} (${body.length} chars) ---\n${body.slice(0,1500)}\n`;
  });
  return s;
}

function memContext(){
  if(!S.memory.length) return '';
  return '\nXotira:\n'+S.memory.slice(-8).map(m=>'- '+m).join('\n');
}

async function runAgent(key, userMsg, agentLabel){
  const prompt = AGENT_PROMPTS[key] || OS_PROMPT;
  const r = await callAI([{role:'user', content:userMsg}], prompt);
  S.messages.push({role:'ai', content:r.content, agent:agentLabel, meta:`~${r.tokens} tok`});
  renderMsgs();
  return r;
}

async function send(){
  const input=document.getElementById('inp');
  const text=input.value.trim();
  if(!text) return;
  const btn=document.getElementById('send');
  btn.disabled=true;
  input.value=''; input.style.height='auto';

  S.messages.push({role:'user',content:text});
  renderMsgs();

  const box=document.getElementById('msgs');
  const tip=document.createElement('div');
  tip.className='msg ai'; tip.id='tip';
  tip.innerHTML=`<div class="msg-role">OmniCode AI</div><div class="typing"><span></span><span></span><span></span></div>`;
  box.appendChild(tip); box.scrollTop=box.scrollHeight;

  try{
    if(S.mode==='os') await runOS(text);
    else {
      const hist=S.messages.filter(m=>m.role==='user'||m.role==='ai').slice(-10)
        .map(m=>({role:m.role==='ai'?'assistant':'user',content:m.content}));
      const r=await callAI(hist);
      S.messages.push({role:'ai',content:r.content,meta:`${S.provider} · ~${r.tokens} tok`});
    }
  }catch(e){
    S.messages.push({role:'ai',content:'❌ '+e.message});
  }
  document.getElementById('tip')?.remove();
  renderMsgs();
  btn.disabled=false;
  input.focus();
  renderStats();
}

async function runOS(task){
  const pipe=document.getElementById('pipe');
  pipe.classList.add('show');
  const ids=['ps1','ps2','ps3','ps4','ps5'];
  ids.forEach(id=>document.getElementById(id).className='ps');
  function step(i,st){ document.getElementById(ids[i]).className='ps '+st; }

  const ctx = filesContext() + memContext();

  step(0,'run');
  document.getElementById('tip')?.remove();
  const tip0=document.createElement('div');
  tip0.className='msg ai'; tip0.id='tip';
  tip0.innerHTML=`<div class="msg-role">OmniCode AI <span class="badge">Core Brain</span></div><div class="typing"><span></span><span></span><span></span></div>`;
  document.getElementById('msgs').appendChild(tip0);
  const brain = await runAgent('core_brain',
    `Foydalanuvchi vazifasi:\n${task}\n\n${ctx}\n\nQaror qabul qil: qaysi agentlar kerak, qisqa yo‘l.`,
    'Core Brain');
  step(0,'done');

  step(1,'run');
  const tip1=document.createElement('div');
  tip1.className='msg ai'; tip1.id='tip';
  tip1.innerHTML=`<div class="msg-role">OmniCode AI <span class="badge">Planner</span></div><div class="typing"><span></span><span></span><span></span></div>`;
  document.getElementById('msgs').appendChild(tip1);
  const plan = await runAgent('planner',
    `Vazifa: ${task}\n\nCore Brain qarori:\n${brain.content}\n\n${ctx}\n\nReja tuz.`,
    'Planner');
  step(1,'done');

  step(2,'run');
  const tip2=document.createElement('div');
  tip2.className='msg ai'; tip2.id='tip';
  tip2.innerHTML=`<div class="msg-role">OmniCode AI <span class="badge">Context</span></div><div class="typing"><span></span><span></span><span></span></div>`;
  document.getElementById('msgs').appendChild(tip2);
  const ctxR = await runAgent('context_engine',
    `Vazifa: ${task}\nReja:\n${plan.content}\n\n${ctx}\n\nFaqat kerakli fayllarni tanla. Agar yangi kod kerak bo‘lsa, ayt.`,
    'Context');

  const tip3=document.createElement('div');
  tip3.className='msg ai'; tip3.id='tip';
  tip3.innerHTML=`<div class="msg-role">OmniCode AI <span class="badge">Editor</span></div><div class="typing"><span></span><span></span><span></span></div>`;
  document.getElementById('msgs').appendChild(tip3);
  const code = await runAgent('code_editor',
    `Vazifa: ${task}\n\nReja:\n${plan.content}\n\nContext:\n${ctxR.content}\n\n${ctx}\n\nMinimal o‘zgarish bilan ishlaydigan kod yoz. Yangi fayl uchun:\n\`\`\`til\n// filename: nom.ext\nkod\n\`\`\``,
    'Editor');
  extractFiles(code.content);
  step(2,'done');

  step(3,'run'); step(4,'run');
  const tip4=document.createElement('div');
  tip4.className='msg ai'; tip4.id='tip';
  tip4.innerHTML=`<div class="msg-role">OmniCode AI <span class="badge">Reviewer</span></div><div class="typing"><span></span><span></span><span></span></div>`;
  document.getElementById('msgs').appendChild(tip4);
  const rev = await runAgent('reviewer',
    `Kodni review qil:\n${code.content.slice(0,4500)}\n\nXavfsizlik, performance, test, git commit xabari.`,
    'Reviewer');

  const mem = await runAgent('memory_engine',
    `Quyidagi sessiyadan qisqa xotira yoz:\nVazifa: ${task}\nReja qisqacha: ${plan.content.slice(0,400)}\nNatija: ${rev.content.slice(0,400)}`,
    'Memory');
  S.memory.push(mem.content.slice(0,300));
  save();
  step(3,'done'); step(4,'done');
}

function extractFiles(text){
  const re=/```(\w*)\n(?:\/\/\s*filename:\s*([^\n]+)\n)?([\s\S]*?)```/g;
  let m,c=0;
  while((m=re.exec(text))!==null){
    let name=m[2]?.trim();
    const code=m[3].trim();
    if(!name){
      const ext={html:'html',css:'css',javascript:'js',js:'js',python:'py',ts:'ts',json:'json'}[m[1]]||'txt';
      name=`file${++c}.${ext}`;
    } else c++;
    S.files[name]=code;
  }
  if(c){ save(); renderFiles(); toast(c+' ta fayl saqlandi','ok'); }
}

function renderAgents(){
  document.getElementById('agentList').innerHTML=AGENTS.map(a=>
    `<div class="agent-row"><span class="ico">${a.i}</span><div class="info"><div class="nm">${a.n}</div><div class="ds">${a.d}</div></div><span class="st">Tayyor</span></div>`
  ).join('');
}

function renderFiles(){
  const list=document.getElementById('fileList');
  const names=Object.keys(S.files);
  if(!names.length){ list.innerHTML='<div style="padding:12px;color:var(--text3);font-size:13px">Fayl yo‘q</div>'; return; }
  list.innerHTML=names.map(n=>
    `<div class="file-row ${S.curFile===n?'active':''}" onclick="openFile('${n.replace(/'/g,"\\'")}')"><span>📄</span><span class="n">${n}</span></div>`
  ).join('');
}
function newFile(){
  const n=prompt('Fayl nomi:');
  if(!n?.trim()) return;
  if(S.files[n.trim()]){ toast('Bor','err'); return; }
  S.files[n.trim()]=''; S.curFile=n.trim();
  document.getElementById('edName').textContent=n.trim();
  document.getElementById('ed').value='';
  save(); renderFiles(); go('files'); toast('Yaratildi','ok');
}
function openFile(n){
  if(S.curFile) S.files[S.curFile]=document.getElementById('ed').value;
  S.curFile=n;
  document.getElementById('edName').textContent=n;
  document.getElementById('ed').value=S.files[n]||'';
  renderFiles();
}
function saveFile(){
  if(!S.curFile){ toast('Fayl tanlang','err'); return; }
  S.files[S.curFile]=document.getElementById('ed').value;
  save(); toast('Saqlandi','ok');
}
function dlFile(){
  if(!S.curFile) return;
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([document.getElementById('ed').value],{type:'text/plain'}));
  a.download=S.curFile; a.click();
}
function delFile(){
  if(!S.curFile||!confirm('O‘chirish?')) return;
  delete S.files[S.curFile]; S.curFile=null;
  document.getElementById('edName').textContent='Fayl tanlanmagan';
  document.getElementById('ed').value='';
  save(); renderFiles(); toast('O‘chirildi','ok');
}

function renderStats(){
  document.getElementById('sReq').textContent=S.stats.req;
  document.getElementById('sTok').textContent=S.stats.tok.toLocaleString();
  document.getElementById('sFil').textContent=Object.keys(S.files).length;
  document.getElementById('sPrj').textContent=Object.keys(S.projects).length;
}

function clearChat(){
  if(!confirm('Chatni tozalash?')) return;
  S.messages=[]; save();
  document.getElementById('msgs').innerHTML=`<div class="msg ai"><div class="msg-role">OmniCode AI</div><div class="msg-body">Chat tozalandi. Yangi vazifa yozing.</div></div>`;
  toast('Tozalandi','ok');
}
function wipe(){
  if(!confirm('Hammasi o‘chadi?')) return;
  localStorage.removeItem(SK); location.reload();
}

load();
updDot();
renderMsgs();
renderFiles();
