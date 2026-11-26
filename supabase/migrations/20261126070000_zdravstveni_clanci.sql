-- Odluka vlasnika od 26. 11. 2026.: zdravstveni članci pišu se iz veterinarskih izvora i objavljuju
-- uz njegovo odobrenje. Dok ih veterinar ne pregleda, stranica sama prikazuje napomenu da tekst
-- nije pregledao veterinar i da ne zamjenjuje pregled. Objava i dalje traži vlasnikovo odobrenje.

alter table public.articles drop constraint articles_publish_gate;
alter table public.articles add constraint articles_publish_gate check (
  status <> 'published'
  or (owner_approved_at is not null and published_at is not null)
);

-- Nova tema Vodiča: zdravlje živih ljubimaca (cijepljenje, krpelji, cijene zahvata).
alter table public.articles drop constraint articles_cluster_check;
alter table public.articles add constraint articles_cluster_check
  check (cluster in ('kraj-zivota', 'nakon-smrti', 'tugovanje', 'prigodni-datumi', 'zdravlje'));
