// OmniCode asosiy JavaScript fayli
class OmniCode {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialMessages();
    }

    setupEventListeners() {
        document.getElementById('sendButton').addEventListener('click', () => this.sendMessage());
        document.getElementById('userInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Emoji picker bilan ishlash
        const emojiPicker = document.getElementById('emojiPicker');
        emojiPicker.addEventListener('emoji-click', event => {
            const emoji = event.detail.unicode;
            document.getElementById('userInput').value += this.addPremiumBadge(emoji);
        });
    }

    loadInitialMessages() {
        // Boshlang'ich xabarlarni yuklash
        const messages = this.getInitialMessages();
        this.displayMessages(messages);
    }

    const results = [];
    let ok = 0;

    for (const filePath of this.FILES) {
      try {
        // Try GitHub API first
        const token = Git.token();
        let content = null;
        if (token) {
          content = await Git.getFileContent(this.REPO_OWNER, this.REPO_NAME, filePath, this.BRANCH);
        }
        // Fallback: fetch from GitHub Pages raw URL
        if (!content) {
          const raw = `https://raw.githubusercontent.com/${this.REPO_OWNER}/${this.REPO_NAME}/${this.BRANCH}/${filePath}`;
          const res = await fetch(raw);
          if (res.ok) content = await res.text();
        }
        if (content) {
          FS.write(this.PROJECT_ID, filePath, content);
          results.push(`✅ ${filePath} (${(content.length/1024).toFixed(1)}kb)`);
          ok++;
        } else {
          results.push(`⚠️ ${filePath} — yuklanmadi`);
        }
      } catch (e) {
        results.push(`❌ ${filePath}: ${e.message}`);
      }
    }

    // Add AI context file so next AI knows everything
    const contextFile = this._buildContextFile();
    FS.write(this.PROJECT_ID, 'AI_CONTEXT.md', contextFile);
    results.push(`✅ AI_CONTEXT.md — AI uchun kontekst`);

    // Sync to Supabase
    try {
      await SB.syncAll();
      results.push(`☁️ Supabase'ga saqlandi`);
    } catch {}

    // Set as current project
    PM.setCurrent(this.PROJECT_ID);

    const summary = `📦 **OmniCode Manba Kodi import qilindi!**\n\n${results.join('\n')}\n\n**${ok}/${this.FILES.length}** fayl muvaffaqiyatli\n\nEndi AI Chat ga o'tib "@omnicode/frontend/app.js ni tahrirlash" deb so'rasangiz, AI loyiha kodiga ega bo'lib ishlaydi.`;

    // Show in AI chat
    App.nav('chat');
    AI.appendBubble('ai', summary, false);
    toast(`✅ ${ok} ta fayl import qilindi`);
  },

  // Loyiha yo'q bo'lsa yaratib active qiladi (async, tez)
  async ensureProject() {
    if (!PM.get(this.PROJECT_ID)) {
      const projects = PM.list();
      projects.unshift({
        id: this.PROJECT_ID,
        name: 'OmniCode — Manba Kodi',
        template: 'self',
        created: Date.now(),
        updated: Date.now(),
        github: { owner: this.REPO_OWNER, repo: this.REPO_NAME, branch: this.BRANCH },
        starred: true,
      });
      Store.set('projects', projects);
    }
    State.projectId = this.PROJECT_ID;
    PM.setCurrent(this.PROJECT_ID);
  },

  _buildContextFile() {
    return `# OmniCode — AI Kontekst Fayli
Yaratilgan: ${new Date().toISOString()}

## Loyiha haqida
OmniCode — Telegram Mini App sifatida ishlaydigan AI coding assistant.
Foydalanuvchi: xojasoipov@gmail.com
GitHub: xojasoipov-sketch/Useg-kop
Branch: claude/shuni-chuntr-va-qil-60bfra
Deploy: GitHub Pages (peaceiris/actions-gh-pages@v4)

## Arxitektura
- \`omnicode/frontend/app.js\` — Barcha JavaScript logika (bitta fayl, ~2000 qator)
- \`omnicode/frontend/index.html\` — Barcha HTML + CSS
- \`omnicode/frontend/styles/main.css\` — Qo'shimcha stillar
- Supabase: tomkxsdkerpbvlumubbg.supabase.co (anon key hardcoded, xavfsiz)

## Asosiy modullar (app.js ichida)
- \`Store\` — localStorage wrapper
- \`SB\` — Supabase cloud sync
- \`Git\` — GitHub API (browser fetch)
- \`GitTools\` — AI→GitHub tool protocol (<GH_*> tags)
- \`SelfImport\` — O'z kodini import qilish
- \`SelfHeal\` — O'z-o'zini tuzatish
- \`StreamAI\` — SSE streaming (OpenRouter + Groq)
- \`AIRouter\` — Multi-provider fallback
- \`FS\` — Virtual File System (localStorage)
- \`PM\` — Project Manager
- \`DiffView\` — LCS diff viewer (approve/reject)
- \`Palette\` — Command palette (⌘K)
- \`Deploy\` — GitHub Pages deploy
- \`AI\` — Chat logic + tool dispatch
- \`Settings\` — Tabbed settings panel
- \`App\` — Navigation, init

## GitHub Tool Protocol
AI javobida quyidagi taglar → app.js execute qiladi:
\`\`\`
<GH_LIST_REPOS/>
<GH_LIST_FILES owner="x" repo="y" path=""/>
<GH_READ_FILE owner="x" repo="y" path="file.js"/>
<GH_WRITE_FILE owner="x" repo="y" path="file.js" message="commit msg">content</GH_WRITE_FILE>
<GH_CREATE_REPO name="repo" private="false"/>
\`\`\`

## Davom ettirish uchun
1. Sozlamalar → GitHub token kiriting
2. AI Chat → 🐙 GitHub chip → repolar yuklanadi
3. "@AI_CONTEXT.md" deb murojaat qiling — bu fayl
4. "/import xojasoipov-sketch/Useg-kop" → loyiha yangilanadi
`;
  },
};

