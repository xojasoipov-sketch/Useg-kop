import { Hono } from 'hono';
import type { Env } from '../index';

export const githubRouter = new Hono<{ Bindings: Env }>();

async function ghFetch(path: string, token: string, opts: RequestInit = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'OmniCode/1.0',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  return res.json();
}

githubRouter.get('/repos', async (c) => {
  const token = c.env.GITHUB_TOKEN;
  const repos = await ghFetch('/user/repos?per_page=50&sort=updated', token);
  return c.json({ repos });
});

githubRouter.post('/push', async (c) => {
  const { owner, repo, branch = 'main', files, message = 'chore: update from OmniCode' } = await c.req.json();
  const token = c.env.GITHUB_TOKEN;

  const results: Record<string, string> = {};

  for (const file of files as { path: string; content: string }[]) {
    try {
      let sha: string | undefined;
      try {
        const existing: any = await ghFetch(`/repos/${owner}/${repo}/contents/${file.path}?ref=${branch}`, token);
        sha = existing.sha;
      } catch {}

      await ghFetch(`/repos/${owner}/${repo}/contents/${file.path}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          message: `${message}: ${file.path}`,
          content: btoa(unescape(encodeURIComponent(file.content))),
          branch,
          ...(sha ? { sha } : {}),
        }),
      });
      results[file.path] = 'ok';
    } catch (e) {
      results[file.path] = `error: ${(e as Error).message}`;
    }
  }

  return c.json({ results });
});

githubRouter.post('/repo/create', async (c) => {
  const { name, description = '', isPrivate = false } = await c.req.json();
  const token = c.env.GITHUB_TOKEN;

  const repo: any = await ghFetch('/user/repos', token, {
    method: 'POST',
    body: JSON.stringify({ name, description, private: isPrivate, auto_init: true }),
  });

  return c.json({ repo: { full_name: repo.full_name, html_url: repo.html_url, clone_url: repo.clone_url } });
});

githubRouter.get('/repo/:owner/:repo/tree', async (c) => {
  const { owner, repo } = c.req.param();
  const token = c.env.GITHUB_TOKEN;

  const tree: any = await ghFetch(`/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, token);
  return c.json({ tree: tree.tree?.filter((f: any) => f.type === 'blob') || [] });
});

githubRouter.get('/repo/:owner/:repo/file', async (c) => {
  const { owner, repo } = c.req.param();
  const path = c.req.query('path') || '';
  const token = c.env.GITHUB_TOKEN;

  const file: any = await ghFetch(`/repos/${owner}/${repo}/contents/${path}`, token);
  const content = decodeURIComponent(escape(atob(file.content.replace(/\n/g, ''))));

  return c.json({ content, sha: file.sha, path });
});
