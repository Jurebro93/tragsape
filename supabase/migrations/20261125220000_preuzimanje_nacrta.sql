-- Preuzimanje nacrta: posjetitelj je počeo spomen kao anonimni korisnik, a zatim upisao e-mail
-- koji već ima račun. Nacrt se tada prenosi na taj račun, ali samo uz jednokratan token koji
-- postoji u pregledniku koji je nacrt započeo ili u e-mailu poslanom na tu adresu.

create table public.draft_claims (
  token_hash text primary key,
  anon_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.draft_claims enable row level security;
revoke all on public.draft_claims from anon, authenticated;
grant all on public.draft_claims to service_role;

create or replace function public.create_draft_claim() returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_token text;
begin
  if v_uid is null or not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'not_anonymous' using errcode = 'P0001';
  end if;
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  delete from public.draft_claims where anon_user_id = v_uid or created_at < now() - interval '1 day';
  insert into public.draft_claims (token_hash, anon_user_id)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), v_uid);
  return v_token;
end $$;

create or replace function public.claim_drafts(p_token text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_hash text := encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  v_anon uuid;
  v_moved integer := 0;
begin
  if v_uid is null or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'email_required' using errcode = 'P0001';
  end if;
  select c.anon_user_id into v_anon from public.draft_claims c
    where c.token_hash = v_hash and c.created_at > now() - interval '1 day';
  if not found then
    return 0;
  end if;
  delete from public.draft_claims where token_hash = v_hash;
  -- Prenosi se samo s računa koji je i dalje anoniman, i nikad na samoga sebe.
  if v_anon = v_uid or not exists (
    select 1 from auth.users u where u.id = v_anon and u.is_anonymous
  ) then
    return 0;
  end if;
  update public.memorials set owner_id = v_uid where owner_id = v_anon;
  get diagnostics v_moved = row_count;
  update public.memorial_photos set created_by = v_uid where created_by = v_anon;
  return v_moved;
end $$;

revoke execute on function public.create_draft_claim() from public, anon;
revoke execute on function public.claim_drafts(text) from public, anon;
grant execute on function public.create_draft_claim() to authenticated, service_role;
grant execute on function public.claim_drafts(text) to authenticated, service_role;
