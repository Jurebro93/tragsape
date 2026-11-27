-- Velika livada: kratka posveta uz trag (vidi se tek nakon odobrenja) i godišnji podsjetnik uz privolu.

alter table public.meadow_flowers
  add column dedication text check (dedication is null or char_length(btrim(dedication)) between 1 and 80),
  add column dedication_status text not null default 'none'
    check (dedication_status in ('none', 'pending', 'approved', 'rejected')),
  add column anniversary_opt_in boolean not null default false,
  add column anniversary_last_year integer;

alter table public.meadow_flowers
  add constraint meadow_flowers_dedication_status_matches check ((dedication is null) = (dedication_status = 'none'));

-- Admin odobrava ili odbija posvetu kroz RLS (politika za update već postoji i vrijedi samo za admina).
grant select (dedication, dedication_status) on public.meadow_flowers to authenticated;
grant update (dedication_status) on public.meadow_flowers to authenticated;

-- Javni podaci jednog traga za njegovu stranicu: posveta samo kad je odobrena. Nikad e-mail ni ključ.
create or replace function public.public_meadow_trail(p_number bigint)
returns table (
  number bigint,
  name text,
  species text,
  petal text,
  memorial_slug text,
  created_at timestamptz,
  confirmed_at timestamptz,
  dedication text
)
language sql stable security definer set search_path = public as $$
  select f.number, f.name, f.species, f.petal, f.memorial_slug, f.created_at, f.confirmed_at,
         case when f.dedication_status = 'approved' then f.dedication end
  from public.meadow_flowers f
  where f.number = p_number and f.status = 'visible';
$$;

revoke all on function public.public_meadow_trail(bigint) from public;
grant execute on function public.public_meadow_trail(bigint) to anon, authenticated;

create index meadow_flowers_dedication_pending_idx on public.meadow_flowers (created_at) where dedication_status = 'pending';
create index meadow_flowers_anniversary_idx on public.meadow_flowers (confirmed_at) where anniversary_opt_in and status = 'visible';
