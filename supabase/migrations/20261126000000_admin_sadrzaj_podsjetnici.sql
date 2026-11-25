-- Lijevak i atribucija, sadržaj (članci, izvori, prodajne sekcije), podsjetnici, suradnici,
-- dokazi o donacijama i adminov uvid u Stripe događaje.

-- ---------------------------------------------------------------------------------------------
-- Lijevak: koraci vezani uz nacrt ili narudžbu, bez identifikatora posjetitelja
-- ---------------------------------------------------------------------------------------------

create table public.funnel_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  name text not null check (name in (
    'draft_started', 'step_review', 'email_confirmed', 'published_free', 'checkout_started', 'paid')),
  memorial_id uuid references public.memorials (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  attribution jsonb
);
alter table public.funnel_events enable row level security;
create index funnel_events_name_idx on public.funnel_events (name, occurred_at desc);
create policy funnel_admin on public.funnel_events for select to authenticated using (public.is_admin());

-- Bilježi korak za vlastiti memorijal; izvor posjeta prepisuje se s nacrta.
create or replace function public.track_funnel(p_name text, p_memorial_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_name not in ('draft_started', 'step_review', 'email_confirmed', 'published_free') then
    raise exception 'invalid_event' using errcode = 'P0001';
  end if;
  if not public.can_edit_memorial(p_memorial_id) then
    return;
  end if;
  -- Svaki korak se za jedan memorijal bilježi jednom.
  if exists (select 1 from public.funnel_events f where f.memorial_id = p_memorial_id and f.name = p_name) then
    return;
  end if;
  insert into public.funnel_events (name, memorial_id, attribution)
  select p_name, m.id, m.attribution from public.memorials m where m.id = p_memorial_id;
end $$;

-- Narudžba nasljeđuje izvor posjeta s memorijala; plaćanje i početak naplate ulaze u lijevak.
create or replace function public.orders_funnel() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_memorial uuid;
  v_attribution jsonb;
begin
  select l.memorial_id into v_memorial from public.order_lines l
    where l.order_id = new.id and l.kind in ('memorial', 'upgrade') and l.memorial_id is not null
    order by l.position limit 1;
  v_attribution := new.attribution;
  if v_attribution is null and v_memorial is not null then
    select m.attribution into v_attribution from public.memorials m where m.id = v_memorial;
  end if;
  if tg_op = 'UPDATE' and new.status = 'paid' and old.status is distinct from 'paid' then
    if new.attribution is null and v_attribution is not null then
      update public.orders set attribution = v_attribution where id = new.id;
    end if;
    insert into public.funnel_events (name, memorial_id, order_id, attribution)
    values ('paid', v_memorial, new.id, v_attribution);
  end if;
  return new;
end $$;
create trigger orders_funnel_paid after update of status on public.orders
  for each row execute function public.orders_funnel();

-- Početak naplate bilježi se nakon što su stavke upisane (zove ga poslužitelj).
create or replace function public.track_checkout_started(p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_memorial uuid;
  v_attribution jsonb;
begin
  select l.memorial_id into v_memorial from public.order_lines l
    where l.order_id = p_order_id and l.memorial_id is not null order by l.position limit 1;
  select coalesce(o.attribution, m.attribution) into v_attribution
    from public.orders o left join public.memorials m on m.id = v_memorial
    where o.id = p_order_id;
  insert into public.funnel_events (name, memorial_id, order_id, attribution)
  values ('checkout_started', v_memorial, p_order_id, v_attribution);
end $$;

-- ---------------------------------------------------------------------------------------------
-- Sadržaj: članci, izvori i prodajne sekcije
-- ---------------------------------------------------------------------------------------------

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  locale text not null default 'hr',
  cluster text not null check (cluster in ('kraj-zivota', 'nakon-smrti', 'tugovanje', 'prigodni-datumi')),
  title text not null check (char_length(title) between 1 and 160),
  excerpt text check (char_length(excerpt) <= 400),
  body_md text not null default '',
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'published', 'archived')),
  -- Članci o zdravlju i eutanaziji: ne objavljuju se bez pregleda veterinara.
  needs_vet_review boolean not null default false,
  vet_reviewed_by text check (char_length(vet_reviewed_by) <= 160),
  vet_reviewed_at timestamptz,
  owner_approved_at timestamptz,
  seo_title text check (char_length(seo_title) <= 160),
  seo_description text check (char_length(seo_description) <= 320),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Pravilo objave provjerava baza, ne samo sučelje.
  constraint articles_publish_gate check (
    status <> 'published'
    or (owner_approved_at is not null
        and published_at is not null
        and (not needs_vet_review or vet_reviewed_at is not null))
  )
);
alter table public.articles enable row level security;
create index articles_published_idx on public.articles (cluster, published_at desc) where status = 'published';
create trigger articles_updated_at before update on public.articles
  for each row execute function public.set_updated_at();
