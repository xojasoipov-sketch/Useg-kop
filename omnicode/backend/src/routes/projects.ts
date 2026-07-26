import { Hono } from 'hono';
import type { Env } from '../index';

export const projectsRouter = new Hono<{ Bindings: Env }>();

projectsRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC'
  ).bind(userId).all();
  return c.json({ projects: results });
});

projectsRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const { name, description, template } = await c.req.json();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO projects (id, user_id, name, description, template, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, name, description || '', template || 'blank', now, now).run();

  return c.json({ id, name, description, template, created_at: now });
});

projectsRouter.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const project = await c.env.DB.prepare(
    'SELECT * FROM projects WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();

  if (!project) return c.json({ error: 'Not found' }, 404);

  const { results: files } = await c.env.DB.prepare(
    'SELECT * FROM files WHERE project_id = ? ORDER BY path'
  ).bind(id).all();

  return c.json({ project, files });
});

projectsRouter.put('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const { name, description } = await c.req.json();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'UPDATE projects SET name = ?, description = ?, updated_at = ? WHERE id = ? AND user_id = ?'
  ).bind(name, description, now, id, userId).run();

  return c.json({ ok: true });
});

projectsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  await c.env.DB.prepare('DELETE FROM files WHERE project_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').bind(id, userId).run();

  return c.json({ ok: true });
});

projectsRouter.post('/:id/files', async (c) => {
  const id = c.req.param('id');
  const { path, content } = await c.req.json();
  const fileId = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT OR REPLACE INTO files (id, project_id, path, content, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(fileId, id, path, content, now).run();

  return c.json({ id: fileId, path, updated_at: now });
});

projectsRouter.put('/:id/files/:fileId', async (c) => {
  const { content } = await c.req.json();
  const fileId = c.req.param('fileId');
  const now = new Date().toISOString();

  await c.env.DB.prepare('UPDATE files SET content = ?, updated_at = ? WHERE id = ?')
    .bind(content, now, fileId).run();

  return c.json({ ok: true });
});

projectsRouter.delete('/:id/files/:fileId', async (c) => {
  const fileId = c.req.param('fileId');
  await c.env.DB.prepare('DELETE FROM files WHERE id = ?').bind(fileId).run();
  return c.json({ ok: true });
});
