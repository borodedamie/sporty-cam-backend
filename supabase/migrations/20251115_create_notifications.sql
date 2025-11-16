drop table if exists public.notifications cascade;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.players(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete cascade,
  external_source text,
  external_id text,
  event_type text not null,
  channel text not null check (channel in ('email','push','in_app')),
  payload jsonb,
  status text not null default 'pending' check (status in ('pending','in_progress','sent','failed')),
  attempt_count integer not null default 0,
  scheduled_at timestamptz,
  is_read boolean not null default false,
  last_attempt_at timestamptz,
  error_text text,
  created_at timestamptz not null default now()
);

create index if not exists notifications_status_scheduled_idx on public.notifications(status, scheduled_at);
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_club_id_idx on public.notifications(club_id);