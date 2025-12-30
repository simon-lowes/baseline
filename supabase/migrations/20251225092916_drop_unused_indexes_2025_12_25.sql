do $$ begin
  if exists(select 1 from pg_class where relname = 'pain_entries_timestamp_idx') then
    drop index if exists public.pain_entries_timestamp_idx;
  end if;
  if exists(select 1 from pg_class where relname = 'pain_entries_user_id_idx') then
    drop index if exists public.pain_entries_user_id_idx;
  end if;
end $$;;