create policy articles_select_published on public.articles for select to anon, authenticated
  using (status = 'published');
create policy articles_admin on public.articles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Svaka cijena i pravna tvrdnja ima izvor i datum pristupa.
create table public.article_sources (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  position integer not null default 0,
  claim text check (char_length(claim) <= 400),
  title text not null check (char_length(title) between 1 and 240),
  url text not null check (url ~ '^https?://' and char_length(url) <= 600),
  publisher text check (char_length(publisher) <= 160),
  accessed_on date not null
);
alter table public.article_sources enable row level security;
create index article_sources_article_idx on public.article_sources (article_id, position);
create policy sources_select on public.article_sources for select to anon, authenticated
  using (exists (select 1 from public.articles a where a.id = article_id and a.status = 'published'));
create policy sources_admin on public.article_sources for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table public.cta_blocks (
  key text primary key check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(key) <= 60),
  heading text not null check (char_length(heading) between 1 and 160),
  body text check (char_length(body) <= 600),
  button_label text not null check (char_length(button_label) between 1 and 60),
  target text not null default '/izradi' check (target ~ '^/' and char_length(target) <= 200),
  variant text not null default 'butter' check (variant in ('butter', 'mint', 'plum')),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.cta_blocks enable row level security;
create trigger cta_blocks_updated_at before update on public.cta_blocks
  for each row execute function public.set_updated_at();
create policy cta_select on public.cta_blocks for select to anon, authenticated using (active or public.is_admin());
create policy cta_admin on public.cta_blocks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.cta_blocks (key, heading, body, button_label, target, variant) values
  ('besplatni-spomen', 'Mjesto gdje sjećanje ostaje',
   'Izradi besplatnu spomen-stranicu: ime, fotografija, posveta i knjiga sjećanja za obitelj i prijatelje.',
   'Izradi besplatni spomen', '/izradi', 'butter'),
  ('pogledaj-primjer', 'Kako izgleda spomen',
   'Pogledaj primjer stranice prije nego što odlučiš.', 'Pogledaj primjer', '/primjer', 'mint'),
  ('poklon', 'Za prijatelja koji se oprašta',
   'Memorijal možeš pokloniti. Primatelj dobiva tvoju poruku i poveznicu kad god mu bude vrijeme.',
   'Pokloni memorijal', '/poklon', 'mint');

create table public.article_cta (
  article_id uuid not null references public.articles (id) on delete cascade,
  slot text not null check (slot in ('after_intro', 'middle', 'end')),
  cta_key text not null references public.cta_blocks (key) on delete cascade,
  primary key (article_id, slot)
);
alter table public.article_cta enable row level security;
create policy article_cta_select on public.article_cta for select to anon, authenticated using (true);
create policy article_cta_admin on public.article_cta for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------------------------
-- Podsjetnici e-mailom
-- ---------------------------------------------------------------------------------------------

create table public.reminder_prefs (
  memorial_id uuid not null references public.memorials (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  birthday boolean not null default true,
  adoption boolean not null default true,
  anniversary boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (memorial_id, user_id)
);
alter table public.reminder_prefs enable row level security;
create policy reminder_prefs_own on public.reminder_prefs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.can_edit_memorial(memorial_id));

-- Dnevnik poslanih: isti podsjetnik za istu godinu ne šalje se dvaput.
create table public.reminder_log (
  memorial_id uuid not null references public.memorials (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('birthday', 'adoption', 'anniversary')),
  year integer not null,
  sent_at timestamptz not null default now(),
  primary key (memorial_id, user_id, kind, year)
);
alter table public.reminder_log enable row level security;

-- ---------------------------------------------------------------------------------------------
-- Suradnici iz obitelji
-- ---------------------------------------------------------------------------------------------

