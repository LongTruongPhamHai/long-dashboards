-- schema_db.sql

-- Bật extension tạo uuid
create extension if not exists "pgcrypto";

-- CATEGORIES
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  icon text
);

-- GOALS
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_goal_id uuid references goals(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'active',
  target_date date,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

-- TASKS
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references goals(id) on delete set null,
  parent_task_id uuid references tasks(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo',
  priority text,
  due_date date,
  estimated_minutes integer,
  actual_minutes integer,
  started_at timestamptz,
  completed_at timestamptz,
  recurrence_rule text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

-- SCHEDULES
create table schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  recurrence_rule text,
  created_at timestamptz not null default now()
);

-- NOTES
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_type text not null default 'note',
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- NOTE_LINKS (đa hình)
create table note_links (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references notes(id) on delete cascade,
  related_type text not null,
  related_id uuid not null
);

-- TAGS
create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text
);

-- TAGGABLES (đa hình)
create table taggables (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references tags(id) on delete cascade,
  taggable_type text not null,
  taggable_id uuid not null
);

-- HABITS
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  frequency_rule text not null default 'daily',
  target_per_period integer default 1,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

-- HABIT_LOGS
create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  logged_date date not null,
  note text,
  created_at timestamptz not null default now(),
  unique (habit_id, logged_date)
);

-- PUSH_SUBSCRIPTIONS
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  keys_p256dh text not null,
  keys_auth text not null,
  created_at timestamptz not null default now()
);

-- INDEXES gợi ý
create index idx_tasks_user_status on tasks(user_id, status);
create index idx_tasks_goal on tasks(goal_id);
create index idx_tasks_due_date on tasks(due_date);
create index idx_schedules_start on schedules(user_id, start_time);
create index idx_goals_parent on goals(parent_goal_id);
create index idx_taggables_lookup on taggables(taggable_type, taggable_id);
create index idx_note_links_lookup on note_links(related_type, related_id);
create index idx_habit_logs_habit_date on habit_logs(habit_id, logged_date);

-- Full text search cho tasks + notes (tuỳ chọn, thêm khi cần)
alter table tasks add column search_vector tsvector
  generated always as (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))) stored;
create index idx_tasks_search on tasks using gin(search_vector);

alter table notes add column search_vector tsvector
  generated always as (to_tsvector('simple', coalesce(content,''))) stored;
create index idx_notes_search on notes using gin(search_vector);

alter table categories enable row level security;
alter table goals enable row level security;
alter table tasks enable row level security;
alter table schedules enable row level security;
alter table notes enable row level security;
alter table note_links enable row level security;
alter table tags enable row level security;
alter table taggables enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table push_subscriptions enable row level security;

-- Policy chung cho các bảng có cột user_id trực tiếp
create policy "user_owns_row" on categories for all using (user_id = auth.uid());
create policy "user_owns_row" on goals for all using (user_id = auth.uid());
create policy "user_owns_row" on tasks for all using (user_id = auth.uid());
create policy "user_owns_row" on schedules for all using (user_id = auth.uid());
create policy "user_owns_row" on notes for all using (user_id = auth.uid());
create policy "user_owns_row" on tags for all using (user_id = auth.uid());
create policy "user_owns_row" on habits for all using (user_id = auth.uid());
create policy "user_owns_row" on push_subscriptions for all using (user_id = auth.uid());

-- note_links: kiểm tra qua bảng notes
create policy "user_owns_via_note" on note_links for all
  using (exists (select 1 from notes n where n.id = note_links.note_id and n.user_id = auth.uid()));

-- taggables: kiểm tra qua bảng tags
create policy "user_owns_via_tag" on taggables for all
  using (exists (select 1 from tags t where t.id = taggables.tag_id and t.user_id = auth.uid()));

-- habit_logs: kiểm tra qua bảng habits
create policy "user_owns_via_habit" on habit_logs for all
  using (exists (select 1 from habits h where h.id = habit_logs.habit_id and h.user_id = auth.uid()));