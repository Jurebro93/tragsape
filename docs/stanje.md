# Trag šape — stanje izrade

**Stanje na dan:** 25. 11. 2026. navečer. Grana `ccr-382e3faf-73psv3`.

Sve je građeno i provjeravano lokalno (lokalni Supabase, bez vanjskih računa). Nijedan vanjski račun nije otvoren, ništa nije objavljeno i ništa ne košta. Koraci za puštanje u rad su u [`README.md`](../README.md), odjeljak „Postavljanje za produkciju”.

## Ukratko

- Izgrađene su cjeline 1–5 i 7 iz plana te veći dio cjeline 8. **Cjelina 6 (AI portret i spomen-list u PDF-u) nije izgrađena**, pa je paket Memorijal + Portret isključen iz prodaje dok se ne izgradi.
- Provjere koje prolaze: 279 automatskih testova u 13 datoteka (dozvole, privatnost, plaćanje, admin, sadržaj, alati, cjenik), provjera tipova, lint, produkcijski build bez upozorenja i probni prolaz kroz preglednik na produkcijskom buildu (10 koraka, od nacrta do brisanja spomena).
- **Stvarna kupnja preko Stripea nije isprobana**, jer nema ključeva. To je prva stvar za provjeriti kad ključevi stignu.
- Nijedan članak nije objavljen. Svih 12 je u stanju „na pregledu” i čeka tvoje odobrenje; pet ih dodatno čeka pregled veterinara.

## Po cjelinama

| # | Cjelina | Stanje | Kako je provjereno |
|---|---|---|---|
| 1 | Temelj i besplatni spomen | gotovo | preglednik na mobilnoj širini (izrada u tri koraka, nacrt bez računa, kod iz e-maila, objava, svijeća, knjiga sjećanja s odobravanjem, prijava sadržaja, kartice za dijeljenje, „samo s poveznicom”, brisanje) i testovi dozvola |
| 2 | Plaćanje i Memorijal | kod gotov, **stvarna naplata nije isprobana** | 53 testa: izračun cijene, popust 30 %, kodovi, potpis i ponavljanje webhooka, dvostruko plaćanje, povrat, donacija. Galerija, privatnost, video, teme: preglednik |
| 3 | Sadržajni sustav i alati | gotovo | 54 + 51 test; preglednik: uređivanje i tijek odobravanja članka, prodajne sekcije, pet javnih alata |
| 4 | Geste, Livada, obitelj | gotovo, kupnja geste čeka Stripe | preglednik: Livada s filtrima, sat svijeća, obiteljska stranica, prikaz i skrivanje gesta; obrazac kupnje do ukupnog iznosa |
| 5 | Pisma, suradnici, QR, podsjetnici, AI priča, poklon | gotovo; **AI pomoćnik nije isproban s pravim ključem** | preglednik: pisma, vremenska crta, pozivnica suradniku, QR, podsjetnici, preuzimanje i primjena poklona; testovi |
| 6 | Portret | **nije izgrađeno** | paket je isključen migracijom; obrasci nude samo ono što se prodaje |
| 7 | Admin i sadržaj | gotovo; članci čekaju odobrenje | 33 testa; preglednik: svih osam odjeljaka, svaka akcija, pokušaji bez uloge admina |
| 8 | Lansiranje | djelomično | izvoz i brisanje računa rade; pravni tekstovi su nacrt; produkcijski ključevi čekaju tebe |

## Što radi

