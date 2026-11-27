# Zadatak: nadogradnja objavljenih članaka

Cilj vlasnika: svaki članak treba izgledati kao vlastita korisna stranica, sa sadržajem na vrhu, internim poveznicama, izvorima, istaknutim podacima i interaktivnim elementima, da se čitatelj zadrži i nauči nešto novo.

## Prije rada

1. Pročitaj `content/UPUTE.md`, osobito odjeljak „Istaknuti okviri i ugrađeni alati".
2. Kao uzor pogledaj `content/clanci/kremiranje-psa-cijena.md` (okviri BROJKE i SAVJET) i `content/clanci/pasje-godine-u-ljudskima-tablica-po-velicini.md` (ugrađen alat).

## Za svaki zadani članak

- Dodaj 2–4 okvira gdje stvarno dodaju vrijednost: BROJKE (3–4 ključne brojke koje članak već potkrepljuje izvorom), CINJENICA (zanimljiva činjenica koju čitatelj vjerojatno ne zna), SAVJET ili VAZNO.
- CINJENICA smije donijeti NOVU činjenicu, ali samo uz izvor koji stvarno otvoriš (WebSearch/WebFetch). Novi izvor dodaj NA KRAJ popisa `sources` s `accessed_on: 2026-11-27`; postojeći brojevi [n] se ne smiju pomaknuti.
- Ugradi jedan alat (`> [!ALAT] slug`) samo gdje je prirodan: `psece-godine` i `macje-godine` (životni vijek, stari ljubimci, pasmine), `posveta` (posvete, spomen, pismo), `sucut` (sućut, kolege, prijatelji), `oprostaj` (rituali, oproštaj, godišnjica). U skupinama `zdravlje` i `kraj-zivota` ne ugrađuj `posveta` ni `oprostaj`.
- Provjeri da članak ima barem tri interne poveznice `/vodic/{slug}` na postojeće članke; dodaj ih gdje nedostaju, prirodno u tekstu. Postoje i stranice tema `/vodic/tema/{zdravlje|kraj-zivota|nakon-smrti|tugovanje|prigodni-datumi}`.
- Ne mijenjaj postojeće činjenice, cijene, izvore ni ton. Ne skraćuj odjeljke. Ne diraj front matter osim dodavanja izvora na kraj popisa.
- Okviri ne idu odmah ispod naslova ni u „Česta pitanja"; najviše četiri po članku.

## Kraj

- Ne mijenjaj druge datoteke osim zadanih članaka. Ne radi commit ni push.
- `node scripts/seed-articles.mjs --check` mora za tvoje članke javiti OK.
- Izvještaj: za svaki članak u jednom retku što si dodao (npr. „BROJKE, CINJENICA (novi izvor: …), ALAT macje-godine, +1 interna poveznica") i što nisi mogao potvrditi.
