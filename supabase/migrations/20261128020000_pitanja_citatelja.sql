-- Pitanja čitatelja: tema koju nisu našli u Vodiču. Istražimo, napišemo članak i javimo im se e-mailom.
-- Pitanje se ne objavljuje. Vidi ga i mijenja samo admin; unos ide kroz poslužiteljski endpoint.

create table public.topic_requests (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(btrim(question)) between 10 and 1000),
  email text not null check (char_length(email) between 3 and 254),
  consent_text text not null check (char_length(consent_text) <= 1000),
  page text check (page is null or char_length(page) <= 300),
  status text not null default 'new' check (status in ('new', 'planned', 'answered', 'rejected')),
  article_slug text,
  notified_at timestamptz,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index topic_requests_status_idx on public.topic_requests (status, created_at desc);

alter table public.topic_requests enable row level security;
revoke all on public.topic_requests from anon, authenticated;

-- Admin čita i mijenja stanje kroz RLS, bez servisnog ključa.
grant select, update (status, article_slug, notified_at, updated_at) on public.topic_requests to authenticated;
create policy topic_requests_admin_select on public.topic_requests for select using (public.is_admin());
create policy topic_requests_admin_update on public.topic_requests for update using (public.is_admin()) with check (public.is_admin());
