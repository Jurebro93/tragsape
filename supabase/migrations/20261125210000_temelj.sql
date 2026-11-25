-- Trag šape — temelj: računi, memorijali, javni unosi, prodaja.
-- Pravila: RLS na svakoj tablici; prava izričito dodijeljena; stanja koja nose novac ili
-- vidljivost (tier, status, visibility) mijenjaju se samo kroz funkcije, nikad izravnim UPDATE-om.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------------------------
-- Pomoćne funkcije
-- ---------------------------------------------------------------------------------------------

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.try_uuid(p text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;

create or replace function public.slugify(p text) returns text
language sql immutable set search_path = '' as $$
  select trim(both '-' from regexp_replace(
    translate(lower(coalesce(p, '')), 'čćžšđáàäâéèëêíìïîóòöôúùüûñ', 'cczsdaaaaeeeeiiiioooouuuun'),
    '[^a-z0-9]+', '-', 'g'))
$$;

-- Ključ za memorijale „samo s linkom". Poslužitelj ga šalje u zaglavlju x-share-key,
-- pa i taj pristup provjerava RLS, a ne kod aplikacije.
create or replace function public.request_share_key() returns text
language sql stable set search_path = '' as $$
  select nullif(nullif(current_setting('request.headers', true), '')::json ->> 'x-share-key', '')
$$;

-- ---------------------------------------------------------------------------------------------
-- Računi
-- ---------------------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
$$;

-- ---------------------------------------------------------------------------------------------
-- Memorijal
-- ---------------------------------------------------------------------------------------------

create table public.memorials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  slug text not null unique,
  share_key text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  tier text not null default 'free' check (tier in ('free', 'memorial', 'portrait')),
  visibility text not null default 'public' check (visibility in ('public', 'unlisted', 'private')),
  name text not null default '' check (char_length(name) <= 60),
  species text check (char_length(species) <= 30),
  breed text check (char_length(breed) <= 80),
  sex text check (sex in ('m', 'z')),
  birth_date date,
  birth_precision text not null default 'day' check (birth_precision in ('day', 'month', 'year')),
  death_date date,
  death_precision text not null default 'day' check (death_precision in ('day', 'month', 'year')),
  adoption_date date,
  dedication text check (char_length(dedication) <= 300),
  story_md text check (char_length(story_md) <= 20000),
  nicknames text[] not null default '{}' check (cardinality(nicknames) <= 8),
  traits text[] not null default '{}' check (cardinality(traits) <= 12),
  favorite_toy text check (char_length(favorite_toy) <= 120),
  favorite_treat text check (char_length(favorite_treat) <= 120),
  favorite_place text check (char_length(favorite_place) <= 120),
  funny_habits text check (char_length(funny_habits) <= 600),
  video_url text check (char_length(video_url) <= 300),
  theme text not null default 'suncano-jutro' check (char_length(theme) <= 40),
  cover_photo_id uuid,
  guestbook_mode text not null default 'premoderate' check (guestbook_mode in ('premoderate', 'open', 'off')),
  candle_count integer not null default 0,
  draft_step smallint not null default 1 check (draft_step between 1 and 3),
  attribution jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Besplatni spomen je uvijek javan.
  constraint memorials_free_is_public check (tier <> 'free' or visibility = 'public'),
  constraint memorials_dates_order check (birth_date is null or death_date is null or birth_date <= death_date)
);
alter table public.memorials enable row level security;
create index memorials_owner_idx on public.memorials (owner_id);
create index memorials_public_idx on public.memorials (published_at desc)
  where status = 'published' and visibility = 'public';
create trigger memorials_updated_at before update on public.memorials
  for each row execute function public.set_updated_at();

create table public.memorial_members (
  memorial_id uuid not null references public.memorials (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('editor')),
  invited_email text not null check (char_length(invited_email) <= 254),
  invite_token_hash text,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (memorial_id, invited_email)
);
alter table public.memorial_members enable row level security;
create index memorial_members_user_idx on public.memorial_members (user_id);

create or replace function public.is_member(p_memorial_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memorial_members mm
    where mm.memorial_id = p_memorial_id
      and mm.user_id = (select auth.uid())
      and mm.accepted_at is not null
  )
$$;

create or replace function public.can_edit_memorial(p_memorial_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memorials m
    where m.id = p_memorial_id
      and (m.owner_id = (select auth.uid()) or public.is_member(m.id))
  )
$$;

create or replace function public.can_view_memorial(p_memorial_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memorials m
    where m.id = p_memorial_id
      and (
        (m.status = 'published' and m.visibility = 'public')
        or (m.status = 'published' and m.visibility = 'unlisted' and m.share_key = public.request_share_key())
        or m.owner_id = (select auth.uid())
        or public.is_member(m.id)
        or public.is_admin()
      )
  )
$$;

create policy memorials_select_public on public.memorials for select to anon, authenticated
  using (
    status = 'published'
    and (visibility = 'public' or (visibility = 'unlisted' and share_key = public.request_share_key()))
  );
