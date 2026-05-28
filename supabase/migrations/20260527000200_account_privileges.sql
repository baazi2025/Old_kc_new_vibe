alter table public.profiles
  add column if not exists account_type text not null default 'registered',
  add column if not exists is_verified boolean not null default false;

update public.profiles
set account_type = case
  when coalesce(role, 'user') in ('admin', 'moderator') then 'staff'
  when coalesce(is_verified, false) then 'prime'
  when coalesce(is_guest, false) then 'guest'
  else 'registered'
end
where account_type is null
   or account_type not in ('guest', 'registered', 'prime', 'staff');

alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles
  add constraint profiles_account_type_check
  check (account_type in ('guest', 'registered', 'prime', 'staff'));

create or replace function public.current_account_type()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when coalesce(role, 'user') in ('admin', 'moderator') then 'staff'
        when account_type in ('guest', 'registered', 'prime', 'staff') then account_type
        when coalesce(is_verified, false) then 'prime'
        when coalesce(is_guest, false) then 'guest'
        else 'registered'
      end
      from public.profiles
      where id = auth.uid()
    ),
    'guest'
  )
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
begin
  uname := coalesce(new.raw_user_meta_data->>'username', 'guest_' || substr(new.id::text, 1, 8));
  emoji := coalesce(new.raw_user_meta_data->>'avatar_emoji', '🧑');
  guest := coalesce((new.is_anonymous)::bool, false);

  insert into public.profiles (id, username, avatar_emoji, is_guest, account_type)
  values (new.id, uname, emoji, guest, case when guest then 'guest' else 'registered' end)
  on conflict (id) do update
    set account_type = case
      when coalesce(public.profiles.account_type, '') in ('prime', 'staff') then public.profiles.account_type
      when excluded.is_guest then 'guest'
      else 'registered'
    end;

  return new;
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

  reward_amount := case when public.current_account_type() = 'guest' then 20 else 50 end;
  perform public.update_daily_streak(target_user, false);
  awarded := public.claim_limited_daily_reward(target_user, 'daily_login', 1, reward_amount, 'Daily login reward', 'daily_login', current_date::text);
  perform public.refresh_user_rank(target_user);
  return awarded;
end;
$$;

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
  if public.current_account_type() = 'guest' then return false; end if;

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
end;
$$;

create or replace function public.reward_message_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_duplicate boolean;
  late_activity boolean;
  sender_account text;
begin
  if coalesce(new.deleted_by_admin, false) = true or new.moderation_status <> 'visible' then
    return new;
  end if;

  select case
    when coalesce(role, 'user') in ('admin', 'moderator') then 'staff'
    when account_type in ('guest', 'registered', 'prime', 'staff') then account_type
    when coalesce(is_guest, false) then 'guest'
    else 'registered'
  end into sender_account
  from public.profiles
  where id = new.user_id;

  late_activity := ((now() at time zone 'Asia/Kolkata')::time >= time '22:30');
  if coalesce(sender_account, 'guest') <> 'guest' then
    perform public.update_daily_streak(new.user_id, late_activity);
  end if;

  if new.kind = 'voice' then
    update public.profiles
       set voice_notes_count = voice_notes_count + 1,
           is_rj = true
     where id = new.user_id;

    perform public.claim_limited_daily_reward(
      new.user_id,
      'voice_note',
      5,
      case when coalesce(sender_account, 'guest') = 'guest' then 10 else 25 end,
      'Voice note reward',
      'message',
      new.id::text
    );
  else
    select exists (
      select 1 from public.messages m
      where m.user_id = new.user_id
        and m.id <> new.id
        and m.kind = 'text'
        and lower(coalesce(m.text, '')) = lower(coalesce(new.text, ''))
        and m.created_at > now() - interval '10 minutes'
    ) into recent_duplicate;

    if not coalesce(recent_duplicate, false) then
      perform public.claim_limited_daily_reward(
        new.user_id,
        'first_message',
        1,
        case when coalesce(sender_account, 'guest') = 'guest' then 5 else 10 end,
        'First message of the day',
        'message',
        new.id::text
      );

      if coalesce(sender_account, 'guest') <> 'guest' then
        perform public.claim_limited_daily_reward(new.user_id, 'room_participation_' || new.room_id, 1, 20, 'Daily room participation bonus', 'room', new.room_id);
      end if;
    end if;
  end if;

  perform public.refresh_user_rank(new.user_id);
  return new;
end;
$$;

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
  if public.current_account_type() = 'guest' then raise exception 'Register to redeem real rewards'; end if;
  if coupon not in ('Amazon', 'Swiggy', 'Zomato', 'Myntra') then raise exception 'Invalid coupon type'; end if;
  if coins_value < 500 or coins_value % 500 <> 0 then raise exception 'Coins must be in 500 coin steps'; end if;

  select coins into available from public.profiles where id = target_user for update;
  if coalesce(available, 0) < coins_value then raise exception 'Not enough coins'; end if;

  perform public.add_coin_transaction(target_user, -coins_value, 'Redemption request hold', 'redemption_hold', coupon);

  insert into public.redemption_requests (user_id, coupon_type, coins_requested, user_note)
  values (target_user, coupon, coins_value, coalesce(note, ''))
  returning id into request_id;

  return request_id;
end;
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
  sender_account text;
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

  if exists (select 1 from public.blocked_users where blocker_id = receiver and blocked_id = sender) then
    raise exception 'This user cannot receive gifts from you';
  end if;

  if exists (select 1 from public.blocked_users where blocker_id = sender and blocked_id = receiver) then
    raise exception 'Unblock this user before gifting';
  end if;

  select count(*) into recent_count
  from public.gift_transactions
  where sender_id = sender
    and created_at > now() - interval '10 minutes';
  if recent_count >= 5 then raise exception 'Gift sending is cooling down. Try again later.'; end if;

  select coins,
    case
      when coalesce(role, 'user') in ('admin', 'moderator') then 'staff'
      when account_type in ('guest', 'registered', 'prime', 'staff') then account_type
      when coalesce(is_guest, false) then 'guest'
      else 'registered'
    end
  into available, sender_account
  from public.profiles
  where id = sender
  for update;

  if coalesce(sender_account, 'guest') = 'guest' and gift_row.price > 500 then
    raise exception 'Guests can send gifts up to 500 coins. Register to unlock premium gifts';
  end if;

  if coalesce(available, 0) < gift_row.price then raise exception 'Not enough coins'; end if;

  clean_message := public.clean_gift_message(gift_message);
  perform public.add_coin_transaction(sender, -gift_row.price, 'Gift sent: ' || gift_row.name, 'gift', gift_row.id);

  insert into public.gift_transactions (gift_id, sender_id, receiver_id, room_id, message, public_announce, coins_spent)
  values (gift_row.id, sender, receiver, coalesce(nullif(room, ''), 'friends'), clean_message, coalesce(announce, true), gift_row.price)
  returning id into tx_id;

  insert into public.gift_notifications (gift_transaction_id, user_id)
  values (tx_id, receiver);

  if coalesce(announce, true) then
    select coalesce(display_name, username, 'Someone') into sender_name from public.profiles where id = sender;
    select coalesce(display_name, username, 'someone') into receiver_name from public.profiles where id = receiver;
    insert into public.messages (room_id, user_id, text)
    values (coalesce(nullif(room, ''), 'friends'), sender, sender_name || ' gifted ' || gift_row.emoji || ' ' || gift_row.name || ' to ' || receiver_name);
  end if;

  return tx_id;
end;
$$;
