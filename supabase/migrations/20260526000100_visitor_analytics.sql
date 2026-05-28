create table if not exists public.visitor_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  path text not null default '/',
  event_type text not null default 'page_view',
  room_id text,
  country text,
  region text,
  city text,
  timezone text,
  locale text,
  user_agent text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists visitor_events_created_at_idx
  on public.visitor_events (created_at desc);

create index if not exists visitor_events_visitor_created_idx
  on public.visitor_events (visitor_id, created_at desc);

create index if not exists visitor_events_country_idx
  on public.visitor_events (country);

alter table public.visitor_events enable row level security;

drop policy if exists "Visitors can create analytics events" on public.visitor_events;
create policy "Visitors can create analytics events"
  on public.visitor_events
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Authenticated users can read analytics events" on public.visitor_events;
create policy "Authenticated users can read analytics events"
  on public.visitor_events
  for select
  to authenticated
  using (true);
