create table if not exists public.guest_fee_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  payment_reference text not null,
  payment_method text not null check (payment_method in ('paystack','kora')),
  amount numeric not null check (amount >= 0),
  club_id uuid not null references public.clubs(id) on delete cascade,
  player_application_id uuid not null references public.players(id) on delete cascade
);

create unique index if not exists guest_fee_payments_payment_reference_key on public.guest_fee_payments(payment_reference);
create index if not exists guest_fee_payments_club_id_idx on public.guest_fee_payments(club_id);
create index if not exists guest_fee_payments_player_application_id_idx on public.guest_fee_payments(player_application_id);