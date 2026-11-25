-- Admin može sakriti ili vratiti gestu (vlasnik to već može za svoj spomen).
create policy gestures_admin on public.gestures for update to authenticated
  using (public.is_admin()) with check (public.is_admin() and status in ('active', 'hidden'));

-- Admin čita memorijale radi moderacije i izvještaja; ključ za dijeljenje ostaje izvan dosega.
-- (Politika memorials_select_own već uključuje admina; ovdje se samo dokumentira namjera.)
comment on policy memorials_select_own on public.memorials is
  'Vlasnik, suradnik ili admin. Stupci share_key i attribution nisu dodijeljeni javnim ulogama.';

-- Atribucija po memorijalu za adminove izvještaje (stupac attribution nije čitljiv klijentima).
create or replace function public.admin_attribution_report(p_since timestamptz default now() - interval '90 days')
returns table (source text, drafts bigint, published bigint, paid_orders bigint, revenue_cents bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  return query
  with events as (
    select coalesce(nullif(f.attribution ->> 'iz', ''), nullif(f.attribution ->> 'utm_source', ''), '(izravno)') as src,
           f.name, f.order_id
    from public.funnel_events f
    where f.occurred_at >= p_since
  )
  select e.src,
         count(*) filter (where e.name = 'draft_started'),
         count(*) filter (where e.name = 'published_free'),
         count(*) filter (where e.name = 'paid'),
         coalesce(sum(o.total_cents) filter (where e.name = 'paid'), 0)::bigint
  from events e
  left join public.orders o on o.id = e.order_id
  group by e.src
  order by 4 desc, 2 desc;
end $$;

revoke execute on function public.admin_attribution_report(timestamptz) from public, anon;
grant execute on function public.admin_attribution_report(timestamptz) to authenticated, service_role;
