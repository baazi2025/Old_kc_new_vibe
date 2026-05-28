alter table public.profiles
  add column if not exists role text not null default 'user',
  add column if not exists is_banned boolean not null default false,
  add column if not exists muted_until timestamptz,
  add column if not exists banned_until timestamptz,
  add column if not exists dm_disabled_by_admin boolean not null default false,
  add column if not exists mood_text text default '';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'moderator', 'user'));

alter table public.messages
  add column if not exists is_pinned boolean not null default false,
  add column if not exists deleted_by_admin boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists moderation_status text not null default 'visible';

create table if not exists public.chat_rooms (
  id text primary key,
  name text not null,
  description text default '',
  visibility text not null default 'public',
  rules text default '',
  mini_games_enabled boolean not null default true,
  voice_notes_enabled boolean not null default true,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_rooms_visibility_check check (visibility in ('public', 'private', 'hidden'))
);

insert into public.chat_rooms (id, name, description, rules)
values
  ('friends', 'Friends Vibing', 'Malayalam + English friendship chat room', 'Respect the vibe. No religion, politics, racism, or personal harassment.'),
  ('romance', 'Romance Vibes', 'Respectful romance and soft chat room', 'Keep romance respectful. No harassment, screenshots, or personal attacks.')
on conflict (id) do nothing;

create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null default 'reported',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  constraint message_reports_status_check check (status in ('open', 'reviewed', 'dismissed', 'actioned'))
);

create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  admin_name text not null default 'admin',
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'user');
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_user_role() = 'admin';
$$;

create or replace function public.is_staff_user()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'moderator');
$$;

alter table public.chat_rooms enable row level security;
alter table public.message_reports enable row level security;
alter table public.admin_action_logs enable row level security;

drop policy if exists "Rooms readable by authenticated users" on public.chat_rooms;
create policy "Rooms readable by authenticated users"
on public.chat_rooms for select to authenticated
using (visibility <> 'hidden' or public.is_staff_user());

drop policy if exists "Staff manage rooms" on public.chat_rooms;
create policy "Staff manage rooms"
on public.chat_rooms for all to authenticated
using (public.is_staff_user())
with check (public.is_staff_user());

drop policy if exists "Users create message reports" on public.message_reports;
create policy "Users create message reports"
on public.message_reports for insert to authenticated
with check (auth.uid() = reporter_id);

drop policy if exists "Staff read message reports" on public.message_reports;
create policy "Staff read message reports"
on public.message_reports for select to authenticated
using (public.is_staff_user());

drop policy if exists "Staff update message reports" on public.message_reports;
create policy "Staff update message reports"
on public.message_reports for update to authenticated
using (public.is_staff_user())
with check (public.is_staff_user());

drop policy if exists "Staff read admin logs" on public.admin_action_logs;
create policy "Staff read admin logs"
on public.admin_action_logs for select to authenticated
using (public.is_staff_user());

drop policy if exists "Staff create admin logs" on public.admin_action_logs;
create policy "Staff create admin logs"
on public.admin_action_logs for insert to authenticated
with check (public.is_staff_user() and auth.uid() = admin_id);

drop policy if exists "Staff update profiles" on public.profiles;
create policy "Staff update profiles"
on public.profiles for update to authenticated
using (public.is_staff_user())
with check (public.is_staff_user());

drop policy if exists "Staff update messages" on public.messages;
create policy "Staff update messages"
on public.messages for update to authenticated
using (public.is_staff_user())
with check (public.is_staff_user());

drop policy if exists "Staff delete messages" on public.messages;
create policy "Staff delete messages"
on public.messages for delete to authenticated
using (public.is_staff_user());

drop policy if exists "Authenticated users insert own messages" on public.messages;
create policy "Authenticated users insert own messages"
on public.messages for insert to authenticated
with check (
  auth.uid() = user_id
  and not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.is_banned = true
        or (p.banned_until is not null and p.banned_until > now())
        or (p.muted_until is not null and p.muted_until > now())
      )
  )
);

drop policy if exists "Authenticated users insert own messages" on public.dm_messages;
drop policy if exists "Users send own DMs respecting privacy" on public.dm_messages;
create policy "Users send own DMs respecting privacy"
on public.dm_messages for insert to authenticated
with check (
  auth.uid() = sender_id
  and sender_id <> recipient_id
  and not exists (
    select 1 from public.profiles p
    where p.id = sender_id
      and (
        p.is_banned = true
        or p.dm_disabled_by_admin = true
        or (p.banned_until is not null and p.banned_until > now())
      )
  )
  and exists (
    select 1 from public.profiles p
    where p.id = recipient_id
      and coalesce(p.dm_enabled, true) = true
      and coalesce(p.dm_disabled_by_admin, false) = false
  )
  and not exists (
    select 1 from public.blocked_users b
    where b.blocker_id = recipient_id
      and b.blocked_id = sender_id
  )
);

drop policy if exists "Authenticated users can read visitor events" on public.visitor_events;
create policy "Staff can read visitor events"
on public.visitor_events for select to authenticated
using (public.is_staff_user());
