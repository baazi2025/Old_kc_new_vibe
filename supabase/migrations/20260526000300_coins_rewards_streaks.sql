alter table public.profiles
  add column if not exists reward_rank text not null default '🌱 Fresh Joiner',
  add column if not exists rj_tag text,
  add column if not exists daily_streak integer not null default 0,
  add column if not exists night_streak integer not null default 0,
  add column if not exists last_active_date date,
  add column if not exists last_night_active_date date,
  add column if not exists last_login_reward_date date,
  add column if not exists profile_reward_claimed boolean not null default false;

create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  reason text not null,
  source text not null,
  source_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_reward_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_type text not null,
  reward_date date not null default current_date,
  claim_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, reward_type, reward_date)
);

create table if not exists public.rank_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  old_rank text,
  new_rank text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.redemption_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  coupon_type text not null,
  coins_requested integer not null check (coins_requested >= 500),
  rupee_value numeric(10,2) generated always as (coins_requested / 500.0) stored,
  status text not null default 'pending',
  user_note text default '',
  admin_note text default '',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint redemption_coupon_type_check check (coupon_type in ('Amazon', 'Swiggy', 'Zomato', 'Myntra')),
  constraint redemption_status_check check (status in ('pending', 'approved', 'rejected'))
);

alter table public.coin_transactions enable row level security;
alter table public.daily_reward_claims enable row level security;
alter table public.rank_history enable row level security;
alter table public.redemption_requests enable row level security;

drop policy if exists "Users read own coin transactions" on public.coin_transactions;
create policy "Users read own coin transactions"
on public.coin_transactions for select to authenticated
using (auth.uid() = user_id or public.is_staff_user());

drop policy if exists "Users read own reward claims" on public.daily_reward_claims;
create policy "Users read own reward claims"
on public.daily_reward_claims for select to authenticated
using (auth.uid() = user_id or public.is_staff_user());

drop policy if exists "Users read own rank history" on public.rank_history;
create policy "Users read own rank history"
on public.rank_history for select to authenticated
using (auth.uid() = user_id or public.is_staff_user());

drop policy if exists "Users read own redemptions" on public.redemption_requests;
create policy "Users read own redemptions"
on public.redemption_requests for select to authenticated
using (auth.uid() = user_id or public.is_staff_user());

drop policy if exists "Users request redemptions" on public.redemption_requests;
create policy "Users request redemptions"
on public.redemption_requests for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Staff update redemptions" on public.redemption_requests;
create policy "Staff update redemptions"
on public.redemption_requests for update to authenticated
using (public.is_staff_user())
with check (public.is_staff_user());

create or replace function public.rank_for_activity(total_messages integer, total_voice_notes integer, streak integer)
returns text
language plpgsql
immutable
as $$
begin
  if total_messages >= 2500 or streak >= 90 then return '💎 Vibe Elite'; end if;
  if total_messages >= 1000 or streak >= 30 then return '👑 KC Legend'; end if;
  if total_messages >= 500 or total_voice_notes >= 100 then return '🔥 Vibe Machine'; end if;
  if total_messages >= 250 then return '🎭 Room Viber'; end if;
  if total_messages >= 100 then return '⚡ Chaos Creator'; end if;
  if total_messages >= 25 then return '💬 Chatter Box'; end if;
  if streak >= 3 then return '🌙 Night Owl'; end if;
  return '🌱 Fresh Joiner';
end $$;

create or replace function public.rj_tag_for_voice_notes(total_voice_notes integer)
returns text
language plpgsql
immutable
as $$
begin
  if total_voice_notes >= 250 then return '👑 KC Radio Star'; end if;
  if total_voice_notes >= 100 then return '🔥 Midnight RJ'; end if;
  if total_voice_notes >= 50 then return '🎤 RJ Vibes'; end if;
  if total_voice_notes >= 20 then return '📻 RJ Rookie'; end if;
  if total_voice_notes >= 5 then return '🎧 Voice Explorer'; end if;
  if total_voice_notes >= 1 then return '🎙️ Mic Tester'; end if;
  return null;
end $$;

