-- Newsletter: prijave s privolom i dvostrukom potvrdom (e-mail s poveznicom i gumbom).
-- Upis, potvrda i odjava idu kroz poslužiteljske endpointove sa servisnim ključem; javne uloge
-- nemaju nikakvo pravo na tablicu. Admin čita kroz RLS.

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 254),
  email_normalized text generated always as (lower(btrim(email))) stored,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'unsubscribed')),
  confirm_token text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  unsubscribe_token text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  -- Gdje je prijava nastala: popup, podnozje, naslovnica ili clanak:{slug}.
  source text check (source is null or char_length(source) <= 120),
  -- Točan tekst privole koji je posjetitelj potvrdio, radi dokaza privole (GDPR čl. 7. st. 1.).
  consent_text text not null check (char_length(consent_text) <= 1000),
  consented_at timestamptz not null default now(),
  confirmation_sent_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index newsletter_subscribers_email_key on public.newsletter_subscribers (email_normalized);
create unique index newsletter_subscribers_confirm_token_key on public.newsletter_subscribers (confirm_token);
create unique index newsletter_subscribers_unsubscribe_token_key on public.newsletter_subscribers (unsubscribe_token);

alter table public.newsletter_subscribers enable row level security;

create policy newsletter_subscribers_admin_select on public.newsletter_subscribers
  for select using (public.is_admin());

revoke all on public.newsletter_subscribers from anon, authenticated;
grant select on public.newsletter_subscribers to authenticated;
