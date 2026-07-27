/**
 * OmniBrain — Free Codebase Index (Keyword + Symbol)
 * Embed API yo'q. Brauzerda ishlaydi. IndexedDB/localStorage.
 *
 * API:
 *   RAG.build(projectId, filesMap)  — index qurish
 *   RAG.search(projectId, query, k) — top-k chunk
 *   RAG.context(projectId, query, maxChars) — prompt uchun matn
 *   RAG.stats(projectId)
 */

const DB_NAME = 'omnicode_rag';
const DB_VER = 1;
const STORE = 'indexes';
const MAX_CHUNK_LINES = 80;
const MAX_CHUNK_CHARS = 3500;
const CODE_EXT = /\.(js|jsx|ts|tsx|mjs|cjs|py|html|css|scss|json|md|vue|go|rs|java|kt|swift|php|rb|sh|yml|yaml)$/i;

/** In-memory cache: projectId → { chunks, inv, symbols, updated } */
const mem = new Map();

// ─── Tokenize ───────────────────────────────────────────────

function tokenize(text) {
  if (!text) return [];
  const raw = String(text)
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase
    .replace(/[_\-./\\]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && t.length <= 40);
  return raw;
}

function extractSymbols(content, path) {
  const symbols = new Set();
  const lines = String(content || '').split('\n');
  const patterns = [
    /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_][\w]*)/g,
    /(?:export\s+)?(?:const|let|var)\s+([A-Za-z_][\w]*)\s*=/g,
    /(?:export\s+)?class\s+([A-Za-z_][\w]*)/g,
    /(?:export\s+)?(?:async\s+)?([A-Za-z_][\w]*)\s*\(/g,
    /def\s+([A-Za-z_][\w]*)/g,
    /class\s+([A-Za-z_][\w]*)/g,
    /interface\s+([A-Za-z_][\w]*)/g,
    /type\s+([A-Za-z_][\w]*)\s*=/g,
  ];
  for (const line of lines) {
    for (const re of patterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        if (m[1] && m[1].length > 1) symbols.add(m[1]);
      }
    }
  }
  // path segments as symbols
  const base = path.split('/').pop() || '';
  const name = base.replace(/\.[^.]+$/, '');
  if (name) symbols.add(name);
  return [...symbols];
}

// ─── Chunker ────────────────────────────────────────────────

function chunkFile(path, content) {
  const text = String(content || '');
  if (!text.trim()) return [];
  if (!CODE_EXT.test(path) && text.length > 50000) {
    // skip huge non-code
    return [];
  }

  const lines = text.split('\n');
  const chunks = [];
  let buf = [];
  let startLine = 1;
  let chars = 0;

  const flush = (endLine) => {
    if (!buf.length) return;
    const body = buf.join('\n');
    if (!body.trim()) {
      buf = [];
      chars = 0;
      return;
    }
    const id = path + '#' + startLine + '-' + endLine;
    chunks.push({
      id,
      path,
      startLine,
      endLine,
      content: body.slice(0, MAX_CHUNK_CHARS),
      symbols: extractSymbols(body, path),
    });
    buf = [];
    chars = 0;
  };

  const boundary = /^(export\s+)?(async\s+)?(function|class|const|let|var|def|interface|type)\b|^\s*\/\*\*|^#{1,3}\s/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (
      buf.length >= MAX_CHUNK_LINES ||
      chars + line.length > MAX_CHUNK_CHARS ||
      (buf.length > 8 && boundary.test(line))
    ) {
      flush(lineNo - 1);
      startLine = lineNo;
    }

    buf.push(line);
    chars += line.length + 1;
  }
  flush(lines.length);

  // Agar juda kichik bo'lsa — bitta chunk
  if (chunks.length === 0 && text.trim()) {
    chunks.push({
      id: path + '#1',
      path,
      startLine: 1,
      endLine: lines.length,
      content: text.slice(0, MAX_CHUNK_CHARS),
      symbols: extractSymbols(text, path),
    });
  }
  return chunks;
}

// ─── Index build ────────────────────────────────────────────

function buildIndex(filesMap) {
  const chunks = [];
  const inv = new Map(); // term → Map<chunkIdx, score>
  const symbols = new Map(); // symbolLower → Set<chunkIdx>

  for (const [path, content] of Object.entries(filesMap || {})) {
    if (!path || content == null) continue;
    const fileChunks = chunkFile(path, content);
    for (const ch of fileChunks) {
      const idx = chunks.length;
      chunks.push(ch);

      // path tokens boost
      const pathTokens = tokenize(path);
      for (const t of pathTokens) {
        if (!inv.has(t)) inv.set(t, new Map());
        const m = inv.get(t);
        m.set(idx, (m.get(idx) || 0) + 2);
      }

      // content tokens
      const tokens = tokenize(ch.content);
      const tf = new Map();
      for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
      for (const [t, c] of tf) {
        if (!inv.has(t)) inv.set(t, new Map());
        const m = inv.get(t);
        // simple tf score capped
        m.set(idx, (m.get(idx) || 0) + Math.min(c, 5));
      }

      // symbols
      for (const s of ch.symbols) {
        const key = s.toLowerCase();
        if (!symbols.has(key)) symbols.set(key, new Set());
        symbols.get(key).add(idx);
        // also boost in inv
        if (!inv.has(key)) inv.set(key, new Map());
        const m = inv.get(key);
        m.set(idx, (m.get(idx) || 0) + 4);
      }
    }
  }

  return {
    chunks,
    inv: serializeInv(inv),
    symbols: serializeSymbols(symbols),
    updated: Date.now(),
    fileCount: Object.keys(filesMap || {}).length,
  };
}

