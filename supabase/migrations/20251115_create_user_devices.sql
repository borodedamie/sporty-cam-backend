create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.players(id) on delete cascade,
  provider text not null,
  token text not null,
  platform text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_devices_user_id_idx on public.user_devices(user_id);
create index if not exists user_devices_provider_idx on public.user_devices(provider);
