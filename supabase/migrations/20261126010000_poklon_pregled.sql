-- Pregled poklona za onoga tko ima kod iz e-maila: tko ga šalje, poruka i paket.
-- Kod je jedina tajna (96 bita); pravo i njegovo stanje vidi samo onaj tko je poklon preuzeo.
create or replace function public.gift_preview(p_code text)
returns table (
  tier text,
  buyer_name text,
  recipient_name text,
  message text,
  redeemed boolean,
  redeemed_by_me boolean,
  entitlement_id uuid,
  entitlement_status text
)
language sql stable security definer set search_path = '' as $$
  select e.tier,
         g.buyer_name,
         g.recipient_name,
         g.message,
         g.redeemed_by is not null,
         coalesce(g.redeemed_by = (select auth.uid()), false),
         case when g.redeemed_by = (select auth.uid()) then g.entitlement_id end,
         case when g.redeemed_by = (select auth.uid()) then e.status end
  from public.gifts g
  join public.entitlements e on e.id = g.entitlement_id
  where g.code = p_code and e.status <> 'revoked'
$$;

revoke execute on function public.gift_preview(text) from public;
grant execute on function public.gift_preview(text) to anon, authenticated, service_role;