create policy memorials_select_own on public.memorials for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_member(id) or public.is_admin());
create policy memorials_update_editors on public.memorials for update to authenticated
  using (owner_id = (select auth.uid()) or public.is_member(id))
  with check (owner_id = (select auth.uid()) or public.is_member(id));
create policy memorials_delete_owner on public.memorials for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy members_select on public.memorial_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.memorials m where m.id = memorial_id and m.owner_id = (select auth.uid()))
  );
create policy members_delete_owner on public.memorial_members for delete to authenticated
  using (exists (select 1 from public.memorials m where m.id = memorial_id and m.owner_id = (select auth.uid())));

-- Fotografije ---------------------------------------------------------------------------------

create table public.memorial_photos (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references public.memorials (id) on delete cascade,
  storage_path text not null,
  width integer,
  height integer,
  caption text check (char_length(caption) <= 200),
  taken_on date,
  sort_order integer not null default 0,
  kind text not null default 'photo' check (kind in ('photo', 'ai_portrait')),
  source_photo_id uuid references public.memorial_photos (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.memorial_photos enable row level security;
create index memorial_photos_memorial_idx on public.memorial_photos (memorial_id, sort_order);

alter table public.memorials
  add constraint memorials_cover_photo_fk foreign key (cover_photo_id)
  references public.memorial_photos (id) on delete set null;

-- Ograničenje broja fotografija po paketu provjerava baza, ne samo sučelje.
create or replace function public.enforce_photo_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_tier text;
  v_count integer;
  v_limit integer;
begin
  if new.kind <> 'photo' then
    return new;
  end if;
  select m.tier into v_tier from public.memorials m where m.id = new.memorial_id for update;
  select count(*) into v_count from public.memorial_photos p
    where p.memorial_id = new.memorial_id and p.kind = 'photo';
  v_limit := case when v_tier = 'free' then 5 else 50 end;
  if v_count >= v_limit then
    raise exception 'photo_limit' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger memorial_photos_limit before insert on public.memorial_photos
  for each row execute function public.enforce_photo_limit();

create policy photos_select on public.memorial_photos for select to anon, authenticated
  using (public.can_view_memorial(memorial_id));
create policy photos_insert on public.memorial_photos for insert to authenticated
  with check (public.can_edit_memorial(memorial_id) and created_by = (select auth.uid()));
create policy photos_update on public.memorial_photos for update to authenticated
  using (public.can_edit_memorial(memorial_id)) with check (public.can_edit_memorial(memorial_id));
create policy photos_delete on public.memorial_photos for delete to authenticated
  using (public.can_edit_memorial(memorial_id));

-- Vremenska crta i pisma -------------------------------------------------------------------------

create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references public.memorials (id) on delete cascade,
  event_date date,
  date_precision text not null default 'day' check (date_precision in ('day', 'month', 'year')),
  title text not null check (char_length(title) between 1 and 120),
  body text check (char_length(body) <= 1000),
  photo_id uuid references public.memorial_photos (id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.timeline_events enable row level security;
create index timeline_events_memorial_idx on public.timeline_events (memorial_id, event_date);

create policy timeline_select on public.timeline_events for select to anon, authenticated
  using (public.can_view_memorial(memorial_id));
create policy timeline_insert on public.timeline_events for insert to authenticated
  with check (public.can_edit_memorial(memorial_id));
create policy timeline_update on public.timeline_events for update to authenticated
  using (public.can_edit_memorial(memorial_id)) with check (public.can_edit_memorial(memorial_id));
create policy timeline_delete on public.timeline_events for delete to authenticated
  using (public.can_edit_memorial(memorial_id));

create table public.letters (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references public.memorials (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  written_on date not null default current_date,
  title text check (char_length(title) <= 120),
  body text not null check (char_length(body) between 1 and 10000),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.letters enable row level security;
create index letters_memorial_idx on public.letters (memorial_id, written_on desc);
create trigger letters_updated_at before update on public.letters
  for each row execute function public.set_updated_at();

-- Privatno pismo vidi samo autor; ni vlasnik memorijala ni admin.
create policy letters_select on public.letters for select to anon, authenticated
  using (
    (visibility = 'public' and public.can_view_memorial(memorial_id))
    or author_id = (select auth.uid())
  );
create policy letters_insert on public.letters for insert to authenticated
  with check (author_id = (select auth.uid()) and public.can_edit_memorial(memorial_id));
create policy letters_update on public.letters for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy letters_delete on public.letters for delete to authenticated
  using (author_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- Javni unosi (upis samo kroz poslužiteljske endpointove sa servisnim ključem)
-- ---------------------------------------------------------------------------------------------

create table public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references public.memorials (id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 60),
  author_email text check (char_length(author_email) <= 254),
  body text not null check (char_length(body) between 1 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden', 'removed')),
  ip_hash text,
  created_at timestamptz not null default now(),
  moderated_at timestamptz
);
alter table public.guestbook_entries enable row level security;
create index guestbook_memorial_idx on public.guestbook_entries (memorial_id, created_at desc);

create policy guestbook_select_approved on public.guestbook_entries for select to anon, authenticated
  using (status = 'approved' and public.can_view_memorial(memorial_id));
create policy guestbook_select_editors on public.guestbook_entries for select to authenticated
  using ((status <> 'removed' and public.can_edit_memorial(memorial_id)) or public.is_admin());
-- Vlasnik i suradnik odobravaju ili skrivaju; uklanja samo admin.
create policy guestbook_moderate on public.guestbook_entries for update to authenticated
  using (status <> 'removed' and public.can_edit_memorial(memorial_id))
  with check (status in ('approved', 'hidden') and public.can_edit_memorial(memorial_id));
create policy guestbook_admin on public.guestbook_entries for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.guestbook_touch_moderated() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    new.moderated_at = now();
  end if;
  return new;
end $$;
create trigger guestbook_moderated before update on public.guestbook_entries
  for each row execute function public.guestbook_touch_moderated();

-- Besplatna dnevna svijeća: jedna po posjetitelju, danu i memorijalu. Samo se broji.
create table public.candles (
  memorial_id uuid not null references public.memorials (id) on delete cascade,
  day date not null,
  visitor_hash text not null,
  created_at timestamptz not null default now(),
  primary key (memorial_id, day, visitor_hash)
);
alter table public.candles enable row level security;
create index candles_created_idx on public.candles (memorial_id, created_at desc);

create or replace function public.candles_increment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.memorials set candle_count = candle_count + 1 where id = new.memorial_id;
  return new;
end $$;
create trigger candles_count after insert on public.candles
  for each row execute function public.candles_increment();

-- Broj svijeća upaljenih od zadanog trenutka („večeras").
create or replace function public.candles_since(p_memorial_id uuid, p_since timestamptz) returns integer
language sql stable security definer set search_path = '' as $$
  select case when public.can_view_memorial(p_memorial_id) then (
    select count(*)::integer from public.candles c
    where c.memorial_id = p_memorial_id and c.created_at >= p_since
  ) else 0 end
$$;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('memorial', 'guestbook_entry', 'gesture', 'photo')),
  target_id uuid not null,
  memorial_id uuid references public.memorials (id) on delete cascade,
  reason text not null check (reason in ('neprimjereno', 'spam', 'tudji_sadrzaj', 'drugo')),
  details text check (char_length(details) <= 1000),
  reporter_email text check (char_length(reporter_email) <= 254),
  ip_hash text,
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  handled_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy reports_admin_select on public.reports for select to authenticated using (public.is_admin());
create policy reports_admin_update on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;

-- Vraća true ako je zahtjev unutar ograničenja. Zove ga samo poslužitelj.
create or replace function public.check_rate_limit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into v_count;
  delete from public.rate_limits where window_start < now() - interval '2 days';
  return v_count <= p_max;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Prodaja
-- ---------------------------------------------------------------------------------------------

create table public.products (
  key text primary key,
  name text not null,
  unit_amount_cents integer not null check (unit_amount_cents >= 0),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
create policy products_select on public.products for select to anon, authenticated using (active);
create policy products_admin on public.products for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.products (key, name, unit_amount_cents) values
  ('memorial', 'Memorijal', 1900),
  ('memorial_portrait', 'Memorijal + Portret', 2900),
  ('upgrade_portrait', 'Nadogradnja na Portret', 1000),
  ('gesture_7d', 'Gesta, 7 dana', 299),
  ('gesture_30d', 'Gesta, 30 dana', 499),
  ('gesture_365d', 'Gesta, godinu dana', 999);

create table public.shelters (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  url text check (char_length(url) <= 300),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.shelters enable row level security;
create policy shelters_select on public.shelters for select to anon, authenticated using (active);
create policy shelters_admin on public.shelters for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table public.settings (
  id boolean primary key default true check (id),
  repeat_discount_pct integer not null default 30 check (repeat_discount_pct between 0 and 100),
  donation_per_memorial_cents integer not null default 100 check (donation_per_memorial_cents >= 0),
  active_shelter_id uuid references public.shelters (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;
insert into public.settings (id) values (true);
create policy settings_select on public.settings for select to anon, authenticated using (true);
create policy settings_admin on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  type text not null check (type in ('vet', 'crematorium', 'other')),
  contact text check (char_length(contact) <= 300),
  commission_type text not null default 'percent' check (commission_type in ('percent', 'fixed')),
  commission_value integer not null default 0 check (commission_value >= 0),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.partners enable row level security;
create policy partners_admin on public.partners for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code = upper(code) and char_length(code) between 3 and 40),
  kind text not null default 'promo' check (kind in ('promo', 'partner')),
  partner_id uuid references public.partners (id) on delete restrict,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value integer not null check (discount_value > 0),
  applies_to text[] not null default '{memorial,memorial_portrait}',
  max_redemptions integer check (max_redemptions > 0),
  redeemed_count integer not null default 0,
  valid_from timestamptz,
  valid_to timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (code),
  constraint promo_partner_kind check ((kind = 'partner') = (partner_id is not null)),
  constraint promo_percent_range check (discount_type <> 'percent' or discount_value <= 100)
);
alter table public.promo_codes enable row level security;
create policy promo_admin on public.promo_codes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text check (char_length(email) <= 254),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'expired', 'refunded')),
  currency text not null default 'eur' check (currency = 'eur'),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  promo_code_id uuid references public.promo_codes (id) on delete set null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  -- Trenutak izričitog pristanka na početak isporuke i gubitak prava na jednostrani raskid.
  withdrawal_waiver_at timestamptz,
  attribution jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  refunded_at timestamptz,
  constraint orders_total check (total_cents = subtotal_cents - discount_cents)
);
alter table public.orders enable row level security;
create index orders_user_idx on public.orders (user_id, created_at desc);
create policy orders_select on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create table public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  position integer not null default 0,
  kind text not null check (kind in ('memorial', 'upgrade', 'gift', 'gesture')),
  product_key text not null references public.products (key),
  memorial_id uuid references public.memorials (id) on delete set null,
  unit_amount_cents integer not null check (unit_amount_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  discount_reason text check (discount_reason in ('repeat', 'promo', 'partner')),
  meta jsonb not null default '{}',
  constraint order_lines_total check (total_cents = unit_amount_cents - discount_cents)
);
alter table public.order_lines enable row level security;
create index order_lines_order_idx on public.order_lines (order_id, position);
create policy order_lines_select on public.order_lines for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and (o.user_id = (select auth.uid()) or public.is_admin())
  ));

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  order_line_id uuid not null references public.order_lines (id) on delete restrict,
  tier text not null check (tier in ('memorial', 'portrait')),
  owner_id uuid references auth.users (id) on delete set null,
  memorial_id uuid references public.memorials (id) on delete set null,
  status text not null default 'available' check (status in ('available', 'applied', 'revoked')),
  applied_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;
create index entitlements_owner_idx on public.entitlements (owner_id);
create unique index entitlements_one_per_memorial on public.entitlements (memorial_id)
  where status = 'applied' and memorial_id is not null;
create policy entitlements_select on public.entitlements for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin());

create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  order_line_id uuid not null unique references public.order_lines (id) on delete restrict,
  entitlement_id uuid not null references public.entitlements (id) on delete restrict,
  code text not null unique,
  buyer_name text check (char_length(buyer_name) <= 80),
  recipient_name text check (char_length(recipient_name) <= 80),
  recipient_email text not null check (char_length(recipient_email) <= 254),
  message text check (char_length(message) <= 1000),
  send_at timestamptz not null default now(),
  sent_at timestamptz,
  redeemed_by uuid references auth.users (id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.gifts enable row level security;
create policy gifts_admin on public.gifts for select to authenticated using (public.is_admin());

create table public.gestures (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references public.memorials (id) on delete cascade,
  order_line_id uuid references public.order_lines (id) on delete set null,
  kind text not null check (kind in ('svijeca', 'sapica', 'cvijet', 'poslastica', 'loptica')),
  display_name text not null check (char_length(display_name) between 1 and 60),
  message text check (char_length(message) <= 200),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'hidden', 'refunded')),
  created_at timestamptz not null default now()
);
alter table public.gestures enable row level security;
create index gestures_memorial_idx on public.gestures (memorial_id, expires_at desc);
create policy gestures_select on public.gestures for select to anon, authenticated
  using (
    (status = 'active' and public.can_view_memorial(memorial_id))
    or public.can_edit_memorial(memorial_id)
    or public.is_admin()
  );
-- Vlasnik može sakriti poruku geste; novac se time ne vraća.
create policy gestures_moderate on public.gestures for update to authenticated
  using (status <> 'refunded' and public.can_edit_memorial(memorial_id))
  with check (status in ('active', 'hidden') and public.can_edit_memorial(memorial_id));

create table public.partner_commissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete restrict,
  order_id uuid not null unique references public.orders (id) on delete restrict,
  base_cents integer not null,
  commission_cents integer not null,
  status text not null default 'accrued' check (status in ('accrued', 'paid', 'void')),
  paid_at timestamptz,
  payout_note text,
  created_at timestamptz not null default now()
);
alter table public.partner_commissions enable row level security;
create policy commissions_admin on public.partner_commissions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table public.donation_entries (
  id uuid primary key default gen_random_uuid(),
  order_line_id uuid not null unique references public.order_lines (id) on delete restrict,
  amount_cents integer not null check (amount_cents >= 0),
  shelter_id uuid references public.shelters (id) on delete set null,
  status text not null default 'accrued' check (status in ('accrued', 'reversed')),
  created_at timestamptz not null default now()
);
alter table public.donation_entries enable row level security;
create policy donations_admin on public.donation_entries for select to authenticated using (public.is_admin());

