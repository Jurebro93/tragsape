-- Bazna cijena i cjenik za strojno čitanje.
--
-- Zakon o zaštiti potrošača, čl. 7. (izmjene NN 59/2026, na snazi od 17. 11. 2026.) traži da
-- trgovac uz maloprodajnu cijenu istakne baznu cijenu i na svojim mrežnim stranicama objavi
-- važeći cjenik. Pojedinosti su u Pravilniku o isticanju bazne cijene proizvoda (NN 132/2026) i
-- Pravilniku o načinu objave cjenika proizvoda (NN 132/2026). Za uslugu ponuđenu nakon
-- 10. 9. 2026. bazna cijena je cijena na dan kad je usluga stavljena u ponudu.
-- Izvori pročitani 25. 11. 2026.; tumačenje treba potvrditi pravnik ili knjigovođa.

alter table public.products
  add column base_amount_cents integer check (base_amount_cents is null or base_amount_cents >= 0),
  add column offered_on date;

update public.products set base_amount_cents = unit_amount_cents;
alter table public.products alter column base_amount_cents set not null;

comment on column public.products.base_amount_cents is
  'Bazna cijena: cijena na dan kad je usluga stavljena u ponudu (offered_on).';
comment on column public.products.offered_on is
  'Dan kad je usluga stavljena u ponudu. Dok je prazno, usluga još nije u ponudi i bazna cijena prati cijenu.';

-- Dok usluga nije u ponudi, bazna cijena je jednaka cijeni. Nakon upisa datuma ostaje kakva je
-- bila, osim ako je admin izričito ne ispravi.
create or replace function public.products_base_price() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.offered_on is null or new.base_amount_cents is null then
    new.base_amount_cents := new.unit_amount_cents;
  end if;
  return new;
end $$;
create trigger products_base_price before insert or update on public.products
  for each row execute function public.products_base_price();

-- Cjenik: stupci redom koji traži pravilnik (naziv, maloprodajna cijena i je li primijenjena u
-- posebnom obliku prodaje, bazna cijena), odvojeni točkom sa zarezom.

create or replace function public.csv_field(p_value text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_value ~ '[;"\r\n]' then '"' || replace(p_value, '"', '""') || '"'
    else p_value
  end
$$;

create or replace function public.csv_amount(p_cents integer) returns text
language sql immutable set search_path = '' as $$
  select replace(to_char(p_cents / 100.0, 'FM99999990.00'), '.', ',')
$$;

create or replace function public.price_list_csv() returns text
language sql stable security definer set search_path = '' as $$
  select 'Naziv usluge;Maloprodajna cijena (EUR);Poseban oblik prodaje;Bazna cijena (EUR)' || E'\n'
    || coalesce(
         string_agg(
           public.csv_field(p.name) || ';' || public.csv_amount(p.unit_amount_cents) || ';ne;'
             || public.csv_amount(p.base_amount_cents),
           E'\n' order by p.unit_amount_cents desc, p.key
         ) || E'\n',
         ''
       )
  from public.products p
  where p.active
$$;

-- Svaka izmjena cjenika je nova inačica. Zamijenjena inačica ostaje javno dostupna 15 dana.
create table public.price_list_versions (
  id bigint generated always as identity primary key,
  csv text not null,
  published_at timestamptz not null default now(),
  replaced_at timestamptz
);
alter table public.price_list_versions enable row level security;
create policy price_list_public on public.price_list_versions for select to anon, authenticated
  using (replaced_at is null or replaced_at > now() - interval '15 days');
create policy price_list_admin on public.price_list_versions for select to authenticated
  using (public.is_admin());

create or replace function public.snapshot_price_list() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_csv text := public.price_list_csv();
  v_last text;
begin
  select v.csv into v_last from public.price_list_versions v where v.replaced_at is null order by v.id desc limit 1;
  if v_last is not null and v_last = v_csv then
    return null;
  end if;
  update public.price_list_versions set replaced_at = now() where replaced_at is null;
  insert into public.price_list_versions (csv) values (v_csv);
  return null;
end $$;
create trigger products_price_list after insert or update or delete on public.products
  for each statement execute function public.snapshot_price_list();

insert into public.price_list_versions (csv) values (public.price_list_csv());

revoke all on public.price_list_versions from anon, authenticated;
grant select on public.price_list_versions to anon, authenticated;
grant all on public.price_list_versions to service_role;

revoke execute on function public.price_list_csv() from public, anon, authenticated;
revoke execute on function public.snapshot_price_list() from public, anon, authenticated;
revoke execute on function public.products_base_price() from public, anon, authenticated;
grant execute on function public.price_list_csv() to service_role;
