-- ============================================================
-- Full setup – run in Supabase SQL Editor (new projects)
-- ============================================================

create table if not exists public.schedules (
  shift_key text primary key check (shift_key in ('6-2', '2-10', '10-6')),
  label text not null,
  nurses text[] not null default '{}',
  rods text[] not null default '{}',
  consultants text[] not null default '{}',
  shos text[] not null default '{}',
  updated_at timestamptz not null default now()
);

insert into public.schedules (shift_key, label, nurses, rods, consultants, shos) values
  ('6-2',  '06:00 – 14:00 (6-2)',  array['Aldrin S. RN','Noel M. RN'], array['Dr. Eli A.'], array['Dr. Consultant A.'], array['Dr. SHO A.']),
  ('2-10', '14:00 – 22:00 (2-10)', array['Aldrin S. RN','Noel M. RN'], array['Dr. Eli A.'], array['Dr. Consultant B.'], array['Dr. SHO B.']),
  ('10-6', '22:00 – 06:00 (10-6)', array['Aldrin S. RN','Noel M. RN'], array['Dr. Eli A.'], array['Dr. Consultant C.'], array['Dr. SHO C.'])
on conflict (shift_key) do nothing;

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_path text not null,
  public_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.schedules enable row level security;
alter table public.videos enable row level security;

drop policy if exists "Public read schedules" on public.schedules;
drop policy if exists "Public read videos" on public.videos;
drop policy if exists "Allow schedule writes" on public.schedules;
drop policy if exists "Allow video writes" on public.videos;

create policy "Public read schedules" on public.schedules for select using (true);
create policy "Public read videos" on public.videos for select using (true);
create policy "Allow schedule writes" on public.schedules for all using (true) with check (true);
create policy "Allow video writes" on public.videos for all using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('ads', 'ads', true)
on conflict (id) do nothing;

drop policy if exists "Public read ads" on storage.objects;
drop policy if exists "Allow upload ads" on storage.objects;
drop policy if exists "Allow update ads" on storage.objects;
drop policy if exists "Allow delete ads" on storage.objects;

create policy "Public read ads" on storage.objects for select using (bucket_id = 'ads');
create policy "Allow upload ads" on storage.objects for insert with check (bucket_id = 'ads');
create policy "Allow update ads" on storage.objects for update using (bucket_id = 'ads');
create policy "Allow delete ads" on storage.objects for delete using (bucket_id = 'ads');

-- Live updates
alter publication supabase_realtime add table public.schedules;
alter publication supabase_realtime add table public.videos;