function serializeInv(inv) {
  const out = {};
  for (const [term, map] of inv) {
    out[term] = [...map.entries()];
  }
  return out;
}

function serializeSymbols(symbols) {
  const out = {};
  for (const [s, set] of symbols) {
    out[s] = [...set];
  }
  return out;
}

function hydrate(data) {
  if (!data) return null;
  const inv = new Map();
  for (const [term, pairs] of Object.entries(data.inv || {})) {
    inv.set(term, new Map(pairs));
  }
  const symbols = new Map();
  for (const [s, arr] of Object.entries(data.symbols || {})) {
    symbols.set(s, new Set(arr));
  }
  return {
    chunks: data.chunks || [],
    inv,
    symbols,
    updated: data.updated,
    fileCount: data.fileCount || 0,
  };
}

// ─── Persistence (IndexedDB with localStorage fallback) ─────

function idbAvailable() {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveIndex(projectId, raw) {
  mem.set(projectId, hydrate(raw));
  // localStorage backup (size-limited)
  try {
    const slim = {
      ...raw,
      chunks: (raw.chunks || []).map((c) => ({
        ...c,
        content: (c.content || '').slice(0, 2000),
      })),
    };
    const json = JSON.stringify(slim);
    if (json.length < 2_000_000) {
      localStorage.setItem('oc_rag_' + projectId, json);
    }
  } catch {}

  if (!idbAvailable()) return;
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(raw, projectId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {}
}

async function loadIndex(projectId) {
  if (mem.has(projectId)) return mem.get(projectId);

  if (idbAvailable()) {
    try {
      const db = await openDB();
      const raw = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(projectId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      db.close();
      if (raw) {
        const h = hydrate(raw);
        mem.set(projectId, h);
        return h;
      }
    } catch {}
  }

  try {
    const json = localStorage.getItem('oc_rag_' + projectId);
    if (json) {
      const h = hydrate(JSON.parse(json));
      mem.set(projectId, h);
      return h;
    }
  } catch {}
  return null;
}

// ─── Search ─────────────────────────────────────────────────

function searchIndex(index, query, k = 6) {
  if (!index || !query) return [];
  const qTokens = tokenize(query);
  if (!qTokens.length) return [];

  const scores = new Map();

  // symbol exact boost
  for (const t of qTokens) {
    const set = index.symbols.get(t);
    if (set) {
      for (const idx of set) {
        scores.set(idx, (scores.get(idx) || 0) + 10);
      }
    }
  }

  // inverted index
  for (const t of qTokens) {
    const postings = index.inv.get(t);
    if (!postings) continue;
    for (const [idx, w] of postings) {
      scores.set(idx, (scores.get(idx) || 0) + w);
    }
  }

  // path substring soft match
  const qLower = query.toLowerCase();
  index.chunks.forEach((ch, idx) => {
    if (ch.path && qLower.includes(ch.path.toLowerCase().split('/').pop())) {
      scores.set(idx, (scores.get(idx) || 0) + 3);
    }
  });

  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([idx, score]) => ({
      score,
      ...index.chunks[idx],
    }))
    .filter((x) => x.content);

  return ranked;
}

function formatHits(hits, maxChars = 10000) {
  if (!hits.length) return '';
  const parts = [];
  let total = 0;
  for (const h of hits) {
    const block =
      `// ${h.path}:${h.startLine}-${h.endLine} (score=${h.score})\n` +
      h.content;
    if (total + block.length > maxChars) break;
    parts.push(block);
    total += block.length;
  }
  return parts.join('\n\n');
}

// ─── Public API ─────────────────────────────────────────────

export const RAG = {
  /**
   * @param {string} projectId
   * @param {Record<string,string>} filesMap — path → content
   */
  async build(projectId, filesMap) {
    if (!projectId) throw new Error('projectId kerak');
    const raw = buildIndex(filesMap || {});
    await saveIndex(projectId, {
      chunks: raw.chunks,
      inv: raw.inv,
      symbols: raw.symbols,
      updated: raw.updated,
      fileCount: raw.fileCount,
    });
    return {
      ok: true,
      chunks: raw.chunks.length,
      files: raw.fileCount,
      terms: Object.keys(raw.inv).length,
    };
  },

  /**
   * FS dan o'qib index qurish
   * @param {string} projectId
   * @param {{ index:(id)=>string[], read:(id,path)=>string|null }} FS
   */
  async buildFromFS(projectId, FS) {
    if (!FS?.index || !FS?.read) throw new Error('FS kerak');
    const paths = FS.index(projectId) || [];
    const files = {};
    for (const p of paths) {
      const c = FS.read(projectId, p);
      if (c != null) files[p] = c;
    }
    return this.build(projectId, files);
  },

  async search(projectId, query, k = 6) {
    const index = await loadIndex(projectId);
    if (!index) return [];
    return searchIndex(index, query, k);
  },

  /**
   * Promptga qo'shiladigan kontekst matni
   */
  async context(projectId, query, maxChars = 10000) {
    const hits = await this.search(projectId, query, 8);
    if (!hits.length) return '';
    return formatHits(hits, maxChars);
  },

  async stats(projectId) {
    const index = await loadIndex(projectId);
    if (!index) return { exists: false };
    return {
      exists: true,
      chunks: index.chunks.length,
      files: index.fileCount,
      terms: index.inv.size,
      symbols: index.symbols.size,
      updated: index.updated,
    };
  },

  async clear(projectId) {
    mem.delete(projectId);
    try {
      localStorage.removeItem('oc_rag_' + projectId);
    } catch {}
    if (idbAvailable()) {
      try {
        const db = await openDB();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).delete(projectId);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        db.close();
      } catch {}
    }
  },
};

export default RAG;