// ══════════════════════════════════════════════════════════════
//  SELF IMPROVE — OmniCode o'zini-o'zi avtonom yaxshilaydi
// ══════════════════════════════════════════════════════════════
const SelfImprove = {

  // OmniCode o'z kodini o'qib, yaxshilab, o'zi push qiladi
  async run(userTask = '') {
    if (!Git.token()) {
      App.nav('ai');
      AI.appendBubble('ai', `❌ **GitHub token kerak**\n\nSozlamalar → Kod → GitHub tokenini qo'shing. Token bilan OmniCode o'z kodini o'zgartirib, avtomatik deploy qila oladi.`, false);
      return;
    }

    App.nav('ai');
    await SelfImport.ensureProject();

    // 1. O'z kodini GitHub dan yuklab oladi
    AI.appendBubble('ai', `🔄 **O'z kodini o'qiyapman...**\n\nomnicode/frontend/app.js GitHub'dan yuklanmoqda...`, false);

    let appJs = '', indexHtml = '';
    try {
      appJs = await Git.getFileContent(
        SelfImport.REPO_OWNER, SelfImport.REPO_NAME,
        'omnicode/frontend/app.js', SelfImport.BRANCH
      );
      indexHtml = await Git.getFileContent(
        SelfImport.REPO_OWNER, SelfImport.REPO_NAME,
        'omnicode/frontend/index.html', SelfImport.BRANCH
      );
    } catch(e) {
      AI.appendBubble('ai', `❌ Kod o'qishda xato: ${e.message}`, false);
      return;
    }

    if (!appJs) {
      AI.appendBubble('ai', `❌ app.js yuklanmadi. GitHub token to'g'ri ekanini tekshiring.`, false);
      return;
    }

    // VFS ga saqlash
    FS.write(SelfImport.PROJECT_ID, 'omnicode/frontend/app.js', appJs);
    if (indexHtml) FS.write(SelfImport.PROJECT_ID, 'omnicode/frontend/index.html', indexHtml);

    AI.appendBubble('ai', `✅ Kod o'qildi (${(appJs.length/1024).toFixed(0)}KB). AI tahlil qilyapti...`, false);

    // 2. AI ga topshiriq beradi
    const task = userTask || 'xatolarni tuzat, tezlikni yaxshila, foydalanuvchi tajribasini yaxshila';
    const prompt = `Sen OmniCode AI coding assistant'ning o'zi. Quyida o'z manba koding berilgan.

VAZIFA: ${task}

QOIDALAR:
1. Kodni sinchiklab o'qi
2. Muammolarni aniqlash: xatolar, cheklovlar, yaxshilash mumkin bo'lgan joylar
3. Yaxshilashlarni qil
4. TO'LIQ yangilangan faylni WRITE_FILE bilan yoz — faqat o'zgargan qism emas, butun fayl
5. Nima o'zgartirganingni qisqacha tushuntir

WRITE_FILE format:
\`\`\`write_file:omnicode/frontend/app.js
[to'liq yangilangan kod bu yerda]
\`\`\`

MUHIM: Men (tizim) avtomatik GitHub'ga push qilib, deploy qilaman. Sen faqat to'liq kodni yoz.

=== app.js (${(appJs.length/1024).toFixed(0)}KB) ===
\`\`\`javascript
${appJs}
\`\`\``;

    // 3. AI ga yuboradi
    const messages = [
      { role: 'system', content: `Sen OmniCode — o'z-o'zini yaxshilovchi AI. O'z kodingni o'qib, yaxshilab, WRITE_FILE format bilan qaytarassan. Faqat o'zbek tilida javob ber.` },
      { role: 'user', content: prompt }
    ];

    AI.showTyping();
    AI.busy = true;
    AI._busySince = Date.now();
    ActivityBar.setPhase('thinking');

    let reply;
    try {
      reply = await AIRouter.call(messages);
    } catch(e) {
      AI.hideTyping();
      AI.busy = false;
      ActivityBar.error();
      AI.appendBubble('ai', `❌ AI xatosi: ${e.message}\n\n/setup buyrug'i bilan AI kalitini qo'shing.`, false);
      return;
    }

    AI.hideTyping();
    ActivityBar.setPhase('writing');

    // 4. Javobni ko'rsatadi
    const div = AI.appendBubble('ai', reply, false);

    // 5. WRITE_FILE ni parse qilib push qiladi
    const writes = FS.parseWrites(reply);
    if (writes.length) {
      // Xavfsizlik: app.js yoki index.html uchun hajm tekshiruvi
      const CRITICAL_FILES = ['app.js', 'index.html'];
      const safeWrites = [];
      for (const w of writes) {
        const isCritical = CRITICAL_FILES.some(f => w.path.endsWith(f));
        if (isCritical) {
          // Joriy faylni GitHub dan olib hajmini solishtirish
          try {
            const url = `https://raw.githubusercontent.com/${SelfImport.REPO_OWNER}/${SelfImport.REPO_NAME}/${SelfImport.BRANCH}/${w.path}`;
            const cur = await fetch(url).then(r => r.text());
            const ratio = w.content.length / cur.length;
            if (ratio < 0.7) {
              // Yangi fayl 30% dan kichik — xavfli, rad etamiz
              AI.appendBubble('ai', `⚠️ **Xavfsizlik filtri:** \`${w.path}\` hajmi ${Math.round(ratio*100)}% ga tushib qoldi (${w.content.length} vs ${cur.length} belgi). Push bekor qilindi — fayl buzilgan bo'lishi mumkin.`, false);
              toast('⛔ Hajm filtri: ' + w.path + ' push qilinmadi');
              continue;
            }
          } catch(e) { /* fetch xato bo'lsa o'tkazib yubormaymiz */ }
        }
        safeWrites.push(w);
      }
      writes.length = 0; writes.push(...safeWrites);

      writes.forEach(w => FS.write(SelfImport.PROJECT_ID, w.path, w.content));
      ActivityBar.setPhase('pushing');
      AI._showStatus('🚀 O\'zgarishlar GitHub\'ga push qilinmoqda...');
      let pushed = 0;
      for (const w of writes) {
        try {
          await Git.pushFile(SelfImport.REPO_OWNER, SelfImport.REPO_NAME, w.path, w.content, SelfImport.BRANCH, `self-improve: ${task.slice(0,60)}`);
          pushed++;
        } catch(e) { console.warn('push fail:', w.path, e.message); }
      }
      AI._hideStatus();
      if (pushed > 0) {
        AI.appendBubble('ai', `✅ **${pushed} ta fayl GitHub'ga push qilindi!**\n\nGitHub Actions avtomatik deploy qilmoqda...\n🔗 [GitHub Pages'da ko'rish](https://xojasoipov-sketch.github.io/Useg-kop/)`, false);
        toast(`✅ Self-improve: ${pushed} ta fayl yangilandi`);
      } else {
        AI.appendBubble('ai', `⚠️ Push qilishda xato. GitHub token'ni tekshiring.`, false);
      }
    } else {
      AI.appendBubble('ai', `ℹ️ AI hech qanday o'zgartirish qilmadi. Aniqroq vazifa bering.`, false);
    }

    if (div) AI._addBubbleActions(div, reply, writes);
    AI.busy = false;
    ActivityBar.done();
    Analytics.track(Math.floor(reply.length / 4));
    State.chatHistory.push({ role: 'assistant', content: reply });
  },
};

