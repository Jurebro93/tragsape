-- Livada sjećanja (zajednički prostor javnih ljubimaca), sat svijeća i obiteljska stranica.

create index memorials_livada_idx on public.memorials (species, published_at desc)
  where status = 'published' and visibility = 'public';

-- Svijeće upaljene od zadanog trenutka, zbrojene po javnom objavljenom memorijalu.
-- Vraća samo podatke koji su ionako javni; sažeci posjetitelja ne izlaze iz baze.
create or replace function public.evening_candles(p_since timestamptz, p_limit integer default 60)
returns table (memorial_id uuid, slug text, name text, species text, breed text, cover_photo_id uuid, candles bigint)
language sql stable security definer set search_path = '' as $$
  select m.id, m.slug, m.name, m.species, m.breed, m.cover_photo_id, count(*) as candles
  from public.candles c
  join public.memorials m on m.id = c.memorial_id
  where c.created_at >= p_since
    and m.status = 'published'
    and m.visibility = 'public'
  group by m.id
  order by count(*) desc, max(c.created_at) desc
  limit least(greatest(p_limit, 1), 200)
$$;

-- Pasmine koje se pojavljuju na Livadi, za filtar. Samo javni objavljeni memorijali.
create or replace function public.livada_breeds(p_species text default null)
returns table (breed text, total bigint)
language sql stable security definer set search_path = '' as $$
  select lower(btrim(m.breed)) as breed, count(*) as total
  from public.memorials m
  where m.status = 'published'
    and m.visibility = 'public'
    and m.breed is not null
    and btrim(m.breed) <> ''
    and (p_species is null or m.species = p_species)
  group by lower(btrim(m.breed))
  order by count(*) desc, lower(btrim(m.breed))
  limit 60
$$;

-- Obiteljska stranica: svi javni ljubimci jednog računa. Uključuje je vlasnik.
create table public.families (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  intro text check (char_length(intro) <= 400),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.families enable row level security;
create trigger families_updated_at before update on public.families
  for each row execute function public.set_updated_at();

create policy families_select on public.families for select to anon, authenticated
  using (is_public or owner_id = (select auth.uid()));
create policy families_update on public.families for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy families_delete on public.families for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Stvaranje ili izmjena obiteljske stranice. Adresa se izvodi iz naslova i ostaje stalna.
create or replace function public.save_family(p_title text, p_intro text, p_is_public boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_slug text;
  v_base text;
begin
  if v_uid is null or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'email_required' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) = 0 then
    raise exception 'title_required' using errcode = 'P0001';
  end if;
  select f.slug into v_slug from public.families f where f.owner_id = v_uid;
  if found then
    update public.families
      set title = btrim(p_title), intro = nullif(btrim(coalesce(p_intro, '')), ''), is_public = p_is_public
      where owner_id = v_uid;
    return v_slug;
  end if;
  v_base := left(public.slugify(p_title), 40);
  if char_length(v_base) < 3 then
    v_base := 'obitelj';
  end if;
  v_slug := v_base || '-' || encode(extensions.gen_random_bytes(2), 'hex');
  insert into public.families (owner_id, slug, title, intro, is_public)
  values (v_uid, v_slug, btrim(p_title), nullif(btrim(coalesce(p_intro, '')), ''), p_is_public);
  return v_slug;
end $$;

revoke all on public.families from anon, authenticated;
grant select on public.families to anon, authenticated;
grant update (title, intro, is_public) on public.families to authenticated;
grant delete on public.families to authenticated;
grant all on public.families to service_role;

revoke execute on function public.evening_candles(timestamptz, integer) from public;
revoke execute on function public.livada_breeds(text) from public;
revoke execute on function public.save_family(text, text, boolean) from public, anon;
grant execute on function public.evening_candles(timestamptz, integer) to anon, authenticated, service_role;
grant execute on function public.livada_breeds(text) to anon, authenticated, service_role;
grant execute on function public.save_family(text, text, boolean) to authenticated, service_role;
