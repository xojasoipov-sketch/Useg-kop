-- OmniCode / SadiPrime — Supabase schema
-- SQL Editor da bir marta ishga tushiring

-- Sessions (AI memory across devices)
create table if not exists public.oc_sessions (
  user_id text primary key,
  goal text default '',
  summary text default '',
  project_id text,
  updated_at timestamptz default now()
);

-- Projects metadata
create table if not exists public.oc_projects (
  id text primary key,
  user_id text not null,
  name text not null,
  template text default 'blank',
  github jsonb,
  updated_at timestamptz default now()
);
create index if not exists oc_projects_user on public.oc_projects (user_id);

-- Project files
create table if not exists public.oc_files (
  id bigserial primary key,
  user_id text not null,
  project_id text not null,
  path text not null,
  content text default '',
  updated_at timestamptz default now(),
  unique (user_id, project_id, path)
);
create index if not exists oc_files_proj on public.oc_files (user_id, project_id);

-- Chat history
create table if not exists public.oc_chat (
  user_id text not null,
  project_id text,
  messages jsonb default '[]',
  updated_at timestamptz default now(),
  primary key (user_id, coalesce(project_id, ''))
);
-- If coalesce in PK fails on older PG, use simpler table:
-- drop and recreate if needed:

do $$
begin
  -- fallback chat table without coalesce PK issues
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'oc_chat' and column_name = 'id'
  ) then
    null;
  end if;
exception when others then null;
end $$;

-- Simpler chat table (preferred)
drop table if exists public.oc_chat cascade;
create table public.oc_chat (
  id bigserial primary key,
  user_id text not null,
  project_id text,
  messages jsonb default '[]',
  updated_at timestamptz default now()
);
create unique index if not exists oc_chat_user_proj
  on public.oc_chat (user_id, coalesce(project_id, ''));

-- Snapshots
create table if not exists public.oc_snapshots (
  id bigserial primary key,
  user_id text not null,
  project_id text,
  payload jsonb not null,
  created_at timestamptz default now()
);
create index if not exists oc_snap_user on public.oc_snapshots (user_id, created_at desc);

-- RLS: enable + owner-only via user_id match header is not automatic;
-- For private owner app using anon key, either:
-- A) keep RLS off and treat anon key as secret (single-user mini app), OR
-- B) use policies with a fixed owner claim.
-- Recommended for Telegram mini app single owner: RLS on + policy allowing all for anon
-- only if you accept that anon key holders can read — better store ownerId and filter in app.
-- Below: open write for anon (single-tenant). Tighten later with auth.uid().

alter table public.oc_sessions enable row level security;
alter table public.oc_projects enable row level security;
alter table public.oc_files enable row level security;
alter table public.oc_chat enable row level security;
alter table public.oc_snapshots enable row level security;

-- Single-owner mini app: allow anon role full access (key stays in your client only)
drop policy if exists oc_sessions_all on public.oc_sessions;
create policy oc_sessions_all on public.oc_sessions for all using (true) with check (true);

drop policy if exists oc_projects_all on public.oc_projects;
create policy oc_projects_all on public.oc_projects for all using (true) with check (true);

drop policy if exists oc_files_all on public.oc_files;
create policy oc_files_all on public.oc_files for all using (true) with check (true);

drop policy if exists oc_chat_all on public.oc_chat;
create policy oc_chat_all on public.oc_chat for all using (true) with check (true);

drop policy if exists oc_snapshots_all on public.oc_snapshots;
create policy oc_snapshots_all on public.oc_snapshots for all using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
