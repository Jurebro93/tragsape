# Zadatak pisca članaka za Vodič

Ovo je zajednički zadatak za svakog pisca koji dobije dvije teme. Pravila pisanja su u `content/UPUTE.md`; ovdje je samo postupak.

## Prije pisanja

1. Pročitaj `content/UPUTE.md`.
2. Kao uzor oblika otvori jedan postojeći članak iz iste skupine u `content/clanci/` (front matter, `sources`, oznake `[n]`, tablice, „## Ukratko", „## Česta pitanja", „## Sljedeći korak").
3. Pogledaj `ls content/clanci`. Ako već postoji članak o srodnoj temi, pročitaj ga i uzmi drugi kut; ne ponavljaj ga.
4. U `docs/teme-reddit.md` potraži (Grep po ključnoj riječi) brief o svojoj temi i pročitaj samo taj odlomak. Iz njega uzmi PITANJA na koja članak treba odgovoriti. Savjeti iz komentara nisu izvor i ne prenose se; sve se provjerava u stručnim izvorima.

## Pisanje

- Datoteka je točno `content/clanci/{slug}.md`, a `slug`, `cluster` i naslov su zadani.
- Odmah ispod `cluster` dodaj `animals:` s životinjama na koje se članak odnosi, odvojenima zarezom: `pas`, `macka`, `kunic`, `ptica`, `ostalo` (npr. `animals: pas, macka`). Ako je članak za sve ljubimce jednako, polje izostavi. Po tome članak ulazi na stranice „Zdravstveni problemi kod pasa” i „… kod mačaka”.
- Hrvatski, obraćanje s „ti", mirno i konkretno, bez patetike i lažne utjehe.
- Svaka cijena, propis i činjenična tvrdnja ima izvor u `sources` s današnjim `accessed_on` i URL-om stranice koju si stvarno otvorio. Što ne možeš potvrditi, izostavi ili reci da podatka nema. Ništa se ne izmišlja: ni tvrtke, ni partneri, ni azili, ni brojke.
- Cijene samo iz javno objavljenih cjenika, uz naziv ustanove i datum cjenika. Za usporedbu cijena traže se najmanje tri cjenika iz različitih mjesta ako postoje.
- Propisi iz teksta propisa (narodne-novine.nn.hr, zakon.hr, stranice ministarstava i gradova), s člankom i brojem NN. Gdje propis nije jednoznačan, reci to.
- Kratki odlomci (2–3 rečenice). Podnaslovi kao pitanja ili tvrdnje. Prva rečenica odjeljka izravno odgovara na podnaslov. Barem jedna tablica gdje ima smisla. „## Česta pitanja" s 5–6 pitanja.
- Dodaj 2–4 istaknuta okvira i, gdje ima smisla, jedan ugrađeni alat, prema odjeljku „Istaknuti okviri i ugrađeni alati” u `content/UPUTE.md`.
- Najmanje tri interne poveznice `/vodic/{slug}`, samo na članke koji postoje u `content/clanci` ili na drugi članak iz tvog para.
- Trag šape se spominje najviše jednom, mirno, bez cijene brojkom (uputi na `/cjenik`). U skupini `zdravlje` i `kraj-zivota` čitatelj još ima ljubimca: spomen se ne nudi.
- Ne spominji nijedan drugi servis vlasnika. Ne piši u ime ljubimca.

## Zdravstvene teme (`needs_vet_review: true`)

- Izvori su veterinarski: klinike i fakulteti, strukovne udruge (WSAVA, AAHA, AVMA, ISFM/iCatCare, BSAVA), Merck/MSD Veterinary Manual, VCA, Cornell, UC Davis, Royal Veterinary College, hrvatski Veterinarski fakultet i Hrvatska veterinarska komora. Uz tvrdnju navedi tko je potpisuje ako piše.
- Bez doza lijekova i bez uputa za liječenje kod kuće. Ljudski lijekovi spominju se samo kao upozorenje.
- Obvezan odjeljak „## Kada odmah veterinaru" s konkretnim znakovima.
- Jasna uputa da procjenu daje veterinar koji je životinju pregledao i da se čitatelj obrati najbližoj veterinarskoj ambulanti.

## Kraj

- Ne mijenjaj nijednu drugu datoteku. Ne radi commit ni push (to radi glavna sesija; ako vidiš tuđe commitove, zanemari ih).
- Pokreni `node scripts/seed-articles.mjs --check` i ispravi greške u svoje dvije datoteke. Greške u tuđim datotekama zanemari.
- Izvještaj neka bude kratak: putanje dviju datoteka, prolazi li provjera, i popis onoga što nisi uspio potvrditi izvorom ili što vlasnik treba pogledati.
