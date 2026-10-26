-- ============================================================
-- ATUAS — Supabase database schema
-- Run this in the Supabase SQL editor (or via `supabase db push`)
-- on a fresh project. Designed for Postgres + Row Level Security.
-- ============================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Roles ----------
-- Roles are enforced in the database, not just hidden in the UI.
create type public.admin_role as enum (
  'super_admin',
  'president',
  'pro',
  'academic_admin',
  'editor'
);

-- profiles: one row per authenticated user (mirrors auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.admin_role,           -- null = not an admin, just an authenticated visitor if ever needed
  created_at timestamptz not null default now()
);

-- ---------- Academics ----------
create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_years numeric,
  mode text,                        -- e.g. 'Morning', 'Evening/Weekend', 'Top-Up'
  description text,
  created_at timestamptz not null default now()
);

create table public.programme_levels (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id) on delete cascade,
  level int not null,
  unique (programme_id, level)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid references public.programmes(id) on delete set null,
  level int,
  semester int check (semester in (1,2)),
  course_code text not null,
  course_title text not null,
  created_at timestamptz not null default now()
);

-- ---------- Past Question Bank ----------
create table public.past_questions (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid references public.programmes(id) on delete set null,
  level int,
  semester int check (semester in (1,2)),
  course_id uuid references public.courses(id) on delete set null,
  course_code text not null,
  course_title text not null,
  academic_year text not null,       -- e.g. '2024/2025'
  file_path text not null,           -- storage path in the 'past-questions' bucket
  file_name text,
  file_type text,
  file_size bigint,
  description text,
  uploaded_by uuid references public.profiles(id),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.past_questions (programme_id, level, semester, academic_year);
create index on public.past_questions using gin (to_tsvector('english', course_code || ' ' || course_title));

-- ---------- Resources, events, news, gallery, etc. ----------
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_path text,
  category text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,                     -- 'ATUAS Week','Seminar','Football Gala', etc.
  description text,
  location text,
  poster_path text,
  starts_at timestamptz,
  ends_at timestamptz,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  full_name text not null,
  student_id text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create table public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  content text,
  featured_image text,
  author_id uuid references public.profiles(id),
  category_id uuid references public.blog_categories(id),
  tags text[],
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  priority text default 'normal' check (priority in ('normal','high','urgent')),
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now()
);

create table public.gallery_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,                     -- Campus, ATUAS Week, TBSC, Football Gala, etc.
  created_at timestamptz not null default now()
);

create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  album_id uuid references public.gallery_albums(id) on delete cascade,
  image_path text not null,
  caption text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.face_of_atuas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_path text,
  year text,
  title text,
  description text,
  achievements text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.executives (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position text not null,
  photo_path text,
  bio text,
  phone text,                        -- shown only if show_phone = true
  show_phone boolean not null default false,
  sort_order int default 0,
  created_at timestamptz not null default now()
);