**Posjetitelj i vlasnik**
- Izrada spomena u tri koraka bez računa; nacrt se sprema i nastavlja e-mailom (kod ili poveznica koja traži klik na gumb). Nacrt započet bez računa prelazi na postojeći račun.
- Besplatni spomen: ime, vrsta, pasmina, datumi, fotografije, posveta, knjiga sjećanja, dnevna svijeća, mjesto na Livadi, kartice za dijeljenje.
- Memorijal (plaćeni paket, primjenjuje se i poklonom): do 50 fotografija s opisima, priča, osobine i najdraže stvari, video s YouTubea ili Vimea koji se učitava tek na klik, vremenska crta, pisma (privatna i javna), privatnost (javno, samo s poveznicom, privatno), suradnici, QR kod za ispis, podsjetnici, tri teme.
- AI pomoćnik za priču: osam pitanja, nacrt koji vlasnik uređuje. Ne piše u ime ljubimca. Radi tek s `ANTHROPIC_API_KEY`.
- Poklon: kupnja, e-mail primatelju odmah ili na odabrani datum, preuzimanje klikom na gumb, primjena na besplatni spomen.
- Geste: do pet u jednoj kupnji, prikaz na spomenu, vlasnik ih može sakriti.
- Livada sjećanja s filtrima i satom svijeća (21–22 h), obiteljska stranica.
- Račun: preuzimanje svih podataka u JSON-u i trajno brisanje računa.
- Adresa spomena je trajna: nakon povlačenja i ponovne objave ostaje ista, pa poveznice i ispisani QR kodovi rade dalje.

**Sadržaj**
- Vodič (`/vodic`): članci s izvorima, prodajnim sekcijama na tri mjesta, povezanim člancima, strukturiranim podacima i vlastitom slikom za dijeljenje. Sve se uređuje u adminu, bez deploya.
- Objavu članka čuva baza: bez tvog odobrenja ne prolazi, a članak označen za veterinara ne prolazi ni bez upisanog pregleda. Izmjena teksta ili izvora objavljenog članka vraća ga na pregled.
- Alati (`/alati`): pseće godine, mačje godine, pomoćnik za posvetu, pomoćnik za sućut, kviz o oproštaju. Upitnik o kvaliteti života i popis za prva 24 sata su izgrađeni, ali ih vidi samo admin.
- 12 nacrta članaka u `content/clanci/` (98 izvora, svaki s datumom pristupa). U bazu ih učitava `node scripts/seed-articles.mjs`, uvijek kao „na pregledu”.

**Admin** (`/admin`)
- Pregled prodaje, narudžbe s detaljima, lijevak i izvor posjeta (koji je članak ili alat doveo do kupnje), geste, kodovi i partneri s provizijama, donacije s azilima i dokazima o isplati, moderacija prijava i skrivanje spomena, cijene i postavke.
- „Stanje sustava” (`/admin/sustav`): što je od postavki stiglo do aplikacije, bez prikaza tajni, i probni e-mail.

**Bazna cijena i cjenik za strojno čitanje**
- Uz svaku cijenu na `/cjenik` i u obrascima kupnje stoji bazna cijena, a važeći cjenik je na stalnoj adresi `/cjenik.csv`. Izmjena cijene u adminu odmah objavljuje novu inačicu; zamijenjena ostaje dostupna 15 dana.
- To traže Zakon o zaštiti potrošača, čl. 7. (izmjene NN 59/2026, na snazi od 17. 11. 2026.) i dva pravilnika u NN 132/2026. Izvori i koraci su u README-u, korak h). Ugrađeno je prema mom čitanju propisa; prije lansiranja to treba potvrditi knjigovođa ili pravnik.

**Izvor posjeta bez kolačića**
- Oznaka članka ili alata putuje u adresi do obrasca i sprema se uz nacrt i narudžbu. Prenosi se i kad posjetitelj putem svrati na primjer, cjenik ili naslovnicu.

## Što nije provjereno

