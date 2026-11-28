-- Vodič: na koje se životinje članak odnosi. Prazan popis znači da je članak za sve ljubimce.
-- Služi za stranice „Zdravstveni problemi kod pasa” i „… kod mačaka”.
alter table public.articles
  add column animals text[] not null default '{}'
    check (animals <@ array['pas', 'macka', 'kunic', 'ptica', 'ostalo']::text[]);

create index articles_animals_idx on public.articles using gin (animals);