create table public.faculty_members (
  id uuid primary key default gen_random_uuid(),
  name text,                          -- left null until IBH supplies verified names
  title text,                         -- 'HOD', 'Lecturer'
  photo_path text,
  bio text,
  sort_order int default 0,
  created_at timestamptz not null default now()
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organization text,
  description text,
  eligibility text,
  deadline date,
  application_url text,
  category text,                      -- ICAG, Scholarship, Internship, Job, Competition
  date_posted date not null default current_date,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  ip_hash text,                       -- for basic abuse/rate-limit tracking, never raw IP
  created_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  action text not null,               -- 'uploaded_past_question', 'deleted_gallery_image', etc.
  resource_type text not null,
  resource_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Chatbot ----------
-- Admin-curated answers the chatbot checks when its built-in local
-- knowledge base (in js/site.js) doesn't match. Lets an admin teach
-- the chatbot new answers (e.g. from the constitution) without a
-- code change.
create table public.chatbot_qa (
  id uuid primary key default gen_random_uuid(),
  keywords text[] not null,           -- lowercase words/phrases matched against the visitor's question
  answer text not null,
  link text,                          -- optional page to point to, e.g. 'constitution.html'
  label text,                         -- optional link button text, e.g. 'Read the Constitution'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.chatbot_qa using gin (keywords);

-- Every question the chatbot couldn't answer, logged for an admin to
-- review and turn into a chatbot_qa entry.
create table public.chatbot_unanswered (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  status text not null default 'open' check (status in ('open', 'answered')),
  answer text,                        -- filled in once an admin answers it
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.programmes enable row level security;
alter table public.programme_levels enable row level security;
alter table public.courses enable row level security;
alter table public.past_questions enable row level security;
alter table public.resources enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_categories enable row level security;
alter table public.announcements enable row level security;
alter table public.gallery_albums enable row level security;
alter table public.gallery_images enable row level security;
alter table public.face_of_atuas enable row level security;
alter table public.executives enable row level security;
alter table public.faculty_members enable row level security;
alter table public.opportunities enable row level security;
alter table public.contact_messages enable row level security;
alter table public.site_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.chatbot_qa enable row level security;
alter table public.chatbot_unanswered enable row level security;

-- Helper: is the current user an admin (any role)?
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role is not null
  );
$$;

-- Helper: does the current user hold one of the given roles?
create or replace function public.has_role(roles public.admin_role[])
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = any(roles)
  );
$$;

-- ---- Public read-only tables: anyone can read published rows, only admins can write ----
-- (repeat this pattern per table; shown in full for past_questions and abbreviated for the rest)

create policy "public can read programmes" on public.programmes for select using (true);
create policy "admins manage programmes" on public.programmes for all
  using (public.has_role(array['super_admin','academic_admin']::public.admin_role[]))
  with check (public.has_role(array['super_admin','academic_admin']::public.admin_role[]));

create policy "public can read levels" on public.programme_levels for select using (true);
create policy "admins manage levels" on public.programme_levels for all
  using (public.has_role(array['super_admin','academic_admin']::public.admin_role[]))
  with check (public.has_role(array['super_admin','academic_admin']::public.admin_role[]));

create policy "public can read courses" on public.courses for select using (true);
create policy "admins manage courses" on public.courses for all
  using (public.has_role(array['super_admin','academic_admin']::public.admin_role[]))
  with check (public.has_role(array['super_admin','academic_admin']::public.admin_role[]));

create policy "public can read published past questions" on public.past_questions
  for select using (published = true);
create policy "academic admins manage past questions" on public.past_questions for all
  using (public.has_role(array['super_admin','academic_admin']::public.admin_role[]))
  with check (public.has_role(array['super_admin','academic_admin']::public.admin_role[]));

create policy "public can read published resources" on public.resources for select using (published = true);
create policy "academic admins manage resources" on public.resources for all
  using (public.has_role(array['super_admin','academic_admin']::public.admin_role[]))
  with check (public.has_role(array['super_admin','academic_admin']::public.admin_role[]));

create policy "public can read published events" on public.events for select using (published = true);
create policy "pro manages events" on public.events for all
  using (public.has_role(array['super_admin','pro','president']::public.admin_role[]))
  with check (public.has_role(array['super_admin','pro','president']::public.admin_role[]));

create policy "anyone can register for an event" on public.event_registrations for insert with check (true);
create policy "admins read registrations" on public.event_registrations for select
  using (public.has_role(array['super_admin','pro','president']::public.admin_role[]));

create policy "public can read published posts" on public.blog_posts for select using (status = 'published');
create policy "pro manages posts" on public.blog_posts for all
  using (public.has_role(array['super_admin','pro','editor']::public.admin_role[]))
  with check (public.has_role(array['super_admin','pro','editor']::public.admin_role[]));

create policy "public can read categories" on public.blog_categories for select using (true);
create policy "admins manage categories" on public.blog_categories for all
  using (public.is_admin()) with check (public.is_admin());

create policy "public can read published announcements" on public.announcements for select using (status = 'published');
create policy "pro manages announcements" on public.announcements for all
  using (public.has_role(array['super_admin','pro']::public.admin_role[]))
  with check (public.has_role(array['super_admin','pro']::public.admin_role[]));

create policy "public can read albums" on public.gallery_albums for select using (true);
create policy "pro manages albums" on public.gallery_albums for all
  using (public.has_role(array['super_admin','pro']::public.admin_role[]))
  with check (public.has_role(array['super_admin','pro']::public.admin_role[]));

create policy "public can read published images" on public.gallery_images for select using (published = true);
create policy "pro manages images" on public.gallery_images for all
  using (public.has_role(array['super_admin','pro']::public.admin_role[]))
  with check (public.has_role(array['super_admin','pro']::public.admin_role[]));

create policy "public can read published face of atuas" on public.face_of_atuas for select using (published = true);
create policy "pro manages face of atuas" on public.face_of_atuas for all
  using (public.has_role(array['super_admin','pro']::public.admin_role[]))
  with check (public.has_role(array['super_admin','pro']::public.admin_role[]));

create policy "public can read executives" on public.executives for select using (true);
create policy "president manages executives" on public.executives for all
  using (public.has_role(array['super_admin','president']::public.admin_role[]))
  with check (public.has_role(array['super_admin','president']::public.admin_role[]));

create policy "public can read faculty" on public.faculty_members for select using (true);
create policy "president manages faculty" on public.faculty_members for all
  using (public.has_role(array['super_admin','president']::public.admin_role[]))
  with check (public.has_role(array['super_admin','president']::public.admin_role[]));

create policy "public can read active opportunities" on public.opportunities for select using (status = 'active');
create policy "admins manage opportunities" on public.opportunities for all
  using (public.is_admin()) with check (public.is_admin());

-- Contact messages: anyone can submit, nobody can read except admins (write-only from the public)
create policy "anyone can submit a contact message" on public.contact_messages for insert with check (true);
create policy "admins read contact messages" on public.contact_messages for select using (public.is_admin());

-- Site settings + audit logs: super admin only
create policy "super admin manages settings" on public.site_settings for all
  using (public.has_role(array['super_admin']::public.admin_role[]))
  with check (public.has_role(array['super_admin']::public.admin_role[]));

create policy "admins read audit logs" on public.audit_logs for select using (public.is_admin());
create policy "system inserts audit logs" on public.audit_logs for insert with check (public.is_admin());

-- profiles: users can read their own row; super admin can read/manage all
create policy "user reads own profile" on public.profiles for select using (auth.uid() = id);
create policy "super admin manages profiles" on public.profiles for all
  using (public.has_role(array['super_admin']::public.admin_role[]))
  with check (public.has_role(array['super_admin']::public.admin_role[]));

-- chatbot_qa: anyone can read (the chatbot checks it live), admins manage it
create policy "public can read chatbot answers" on public.chatbot_qa for select using (true);
create policy "admins manage chatbot answers" on public.chatbot_qa for all
  using (public.has_role(array['super_admin','pro']::public.admin_role[]))
  with check (public.has_role(array['super_admin','pro']::public.admin_role[]));

-- chatbot_unanswered: anyone can log a question the bot couldn't answer;
-- only admins can read the log or mark it answered
create policy "anyone can log an unanswered question" on public.chatbot_unanswered for insert with check (true);
create policy "admins read unanswered questions" on public.chatbot_unanswered for select
  using (public.has_role(array['super_admin','pro']::public.admin_role[]));
create policy "admins update unanswered questions" on public.chatbot_unanswered for update
  using (public.has_role(array['super_admin','pro']::public.admin_role[]))
  with check (public.has_role(array['super_admin','pro']::public.admin_role[]));

-- ============================================================
-- Storage buckets (run separately or via the dashboard)
-- ============================================================
-- insert into storage.buckets (id, name, public) values
--   ('past-questions', 'past-questions', false),   -- served via signed URLs, not public
--   ('academic-resources', 'academic-resources', true),
--   ('executive-photos', 'executive-photos', true),
--   ('blog-images', 'blog-images', true),
--   ('gallery', 'gallery', true),
--   ('face-of-atuas', 'face-of-atuas', true),
--   ('campus-images', 'campus-images', true),
--   ('faculty-images', 'faculty-images', true),
--   ('event-posters', 'event-posters', true),
--   ('documents', 'documents', false);
--
-- Then add storage.objects policies mirroring the table policies above:
-- public SELECT on public buckets, admin-only INSERT/UPDATE/DELETE
-- everywhere, and signed-URL-only reads on 'past-questions' and 'documents'.
-- Full policy statements are documented in README.md.

-- ============================================================
-- Seed data: chatbot answers drawn from the ATUAS Amended Local
-- Constitution. Safe to re-run is not guaranteed (no upsert key),
-- so only run this block once on a fresh database.
-- ============================================================
insert into public.chatbot_qa (keywords, answer, link, label) values
  (array['full name', 'stand for', 'what does atuas mean', 'what is atuas'],
   'ATUAS stands for the Association of Technical University Accountancy Students of Ghana (ATUAS-GH).',
   'about.html', 'About ATUAS'),

  (array['slogan'],
   'ATUAS''s slogan is "ATUAS, true and fair".',
   null, null),

  (array['motto'],
   'ATUAS''s motto is "Commitment is vital".',
   null, null),

  (array['membership', 'who can join', 'join atuas', 'automatic member'],
   'All Accountancy students at ATU are automatic members: HND students (Levels 100 to 300), BTech students (Levels 100 to 400, including Top-Up students), and Diploma students (Levels 100 to 200). Past students stay members through the alumni network.',
   'constitution.html', 'Read the Constitution'),

  (array['executive committee', 'lec members', 'who makes up the executive', 'local executive committee'],
   'The Local Executive Committee (LEC) consists of the President, Vice President, Secretary, Financial Officer, ATUAS-GH Representative, two Organizing Secretaries, Publicity Officer, Women''s Commissioner, and Part-Time Representative.',
   'executives.html', 'Meet the Executives'),

  (array['president qualification', 'who can be president', 'run for president', 'contest president'],
   'To run for President, a student must be a third-year HND Accountancy student, or a third or fourth-year BTech student, with a minimum CGPA of 3.70 (HND), 4.00 (BTech), or 3.50 (Diploma).',
   'constitution.html', 'Read the Constitution'),

  (array['vice president qualification', 'vp qualification', 'running mate'],
   'The Vice President is nominated as a running mate by the Presidential candidate, and must be a second-year HND or Diploma student, or a second or third-year BTech student.',
   'constitution.html', 'Read the Constitution'),

  (array['cgpa requirement', 'grade requirement', 'minimum cgpa'],
   'Executive positions other than President and Vice President require a minimum CGPA of 3.50 (BTech), 3.00 (HND), or 3.00 (Diploma), and candidates must have no outstanding or unresolved courses at the time of nomination.',
   'constitution.html', 'Read the Constitution'),

  (array['judicial council', 'chief justice', 'justices'],
   'The Judicial Council has 5 members called Justices, led by a Chief Justice. It resolves disputes, handles discipline, and has appellate jurisdiction over election petitions.',
   'constitution.html', 'Read the Constitution'),

  (array['lecom', 'electoral commission', 'how are elections conducted'],
   'The Local Electoral Commission (LECOM) is an independent body that conducts ATUAS elections. It has 5 members, dissolves 72 hours after results are declared, and has three weeks to conduct and declare election results.',
   'constitution.html', 'Read the Constitution'),

  (array['remove an officer', 'impeachment', 'how to impeach'],
   'An officer can be impeached through a written allegation to the Judicial Council, signed by 15 General Council members or 30 students. General Council then votes by a two-thirds majority to remove the officer.',
   'constitution.html', 'Read the Constitution'),

  (array['resign', 'resignation process'],
   'An officer who wants to resign must give written notice to the Judicial Council, with copies to LEC and the Patrons, at least four weeks before the resignation takes effect.',
   'constitution.html', 'Read the Constitution'),

  (array['dress code', 'what to wear', 'uniform'],
   'The ATUAS dress code: Monday and Wednesday, blue long-sleeved shirt with tie; Tuesday, white long-sleeved shirt with tie; Thursday, ATUAS Lacoste or shirt; Friday, African prints or ATUAS cloth.',
   'constitution.html', 'Read the Constitution'),

  (array['patron', 'patrons of atuas'],
   'The Head of the Accountancy Department is an automatic Patron. Other patrons include senior lecturers, course coordinators, or any other person the Association finds resourceful.',
   'constitution.html', 'Read the Constitution'),

  (array['standing committee', 'committees'],
   'ATUAS has four standing committees: Finance and Sponsorship, Education and Research, Audit, and Sports.',
   'constitution.html', 'Read the Constitution'),

  (array['aims', 'objectives', 'purpose of atuas'],
   'ATUAS aims to unify all Accountancy students, raise awareness of Accountancy programmes, educate members on modern Accountancy practices, advocate for student welfare, and serve as the department''s voice within the SRC and ATUAS National.',
   'constitution.html', 'Read the Constitution'),

  (array['supreme law', 'constitution supremacy'],
   'The ATUAS local constitution governs the Local Executive Committee and operates under the supremacy of the SRC Constitution and the 1992 Constitution of Ghana.',
   'constitution.html', 'Read the Constitution'),

  (array['political', 'non-partisan'],
   'The Local Executive Committee remains non-political and non-partisan, and must represent the interests of all student groups equally.',
   'constitution.html', 'Read the Constitution');
-- ============================================================
-- ATUAS round-2 update: visitor analytics + editable page content
-- Safe to run more than once. Run in Supabase -> SQL Editor.
-- ============================================================

-- 1. Visitor analytics -------------------------------------------------
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  path text not null check (char_length(path) <= 120),
  visitor_id text check (visitor_id is null or char_length(visitor_id) <= 64),
  referrer text check (referrer is null or char_length(referrer) <= 120),
  visited_at timestamptz not null default now(),
  visited_on date not null default ((now() at time zone 'Africa/Accra')::date)
);
create index if not exists page_views_day_idx on public.page_views (visited_on);
alter table public.page_views enable row level security;

