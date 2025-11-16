drop index if exists public.notifications_external_source_id_user_id_key;

create index if not exists notifications_external_source_id_idx
  on public.notifications(external_source, external_id);
