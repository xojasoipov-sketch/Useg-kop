const OS_PROMPT = `Sen oddiy chatbot emassan. Sen Professional AI Software Engineering Operating Systemsan.
Vazifa: mavjud kodni tushunish, tahlil qilish, yaxshilash va production darajasiga olib chiqish.
Yangi loyiha yozishga shoshilma — avval mavjud kodni tushun, keyin yaxshila.
Hech qachon mavjud arxitekturani buzma. Taxmin qilma. API o'ylab topma.
Ishlash: Scan → Analyze → Plan → Modify → Review → Optimize → Test → Git Diff → User Approval.
Kod stil: Production-ready, SOLID, Clean Architecture, modular, secure, scalable.
UI: Apple/Cursor/Linear/Notion uslubi — minimal, dark mode, pixel perfect.
Javob formati:
1. Vazifa 2. Tahlil 3. Reja 4. Fayllar 5. Risk 6. Kod 7. Review 8. Test 9. Git 10. Keyingi tavsiya
O'zbek tilida javob ber agar foydalanuvchi o'zbekcha yozsa. Kod to'liq va ishlaydigan bo'lsin.`;

const AGENTS = [
  {i:'👔',n:'CEO',d:'Strategiya'},
  {i:'📋',n:'Planner',d:'Rejalashtirish'},
  {i:'🔍',n:'Research',d:'Tahlil'},
  {i:'🏗️',n:'Architect',d:'Arxitektura'},
  {i:'🎨',n:'Frontend',d:'UI/UX'},
  {i:'⚙️',n:'Backend',d:'Server/API'},
  {i:'🗄️',n:'Database',d:'DB'},
  {i:'🔒',n:'Security',d:'Xavfsizlik'},
  {i:'🧪',n:'Testing',d:'Test'},
  {i:'✅',n:'Reviewer',d:'Kod review'},
  {i:'📦',n:'Git',d:'Commit'},
  {i:'🚀',n:'Deploy',d:'Deploy'}
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

const SK = 'oc_os_mobile_v1';
let S = {
  provider:'pollinations', apiKey:'', model:'openai', customUrl:'',
  maxTokens:8192, mode:'fast',
  messages:[], files:{}, curFile:null, projects:{},
  stats:{req:0, tok:0}
};

function load(){ try{ const r=localStorage.getItem(SK); if(r) Object.assign(S,JSON.parse(r)); }catch(e){} }
function save(){ localStorage.setItem(SK, JSON.stringify({...S, messages:S.messages.slice(-50)})); }

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

async function callAI(msgs){
  const messages=[{role:'system',content:OS_PROMPT},...msgs];
  const body={model:S.model,messages,max_tokens:S.maxTokens,temperature:0.6};
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
  if(!content) throw new Error('Bo\'sh javob');
  const tokens=data.usage?.total_tokens||Math.ceil((JSON.stringify(messages)+content).length/4);
  S.stats.req++; S.stats.tok+=tokens; save();
  return {content,tokens,model:data.model||S.model};
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

  const filesCtx=Object.keys(S.files).length
    ? '\nMavjud fayllar: '+Object.keys(S.files).join(', ')
    : '';

  function step(i,st){ document.getElementById(ids[i]).className='ps '+st; }

  step(0,'run'); step(1,'run');
  const plan=await callAI([{role:'user',content:
    `Vazifa: ${task}${filesCtx}\n\nQisqa: 1) Muammoni tushun 2) 5-7 qadamli reja 3) Arxitektura tavsiyasi. O'zbekcha.`
  }]);
  step(0,'done'); step(1,'done');
  S.messages.push({role:'ai',content:plan.content,agent:'Planner',meta:`~${plan.tokens} tok`});
  renderMsgs();
  document.getElementById('tip')?.remove();

  const box=document.getElementById('msgs');
  const tip=document.createElement('div');
  tip.className='msg ai'; tip.id='tip';
  tip.innerHTML=`<div class="msg-role">OmniCode AI <span class="badge">Coder</span></div><div class="typing"><span></span><span></span><span></span></div>`;
  box.appendChild(tip); box.scrollTop=box.scrollHeight;

  step(2,'run');
  const code=await callAI([{role:'user',content:
    `Vazifa: ${task}\n\nReja:\n${plan.content}\n\nTo'liq ishlaydigan kod yoz. Har fayl uchun:\n\`\`\`til\n// filename: nom.ext\nkod\n\`\`\``
  }]);
  step(2,'done');
  S.messages.push({role:'ai',content:code.content,agent:'Coder',meta:`~${code.tokens} tok`});
  extractFiles(code.content);

  document.getElementById('tip')?.remove();
  const tip2=document.createElement('div');
  tip2.className='msg ai'; tip2.id='tip';
  tip2.innerHTML=`<div class="msg-role">OmniCode AI <span class="badge">Reviewer</span></div><div class="typing"><span></span><span></span><span></span></div>`;
  box.appendChild(tip2); box.scrollTop=box.scrollHeight;

  step(3,'run'); step(4,'run');
  const rev=await callAI([{role:'user',content:
    `Kodni review qil, xavfsizlik/performance tekshir, test tavsiya qil, git commit xabari yoz.\n\n${code.content.slice(0,5000)}`
  }]);
  step(3,'done'); step(4,'done');
  S.messages.push({role:'ai',content:rev.content,agent:'Reviewer',meta:`~${rev.tokens} tok`});
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