drop policy if exists "anyone can log a page view" on public.page_views;
create policy "anyone can log a page view" on public.page_views for insert with check (true);
drop policy if exists "admins read page views" on public.page_views;
create policy "admins read page views" on public.page_views for select using (public.is_admin());

create or replace function public.analytics_daily(p_from date, p_to date)
returns table(day date, views bigint, visitors bigint)
language sql security definer set search_path = public as $$
  select visited_on, count(*), count(distinct visitor_id)
  from public.page_views
  where public.is_admin() and visited_on between p_from and p_to
  group by visited_on order by visited_on;
$$;

create or replace function public.analytics_summary(p_from date, p_to date)
returns table(views bigint, visitors bigint)
language sql security definer set search_path = public as $$
  select count(*), count(distinct visitor_id)
  from public.page_views
  where public.is_admin() and visited_on between p_from and p_to;
$$;

create or replace function public.analytics_pages(p_from date, p_to date)
returns table(path text, views bigint, visitors bigint)
language sql security definer set search_path = public as $$
  select pv.path, count(*), count(distinct pv.visitor_id)
  from public.page_views pv
  where public.is_admin() and pv.visited_on between p_from and p_to
  group by pv.path order by count(*) desc limit 30;
$$;

revoke execute on function public.analytics_daily(date, date) from public, anon;
revoke execute on function public.analytics_summary(date, date) from public, anon;
revoke execute on function public.analytics_pages(date, date) from public, anon;
grant execute on function public.analytics_daily(date, date) to authenticated;
grant execute on function public.analytics_summary(date, date) to authenticated;
grant execute on function public.analytics_pages(date, date) to authenticated;

-- 2. Editable page content (text + images) -----------------------------
create table if not exists public.site_content (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;

drop policy if exists "public can read site content" on public.site_content;
create policy "public can read site content" on public.site_content for select using (true);
drop policy if exists "admins manage site content" on public.site_content;
create policy "admins manage site content" on public.site_content for all
  using (public.is_admin()) with check (public.is_admin());

-- 3. Admin can read and delete contact messages ------------------------
drop policy if exists "admins delete contact messages" on public.contact_messages;
create policy "admins delete contact messages" on public.contact_messages for delete using (public.is_admin());
