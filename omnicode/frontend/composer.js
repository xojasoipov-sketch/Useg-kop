'use strict';
// Chat Composer — yozish maydoni + fayl + rasm + ovoz

const Composer = {
  pendingFiles: [], // { name, text, type }
  pendingImages: [], // { name, dataUrl, type }

  clearAttach() {
    this.pendingFiles = [];
    this.pendingImages = [];
    this.renderChips();
  },

  renderChips() {
    const box = document.getElementById('composer-attach-chips');
    if (!box) return;
    const items = [
      ...this.pendingFiles.map((f, i) => ({ kind: 'file', i, label: f.name })),
      ...this.pendingImages.map((f, i) => ({ kind: 'img', i, label: f.name })),
    ];
    if (!items.length) {
      box.innerHTML = '';
      box.style.display = 'none';
      return;
    }
    box.style.display = 'flex';
    box.innerHTML = items.map(it =>
      `<span class="attach-chip">${it.kind === 'img' ? '🖼' : '📄'} ${it.label}
        <button type="button" onclick="Composer.remove('${it.kind}',${it.i})">×</button></span>`
    ).join('');
  },

  remove(kind, i) {
    if (kind === 'file') this.pendingFiles.splice(i, 1);
    else this.pendingImages.splice(i, 1);
    this.renderChips();
  },

  pickFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.js,.ts,.tsx,.jsx,.py,.html,.css,.json,.md,.txt,.sql,.yml,.yaml,.env,.vue,.go,.rs,.java,.kt,.swift,.php,.rb,.sh,text/*';
    input.onchange = async () => {
      for (const file of [...(input.files || [])]) {
        if (file.size > 400000) { toast('Fayl juda katta: ' + file.name); continue; }
        const text = await file.text();
        this.pendingFiles.push({ name: file.name, text, type: file.type || 'text' });
      }
      this.renderChips();
      toast(this.pendingFiles.length + ' fayl biriktirildi');
    };
    input.click();
  },

  pickImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async () => {
      for (const file of [...(input.files || [])]) {
        if (file.size > 2_000_000) { toast('Rasm katta: ' + file.name); continue; }
        const dataUrl = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        this.pendingImages.push({ name: file.name, dataUrl, type: file.type });
      }
      this.renderChips();
      if (typeof Vision !== 'undefined') {
        // oxirgi rasmni Vision kontekstiga ham
        const last = this.pendingImages[this.pendingImages.length - 1];
        if (last) Store.set('pending_image', { name: last.name, full: last.dataUrl, type: last.type });
      }
      toast(this.pendingImages.length + ' rasm biriktirildi');
    };
    input.click();
  },

  /** AI.send oldidan kontekst */
  buildContextSuffix() {
    let s = '';
    if (this.pendingFiles.length) {
      s += '\n\n[BIRIKTIRILGAN FAYLLAR]\n';
      for (const f of this.pendingFiles) {
        s += `\n--- ${f.name} ---\n${f.text.slice(0, 12000)}\n`;
      }
    }
    if (this.pendingImages.length) {
      s += '\n\n[BIRIKTIRILGAN RASMLAR: ' + this.pendingImages.map(i => i.name).join(', ') + ']\n';
      s += 'Foydalanuvchi UI/screenshot yubordi. Kerak bo\'lsa HTML/CSS yoki komponent yozing (WRITE_FILE).\n';
    }
    return s;
  },

  consume() {
    const suffix = this.buildContextSuffix();
    this.clearAttach();
    return suffix;
  },
};

// AI.send ga composer konteksti
(function wireComposer() {
  if (typeof AI === 'undefined') return;
  const _resolve = AI.resolveRefs?.bind(AI);
  if (_resolve) {
    AI.resolveRefs = async function (text) {
      const base = await _resolve(text);
      return base + (Composer.buildContextSuffix() || '');
    };
  }

  // clear attach after successful send path in coding-brain / AI
  const orig = AI.send.bind(AI);
  // coding-brain may override; hook after load via soft wrap on resolve only is enough
})();

// O'zbekcha welcome override
(function uzWelcome() {
  if (typeof AI === 'undefined') return;
  AI.addWelcome = function () {
    const el = document.getElementById('chat-messages');
    if (!el) return;
    el.innerHTML = '';
    this.appendBubble('ai', `**Coding Brain** — mobil dasturchi yordamchisi

**Nima qila olaman:**
- To‘liq fayl va loyiha yozish
- Kodni tahrirlash, tuzatish, tushuntirish
- GitHubga push
- Agentlar (reja, backend, frontend, xavfsizlik…)

**Boshlash:**
1. **Loyiha** bo‘limida loyiha yarating
2. Nima qurishni yozing yoki fayl/rasm biriktiring
3. Fayllarni **Qo‘llash** bilan saqlang

Nima quramiz?`, false);
  };

  AI.quickAction = async function (action) {
    const last = State.chatHistory.filter(m => m.role === 'assistant').pop();
    if (!last) { toast('Oldingi javob yo‘q'); return; }
    const map = {
      Improve: 'Yaxshila:',
      Explain: 'Tushuntir:',
      Shorter: 'Qisqaroq qil:',
      'Fix bugs': 'Xatolarni top va tuzat:',
      Yaxshila: 'Yaxshila:',
      Tushuntir: 'Tushuntir:',
      Qisqa: 'Qisqaroq qil:',
      Tuzat: 'Xatolarni top va tuzat:',
    };
    await this.send((map[action] || action + ':') + ' ' + last.content.slice(0, 500));
  };

  // bubble chips UZ when rendering AI — patch appendBubble chips labels once
  const _append = AI.appendBubble.bind(AI);
  AI.appendBubble = function (role, text, hasWrites) {
    const div = _append(role, text, hasWrites);
    if (role === 'ai' && div) {
      const chips = div.querySelector('.bubble-chips');
      if (chips) {
        chips.innerHTML = ['Yaxshila', 'Tushuntir', 'Qisqa', 'Tuzat'].map(a =>
          `<button class="bubble-chip" onclick="AI.quickAction('${a}')">${a}</button>`).join('');
      }
      if (hasWrites) {
        const btn = div.querySelector('.apply-btn');
        if (btn) btn.textContent = `${State.pendingWrites.length} faylni qo‘llash`;
      }
    }
    return div;
  };
})();

// Greeting UZ
(function uzGreet() {
  if (typeof App === 'undefined') return;
  const _init = App.init.bind(App);
  App.init = function () {
    _init();
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Xayrli tong' : hour < 17 ? 'Xayrli kun' : 'Xayrli kech';
    const name = window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || '';
    const el = document.getElementById('greeting-text');
    if (el) el.textContent = name ? `${greet}, ${name}` : greet;
    // qayta welcome UZ
    if (typeof AI !== 'undefined') AI.addWelcome();
  };
})();

console.log('✓ composer.js');
