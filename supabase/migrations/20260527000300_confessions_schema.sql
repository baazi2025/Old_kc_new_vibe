create table if not exists public.confessions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 500),
  mood text not null default 'secret' check (mood in ('crush', 'compliment', 'secret', 'emotional')),
  reveal_identity boolean not null default false,
  like_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_confessions_created
  on public.confessions (created_at desc);

alter table public.confessions enable row level security;

drop policy if exists "Confessions readable by authenticated users" on public.confessions;
create policy "Confessions readable by authenticated users"
on public.confessions for select to authenticated
using (true);

drop policy if exists "Users insert own confessions" on public.confessions;
create policy "Users insert own confessions"
on public.confessions for insert to authenticated
with check (auth.uid() = author_id);

drop policy if exists "Authors delete own confessions" on public.confessions;
create policy "Authors delete own confessions"
on public.confessions for delete to authenticated
using (auth.uid() = author_id);

grant select, insert, delete on public.confessions to authenticated;

create table if not exists public.confession_likes (
  confession_id uuid not null references public.confessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (confession_id, user_id)
);

alter table public.confession_likes enable row level security;

drop policy if exists "Confession likes readable by authenticated users" on public.confession_likes;
create policy "Confession likes readable by authenticated users"
on public.confession_likes for select to authenticated
using (true);

drop policy if exists "Users like confessions" on public.confession_likes;
create policy "Users like confessions"
on public.confession_likes for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users unlike confessions" on public.confession_likes;
create policy "Users unlike confessions"
on public.confession_likes for delete to authenticated
using (auth.uid() = user_id);

grant select, insert, delete on public.confession_likes to authenticated;

create or replace function public.bump_confession_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.confessions
       set like_count = like_count + 1
     where id = new.confession_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.confessions
       set like_count = greatest(like_count - 1, 0)
     where id = old.confession_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_confession_likes_count on public.confession_likes;
create trigger trg_confession_likes_count
after insert or delete on public.confession_likes
for each row execute function public.bump_confession_like_count();

do $$
begin
  alter publication supabase_realtime add table public.confessions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.confession_likes;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
