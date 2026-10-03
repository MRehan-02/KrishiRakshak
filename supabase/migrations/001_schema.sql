-- KrishiRakshak Database Schema (SIH 2026)
-- Migration: 001_schema.sql

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('farmer', 'officer')),
  district text default 'Pune',
  language text default 'en',
  lat double precision,
  lng double precision,
  created_at timestamptz default now()
);

-- 2. SCANS TABLE
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  image_url text not null,
  crop text not null,
  disease text not null,
  confidence integer not null check (confidence >= 0 and confidence <= 100),
  severity text not null check (severity in ('low', 'medium', 'high')),
  result_json jsonb default '{}'::jsonb,
  lat double precision,
  lng double precision,
  district text not null,
  created_at timestamptz default now()
);

-- 3. EXPERT REQUESTS TABLE
create table if not exists public.expert_requests (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid references public.scans(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'corrected')),
  officer_id uuid references auth.users(id) on delete set null,
  officer_reply text,
  corrected_disease text,
  created_at timestamptz default now()
);

-- 4. PEST TRAPS TABLE
create table if not exists public.pest_traps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  pest_type text not null,
  count integer not null default 0 check (count >= 0),
  village text,
  district text not null,
  image_url text,
  created_at timestamptz default now()
);

-- 5. CROPS TABLE (Farmer active crops)
create table if not exists public.crops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  crop_name text not null,
  sowing_date date not null,
  district text not null,
  created_at timestamptz default now()
);

-- 6. CROP TEMPLATES TABLE (Static master data for roadmaps)
create table if not exists public.crop_templates (
  id uuid primary key default gen_random_uuid(),
  crop_name text not null,
  stage text not null,
  week_start integer not null,
  week_end integer not null,
  tasks jsonb default '[]'::jsonb,
  diseases_to_watch jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 7. ROADMAP TASKS TABLE (Farmer crop roadmap checklist)
create table if not exists public.roadmap_tasks (
  id uuid primary key default gen_random_uuid(),
  crop_id uuid references public.crops(id) on delete cascade,
  week integer not null,
  task text not null,
  done boolean not null default false,
  created_at timestamptz default now()
);

-- 8. REMINDERS TABLE
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  text text not null,
  due_date date not null,
  done boolean not null default false,
  created_at timestamptz default now()
);

-- 9. ALERTS TABLE
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  district text not null,
  type text not null,
  message text not null,
  created_at timestamptz default now()
);

-- 10. VIEW: OUTBREAKS
-- Groups scans by district & disease within past 7 days where count >= 5
create or replace view public.outbreaks as
select
  district,
  disease,
  count(*)::integer as scan_count,
  max(created_at) as latest_report
from public.scans
where created_at > (now() - interval '7 days')
group by district, disease
having count(*) >= 5;

-- 11. SECURITY DEFINER HELPER FUNCTION
-- Prevents infinite recursion in RLS policies when querying profiles
create or replace function public.is_officer()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'officer'
  );
$$;

-- 12. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.profiles enable row level security;
alter table public.scans enable row level security;
alter table public.expert_requests enable row level security;
alter table public.pest_traps enable row level security;
alter table public.crops enable row level security;
alter table public.crop_templates enable row level security;
alter table public.roadmap_tasks enable row level security;
alter table public.reminders enable row level security;
alter table public.alerts enable row level security;

-- Profiles Policies
create policy "Users can view own profile or officers view all"
  on public.profiles for select
  using (auth.uid() = id or public.is_officer());

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Scans Policies
create policy "Farmers see own scans, officers see all scans"
  on public.scans for select
  using (user_id = auth.uid() or public.is_officer());

create policy "Farmers can insert scans"
  on public.scans for insert
  with check (user_id = auth.uid());

-- Expert Requests Policies
create policy "Farmers see own requests, officers see all"
  on public.expert_requests for select
  using (user_id = auth.uid() or public.is_officer());

create policy "Farmers can insert expert requests"
  on public.expert_requests for insert
  with check (user_id = auth.uid());

create policy "Officers can update expert requests"
  on public.expert_requests for update
  using (public.is_officer());

-- Pest Traps Policies
create policy "Farmers see own traps, officers see all"
  on public.pest_traps for select
  using (user_id = auth.uid() or public.is_officer());

create policy "Farmers can insert pest traps"
  on public.pest_traps for insert
  with check (user_id = auth.uid());

-- Crops Policies
create policy "Farmers manage own crops"
  on public.crops for all
  using (user_id = auth.uid());

-- Roadmap Tasks Policies
create policy "Farmers manage own roadmap tasks"
  on public.roadmap_tasks for all
  using (
    exists (
      select 1 from public.crops
      where crops.id = roadmap_tasks.crop_id and crops.user_id = auth.uid()
    )
  );

-- Reminders Policies
create policy "Farmers manage own reminders"
  on public.reminders for all
  using (user_id = auth.uid());

-- Crop Templates & Alerts (Readable by all authenticated users)
create policy "Authenticated users can read crop templates"
  on public.crop_templates for select
  to authenticated
  using (true);

create policy "Authenticated users can read alerts"
  on public.alerts for select
  to authenticated
  using (true);

-- 13. STORAGE BUCKET CONFIGURATION (for scan images)
insert into storage.buckets (id, name, public)
values ('scan-images', 'scan-images', true)
on conflict (id) do nothing;

create policy "Public can view scan images"
  on storage.objects for select
  using (bucket_id = 'scan-images');

create policy "Authenticated users can upload scan images"
  on storage.objects for insert
  with check (bucket_id = 'scan-images' and auth.role() = 'authenticated');

-- 14. AUTOMATIC PROFILE CREATION TRIGGER
-- Ensures profiles are created automatically whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role, district, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'farmer'),
    coalesce(new.raw_user_meta_data->>'district', 'Pune'),
    coalesce(new.raw_user_meta_data->>'language', 'en')
  )
  on conflict (id) do update set
    name = coalesce(excluded.name, profiles.name),
    role = coalesce(excluded.role, profiles.role),
    district = coalesce(excluded.district, profiles.district);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

