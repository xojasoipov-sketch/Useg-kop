CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  template TEXT DEFAULT 'blank',
  github_owner TEXT,
  github_repo TEXT,
  github_branch TEXT DEFAULT 'main',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  path TEXT NOT NULL,
  content TEXT DEFAULT '',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, path)
);

CREATE TABLE IF NOT EXISTS deployments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  branch TEXT DEFAULT 'main',
  status TEXT DEFAULT 'pending',
  steps TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_deployments_user ON deployments(user_id);
