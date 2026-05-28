alter table public.profiles
  add column if not exists guest_created_at timestamptz,
  add column if not exists guest_expires_at timestamptz,
  add column if not exists guest_expired_at timestamptz,
  add column if not exists upgraded_from_guest_at timestamptz;

update public.profiles
set guest_created_at = coalesce(guest_created_at, created_at, now()),
    guest_expires_at = coalesce(guest_expires_at, coalesce(created_at, now()) + interval '96 hours')
where account_type = 'guest' or coalesce(is_guest, false);

create index if not exists profiles_guest_expiry_idx
on public.profiles (guest_expires_at)
where account_type = 'guest';

create or replace function public.is_guest_expired(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = target_user
      and account_type = 'guest'
      and guest_expires_at is not null
      and guest_expires_at <= now()
  )
$$;

create or replace function public.set_guest_expiry_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_type = 'guest' or coalesce(new.is_guest, false) then
    new.account_type := 'guest';
    new.is_guest := true;
    new.guest_created_at := coalesce(new.guest_created_at, new.created_at, now());
    new.guest_expires_at := coalesce(new.guest_expires_at, new.guest_created_at + interval '96 hours');
  else
    new.is_guest := false;
    new.guest_expires_at := null;
    new.guest_expired_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_guest_expiry_fields on public.profiles;
create trigger trg_set_guest_expiry_fields
before insert or update of account_type, is_guest, guest_created_at, guest_expires_at
on public.profiles
for each row
execute function public.set_guest_expiry_fields();

create or replace function public.prevent_expired_guest_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_guest_expired(new.user_id) then
    raise exception 'Guest access expired. Register to continue.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_expired_guest_message on public.messages;
create trigger trg_prevent_expired_guest_message
before insert on public.messages
for each row
execute function public.prevent_expired_guest_message();

create or replace function public.prevent_expired_guest_gift()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_guest_expired(new.sender_id) then
    raise exception 'Guest access expired. Register to continue.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_expired_guest_gift on public.gift_transactions;
create trigger trg_prevent_expired_guest_gift
before insert on public.gift_transactions
for each row
execute function public.prevent_expired_guest_gift();

create or replace function public.expire_guest_profile(target_user uuid, delete_profile boolean default false)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  is_target_guest boolean;
begin
  select account_type = 'guest' or coalesce(is_guest, false)
    into is_target_guest
  from public.profiles
  where id = target_user;

  if not coalesce(is_target_guest, false) then
    return false;
  end if;

  delete from public.daily_reward_claims where user_id = target_user;
  delete from public.coin_transactions where user_id = target_user;
  delete from public.gift_notifications where user_id = target_user;

  update public.gift_transactions
     set removed_by_admin = true,
         removed_reason = 'Expired guest cleanup'
   where sender_id = target_user or receiver_id = target_user;

  update public.redemption_requests
     set status = 'rejected',
         admin_note = coalesce(nullif(admin_note, ''), 'Guest account expired'),
         reviewed_at = coalesce(reviewed_at, now())
   where user_id = target_user
     and status = 'pending';

  delete from public.visitor_events where user_id = target_user;

  if delete_profile then
    delete from public.profiles
    where id = target_user and (account_type = 'guest' or coalesce(is_guest, false));
  else
    update public.profiles
       set username = 'expired_guest_' || substr(target_user::text, 1, 8),
           display_name = 'Expired Guest',
           avatar_emoji = '👤',
           avatar_url = null,
           avatar_path = null,
           bio = null,
           status_text = null,
           mood_text = null,
           dm_enabled = false,
           coins = 0,
           reward_rank = 'Expired Guest',
           rj_tag = null,
           daily_streak = 0,
           night_streak = 0,
           featured_gift_transaction_id = null,
           guest_expired_at = coalesce(guest_expired_at, now())
     where id = target_user
       and (account_type = 'guest' or coalesce(is_guest, false));
  end if;

  return true;
end;
$$;

create or replace function public.cleanup_expired_guests()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  row record;
  cleaned integer := 0;
begin
  for row in
    select id
    from public.profiles
    where account_type = 'guest'
      and guest_expires_at is not null
      and guest_expires_at <= now()
      and guest_expired_at is null
  loop
    if public.expire_guest_profile(row.id, false) then
      cleaned := cleaned + 1;
    end if;
  end loop;

  return cleaned;
end;
$$;

create or replace function public.validate_guest_access()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid := auth.uid();
begin
  perform public.cleanup_expired_guests();
  if target_user is null then
    return true;
  end if;
  return not public.is_guest_expired(target_user);
end;
$$;

create or replace function public.upgrade_current_guest()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid := auth.uid();
begin
  if target_user is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
     set account_type = 'registered',
         is_guest = false,
         guest_expires_at = null,
         guest_expired_at = null,
         upgraded_from_guest_at = now(),
         dm_enabled = true
   where id = target_user
     and account_type = 'guest'
     and (guest_expires_at is null or guest_expires_at > now());

  return found;
end;
$$;

create or replace function public.admin_expire_guest(target_user uuid, delete_profile boolean default false)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff_user() then
    raise exception 'Not allowed';
  end if;
  return public.expire_guest_profile(target_user, delete_profile);
end;
$$;

create or replace function public.claim_daily_login_reward()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid := auth.uid();
  awarded boolean;
  reward_amount integer;
begin
  if target_user is null then return false; end if;
  if public.is_guest_expired(target_user) then return false; end if;

  reward_amount := case when public.current_account_type() = 'guest' then 20 else 50 end;
  perform public.update_daily_streak(target_user, false);
  awarded := public.claim_limited_daily_reward(target_user, 'daily_login', 1, reward_amount, 'Daily login reward', 'daily_login', current_date::text);
  perform public.refresh_user_rank(target_user);
  return awarded;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
  emoji text;
  guest bool;
  created_at_value timestamptz;
begin
  uname := coalesce(new.raw_user_meta_data->>'username', 'guest_' || substr(new.id::text, 1, 8));
  emoji := coalesce(new.raw_user_meta_data->>'avatar_emoji', '🧑');
  guest := coalesce((new.is_anonymous)::bool, false);
  created_at_value := coalesce(new.created_at, now());

  insert into public.profiles (
    id,
    username,
    avatar_emoji,
    is_guest,
    account_type,
    guest_created_at,
    guest_expires_at
  )
  values (
    new.id,
    uname,
    emoji,
    guest,
    case when guest then 'guest' else 'registered' end,
    case when guest then created_at_value else null end,
    case when guest then created_at_value + interval '96 hours' else null end
  )
  on conflict (id) do update
    set account_type = case
      when coalesce(public.profiles.account_type, '') in ('prime', 'staff') then public.profiles.account_type
      when excluded.is_guest then 'guest'
      else 'registered'
    end,
    is_guest = excluded.is_guest,
    guest_created_at = case when excluded.is_guest then coalesce(public.profiles.guest_created_at, excluded.guest_created_at) else null end,
    guest_expires_at = case when excluded.is_guest then coalesce(public.profiles.guest_expires_at, excluded.guest_expires_at) else null end;

  return new;
end;
$$;
