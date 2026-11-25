-- 1) Adresa spomena je trajna: ponovna objava (nakon povlačenja u nacrt ili povrata novca)
--    vraća spomen na istu adresu, pa poveznice i ispisani QR kodovi nastavljaju raditi.
-- 2) Pisma, vremenska crta i podsjetnici dio su plaćenog paketa i to čuva i baza, ne samo aplikacija.
-- 3) Vlasnik smije ukloniti javno pismo suradnika sa svog spomena.

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
  if m.status in ('published', 'hidden') then
    return m.slug;
  end if;
  if char_length(btrim(m.name)) = 0 then
    raise exception 'name_required' using errcode = 'P0001';
  end if;
  -- Spomen koji je već jednom bio objavljen zadržava svoju adresu, i kad mu se ime promijeni.
  if m.published_at is not null then
    update public.memorials set status = 'published' where id = p_id;
    return m.slug;
  end if;
  v_base := left(public.slugify(m.name), 40);
  if v_base = '' then
    v_base := 'spomen';
  end if;
  v_slug := v_base || '-' || encode(extensions.gen_random_bytes(3), 'hex');
  update public.memorials
    set status = 'published', published_at = now(), slug = v_slug
    where id = p_id;
  return v_slug;
end $$;

create or replace function public.is_paid_memorial(p_memorial_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memorials m where m.id = p_memorial_id and m.tier <> 'free')
$$;
revoke execute on function public.is_paid_memorial(uuid) from public, anon;
grant execute on function public.is_paid_memorial(uuid) to authenticated, service_role;

-- Ograničavajuće politike vrijede uz postojeće: novo pismo, događaj ili podsjetnik traži plaćeni
-- paket. Brisanje ostaje dopušteno i na besplatnom spomenu (npr. nakon povrata novca).
create policy letters_paid_insert on public.letters as restrictive for insert to authenticated
  with check (public.is_paid_memorial(memorial_id));
create policy letters_paid_update on public.letters as restrictive for update to authenticated
  using (true) with check (public.is_paid_memorial(memorial_id));
create policy timeline_paid_insert on public.timeline_events as restrictive for insert to authenticated
  with check (public.is_paid_memorial(memorial_id));
create policy timeline_paid_update on public.timeline_events as restrictive for update to authenticated
  using (true) with check (public.is_paid_memorial(memorial_id));
create policy reminder_prefs_paid_insert on public.reminder_prefs as restrictive for insert to authenticated
  with check (public.is_paid_memorial(memorial_id));

-- Privatna pisma vlasnik ne vidi, pa ih ne može ni ukloniti; javna na svom spomenu može.
create policy letters_delete_owner on public.letters for delete to authenticated
  using (
    visibility = 'public'
    and exists (select 1 from public.memorials m where m.id = memorial_id and m.owner_id = (select auth.uid()))
  );