create table public.donation_payouts (
  id uuid primary key default gen_random_uuid(),
  shelter_id uuid not null references public.shelters (id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  paid_on date not null,
  proof_path text,
  note text check (char_length(note) <= 500),
  published boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.donation_payouts enable row level security;
create policy payouts_select on public.donation_payouts for select to anon, authenticated
  using (published or public.is_admin());
create policy payouts_admin on public.donation_payouts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Javni zbroj donacija bez otkrivanja narudžbi.
create or replace function public.donation_totals() returns table (accrued_cents bigint, paid_out_cents bigint)
language sql stable security definer set search_path = '' as $$
  select
    (select coalesce(sum(d.amount_cents), 0) from public.donation_entries d where d.status = 'accrued'),
    (select coalesce(sum(p.amount_cents), 0) from public.donation_payouts p where p.published)
$$;

create table public.stripe_events (
  event_id text primary key,
  type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);
alter table public.stripe_events enable row level security;

-- ---------------------------------------------------------------------------------------------
-- Funkcije stanja memorijala
-- ---------------------------------------------------------------------------------------------

create or replace function public.create_memorial_draft(p_attribution jsonb default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_count integer;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  select count(*) into v_count from public.memorials m where m.owner_id = v_uid and m.status = 'draft';
  if v_count >= 5 then
    raise exception 'too_many_drafts' using errcode = 'P0001';
  end if;
  insert into public.memorials (owner_id, slug, attribution)
  values (v_uid, 'nacrt-' || encode(extensions.gen_random_bytes(8), 'hex'), p_attribution)
  returning id into v_id;
  return v_id;
end $$;

-- Interno: objava bez provjere pozivatelja. Zovu je publish_memorial i fulfill_order.
create or replace function public.finalize_publish(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  m public.memorials;
  v_base text;
  v_slug text;
begin
  select * into m from public.memorials where id = p_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if m.status = 'published' then
    return m.slug;
  end if;
  if char_length(btrim(m.name)) = 0 then
    raise exception 'name_required' using errcode = 'P0001';
  end if;
  v_base := left(public.slugify(m.name), 40);
  if v_base = '' then
    v_base := 'spomen';
  end if;
  v_slug := v_base || '-' || encode(extensions.gen_random_bytes(3), 'hex');
  update public.memorials
    set status = 'published', published_at = coalesce(published_at, now()), slug = v_slug
    where id = p_id;
  return v_slug;
end $$;

create or replace function public.publish_memorial(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  m public.memorials;
  v_free integer;
begin
  select * into m from public.memorials where id = p_id;
  if not found or v_uid is null or m.owner_id <> v_uid then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  -- Objava traži potvrđen e-mail: vlasnik mora moći primati obavijesti i moderirati.
  if coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'email_required' using errcode = 'P0001';
  end if;
  if m.status = 'hidden' then
    raise exception 'hidden_by_admin' using errcode = 'P0001';
  end if;
  if m.tier = 'free' and m.status = 'draft' then
    select count(*) into v_free from public.memorials x
      where x.owner_id = v_uid and x.tier = 'free' and x.status = 'published';
    if v_free >= 10 then
      raise exception 'free_limit' using errcode = 'P0001';
    end if;
  end if;
  return public.finalize_publish(p_id);
end $$;

create or replace function public.unpublish_memorial(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.memorials set status = 'draft'
    where id = p_id and owner_id = (select auth.uid()) and status = 'published';
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
end $$;

-- Privatnost mijenja samo vlasnik i samo na plaćenom paketu. Prelazak na „samo s linkom"
-- uvijek izdaje novi ključ, jer je stari mogao biti viđen dok je memorijal bio javan.
create or replace function public.set_memorial_visibility(p_id uuid, p_visibility text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  m public.memorials;
begin
  select * into m from public.memorials where id = p_id and owner_id = (select auth.uid()) for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if p_visibility not in ('public', 'unlisted', 'private') then
    raise exception 'invalid_visibility' using errcode = 'P0001';
  end if;
  if m.tier = 'free' and p_visibility <> 'public' then
    raise exception 'paid_feature' using errcode = 'P0001';
  end if;
  update public.memorials
    set visibility = p_visibility,
        share_key = case when p_visibility = 'unlisted' and m.visibility <> 'unlisted'
                         then encode(extensions.gen_random_bytes(16), 'hex') else share_key end
    where id = p_id;
end $$;

create or replace function public.memorial_share_key(p_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select m.share_key from public.memorials m
  where m.id = p_id and (m.owner_id = (select auth.uid()) or public.is_member(m.id))
$$;

-- Admin skriva ili vraća memorijal.
create or replace function public.admin_set_memorial_hidden(p_id uuid, p_hidden boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  update public.memorials
    set status = case when p_hidden then 'hidden' else 'published' end
    where id = p_id and status in ('published', 'hidden');
end $$;

-- ---------------------------------------------------------------------------------------------
-- Narudžbe: stvaranje, ispunjenje, povrat (samo servisna uloga)
-- ---------------------------------------------------------------------------------------------

create or replace function public.create_order(p_order jsonb, p_lines jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.orders (user_id, email, subtotal_cents, discount_cents, total_cents,
                             promo_code_id, withdrawal_waiver_at, attribution)
  values (
    (p_order ->> 'user_id')::uuid,
    p_order ->> 'email',
    (p_order ->> 'subtotal_cents')::integer,
    (p_order ->> 'discount_cents')::integer,
    (p_order ->> 'total_cents')::integer,
    (p_order ->> 'promo_code_id')::uuid,
    (p_order ->> 'withdrawal_waiver_at')::timestamptz,
    p_order -> 'attribution'
  ) returning id into v_id;

  insert into public.order_lines (order_id, position, kind, product_key, memorial_id,
                                  unit_amount_cents, discount_cents, total_cents, discount_reason, meta)
  select v_id, (l.ord - 1)::integer, l.value ->> 'kind', l.value ->> 'product_key',
         (l.value ->> 'memorial_id')::uuid,
         (l.value ->> 'unit_amount_cents')::integer,
         (l.value ->> 'discount_cents')::integer,
         (l.value ->> 'total_cents')::integer,
         l.value ->> 'discount_reason',
         coalesce(l.value -> 'meta', '{}'::jsonb)
  from jsonb_array_elements(p_lines) with ordinality as l(value, ord);
  return v_id;
end $$;

create or replace function public.fulfill_order(p_order_id uuid, p_payment_intent text, p_email text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  l public.order_lines;
  s public.settings;
  pc public.promo_codes;
  pa public.partners;
  v_tier text;
  v_ent uuid;
  v_code text;
  v_days integer;
  v_publish boolean;
  v_visibility text;
  v_gifts jsonb := '[]'::jsonb;
  v_memorials jsonb := '[]'::jsonb;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;
  if o.status = 'paid' then
    return jsonb_build_object('status', 'already_paid');
  end if;
  if o.status <> 'pending' then
    raise exception 'invalid_order_status' using errcode = 'P0001';
  end if;

  select * into s from public.settings where id;

  update public.orders
    set status = 'paid', paid_at = now(), stripe_payment_intent_id = p_payment_intent,
        email = coalesce(nullif(p_email, ''), email)
    where id = o.id;

  for l in select * from public.order_lines where order_id = o.id order by position loop
    if l.kind = 'memorial' then
      v_tier := case l.product_key when 'memorial_portrait' then 'portrait' else 'memorial' end;
      -- Pravo se veže na memorijal samo ako on pripada kupcu.
      if l.memorial_id is not null and exists (
        select 1 from public.memorials m where m.id = l.memorial_id and m.owner_id = o.user_id
      ) then
        v_publish := coalesce((l.meta ->> 'publish')::boolean, false);
        v_visibility := l.meta ->> 'visibility';
        insert into public.entitlements (order_line_id, tier, owner_id, memorial_id, status, applied_at)
        values (l.id, v_tier, o.user_id, l.memorial_id, 'applied', now());
        update public.memorials
          set tier = v_tier,
              visibility = case when v_visibility in ('public', 'unlisted', 'private')
                                then v_visibility else visibility end
          where id = l.memorial_id;
        if v_publish then
          perform public.finalize_publish(l.memorial_id);
        end if;
        v_memorials := v_memorials || jsonb_build_object('memorial_id', l.memorial_id, 'tier', v_tier);
      else
        insert into public.entitlements (order_line_id, tier, owner_id, status)
        values (l.id, v_tier, o.user_id, 'available');
      end if;
      if s.donation_per_memorial_cents > 0 then
        insert into public.donation_entries (order_line_id, amount_cents, shelter_id)
        values (l.id, least(s.donation_per_memorial_cents, l.total_cents), s.active_shelter_id);
      end if;

    elsif l.kind = 'upgrade' then
      update public.memorials set tier = 'portrait'
        where id = l.memorial_id and owner_id = o.user_id and tier = 'memorial';
      if found then
        update public.entitlements set tier = 'portrait'
          where memorial_id = l.memorial_id and status = 'applied';
        v_memorials := v_memorials || jsonb_build_object('memorial_id', l.memorial_id, 'tier', 'portrait');
      end if;

    elsif l.kind = 'gift' then
      v_tier := case l.product_key when 'memorial_portrait' then 'portrait' else 'memorial' end;
      insert into public.entitlements (order_line_id, tier, status)
      values (l.id, v_tier, 'available') returning id into v_ent;
      v_code := encode(extensions.gen_random_bytes(12), 'hex');
      insert into public.gifts (order_line_id, entitlement_id, code, buyer_name, recipient_name,
                                recipient_email, message, send_at)
      values (l.id, v_ent, v_code, l.meta ->> 'buyer_name', l.meta ->> 'recipient_name',
              l.meta ->> 'recipient_email', l.meta ->> 'message',
              coalesce((l.meta ->> 'send_at')::timestamptz, now()));
      v_gifts := v_gifts || jsonb_build_object(
        'code', v_code, 'tier', v_tier,
        'recipient_email', l.meta ->> 'recipient_email',
        'recipient_name', l.meta ->> 'recipient_name',
        'buyer_name', l.meta ->> 'buyer_name',
        'message', l.meta ->> 'message');
      if s.donation_per_memorial_cents > 0 then
        insert into public.donation_entries (order_line_id, amount_cents, shelter_id)
        values (l.id, least(s.donation_per_memorial_cents, l.total_cents), s.active_shelter_id);
      end if;

    elsif l.kind = 'gesture' then
      v_days := case l.product_key when 'gesture_7d' then 7 when 'gesture_30d' then 30 else 365 end;
      if l.memorial_id is not null then
        insert into public.gestures (memorial_id, order_line_id, kind, display_name, message, expires_at)
        values (l.memorial_id, l.id, l.meta ->> 'kind',
                coalesce(nullif(btrim(l.meta ->> 'display_name'), ''), 'Netko tko pamti'),
                nullif(btrim(l.meta ->> 'message'), ''),
                now() + make_interval(days => v_days));
        v_memorials := v_memorials || jsonb_build_object('memorial_id', l.memorial_id);
      end if;
    end if;
  end loop;

  if o.promo_code_id is not null then
    update public.promo_codes set redeemed_count = redeemed_count + 1
      where id = o.promo_code_id returning * into pc;
    if pc.partner_id is not null then
      select * into pa from public.partners where id = pc.partner_id;
      insert into public.partner_commissions (partner_id, order_id, base_cents, commission_cents)
      values (pa.id, o.id, o.total_cents,
              case pa.commission_type
                when 'percent' then round(o.total_cents * pa.commission_value / 100.0)::integer
                else least(pa.commission_value, o.total_cents) end)
      on conflict (order_id) do nothing;
    end if;
  end if;

  return jsonb_build_object('status', 'fulfilled', 'user_id', o.user_id,
                            'gifts', v_gifts, 'memorials', v_memorials);
end $$;

-- Puni povrat: opoziva prava. Memorijal se vraća u nacrt da privatan sadržaj ne postane javan.
create or replace function public.refund_order(p_order_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  v_memorials jsonb := '[]'::jsonb;
  r record;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;
  if o.status = 'refunded' then
    return jsonb_build_object('status', 'already_refunded');
  end if;
  if o.status <> 'paid' then
    raise exception 'invalid_order_status' using errcode = 'P0001';
  end if;

  update public.orders set status = 'refunded', refunded_at = now() where id = o.id;

  for r in
    select e.id, e.memorial_id from public.entitlements e
    join public.order_lines l on l.id = e.order_line_id
    where l.order_id = o.id and e.status <> 'revoked'
  loop
    update public.entitlements set status = 'revoked' where id = r.id;
    if r.memorial_id is not null then
      update public.memorials set status = 'draft', tier = 'free', visibility = 'public'
        where id = r.memorial_id and status <> 'hidden';
      update public.memorials set tier = 'free', visibility = 'public'
        where id = r.memorial_id and status = 'hidden';
      v_memorials := v_memorials || jsonb_build_object('memorial_id', r.memorial_id);
    end if;
  end loop;

  -- Povrat nadogradnje na Portret vraća paket na Memorijal.
  for r in
    select l.memorial_id from public.order_lines l
    where l.order_id = o.id and l.kind = 'upgrade' and l.memorial_id is not null
  loop
    update public.memorials set tier = 'memorial' where id = r.memorial_id and tier = 'portrait';
    update public.entitlements set tier = 'memorial'
      where memorial_id = r.memorial_id and status = 'applied';
    v_memorials := v_memorials || jsonb_build_object('memorial_id', r.memorial_id);
  end loop;

  update public.gestures g set status = 'refunded'
    from public.order_lines l where l.id = g.order_line_id and l.order_id = o.id;
  update public.donation_entries d set status = 'reversed'
    from public.order_lines l where l.id = d.order_line_id and l.order_id = o.id;
  update public.partner_commissions set status = 'void' where order_id = o.id and status = 'accrued';

  return jsonb_build_object('status', 'refunded', 'memorials', v_memorials);
end $$;

-- Poklon: primatelj preuzima pravo na svoj račun.
create or replace function public.redeem_gift(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  g public.gifts;
begin
  if v_uid is null or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'email_required' using errcode = 'P0001';
  end if;
  select * into g from public.gifts where code = p_code for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if g.redeemed_by is not null then
    if g.redeemed_by = v_uid then
      return g.entitlement_id;
    end if;
    raise exception 'already_redeemed' using errcode = 'P0001';
  end if;
  update public.gifts set redeemed_by = v_uid, redeemed_at = now() where id = g.id;
  update public.entitlements set owner_id = v_uid where id = g.entitlement_id and status = 'available';
  return g.entitlement_id;
end $$;

-- Primjena dostupnog prava (poklon ili ranije kupljen paket) na vlastiti memorijal.
create or replace function public.apply_entitlement(p_entitlement_id uuid, p_memorial_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  e public.entitlements;
begin
  select * into e from public.entitlements
    where id = p_entitlement_id and owner_id = v_uid and status = 'available' for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  perform 1 from public.memorials m
    where m.id = p_memorial_id and m.owner_id = v_uid and m.tier = 'free' for update;
  if not found then
    raise exception 'memorial_not_eligible' using errcode = 'P0001';
  end if;
  update public.entitlements
    set status = 'applied', memorial_id = p_memorial_id, applied_at = now()
    where id = e.id;
  update public.memorials set tier = e.tier where id = p_memorial_id;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Pohrana fotografija
-- ---------------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memorial-media', 'memorial-media', false, 10485760, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Putanja: {memorial_id}/{photo_id}/{varijanta}.webp
create policy media_select on storage.objects for select to anon, authenticated
  using (bucket_id = 'memorial-media'
         and public.can_view_memorial(public.try_uuid((storage.foldername(name))[1])));
create policy media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'memorial-media'
              and public.can_edit_memorial(public.try_uuid((storage.foldername(name))[1])));
create policy media_update on storage.objects for update to authenticated
  using (bucket_id = 'memorial-media'
         and public.can_edit_memorial(public.try_uuid((storage.foldername(name))[1])))
  with check (bucket_id = 'memorial-media'
              and public.can_edit_memorial(public.try_uuid((storage.foldername(name))[1])));
create policy media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'memorial-media'
         and public.can_edit_memorial(public.try_uuid((storage.foldername(name))[1])));

-- ---------------------------------------------------------------------------------------------
-- Prava: sve se oduzima, pa se dodjeljuje samo ono što treba
-- ---------------------------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Funkcije koje koriste politike i klijenti.
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_member(uuid) to anon, authenticated;
grant execute on function public.can_view_memorial(uuid) to anon, authenticated;
grant execute on function public.can_edit_memorial(uuid) to anon, authenticated;
grant execute on function public.request_share_key() to anon, authenticated;
grant execute on function public.try_uuid(text) to anon, authenticated;
grant execute on function public.candles_since(uuid, timestamptz) to anon, authenticated;
grant execute on function public.donation_totals() to anon, authenticated;
grant execute on function public.create_memorial_draft(jsonb) to authenticated;
grant execute on function public.publish_memorial(uuid) to authenticated;
grant execute on function public.unpublish_memorial(uuid) to authenticated;
grant execute on function public.set_memorial_visibility(uuid, text) to authenticated;
grant execute on function public.memorial_share_key(uuid) to authenticated;
grant execute on function public.admin_set_memorial_hidden(uuid, boolean) to authenticated;
grant execute on function public.redeem_gift(text) to authenticated;
grant execute on function public.apply_entitlement(uuid, uuid) to authenticated;

-- Memorijal: javnost ne vidi share_key ni atribuciju; korisnik mijenja samo sadržaj.
grant select (id, owner_id, slug, status, tier, visibility, name, species, breed, sex,
              birth_date, birth_precision, death_date, death_precision, adoption_date,
              dedication, story_md, nicknames, traits, favorite_toy, favorite_treat, favorite_place,
              funny_habits, video_url, theme, cover_photo_id, guestbook_mode, candle_count,
              draft_step, published_at, created_at, updated_at)
  on public.memorials to anon, authenticated;
grant update (name, species, breed, sex, birth_date, birth_precision, death_date, death_precision,
              adoption_date, dedication, story_md, nicknames, traits, favorite_toy, favorite_treat,
              favorite_place, funny_habits, video_url, theme, cover_photo_id, guestbook_mode, draft_step)
  on public.memorials to authenticated;
grant delete on public.memorials to authenticated;

grant select on public.memorial_photos, public.timeline_events, public.letters to anon, authenticated;
grant insert, delete on public.memorial_photos to authenticated;
grant update (caption, taken_on, sort_order) on public.memorial_photos to authenticated;
grant insert, update, delete on public.timeline_events, public.letters to authenticated;

grant select, delete on public.memorial_members to authenticated;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

-- Knjiga sjećanja: e-mail autora i sažetak IP-a nikad ne izlaze iz baze.
grant select (id, memorial_id, author_name, body, status, created_at, moderated_at)
  on public.guestbook_entries to anon, authenticated;
grant update (status) on public.guestbook_entries to authenticated;

grant select on public.gestures to anon, authenticated;
grant update (status) on public.gestures to authenticated;

grant select on public.products, public.settings, public.shelters, public.donation_payouts
  to anon, authenticated;
grant update on public.products, public.settings to authenticated;
grant insert, update, delete on public.shelters, public.donation_payouts to authenticated;
grant select, insert, update, delete on public.partners, public.promo_codes, public.partner_commissions
  to authenticated;
grant select on public.orders, public.order_lines, public.entitlements, public.gifts,
                public.donation_entries to authenticated;
grant select, update on public.reports to authenticated;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
