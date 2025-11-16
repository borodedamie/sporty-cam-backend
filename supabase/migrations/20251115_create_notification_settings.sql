create table if not exists public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email_notifications boolean not null default true,
  push_notifications boolean not null default true,
  new_training_sessions boolean not null default true,
  training_match_reminders boolean not null default true,
  club_announcements boolean not null default true,
  new_member_welcomes boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists notification_settings_user_id_key on public.notification_settings(user_id);