| Što | Zašto | Kako provjeriti |
|---|---|---|
| Stvarna kupnja: spomen, nadogradnja, poklon, gesta | nema Stripe ključeva | testna kartica u Stripe testnom načinu; README, korak i) |
| Povrat novca iz Stripea | isto | povrat u Stripe nadzornoj ploči; spomen se vraća na besplatni paket i u nacrt |
| AI pomoćnik s pravim odgovorom modela | nema ključa | jedan nacrt priče nakon upisa `ANTHROPIC_API_KEY` |
| Slanje e-maila preko Resenda i dostavljivost | nema računa ni domene | probni e-mail na `/admin/sustav` |
| Kodovi prijave u produkciji | Supabase bez vlastitog SMTP-a šalje samo članovima tima | prijava adresom izvan tima nakon postavljanja SMTP-a |
| `render.yaml` na Renderu | Blueprint se ne može provjeriti bez stvaranja servisa | plan, regija i Node inačica provjereni su prema Renderovoj dokumentaciji (25. 11. 2026.) |
| Turnstile s pravim ključevima | nema ključeva | poruka u knjizi sjećanja nakon upisa oba ključa |
| Zakazani posao pozvan izvana | lokalno je provjeren kroz test, ne preko Supabase Crona | README, korak g) |
| Koje zaglavlje na Renderu nosi pravu adresu posjetitelja | Render to ne dokumentira | `/admin/sustav`, stavka „Adresa posjetitelja” |
| Fotografija veća od 10 MB i dokaz veći od 1 MB | ograničenja su podignuta u `next.config.ts`, ali nisu isprobana velikom datotekom | jedno učitavanje velike datoteke |
| Je li prikaz bazne cijene i oblik cjenika dovoljan inspekciji | propisi su novi i ne rješavaju sve slučajeve | knjigovođa ili pravnik; otvorena pitanja su u README-u, korak h) |
| Safari na iPhoneu, stvarni ispis QR koda, skeniranje mobitelom | nema uređaja | ručno |
| Pregled sa stotinama redaka u adminu | nema toliko podataka | — |

## Poznata ograničenja

- **Nepostojeći ili privatni spomen vraća HTTP 200** sa stranicom „Ove stranice nema” i oznakom `noindex`, a ne 404. To je ponašanje Nexta kad se sadržaj dohvaća nakon što je zaglavlje stranice već poslano. Tražilice takvu stranicu ne indeksiraju. Isto vrijedi za neobjavljen članak, nacrt alata i admin bez uloge.
- **Pozivnica suradniku nije vezana uz adresu** na koju je poslana: prihvatiti je može tko god je prijavljen i ima poveznicu. Vrijedi jednom, a vlasnik suradnika može ukloniti.
- **Prelazak na „samo s poveznicom” izdaje novi ključ**, pa stari QR kod za takav spomen prestaje raditi. Stranica QR koda na to upozorava.
- **Broj iskorištenja koda za popust** provjerava se pri otvaranju naplate, pa dvije istodobne kupnje mogu obje proći s posljednjim iskorištenjem.
- **E-mail kupca i podaci o primatelju poklona ostaju uz narudžbu** i nakon brisanja računa. Rok čuvanja treba odrediti knjigovođa ili pravnik.
- **Pisma nisu šifrirana u bazi.** Privatno pismo kroz aplikaciju vidi samo autor (ni vlasnik spomena ni admin), ali tko ima izravan pristup bazi može ga pročitati.
- **Nema dnevnika adminovih radnji** (`audit_log` iz plana nije izgrađen).
- **Nema automatske provjere učitanih slika.** Pokrivaju je potvrđen e-mail, ograničenja, prijava sadržaja i adminovo skrivanje.
- **Datum „Ažurirano” na članku** pomiče se i kad se članak samo objavi ili povuče.

## Odluke koje čekaju tebe

**Prije puštanja u rad**
1. Supabase projekt (organizacija, regija, plan), Render (plan), domena, zaseban Stripe račun, Resend. Ništa od toga nije otvoreno.
2. Izdavanje i fiskalizacija računa za kartična plaćanja: s knjigovođom (vidi `docs/arhitektura.md`, §12).
3. Bazna cijena i cjenik: potvrda tumačenja (README, korak h), OIB ili matični broj u `SELLER_TAX_ID` te upis datuma ponude u adminu na dan lansiranja. Naslovnica cijenu spominje u tekstu bez bazne cijene; pitaj treba li je i tamo isticati.
4. Pravni tekstovi (`/uvjeti`, `/privatnost`, `/kolacici`) su nacrt s praznim mjestima u uglatim zagradama. Dok ih pravnik ne pregleda, nose oznaku nacrta i nisu u sitemapu.
5. Pretpostavke o proizvodu iz `docs/arhitektura.md`, §11 (sedam točaka).

