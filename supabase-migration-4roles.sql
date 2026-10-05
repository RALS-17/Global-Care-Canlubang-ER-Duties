-- ============================================================
-- Run this ONCE in Supabase → SQL Editor
-- Adds Consultant + SHO columns to existing schedules table
-- ============================================================

alter table public.schedules
  add column if not exists consultants text[] not null default '{}';

alter table public.schedules
  add column if not exists shos text[] not null default '{}';

-- Optional: enable realtime for live TV updates (if not already on)
-- In Dashboard: Database → Replication → enable schedules + videos
-- Or run:
alter publication supabase_realtime add table public.schedules;
alter publication supabase_realtime add table public.videos;
