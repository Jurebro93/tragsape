-- Admin ne čita nacrte (docs/arhitektura.md, §4: „Nacrt — admin: ništa").
-- Moderira ono što je objavljeno ili skriveno; nacrt je do objave samo vlasnikov.
-- Uz to: admin smije vidjeti datoteke dokaza o isplati, pa ih može zamijeniti i obrisati.

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
        or (m.status <> 'draft' and public.is_admin())
      )
  )
$$;

drop policy memorials_select_own on public.memorials;
create policy memorials_select_own on public.memorials for select to authenticated
  using (
    owner_id = (select auth.uid())
    or public.is_member(id)
    or (status <> 'draft' and public.is_admin())
  );

-- Pregled u adminu treba samo brojeve, ne i sadržaj nacrta.
create or replace function public.admin_memorial_counts()
returns table (drafts bigint, published_free bigint, published_paid bigint, hidden bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  return query
  select count(*) filter (where m.status = 'draft'),
         count(*) filter (where m.status = 'published' and m.tier = 'free'),
         count(*) filter (where m.status = 'published' and m.tier <> 'free'),
         count(*) filter (where m.status = 'hidden')
  from public.memorials m;
end $$;

revoke execute on function public.admin_memorial_counts() from public, anon;
grant execute on function public.admin_memorial_counts() to authenticated, service_role;

-- Bez prava čitanja pohrana ne nalazi datoteku, pa je brisanje i zamjena tiho ne učine.
create policy proofs_select on storage.objects for select to authenticated
  using (bucket_id = 'donation-proofs' and public.is_admin());
