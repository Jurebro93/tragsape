-- Nacrt je samo vlasnikov (docs/arhitektura.md, §4: „Nacrt — suradnik: ništa").
-- Suradnik ima pristup dok je spomen objavljen ili skriven; kad ga vlasnik povuče u nacrt
-- (ili se nakon povrata novca vrati u nacrt), pristup miruje do ponovne objave.

create or replace function public.is_member(p_memorial_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memorial_members mm
    join public.memorials m on m.id = mm.memorial_id
    where mm.memorial_id = p_memorial_id
      and mm.user_id = (select auth.uid())
      and mm.accepted_at is not null
      and m.status <> 'draft'
  )
$$;
