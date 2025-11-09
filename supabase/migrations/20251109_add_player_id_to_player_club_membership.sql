alter table if exists public.player_club_membership
  add column if not exists player_id uuid references public.players(id) on delete cascade;

create unique index if not exists player_club_membership_player_club_key on public.player_club_membership(player_id, club_id);
