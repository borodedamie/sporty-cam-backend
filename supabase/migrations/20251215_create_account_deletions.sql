drop table if exists public.account_deletions cascade;

create table if not exists public.account_deletions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending','cancelled','processed')),
  processed_at timestamptz,
  cancelled_at timestamptz,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists account_deletions_user_id_idx on public.account_deletions(user_id);
create index if not exists account_deletions_scheduled_for_idx on public.account_deletions(scheduled_for);