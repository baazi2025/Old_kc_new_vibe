alter table public.profiles
  add column if not exists featured_gift_transaction_id uuid;

create table if not exists public.gift_catalog (
  id text primary key,
  emoji text not null,
  name text not null,
  price integer not null check (price > 0),
  meaning text not null default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gift_transactions (
  id uuid primary key default gen_random_uuid(),
  gift_id text not null references public.gift_catalog(id),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  room_id text not null default 'friends',
  message text not null default '',
  public_announce boolean not null default true,
  coins_spent integer not null check (coins_spent > 0),
  removed_by_admin boolean not null default false,
  removed_reason text,
  created_at timestamptz not null default now(),
  check (sender_id <> receiver_id),
  check (char_length(message) <= 120)
);

create table if not exists public.gift_notifications (
  id uuid primary key default gen_random_uuid(),
  gift_transaction_id uuid not null references public.gift_transactions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_gift_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  admin_name text not null default 'admin',
  action text not null,
  gift_transaction_id uuid references public.gift_transactions(id) on delete set null,
  gift_id text references public.gift_catalog(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_featured_gift_transaction_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_featured_gift_transaction_id_fkey
      foreign key (featured_gift_transaction_id)
      references public.gift_transactions(id)
      on delete set null;
  end if;
end $$;

insert into public.gift_catalog (id, emoji, name, price, meaning)
values
  ('rose', '🌹', 'Rose', 250, 'A soft old-school vibe for someone special.'),
  ('chaya', '☕', 'Chaya', 300, 'Malayali comfort in one warm cup.'),
  ('chocolate', '🍫', 'Chocolate', 500, 'Sweetness for the chat friend who made your day.'),
  ('crown', '👑', 'Crown', 1000, 'For the room royalty and vibe leaders.'),
  ('diamond_vibe', '💎', 'Diamond Vibe', 2000, 'Premium sparkle for a premium viber.'),
  ('mic_star', '🎤', 'Mic Star', 1500, 'For singers, RJ energy, and mic-night legends.'),
  ('heart_drop', '❤️', 'Heart Drop', 750, 'A clean little heart without too much drama.'),
  ('fire_vibe', '🔥', 'Fire Vibe', 1200, 'For instant counters, roast queens, and energy.'),
  ('mystery_gift', '🎁', 'Mystery Gift', 2500, 'A surprise gift with full KC suspense.')
on conflict (id) do update
set emoji = excluded.emoji,
    name = excluded.name,
    price = excluded.price,
    meaning = excluded.meaning,
    updated_at = now();

alter table public.gift_catalog enable row level security;
alter table public.gift_transactions enable row level security;
alter table public.gift_notifications enable row level security;
alter table public.admin_gift_logs enable row level security;

drop policy if exists "Gift catalog readable" on public.gift_catalog;
create policy "Gift catalog readable"
on public.gift_catalog for select to authenticated
using (enabled = true or public.is_staff_user());

drop policy if exists "Staff manage gift catalog" on public.gift_catalog;
create policy "Staff manage gift catalog"
on public.gift_catalog for all to authenticated
using (public.is_staff_user())
with check (public.is_staff_user());

drop policy if exists "Users read related gifts" on public.gift_transactions;
create policy "Users read related gifts"
on public.gift_transactions for select to authenticated
using (
  sender_id = auth.uid()
  or receiver_id = auth.uid()
  or public.is_staff_user()
  or (public_announce = true and removed_by_admin = false)
);

drop policy if exists "Users read own gift notifications" on public.gift_notifications;
create policy "Users read own gift notifications"
on public.gift_notifications for select to authenticated
using (user_id = auth.uid() or public.is_staff_user());

drop policy if exists "Users update own gift notifications" on public.gift_notifications;
create policy "Users update own gift notifications"
on public.gift_notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Staff read gift logs" on public.admin_gift_logs;
create policy "Staff read gift logs"
on public.admin_gift_logs for select to authenticated
using (public.is_staff_user());

drop policy if exists "Staff insert gift logs" on public.admin_gift_logs;
create policy "Staff insert gift logs"
on public.admin_gift_logs for insert to authenticated
with check (public.is_staff_user());

create or replace function public.clean_gift_message(raw text)
returns text
language sql
immutable
as $$
  select left(regexp_replace(regexp_replace(coalesce(raw, ''), '[<>]', '', 'g'), '\s+', ' ', 'g'), 120)
$$;

create or replace function public.send_virtual_gift(
  receiver uuid,
  gift text,
  gift_message text default '',
  announce boolean default true,
  room text default 'friends'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sender uuid := auth.uid();
  gift_row public.gift_catalog%rowtype;
  available integer;
  tx_id uuid;
  clean_message text;
  sender_name text;
  receiver_name text;
  recent_count integer;
begin
  if sender is null then raise exception 'Not authenticated'; end if;
  if receiver is null then raise exception 'Receiver is required'; end if;
  if sender = receiver then raise exception 'You cannot send a gift to yourself'; end if;

  select * into gift_row
  from public.gift_catalog
  where id = gift and enabled = true;
  if gift_row.id is null then raise exception 'Gift is not available'; end if;

  if exists (
    select 1 from public.blocked_users
    where blocker_id = receiver and blocked_id = sender
  ) then
    raise exception 'This user cannot receive gifts from you';
  end if;

  if exists (
    select 1 from public.blocked_users
    where blocker_id = sender and blocked_id = receiver
  ) then
    raise exception 'Unblock this user before gifting';
  end if;

  select count(*) into recent_count
  from public.gift_transactions
  where sender_id = sender
    and created_at > now() - interval '10 minutes';
  if recent_count >= 5 then raise exception 'Gift sending is cooling down. Try again later.'; end if;

  select coins into available
  from public.profiles
  where id = sender
  for update;

  if coalesce(available, 0) < gift_row.price then raise exception 'Not enough coins'; end if;

  clean_message := public.clean_gift_message(gift_message);

  perform public.add_coin_transaction(
    sender,
    -gift_row.price,
    'Gift sent: ' || gift_row.name,
    'gift',
    gift_row.id
  );

  insert into public.gift_transactions (
    gift_id,
    sender_id,
    receiver_id,
    room_id,
    message,
    public_announce,
    coins_spent
  )
  values (
    gift_row.id,
    sender,
    receiver,
    coalesce(nullif(room, ''), 'friends'),
    clean_message,
    coalesce(announce, true),
    gift_row.price
  )
  returning id into tx_id;

  insert into public.gift_notifications (gift_transaction_id, user_id)
  values (tx_id, receiver);

  if coalesce(announce, true) then
    select coalesce(display_name, username, 'Someone') into sender_name from public.profiles where id = sender;
    select coalesce(display_name, username, 'someone') into receiver_name from public.profiles where id = receiver;
    insert into public.messages (room_id, user_id, text)
    values (
      coalesce(nullif(room, ''), 'friends'),
      sender,
      sender_name || ' gifted ' || gift_row.emoji || ' ' || gift_row.name || ' to ' || receiver_name
    );
  end if;

  return tx_id;
end $$;

create or replace function public.set_featured_gift(transaction_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid := auth.uid();
begin
  if target_user is null then raise exception 'Not authenticated'; end if;
  if not exists (
    select 1 from public.gift_transactions
    where id = transaction_id
      and receiver_id = target_user
      and removed_by_admin = false
  ) then
    raise exception 'Gift not found';
  end if;

  update public.profiles
     set featured_gift_transaction_id = transaction_id
   where id = target_user;

  return true;
end $$;

create or replace function public.admin_remove_gift_transaction(transaction_id uuid, reason text default '')
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff_user() then raise exception 'Not allowed'; end if;

  update public.gift_transactions
     set removed_by_admin = true,
         removed_reason = public.clean_gift_message(reason)
   where id = transaction_id;

  insert into public.admin_gift_logs (admin_id, admin_name, action, gift_transaction_id, details)
  values (
    auth.uid(),
    coalesce((select display_name from public.profiles where id = auth.uid()), (select username from public.profiles where id = auth.uid()), 'admin'),
    'removed gift transaction',
    transaction_id,
    jsonb_build_object('reason', public.clean_gift_message(reason))
  );

  return true;
end $$;

alter table public.gift_transactions replica identity full;
alter table public.gift_notifications replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.gift_transactions;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.gift_notifications;
  exception when duplicate_object then null;
  end;
end $$;
