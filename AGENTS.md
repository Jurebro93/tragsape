# AGENTS.md — pravila za rad na Tragu šape

Trag šape je hrvatski servis za trajne spomen-stranice kućnih ljubimaca. Ovaj dokument skuplja pravila koja vrijede za svaku promjenu u repozitoriju. Dopunjuje se kako pravila nastaju; arhitektura je u `docs/arhitektura.md`.

## Kako radimo

- Vlasnik odobrava smjer prije izrade. Gradi se u cjelinama koje se mogu isprobati; nakon svake se kaže što radi i što nije provjereno.
- Prije svega što košta ili je vanjsko (novi projekt, račun, domena, hosting, pružatelj AI-ja, e-mail servis, izdavanje računa) pita se vlasnika.
- Ključevi i tajne nikad ne idu u repozitorij ni u razgovor. Samo u varijable okruženja.
- Primjeri memorijala su izmišljeni ljubimci jasno označeni kao primjer. Ne koriste se tuđe fotografije s interneta.

## Odvojenost brenda

- Trag šape je potpuno samostalan proizvod: vlastita domena, vizuali, Supabase projekt, Stripe račun, pošiljatelj e-maila, hosting i analitika.
- U kodu, sadržaju, metapodacima i porukama commitova ne spominju se drugi servisi vlasnika. Nema zajedničkih identifikatora, poveznica ni kolačića.

## Sigurnost i podaci

- RLS je uključen na svakoj tablici. Nova tablica bez politika ne prolazi pregled.
- Preglednik nikad ne dobiva servisni ključ. Servisni ključ koriste samo Stripe webhook, zakazani poslovi i poslužiteljski endpointi za javne unose, u modulima označenima `server-only`.
- Javni unosi (poruke, svijeće, geste, prijave) idu kroz poslužiteljske endpointove. Prava i primatelji obavijesti izvode se iz pohranjenog vlasništva, nikad iz zahtjeva.
- Memorijal se dohvaća kroz jedan poslužiteljski modul za pristup. Nema zaobilaznih upita.
- Memorijali „samo s linkom" i privatni nikad nisu u sitemapu, na Livadi, na obiteljskoj stranici ni u slikama za dijeljenje sa sadržajem.
- IP adrese se ne spremaju; samo sažetak s dnevno rotiranom soli.

## Novac

- Cijene i popusti žive u bazi i na poslužitelju. Klijent nikad ne šalje iznos.
- Narudžbu ispunjava isključivo Stripe webhook nakon provjere potpisa, idempotentno.
- Bez pretplata. Bez odbrojavanja, lažne oskudice i pritiska na naplati. Bez e-mailova koji požuruju kupnju ili obnovu.
- Azil i partneri se ne izmišljaju; prikazuje se samo ono što je vlasnik unio.

## AI

- AI pomaže vlasniku naći riječi. Nikad ne piše u ime ljubimca i ne oponaša ga.
- AI portret je uvijek označen kao AI. Izvorna fotografija ostaje netaknuta.

## Sadržaj

- Svaka cijena i pravna tvrdnja ima izvor i datum pristupa. Ništa se ne izmišlja.
- Članci o zdravlju i eutanaziji nose oznaku „čeka pregled veterinara" i ne objavljuju se bez vlasnikova odobrenja. To provjerava i baza.
- Članci i prodajne sekcije uređuju se u adminu, bez deploya.

## Tekst i ton

- Jezik je hrvatski, obraćanje s „ti". Mirno i iskreno, bez patetike i lažne utjehe.
- Svi tekstovi sučelja su u središnjim porukama (`messages/hr.json`), ne u komponentama.
- Tekstovi sučelja ne sklanjaju ime ljubimca; rečenica se piše tako da ime stoji u nominativu ili ga nema.
- Fontovi moraju imati č, ć, ž, š i đ.

## Sučelje

- Prvo mobitel. Vizualno toplo i svijetlo; bez crno-zlatne estetike i bez kiča.
- Vremenska logika računa se u zoni `Europe/Zagreb`.

## Testovi

- Plaćanje, dozvole i privatnost memorijala imaju testove. Promjena u tim područjima bez testa nije gotova.
