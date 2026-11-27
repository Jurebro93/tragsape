-- Velika livada: svaki ljubimac dobiva cvijet na zajedničkoj livadi.
-- Trag može ostaviti svatko bez računa (ime, vrsta, boja); javni objavljeni spomeni dobivaju cvijet sami.
-- Redni broj određuje i mjesto na livadi (raspored računa aplikacija), pa se položaj ne sprema.
-- Javnost vidi samo ime, vrstu, boju, broj, datum i adresu spomena; e-mail, token i sažetak IP-a nikad.

create table public.meadow_flowers (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  species text not null check (species in ('pas', 'macka', 'kunic', 'ptica', 'drugo')),
  petal text not null check (petal in ('terakota', 'teal', 'sunce', 'sljiva', 'koralj', 'bijela')),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  -- Cvijet javnog spomena; adresa spomena se ne mijenja (AGENTS.md), pa se može čuvati ovdje.
  memorial_id uuid unique references public.memorials (id) on delete cascade,
  memorial_slug text,
  -- Tajni ključ koji dobiva samo onaj tko je ostavio trag; služi za spremanje e-mailom.
  claim_token text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  email text check (email is null or char_length(email) between 3 and 254),
  consent_text text check (consent_text is null or char_length(consent_text) <= 1000),
  email_saved_at timestamptz,
  ip_hash text,
  created_at timestamptz not null default now()
);

create unique index meadow_flowers_claim_token_key on public.meadow_flowers (claim_token);
create index meadow_flowers_visible_idx on public.meadow_flowers (number) where status = 'visible';

alter table public.meadow_flowers enable row level security;

-- Javno: samo vidljivi cvjetovi i samo javni stupci.
revoke all on public.meadow_flowers from anon, authenticated;
grant select (id, number, name, species, petal, status, memorial_slug, created_at) on public.meadow_flowers to anon, authenticated;
create policy meadow_flowers_public_select on public.meadow_flowers
  for select using (status = 'visible' or public.is_admin());

-- Admin smije sakriti ili vratiti cvijet (moderacija); ostalo mijenja samo poslužitelj.
grant update (status) on public.meadow_flowers to authenticated;
create policy meadow_flowers_admin_update on public.meadow_flowers
  for update using (public.is_admin()) with check (public.is_admin());

-- Javni objavljeni spomen dobiva cvijet; kad prestane biti javan, cvijet se skriva.
create or replace function public.sync_memorial_flower() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_species text;
begin
  v_species := case new.species when 'pas' then 'pas' when 'macka' then 'macka' when 'kunic' then 'kunic' when 'ptica' then 'ptica' else 'drugo' end;
  if new.status = 'published' and new.visibility = 'public' and char_length(btrim(coalesce(new.name, ''))) > 0 then
    insert into public.meadow_flowers (name, species, petal, memorial_id, memorial_slug)
    values (left(btrim(new.name), 30), v_species, 'terakota', new.id, new.slug)
    on conflict (memorial_id) do update
      set status = 'visible', name = excluded.name, species = excluded.species, memorial_slug = excluded.memorial_slug;
  else
    update public.meadow_flowers set status = 'hidden' where memorial_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_memorial_flower() from public, anon, authenticated;

create trigger memorials_meadow_flower
  after insert or update of status, visibility, name, species, slug on public.memorials
  for each row execute function public.sync_memorial_flower();

-- Već objavljeni javni spomeni.
insert into public.meadow_flowers (name, species, petal, memorial_id, memorial_slug)
select left(btrim(m.name), 30),
       case m.species when 'pas' then 'pas' when 'macka' then 'macka' when 'kunic' then 'kunic' when 'ptica' then 'ptica' else 'drugo' end,
       'terakota', m.id, m.slug
from public.memorials m
where m.status = 'published' and m.visibility = 'public' and char_length(btrim(m.name)) > 0
order by m.published_at nulls last
on conflict (memorial_id) do nothing;
