-- Vidljiv trag uvijek ima broj (mjesto na livadi); trag na čekanju ga nema.
alter table public.meadow_flowers
  add constraint meadow_flowers_number_when_visible check (status = 'pending' or number is not null);
alter table public.meadow_flowers
  add constraint meadow_flowers_pending_has_no_number check (status <> 'pending' or number is null);

-- Niz nastavlja točno iza najvećeg dodijeljenog broja, bez rupe od proba.
select setval('public.meadow_flowers_number_seq', greatest(1, coalesce((select max(number) from public.meadow_flowers), 0)), (select count(*) > 0 from public.meadow_flowers));