**Sadržaj**
6. Odobrenje članaka. Sedam ih ne traži veterinara, pet traži. U tekstovima je 15 bilješki `[PROVJERITI: …]` koje treba riješiti prije objave; popis je niže.
7. Zakapanje ljubimca na vlastitom zemljištu: Pravilnik NN 129/2022, čl. 43. st. 3. to dopušta uz uvjete, a mediji često tvrde suprotno. Članak 5 navodi odredbe i razliku. Prije objave to treba potvrditi pravnik ili Uprava za veterinarstvo.
8. Upitnik o kvaliteti života slijedi ljestvicu dr. Alice Villalobos (sedam područja, bodovi 0–10, granica 35), našim riječima i uz navođenje izvora. Objavljeni primjerci nose napomenu „reprinted with permission”, pa prije objave vrijedi tražiti dopuštenje. Alat je nacrt.
9. Kalkulator psećih godina računa prema tablici AKC-a i navodi izvor, ali cijelu tablicu ne prenosi. Ako je želiš prikazati, treba dopuštenje AKC-a.
10. Izvor cjenika riječkog groblja za ljubimce je dokument komunalnog društva koje se bavi i pogrebnim uslugama. Odluči je li ta poveznica prihvatljiva s obzirom na odvojenost brenda.

**Kasnije**
11. Pružatelj AI slika za Portret (cjelina 6).

### Bilješke `[PROVJERITI]` u nacrtima članaka

- **Uspavljivanje psa: cijena** — postoji li noviji cjenik klinika Veterinarskog fakulteta od onoga s datumom 14. 11. 2024.; cijena eutanazije kod kuće (nijedna ambulanta je ne objavljuje).
- **Što učiniti kad ljubimac ugine** — odluke Zagreba, Splita, Rijeke i Osijeka o zakapanju; pisana potvrda Uprave za veterinarstvo treba li prijava ili odobrenje; način prijave uginuća označenog ljubimca.
- **Kremiranje: cijena** — je li urna uključena u cijenu; vrijede li još cijene riječkog cjenika iz 2021./2022.; postoje li drugi krematoriji s objavljenim cjenikom.
- **Groblje za kućne ljubimce** — postoje li druga registrirana groblja; značenje oznaka u cjeniku zagrebačkog groblja; starost riječkog cjenika.
- **Tuga i krivnja** — provjereni brojevi psihološke pomoći u Hrvatskoj; postoji li podrška specijalizirana za gubitak ljubimca; dostupnost stranih linija.
- **Svjetski dan pasa, mačaka i životinja** — datumi i podrijetlo triju spomen-dana koje nismo uspjeli provjeriti na izvoru.

## Što se promijenilo u odnosu na plan

- Admin ne čita nacrte, a suradnik ih ne vidi dok vlasnik spomen ne objavi. Tako piše u tablici prava; baza to sada i provodi.
- Pisma, vremenska crta i podsjetnici traže plaćeni paket i na razini baze.
- Vlasnik može ukloniti javno pismo suradnika sa svog spomena.
- Podsjetnici počinju godinu nakon datuma, da nitko ne dobije „godišnjicu” na dan kad je ljubimac otišao.
- Na besplatnom spomenu vlastita pisma i događaji mogu se obrisati, ali ne dodavati ni mijenjati (npr. nakon povrata novca).
- Stanja narudžbe su `pending`, `paid`, `failed`, `expired`, `refunded`. Djelomičan povrat ne opoziva ništa.
- Dodano izvan plana: bazna cijena i cjenik za strojno čitanje (novi propis), stranica „Stanje sustava” u adminu, ikona i zadana slika za dijeljenje.
- Nisu izgrađeni: `ai_story_sessions`, `ai_portrait_jobs`, `audit_log`.