create or replace function public.refresh_user_rank(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  msg_count integer;
  voice_count integer;
  streak_count integer;
  old_rank text;
  next_rank text;
  next_rj text;
begin
  select count(*) into msg_count
  from public.messages
  where user_id = target_user
    and coalesce(deleted_by_admin, false) = false
    and moderation_status = 'visible';

  select voice_notes_count, daily_streak, reward_rank
    into voice_count, streak_count, old_rank
  from public.profiles
  where id = target_user;

  next_rank := public.rank_for_activity(coalesce(msg_count, 0), coalesce(voice_count, 0), coalesce(streak_count, 0));
  next_rj := public.rj_tag_for_voice_notes(coalesce(voice_count, 0));

  update public.profiles
     set reward_rank = next_rank,
         rj_tag = next_rj
   where id = target_user;

  if old_rank is distinct from next_rank then
    insert into public.rank_history (user_id, old_rank, new_rank)
    values (target_user, old_rank, next_rank);
  end if;
end $$;

create or replace function public.add_coin_transaction(
  target_user uuid,
  coin_amount integer,
  reward_reason text,
  reward_source text,
  reward_source_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if coin_amount = 0 then return false; end if;
  update public.profiles
     set coins = greatest(0, coins + coin_amount)
   where id = target_user;

  insert into public.coin_transactions (user_id, amount, reason, source, source_id)
  values (target_user, coin_amount, reward_reason, reward_source, reward_source_id);

  return true;
end $$;

create or replace function public.claim_limited_daily_reward(
  target_user uuid,
  reward_type_value text,
  daily_limit integer,
  coin_amount integer,
  reward_reason text,
  reward_source text,
  reward_source_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into public.daily_reward_claims (user_id, reward_type, reward_date, claim_count)
  values (target_user, reward_type_value, current_date, 0)
  on conflict (user_id, reward_type, reward_date) do nothing;

  select claim_count into current_count
  from public.daily_reward_claims
  where user_id = target_user
    and reward_type = reward_type_value
    and reward_date = current_date
  for update;

  if coalesce(current_count, 0) >= daily_limit then
    return false;
  end if;

  update public.daily_reward_claims
     set claim_count = claim_count + 1,
         updated_at = now()
   where user_id = target_user
     and reward_type = reward_type_value
     and reward_date = current_date;

  perform public.add_coin_transaction(target_user, coin_amount, reward_reason, reward_source, reward_source_id);
  return true;
end $$;

create or replace function public.update_daily_streak(target_user uuid, late_activity boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  last_day date;
  last_night_day date;
begin
  select last_active_date, last_night_active_date
    into last_day, last_night_day
  from public.profiles
  where id = target_user
  for update;

  if last_day is null then
    update public.profiles set daily_streak = 1, last_active_date = current_date where id = target_user;
  elsif last_day = current_date then
    null;
  elsif last_day = current_date - interval '1 day' then
    update public.profiles set daily_streak = daily_streak + 1, last_active_date = current_date where id = target_user;
  else
    update public.profiles set daily_streak = 1, last_active_date = current_date where id = target_user;
  end if;

  if late_activity then
    if last_night_day is null then
      update public.profiles set night_streak = 1, last_night_active_date = current_date where id = target_user;
    elsif last_night_day = current_date then
      null;
    elsif last_night_day = current_date - interval '1 day' then
      update public.profiles set night_streak = night_streak + 1, last_night_active_date = current_date where id = target_user;
    else
      update public.profiles set night_streak = 1, last_night_active_date = current_date where id = target_user;
    end if;
  end if;
end $$;

create or replace function public.claim_daily_login_reward()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid := auth.uid();
  awarded boolean;
begin
  if target_user is null then return false; end if;

  perform public.update_daily_streak(target_user, false);
  awarded := public.claim_limited_daily_reward(target_user, 'daily_login', 1, 50, 'Daily login reward', 'daily_login', current_date::text);
  perform public.refresh_user_rank(target_user);
  return awarded;
end $$;

create or replace function public.claim_profile_completion_reward()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid := auth.uid();
  completed boolean;
begin
  if target_user is null then return false; end if;

  select (
    coalesce(display_name, '') <> ''
    and coalesce(bio, '') <> ''
    and coalesce(status_text, '') <> ''
    and profile_reward_claimed = false
  ) into completed
  from public.profiles
  where id = target_user
  for update;

  if not coalesce(completed, false) then return false; end if;

  update public.profiles set profile_reward_claimed = true where id = target_user;
  perform public.add_coin_transaction(target_user, 100, 'Profile completion reward', 'profile_completion', target_user::text);
  perform public.refresh_user_rank(target_user);
  return true;
end $$;

create or replace function public.reward_message_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_duplicate boolean;
  late_activity boolean;
begin
  if coalesce(NEW.deleted_by_admin, false) = true or NEW.moderation_status <> 'visible' then
    return NEW;
  end if;

  late_activity := ((now() at time zone 'Asia/Kolkata')::time >= time '22:30');
  perform public.update_daily_streak(NEW.user_id, late_activity);

  if NEW.kind = 'voice' then
    update public.profiles
       set voice_notes_count = voice_notes_count + 1,
           is_rj = true
     where id = NEW.user_id;

    perform public.claim_limited_daily_reward(NEW.user_id, 'voice_note', 5, 25, 'Voice note reward', 'message', NEW.id::text);
  else
    select exists (
      select 1 from public.messages m
      where m.user_id = NEW.user_id
        and m.id <> NEW.id
        and m.kind = 'text'
        and lower(coalesce(m.text, '')) = lower(coalesce(NEW.text, ''))
        and m.created_at > now() - interval '10 minutes'
    ) into recent_duplicate;

    if not coalesce(recent_duplicate, false) then
      perform public.claim_limited_daily_reward(NEW.user_id, 'first_message', 1, 10, 'First message of the day', 'message', NEW.id::text);
      perform public.claim_limited_daily_reward(NEW.user_id, 'room_participation_' || NEW.room_id, 1, 20, 'Daily room participation bonus', 'room', NEW.room_id);
    end if;
  end if;

  perform public.refresh_user_rank(NEW.user_id);
  return NEW;
end $$;

drop trigger if exists trg_reward_voice_note on public.messages;
drop trigger if exists trg_reward_message_activity on public.messages;
create trigger trg_reward_message_activity
after insert on public.messages
for each row
execute function public.reward_message_activity();

drop function if exists public.reward_voice_note();

create or replace function public.request_redemption(coupon text, coins_value integer, note text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid := auth.uid();
  available integer;
  request_id uuid;
begin
  if target_user is null then raise exception 'Not authenticated'; end if;
  if coupon not in ('Amazon', 'Swiggy', 'Zomato', 'Myntra') then raise exception 'Invalid coupon type'; end if;
  if coins_value < 500 or coins_value % 500 <> 0 then raise exception 'Coins must be in 500 coin steps'; end if;

  select coins into available from public.profiles where id = target_user for update;
  if coalesce(available, 0) < coins_value then raise exception 'Not enough coins'; end if;

  perform public.add_coin_transaction(target_user, -coins_value, 'Redemption request hold', 'redemption_hold', coupon);

  insert into public.redemption_requests (user_id, coupon_type, coins_requested, user_note)
  values (target_user, coupon, coins_value, coalesce(note, ''))
  returning id into request_id;

  return request_id;
end $$;

create or replace function public.review_redemption(request_id uuid, next_status text, note text default '')
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.redemption_requests%rowtype;
begin
  if not public.is_staff_user() then raise exception 'Not allowed'; end if;
  if next_status not in ('approved', 'rejected') then raise exception 'Invalid status'; end if;

  select * into req
  from public.redemption_requests
  where id = request_id
  for update;

  if req.id is null then raise exception 'Request not found'; end if;
  if req.status <> 'pending' then return false; end if;

  update public.redemption_requests
     set status = next_status,
         admin_note = coalesce(note, ''),
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = request_id;

  if next_status = 'rejected' then
    perform public.add_coin_transaction(req.user_id, req.coins_requested, 'Redemption rejected refund', 'redemption_refund', request_id::text);
  end if;

  insert into public.admin_action_logs (admin_id, admin_name, action, target_type, target_id, details)
  values (
    auth.uid(),
    coalesce((select display_name from public.profiles where id = auth.uid()), (select username from public.profiles where id = auth.uid()), 'admin'),
    'redemption ' || next_status,
    'redemption',
    request_id::text,
    jsonb_build_object('coins', req.coins_requested, 'coupon_type', req.coupon_type)
  );

  return true;
end $$;
