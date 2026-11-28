-- Admin: popis adresa koje dobivaju ulogu admina i brojke za nadzornu ploču.

-- ---------------------------------------------------------------------------------------------
-- Popis adresa admina
-- ---------------------------------------------------------------------------------------------
-- Adrese se ne drže u repozitoriju; vlasnik ih upisuje izravno u bazu. Uloga se dodjeljuje tek
-- kad je adresa potvrđena kodom iz e-maila, pa je nitko ne može preuzeti samim upisom adrese.

create table public.admin_emails (
  email text primary key
    check (email = lower(btrim(email)) and char_length(email) between 3 and 254),
  created_at timestamptz not null default now()
);

alter table public.admin_emails enable row level security;
revoke all on public.admin_emails from public, anon, authenticated;
-- Bez politika: tablicu čitaju samo funkcije ispod.

create or replace function public.promote_listed_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null
     and new.email_confirmed_at is not null
     and exists (select 1 from public.admin_emails a where a.email = lower(new.email)) then
    insert into public.profiles (id, role) values (new.id, 'admin')
    on conflict (id) do update set role = 'admin';
  end if;
  return new;
end $$;

revoke execute on function public.promote_listed_admin() from public, anon, authenticated;

-- Ime počinje s „on_auth_user_admin”, pa se okida prije `on_auth_user_created`; ta zatim ne mijenja ništa.
create trigger on_auth_user_admin
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function public.promote_listed_admin();

-- Adresa dodana na popis kad račun već postoji: uloga se dodjeljuje odmah.
create or replace function public.promote_existing_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role)
  select u.id, 'admin' from auth.users u
  where lower(u.email) = new.email and u.email_confirmed_at is not null
  on conflict (id) do update set role = 'admin';
  return new;
end $$;

revoke execute on function public.promote_existing_admin() from public, anon, authenticated;

create trigger admin_emails_promote
  after insert on public.admin_emails
  for each row execute function public.promote_existing_admin();

-- ---------------------------------------------------------------------------------------------
-- Brojke za nadzornu ploču
-- ---------------------------------------------------------------------------------------------
-- Samo zbrojevi, bez sadržaja i bez adresa. Nacrti se broje, ali se ne čitaju.

create or replace function public.admin_dashboard(p_since timestamptz)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  select jsonb_build_object(
    'memorials', (
      select jsonb_build_object(
        'created', count(*) filter (where m.created_at >= p_since),
        'published', count(*) filter (where m.published_at >= p_since and m.status <> 'draft'),
        'publishedTotal', count(*) filter (where m.status = 'published'),
        'onMeadow', count(*) filter (where m.status = 'published' and m.visibility = 'public'),
        'paidTotal', count(*) filter (where m.status = 'published' and m.tier <> 'free'),
        'openDrafts', count(*) filter (where m.status = 'draft')
      ) from public.memorials m
    ),
    'species', (
      select coalesce(jsonb_object_agg(s.species, s.n), '{}'::jsonb) from (
        select m.species, count(*) as n from public.memorials m
        where m.status = 'published' group by m.species
      ) s
    ),
    'trails', (
      select jsonb_build_object(
        'new', count(*) filter (where f.status = 'visible' and coalesce(f.confirmed_at, f.created_at) >= p_since),
        'total', count(*) filter (where f.status = 'visible'),
        'waitingEmail', count(*) filter (where f.status = 'pending'),
        'dedicationsPending', count(*) filter (where f.dedication_status = 'pending' and f.status = 'visible')
      ) from public.meadow_flowers f
    ),
    'newsletter', (
      select jsonb_build_object(
        'confirmed', count(*) filter (where n.status = 'confirmed'),
        'newConfirmed', count(*) filter (where n.status = 'confirmed' and n.confirmed_at >= p_since),
        'pending', count(*) filter (where n.status = 'pending'),
        'unsubscribed', count(*) filter (where n.status = 'unsubscribed')
      ) from public.newsletter_subscribers n
    ),
    'accounts', (
      select jsonb_build_object(
        'total', count(*) filter (where u.email_confirmed_at is not null and not u.is_anonymous),
        'new', count(*) filter (where u.email_confirmed_at >= p_since and not u.is_anonymous)
      ) from auth.users u
    ),
    'engagement', jsonb_build_object(
      'candles', (select count(*) from public.candles c where c.created_at >= p_since),
      'messages', (select count(*) from public.guestbook_entries g
                   where g.created_at >= p_since and g.status in ('pending', 'approved')),
      'gestures', (select count(*) from public.gestures g where g.created_at >= p_since)
    ),
    'attention', jsonb_build_object(
      'reports', (select count(*) from public.reports r where r.status = 'open'),
      'questions', (select count(*) from public.topic_requests q where q.status = 'new'),
      'articlesInReview', (select count(*) from public.articles a where a.status = 'in_review'),
      'stripeErrors', (select count(*) from public.stripe_events e where e.error is not null)
    ),
    'content', jsonb_build_object(
      'articles', (select count(*) from public.articles a where a.status = 'published'),
      'questionsTotal', (select count(*) from public.topic_requests q where q.created_at >= p_since)
    )
  ) into v;

  return v;
end $$;

revoke execute on function public.admin_dashboard(timestamptz) from public, anon;
grant execute on function public.admin_dashboard(timestamptz) to authenticated, service_role;
