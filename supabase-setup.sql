-- ============================================================
-- Run this in Supabase → SQL Editor → New query → Run
-- Free plan compatible
-- ============================================================

-- 1) Schedule table (one row per shift)
create table if not exists public.schedules (
  shift_key text primary key check (shift_key in ('6-2', '2-10', '10-6')),
  label text not null,
  nurses text[] not null default '{}',
  rods text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- Seed default rows
insert into public.schedules (shift_key, label, nurses, rods) values
  ('6-2',  '06:00 – 14:00 (6-2)',  array['Sarah M. RN','Lisa T. RN'], array['Dr. James K.']),
  ('2-10', '14:00 – 22:00 (2-10)', array['Mark R. RN','Aisha K. RN'], array['Dr. Priya S.']),
  ('10-6', '22:00 – 06:00 (10-6)', array['Nina P. RN','Tom H. RN'], array['Dr. Alex W.'])
on conflict (shift_key) do nothing;

-- 2) Videos table
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_path text not null,
  public_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 3) Public read access (TV display needs to read without login)
alter table public.schedules enable row level security;
alter table public.videos enable row level security;

create policy "Public read schedules"
  on public.schedules for select
  using (true);

create policy "Public read videos"
  on public.videos for select
  using (true);

-- Allow inserts/updates/deletes with the anon key for admin simplicity
-- (Admin page is password-protected in the app)
create policy "Allow schedule writes"
  on public.schedules for all
  using (true)
  with check (true);

create policy "Allow video writes"
  on public.videos for all
  using (true)
  with check (true);

-- 4) Storage bucket for videos
insert into storage.buckets (id, name, public)
values ('ads', 'ads', true)
on conflict (id) do nothing;

create policy "Public read ads"
  on storage.objects for select
  using (bucket_id = 'ads');

create policy "Allow upload ads"
  on storage.objects for insert
  with check (bucket_id = 'ads');

create policy "Allow update ads"
  on storage.objects for update
  using (bucket_id = 'ads');

create policy "Allow delete ads"
  on storage.objects for delete
  using (bucket_id = 'ads');
