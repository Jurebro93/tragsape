-- Velika livada: trag dobiva mjesto tek kad vlasnik potvrdi e-mail.
-- Nepotvrđen trag nema broj (broj je mjesto na livadi), pa nepotvrđeni ne ostavljaju rupe u otiscima šapa.
-- Tajni ključ (claim_token) je ključ iz poveznice za potvrdu. Javnost i dalje vidi samo vidljive tragove.

alter table public.meadow_flowers drop constraint meadow_flowers_status_check;
alter table public.meadow_flowers
  add constraint meadow_flowers_status_check check (status in ('pending', 'visible', 'hidden'));

-- Broj se dodjeljuje pri potvrdi (ili odmah, za cvijet javnog spomena), iz istog niza.
alter table public.meadow_flowers alter column number drop identity if exists;
alter table public.meadow_flowers alter column number drop not null;
create sequence if not exists public.meadow_flowers_number_seq owned by public.meadow_flowers.number;
select setval('public.meadow_flowers_number_seq', coalesce((select max(number) from public.meadow_flowers), 0) + 1, false);
alter table public.meadow_flowers alter column number set default nextval('public.meadow_flowers_number_seq');
revoke all on sequence public.meadow_flowers_number_seq from anon, authenticated;

alter table public.meadow_flowers add column newsletter_opt_in boolean not null default false;
alter table public.meadow_flowers add column confirmed_at timestamptz;
-- Trag posjetitelja uvijek ima e-mail i privolu; cvijet spomena ih nema.
alter table public.meadow_flowers
  add constraint meadow_flowers_visitor_email check (memorial_id is not null or (email is not null and consent_text is not null));

create index meadow_flowers_pending_idx on public.meadow_flowers (created_at) where status = 'pending';
create index meadow_flowers_email_idx on public.meadow_flowers (lower(email)) where email is not null;

-- Potvrda traga iz poveznice. Vraća broj i ime; ponovljena potvrda vraća isti broj.
-- Poveznica vrijedi 7 dana. Poziva je samo poslužitelj (servisni ključ).
create or replace function public.confirm_meadow_flower(p_token text)
returns table (number bigint, name text, email text, newsletter_opt_in boolean, newly_confirmed boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_row public.meadow_flowers%rowtype;
begin
  select * into v_row from public.meadow_flowers f where f.claim_token = p_token for update;
  if not found or v_row.status = 'hidden' then
    return;
  end if;
  if v_row.status = 'visible' then
    return query select v_row.number, v_row.name, v_row.email, v_row.newsletter_opt_in, false;
    return;
  end if;
  if v_row.created_at < now() - interval '7 days' then
    return;
  end if;
  update public.meadow_flowers f
    set status = 'visible', number = nextval('public.meadow_flowers_number_seq'), confirmed_at = now()
    where f.id = v_row.id
    returning * into v_row;
  return query select v_row.number, v_row.name, v_row.email, v_row.newsletter_opt_in, true;
end;
$$;

revoke all on function public.confirm_meadow_flower(text) from public, anon, authenticated;
grant execute on function public.confirm_meadow_flower(text) to service_role;
