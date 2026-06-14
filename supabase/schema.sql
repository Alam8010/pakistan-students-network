-- Pakistan Students Network - Supabase Schema
-- Run this in your Supabase SQL Editor

-- PROFILES TABLE (extends auth.users)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  role       text default 'student' check (role in ('student', 'group_owner', 'admin')),
  created_at timestamptz default now()
);

-- GROUPS TABLE
create table if not exists public.groups (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid references public.profiles(id) on delete cascade,
  group_name      text not null,
  description     text,
  status          text default 'pending' check (status in ('pending', 'active', 'inactive')),
  join_policy     text default 'open' check (join_policy in ('open', 'approval')),
  parent_group_id uuid references public.groups(id) on delete cascade,
  created_at      timestamptz default now()
);

-- GROUP MEMBERS
create table if not exists public.group_members (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid references public.groups(id) on delete cascade,
  user_id   uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(group_id, user_id)
);

-- JOIN REQUESTS
create table if not exists public.join_requests (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references public.groups(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  status     text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now(),
  unique(group_id, user_id)
);

-- CHAT MESSAGES
create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references public.groups(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  message    text not null,
  created_at timestamptz default now()
);

-- ANNOUNCEMENTS
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references public.groups(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete cascade,
  title      text not null,
  content    text not null,
  created_at timestamptz default now()
);

-- MATERIALS
create table if not exists public.materials (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references public.groups(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete cascade,
  title      text not null,
  file_url   text not null,
  file_type  text,
  created_at timestamptz default now()
);

-- AUTO-CREATE PROFILE ON SIGNUP TRIGGER
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ROW LEVEL SECURITY
alter table public.profiles       enable row level security;
alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;
alter table public.join_requests  enable row level security;
alter table public.chat_messages  enable row level security;
alter table public.announcements  enable row level security;
alter table public.materials      enable row level security;

-- Profiles: users can read all, update their own
create policy "profiles_read_all"   on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Groups: anyone can read active groups
create policy "groups_read_all"     on public.groups for select using (true);
create policy "groups_insert_auth"  on public.groups for insert with check (auth.uid() = owner_id);
create policy "groups_update_owner" on public.groups for update using (auth.uid() = owner_id);
create policy "groups_delete_owner" on public.groups for delete using (auth.uid() = owner_id);

-- Group members: members + owners can read
create policy "members_read"   on public.group_members for select using (auth.uid() = user_id or exists (select 1 from public.groups where id = group_id and owner_id = auth.uid()));
create policy "members_insert" on public.group_members for insert with check (auth.uid() = user_id);
create policy "members_delete" on public.group_members for delete using (auth.uid() = user_id or exists (select 1 from public.groups where id = group_id and owner_id = auth.uid()));

-- Join requests
create policy "jr_read"   on public.join_requests for select using (auth.uid() = user_id or exists (select 1 from public.groups where id = group_id and owner_id = auth.uid()));
create policy "jr_insert" on public.join_requests for insert with check (auth.uid() = user_id);
create policy "jr_update" on public.join_requests for update using (exists (select 1 from public.groups where id = group_id and owner_id = auth.uid()));

-- Chat messages: members only
create policy "chat_read"   on public.chat_messages for select using (exists (select 1 from public.group_members where group_id = chat_messages.group_id and user_id = auth.uid()) or exists (select 1 from public.groups where id = chat_messages.group_id and owner_id = auth.uid()));
create policy "chat_insert" on public.chat_messages for insert with check (auth.uid() = user_id);

-- Announcements
create policy "ann_read"   on public.announcements for select using (exists (select 1 from public.group_members where group_id = announcements.group_id and user_id = auth.uid()) or exists (select 1 from public.groups where id = announcements.group_id and owner_id = auth.uid()));
create policy "ann_insert" on public.announcements for insert with check (exists (select 1 from public.groups where id = group_id and owner_id = auth.uid()));
create policy "ann_delete" on public.announcements for delete using (exists (select 1 from public.groups where id = group_id and owner_id = auth.uid()));

-- Materials
create policy "mat_read"   on public.materials for select using (exists (select 1 from public.group_members where group_id = materials.group_id and user_id = auth.uid()) or exists (select 1 from public.groups where id = materials.group_id and owner_id = auth.uid()));
create policy "mat_insert" on public.materials for insert with check (exists (select 1 from public.groups where id = group_id and owner_id = auth.uid()));
create policy "mat_delete" on public.materials for delete using (exists (select 1 from public.groups where id = group_id and owner_id = auth.uid()));

-- Enable realtime for chat
alter publication supabase_realtime add table public.chat_messages;
