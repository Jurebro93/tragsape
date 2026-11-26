# Upute za pisanje članaka Vodiča

Vrijede za svaki novi članak u `content/clanci/`. Plan tema je u `docs/plan-sadrzaja.md`, a pravila projekta u `AGENTS.md`.

## Čitatelj i ton
- Čitatelj je vlasnik ljubimca u Hrvatskoj, često u prvim danima nakon gubitka. Obraćanje s „ti”, mirno i izravno, bez patetike i bez lažne utjehe.
- Ime ljubimca se ne sklanja i ne izmišlja. AI nikad ne piše u ime ljubimca.

## Istina i izvori
- Svaka cijena, rok, propis, brojka i medicinska tvrdnja ima izvor koji si stvarno otvorio, s datumom pristupa. Što ne možeš potvrditi na izvoru, ne pišeš.
- Cijene samo iz objavljenih cjenika pružatelja, uz naziv pružatelja i datum cjenika. Ne izmišljaju se pružatelji, partneri ni „prosječne cijene”.
- Izvor se u tekstu označava brojem u uglatim zagradama, npr. `[2]`, a popis izvora je u zaglavlju datoteke. Svaki izvor mora biti spomenut barem jednom i svaka oznaka mora imati izvor.
- Vanjske poveznice u tekstu su dobrodošle kad čitatelju koriste (službeni cjenik, tekst propisa, stranica ustanove). Samo `https://`.
- Tema zdravlja ili eutanazije: `needs_vet_review: true` i rečenica pri vrhu da tekst ne zamjenjuje veterinara. Stranica sama dodaje napomenu da tekst nije pregledao veterinar.
- Zdravstvene tvrdnje i preporuke liječenja samo iz izvora koje potpisuju veterinari ili veterinarske ustanove (fakulteti, strukovne udruge, klinike, MSD/Merck Veterinary Manual, WSAVA, AAHA, AVMA, ESCCAP i slično). Uz svaku preporuku stoji tko je daje. Ne navode se doze lijekova; za lijekove i doze upućuje se na veterinara.
- Svaki zdravstveni članak ima odjeljak „Kada odmah veterinaru" s konkretnim znakovima i završava uputom da se čitatelj obrati najbližoj veterinarskoj ambulanti.
- Tema živog ljubimca (cijepljenje, krpelji, cijene zahvata) ide u temu `zdravlje`, a `cta.end` ostaje prazan ili `pogledaj-primjer`; takvom čitatelju se ne nudi spomen.

## Oblik (i za čitatelja i za tražilice i AI odgovore)
Redoslijed odjeljaka:
1. **Uvod** od dvije do tri rečenice koji odmah odgovara na pitanje iz naslova.
2. `## Ukratko`: tri do pet natuknica s konkretnim odgovorima (brojke, rokovi, koraci).
3. Glavni odjeljci s podnaslovima `##` koji su sami po sebi pitanja ili jasne tvrdnje. Odlomci imaju najviše tri rečenice.
4. Barem jedan **vizual koji nosi podatak**: tablica (cijene, usporedba, rokovi), numerirani koraci ili popis za označavanje `- [ ]`. Ne ukras.
5. `## Česta pitanja`: četiri do šest pitanja kao `### Pitanje?`, svako s odgovorom od jedne do tri rečenice koji stoji sam za sebe. Iz ovoga nastaje FAQ shema.
6. `## Sljedeći korak`: jedan konkretan prijedlog i poveznica (alat, primjer, izrada spomena, poklon).

Ostalo:
- 900 do 1500 riječi. Bez HTML oznaka, samo Markdown.
- Najmanje tri unutarnje poveznice na druge članke (`/vodic/{slug}`) i jedna na alat ili stranicu (`/alati/...`, `/izradi`, `/primjer`, `/livada`, `/cjenik`, `/poklon`).
- Naslov do 160 znakova; `seo_title` do 60, `seo_description` do 155, s običnom crticom, bez duge crte.
- `cta.end` je jedan od: `besplatni-spomen`, `pogledaj-primjer`, `poklon`. Čitatelju koji još ima ljubimca ne nudi se spomen.
- Bez bilješki `[PROVJERITI]` u tekstu. Što nije provjereno, izostavi i navedi u izvještaju.

## Provjera
`node scripts/seed-articles.mjs --check` mora proći bez pogrešaka. Uzor oblika zaglavlja: `content/clanci/dugin-most.md`.
