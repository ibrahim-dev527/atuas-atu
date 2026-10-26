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
