-- Velika livada: svaki svijet (psi, mačke, mali sisavci, ptice, ostali) ima svoj niz mjesta.
-- Javni broj traga ostaje jedinstven; mjesto u krajoliku određuju svijet i redni broj u njemu.

create or replace function public.meadow_zone(p_species text) returns text
language sql immutable set search_path = public as $$
  select case p_species when 'pas' then 'psi' when 'macka' then 'macke' when 'kunic' then 'mali' when 'ptica' then 'ptice' else 'ostali' end;
$$;

create sequence public.meadow_zone_psi_seq;
create sequence public.meadow_zone_macke_seq;
create sequence public.meadow_zone_mali_seq;
create sequence public.meadow_zone_ptice_seq;
create sequence public.meadow_zone_ostali_seq;
revoke all on sequence public.meadow_zone_psi_seq, public.meadow_zone_macke_seq, public.meadow_zone_mali_seq,
  public.meadow_zone_ptice_seq, public.meadow_zone_ostali_seq from anon, authenticated;

create or replace function public.next_meadow_zone_index(p_species text) returns bigint
language sql volatile security definer set search_path = public as $$
  select nextval(format('public.meadow_zone_%s_seq', public.meadow_zone(p_species))::regclass);
$$;
revoke all on function public.next_meadow_zone_index(text) from public, anon, authenticated;

alter table public.meadow_flowers add column zone_index bigint;

-- Postojeći tragovi s mjestom dobivaju redni broj u svom svijetu, redom kojim su dobili mjesto.
update public.meadow_flowers f set zone_index = x.rn
from (
  select id, row_number() over (partition by public.meadow_zone(species) order by number) as rn
  from public.meadow_flowers where number is not null
) x
where f.id = x.id;

select setval('public.meadow_zone_psi_seq', greatest(1, coalesce((select max(zone_index) from public.meadow_flowers where public.meadow_zone(species) = 'psi'), 0)), (select count(*) > 0 from public.meadow_flowers where public.meadow_zone(species) = 'psi' and zone_index is not null));
select setval('public.meadow_zone_macke_seq', greatest(1, coalesce((select max(zone_index) from public.meadow_flowers where public.meadow_zone(species) = 'macke'), 0)), (select count(*) > 0 from public.meadow_flowers where public.meadow_zone(species) = 'macke' and zone_index is not null));
select setval('public.meadow_zone_mali_seq', greatest(1, coalesce((select max(zone_index) from public.meadow_flowers where public.meadow_zone(species) = 'mali'), 0)), (select count(*) > 0 from public.meadow_flowers where public.meadow_zone(species) = 'mali' and zone_index is not null));
select setval('public.meadow_zone_ptice_seq', greatest(1, coalesce((select max(zone_index) from public.meadow_flowers where public.meadow_zone(species) = 'ptice'), 0)), (select count(*) > 0 from public.meadow_flowers where public.meadow_zone(species) = 'ptice' and zone_index is not null));
select setval('public.meadow_zone_ostali_seq', greatest(1, coalesce((select max(zone_index) from public.meadow_flowers where public.meadow_zone(species) = 'ostali'), 0)), (select count(*) > 0 from public.meadow_flowers where public.meadow_zone(species) = 'ostali' and zone_index is not null));

create unique index meadow_flowers_zone_index_key on public.meadow_flowers (public.meadow_zone(species), zone_index) where zone_index is not null;
alter table public.meadow_flowers
  add constraint meadow_flowers_zone_index_with_number check ((number is null) = (zone_index is null));

grant select (zone_index) on public.meadow_flowers to anon, authenticated;

-- Potvrda traga dodjeljuje i javni broj i mjesto u svijetu.
drop function public.confirm_meadow_flower(text);
create function public.confirm_meadow_flower(p_token text)
returns table (number bigint, zone_index bigint, species text, name text, email text, newsletter_opt_in boolean, newly_confirmed boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_row public.meadow_flowers%rowtype;
begin
  select * into v_row from public.meadow_flowers f where f.claim_token = p_token for update;
  if not found or v_row.status = 'hidden' then
    return;
  end if;
  if v_row.status = 'visible' then
    return query select v_row.number, v_row.zone_index, v_row.species, v_row.name, v_row.email, v_row.newsletter_opt_in, false;
    return;
  end if;
  if v_row.created_at < now() - interval '7 days' then
    return;
  end if;
  update public.meadow_flowers f
    set status = 'visible',
        number = nextval('public.meadow_flowers_number_seq'),
        zone_index = public.next_meadow_zone_index(v_row.species),
        confirmed_at = now()
    where f.id = v_row.id
    returning * into v_row;
  return query select v_row.number, v_row.zone_index, v_row.species, v_row.name, v_row.email, v_row.newsletter_opt_in, true;
end;
$$;
revoke all on function public.confirm_meadow_flower(text) from public, anon, authenticated;
grant execute on function public.confirm_meadow_flower(text) to service_role;

-- Cvijet javnog spomena: novo mjesto u svijetu samo kad se cvijet tek stvara ili mijenja svijet.
create or replace function public.sync_memorial_flower() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_species text;
  v_existing public.meadow_flowers%rowtype;
begin
  v_species := case new.species when 'pas' then 'pas' when 'macka' then 'macka' when 'kunic' then 'kunic' when 'ptica' then 'ptica' else 'drugo' end;
  select * into v_existing from public.meadow_flowers where memorial_id = new.id for update;
  if new.status = 'published' and new.visibility = 'public' and char_length(btrim(coalesce(new.name, ''))) > 0 then
    if not found then
      insert into public.meadow_flowers (name, species, petal, memorial_id, memorial_slug, zone_index, confirmed_at)
      values (left(btrim(new.name), 30), v_species, 'terakota', new.id, new.slug, public.next_meadow_zone_index(v_species), now());
    else
      update public.meadow_flowers
        set status = 'visible',
            name = left(btrim(new.name), 30),
            species = v_species,
            memorial_slug = new.slug,
            zone_index = case when public.meadow_zone(v_existing.species) = public.meadow_zone(v_species) then v_existing.zone_index
                              else public.next_meadow_zone_index(v_species) end
        where id = v_existing.id;
    end if;
  elsif found then
    update public.meadow_flowers set status = 'hidden' where id = v_existing.id;
  end if;
  return new;
end;
$$;
revoke all on function public.sync_memorial_flower() from public, anon, authenticated;

-- Javni podaci jednog traga za njegovu stranicu, sad i s mjestom u svijetu.
drop function public.public_meadow_trail(bigint);
create function public.public_meadow_trail(p_number bigint)
returns table (number bigint, zone_index bigint, name text, species text, petal text, memorial_slug text, created_at timestamptz, confirmed_at timestamptz, dedication text)
language sql stable security definer set search_path = public as $$
  select f.number, f.zone_index, f.name, f.species, f.petal, f.memorial_slug, f.created_at, f.confirmed_at,
         case when f.dedication_status = 'approved' then f.dedication end
  from public.meadow_flowers f
  where f.number = p_number and f.status = 'visible';
$$;
revoke all on function public.public_meadow_trail(bigint) from public;
grant execute on function public.public_meadow_trail(bigint) to anon, authenticated;
