# OmniCode — Keyingi AI Sessiyasi Uchun To'liq Kontekst

## Loyiha
**OmniCode 3.0** — Telegram Mini App sifatida ishlaydigan AI coding assistant.
- Foydalanuvchi: xojasoipov@gmail.com
- GitHub: xojasoipov-sketch/Useg-kop
- Branch: `claude/shuni-chuntr-va-qil-60bfra`
- Deploy: GitHub Pages → `gh-pages` branch (peaceiris/actions-gh-pages@v4)
- Supabase: tomkxsdkerpbvlumubbg.supabase.co

## Fayllar
```
omnicode/
  frontend/
    app.js          ← BARCHA JavaScript (~2500 qator, bitta fayl)
    index.html      ← HTML + inline CSS + nav
    styles/main.css ← Qo'shimcha stillar
  AI_CONTEXT.md    ← Bu fayl
.github/workflows/pages.yml  ← GitHub Actions deploy
CLAUDE.md          ← Claude Code qo'llanmasi
```

## app.js Modullar Tuzilmasi
```javascript
Store         // localStorage wrapper: Store.get/set('key', default)
Analytics     // token/request tracking
Tasks         // running tasks list
SB            // Supabase: upsertProject, upsertFile, syncAll, pullAll
Git           // GitHub API: repos, pushFile, getFileContent, importRepoToProject
GitTools      // AI→GitHub tool protocol: <GH_LIST_REPOS/> <GH_READ_FILE> etc
SelfImport    // O'z kodini import: SelfImport.run()
SelfHeal      // O'z-o'zini tuzatish: SelfHeal.analyze()
FS            // Virtual File System: FS.read/write/index/context(projectId)
PM            // Project Manager: PM.list/get/create/update/delete/current
StreamAI      // SSE streaming: openrouter + groq
AIRouter      // Multi-provider: openrouter→groq→anthropic→gemini→deepseek→mistral→pollinations
MODELS        // Model list with stream: true/false
AI            // Chat: send, appendBubble, toggleTool, _loadGithubContext
DiffView      // LCS diff viewer: approve/reject per file
Palette       // Command palette: Palette.open(), 15+ commands
Deploy        // GitHub Pages deploy: Deploy.start(), Deploy.push()
Settings      // Tabbed settings: refresh, tab, toggleStream, exportKeys
Home          // Home screen refresh
Projects      // Projects list render
App           // Navigation: App.nav('chat'|'projects'|'settings'|'deploy'|'agents')
```

## GitHub Tool Protocol (MUHIM)
AI javobida quyidagi XML taglar → app.js execute qiladi:
```xml
<GH_LIST_REPOS/>
<GH_LIST_FILES owner="xojasoipov-sketch" repo="Useg-kop" path="omnicode/frontend"/>
<GH_READ_FILE owner="xojasoipov-sketch" repo="Useg-kop" path="omnicode/frontend/app.js"/>
<GH_WRITE_FILE owner="xojasoipov-sketch" repo="Useg-kop" path="omnicode/frontend/app.js" message="fix: description">
...fayl kontenti...
</GH_WRITE_FILE>
<GH_CREATE_REPO name="repo-nomi" private="false"/>
```

## Write Protocol (Lokal VFS)
```xml
<WRITE_FILE path="relative/path/file.js">
...fayl kontenti...
</WRITE_FILE>
```
Foydalanuvchi diff ko'rib tasdiqlaydi (Cursor-style).

## Slash Buyruqlar
```
/fix      → SelfHeal.analyze() — AI o'z xatolarini topadi
/sync     → SB.syncAll() — Supabase ga push
/pull     → SB.pullAll() — Supabase dan pull
/github   → Git repos yuklanadi, AI kontekstga qo'shiladi
/self     → SelfImport.run() — OmniCode o'z kodini import qiladi
/import owner/repo → GitHub repo ni loyihaga import qilish
/model    → Model picker ochiladi
/clear    → Chat tozalanadi
```

## Sozlamalar (localStorage kalitlari)
```javascript
Store.get('keys') = {
  or1, or2, or3, or4,  // OpenRouter keys
  groq,                 // Groq key
  anthropic,            // Anthropic key
  gemini,               // Gemini key
  deepseek,             // DeepSeek key
  mistral,              // Mistral key
  together,             // Together AI key
  github,               // GitHub Personal Access Token
}
Store.get('model')     // Tanlangan model
Store.get('projects')  // Loyihalar ro'yxati
Store.get('anon_uid')  // Supabase user ID
```

## Supabase Jadvallar
```sql
omnicode_projects (id, user_id, name, template, github, starred, created_at, updated_at)
omnicode_files    (id, project_id, path, content, updated_at)  -- unique(project_id, path)
omnicode_chats    (id, user_id, project_id, role, content, created_at)
```

## Qoidalar
1. Barcha UI text O'zbek tilida
2. Foydalanuvchi telefonda, Termux yo'q — GitHub Pages orqali deploy
3. Bot token yoki API keylarni hech qachon git ga push qilma
4. Supabase anon key hardcoded bo'lishi xavfsiz (public key)
5. index.html + app.js — bitta faylda barcha kod (bundle yo'q)
6. Branch: `claude/shuni-chuntr-va-qil-60bfra` — shu branchga push qil

## Qanday davom etish
```bash
# 1. Repo ni clone qil
git clone https://github.com/xojasoipov-sketch/Useg-kop
cd Useg-kop
git checkout claude/shuni-chuntr-va-qil-60bfra

# 2. Fayllarni o'zgartir
# app.js va index.html ni tahrirlang

# 3. Push qil
git add omnicode/frontend/
git commit -m "feat: ..."
git push origin claude/shuni-chuntr-va-qil-60bfra
```

GitHub Actions avtomatik deploy qiladi.