-- Pozivnica: samo vlasnik, samo plaćeni paket, najviše 10 suradnika. Vraća jednokratan token
-- koji poslužitelj šalje e-mailom; u bazi ostaje samo njegov sažetak.
create or replace function public.invite_member(p_memorial_id uuid, p_email text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  m public.memorials;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_token text;
  v_count integer;
begin
  select * into m from public.memorials where id = p_memorial_id and owner_id = v_uid;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if m.tier = 'free' then
    raise exception 'paid_feature' using errcode = 'P0001';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;
  select count(*) into v_count from public.memorial_members mm where mm.memorial_id = p_memorial_id;
  if v_count >= 10 and not exists (
    select 1 from public.memorial_members mm where mm.memorial_id = p_memorial_id and mm.invited_email = v_email
  ) then
    raise exception 'member_limit' using errcode = 'P0001';
  end if;
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.memorial_members (memorial_id, invited_email, invite_token_hash)
  values (p_memorial_id, v_email, encode(extensions.digest(v_token, 'sha256'), 'hex'))
  on conflict (memorial_id, invited_email) do update
    set invite_token_hash = excluded.invite_token_hash
    where public.memorial_members.accepted_at is null;
  return v_token;
end $$;

-- Prihvaćanje pozivnice: prijavljeni korisnik s potvrđenim e-mailom i ispravnim tokenom.
create or replace function public.accept_member_invite(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_hash text := encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  mm public.memorial_members;
begin
  if v_uid is null or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'email_required' using errcode = 'P0001';
  end if;
  select * into mm from public.memorial_members where invite_token_hash = v_hash for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if mm.accepted_at is not null then
    if mm.user_id = v_uid then
      return mm.memorial_id;
    end if;
    raise exception 'already_used' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.memorials m where m.id = mm.memorial_id and m.owner_id = v_uid) then
    raise exception 'is_owner' using errcode = 'P0001';
  end if;
  update public.memorial_members
    set user_id = v_uid, accepted_at = now(), invite_token_hash = null
    where memorial_id = mm.memorial_id and invited_email = mm.invited_email;
  return mm.memorial_id;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Dokazi o donacijama (javni) i adminov uvid u Stripe događaje
-- ---------------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('donation-proofs', 'donation-proofs', true, 10485760,
        array['application/pdf', 'image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy proofs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'donation-proofs' and public.is_admin());
create policy proofs_update on storage.objects for update to authenticated
  using (bucket_id = 'donation-proofs' and public.is_admin())
  with check (bucket_id = 'donation-proofs' and public.is_admin());
create policy proofs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'donation-proofs' and public.is_admin());

create policy stripe_events_admin on public.stripe_events for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------------------------
-- Prava
-- ---------------------------------------------------------------------------------------------

revoke all on public.funnel_events, public.articles, public.article_sources, public.cta_blocks,
              public.article_cta, public.reminder_prefs, public.reminder_log
  from anon, authenticated;
grant all on public.funnel_events, public.articles, public.article_sources, public.cta_blocks,
             public.article_cta, public.reminder_prefs, public.reminder_log
  to service_role;

grant select on public.funnel_events, public.stripe_events to authenticated;
grant select on public.articles, public.article_sources, public.cta_blocks, public.article_cta
  to anon, authenticated;
grant insert, update, delete on public.articles, public.article_sources, public.cta_blocks, public.article_cta
  to authenticated;
grant select, insert, update, delete on public.reminder_prefs to authenticated;
-- Admin: uklanjanje poruke iz knjige sjećanja i unos novih partnera/kodova već imaju politike;
-- ovdje se dodaje pravo izmjene statusa gesti i prijava koje politike već ograničavaju na admina.
grant select on public.profiles to authenticated;

revoke execute on function public.track_funnel(text, uuid) from public, anon;
revoke execute on function public.orders_funnel() from public, anon, authenticated;
revoke execute on function public.track_checkout_started(uuid) from public, anon, authenticated;
revoke execute on function public.invite_member(uuid, text) from public, anon;
revoke execute on function public.accept_member_invite(text) from public, anon;
grant execute on function public.track_funnel(text, uuid) to authenticated, service_role;
grant execute on function public.track_checkout_started(uuid) to service_role;
grant execute on function public.invite_member(uuid, text) to authenticated, service_role;
grant execute on function public.accept_member_invite(text) to authenticated, service_role;