// ══════════════════════════════════════════════════════════════
const SelfHeal = {
  async analyze() {
    let projectId = State.projectId;

    // Loyiha yo'q → SelfImport loyihasiga o'tamiz (agar token bor bo'lsa)
    if (!projectId && Git.token()) {
      await SelfImport.ensureProject();
      projectId = SelfImport.PROJECT_ID;
    }

    // GitHub token yo'q bo'lsa — o'z kodini tahlil qilish imkonsiz
    if (!projectId) {
      App.nav('ai');
      AI.appendBubble('ai', `⚠️ **Loyiha yoki GitHub token kerak**\n\n1. Sozlamalar → GitHub Token qo'shing\n2. Yoki Loyihalar → Yangi loyiha yarating`, false);
      return;
    }

    // Loyiha SelfImport bo'lsa — GitHub dan faylni yuklab olamiz
    if (projectId === SelfImport.PROJECT_ID) {
      App.nav('ai');
      AI.appendBubble('ai', `🔧 **O'z-o'zini tuzatish** — OmniCode o'z kodini tekshirmoqda...`, false);
      const taskId2 = Tasks.add('🔧 SelfHeal', 'O\'z kodi tahlil qilinmoqda');
      try {
        AI._showStatus('📖 OmniCode kodi GitHub dan yuklanmoqda...');
        const code = await Git.getFileContent('xojasoipov-sketch', 'Useg-kop', 'omnicode/frontend/app.js', 'claude/shuni-chuntr-va-qil-60bfra');
        AI._hideStatus();
        if (!code) throw new Error('Fayl GitHub dan yuklanmadi');
        FS.write(SelfImport.PROJECT_ID, 'omnicode/frontend/app.js', code);
        const msgs = [
          { role: 'system', content: AI.system() },
          { role: 'user', content: `OmniCode app.js kodini tahlil qil, xatolarni topib tuzat:\n\`\`\`js\n${code.slice(0,15000)}\n\`\`\`` },
        ];
    }

    sendMessage() {
        const input = document.getElementById('userInput');
        let message = input.value.trim();

        if (message) {
            // Barcha emojilarga premium belgisini qo'shish
            message = this.addPremiumBadgesToMessage(message);
            this.addMessage(message, true);
            input.value = '';

            // AI javobini kuting
            setTimeout(() => {
                this.addMessage("🤖 Men sizning so'rovingizni qayta ishlayapman...", false);
            }, 500);
        }
    }

    addPremiumBadge(emoji) {
        // Emojiga premium belgisini qo'shish
        return `<span class="premium-emoji">${emoji}</span>`;
    }

    addPremiumBadgesToMessage(text) {
        // Matndagi barcha emojilarga premium belgisini qo'shish
        const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1F004}\u{1F0CF}\u{1F191}-\u{1F251}\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0063}\u{E0073}\u{E0070}\u{E007F}]/gu;
        return text.replace(emojiRegex, match => this.addPremiumBadge(match));
    }

    addMessage(text, isUser) {
        const messagesDiv = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;

        // Emojilarga premium belgisini qo'shish
        const processedText = this.addPremiumBadgesToMessage(text);

        messageDiv.innerHTML = marked.parse(processedText);
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    displayMessages(messages) {
        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML = '';
        messages.forEach(msg => this.addMessage(msg.text, msg.isUser));
    }
}

// Dasturni ishga tushiramiz
new OmniCode();