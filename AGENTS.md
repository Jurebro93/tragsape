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
- Preglednik nikad ne dobiva servisni ključ. Servisni ključ koriste samo Stripe webhook, stvaranje narudžbe, zakazani poslovi, poslužiteljski endpointi za javne unose, čitanje slike nakon RLS provjere i brisanje vlastitog računa nakon provjere sesije, u modulima označenima `server-only`.
- Javni unosi (poruke, svijeće, geste, prijave) idu kroz poslužiteljske endpointove. Prava i primatelji obavijesti izvode se iz pohranjenog vlasništva, nikad iz zahtjeva.
- Memorijal se dohvaća kroz jedan poslužiteljski modul za pristup. Nema zaobilaznih upita.
- Nacrt je samo vlasnikov: ne vidi ga ni admin ni suradnik. Admin moderira objavljene i skrivene spomene.
- Što je dio plaćenog paketa (pisma, vremenska crta, podsjetnici, privatnost, broj fotografija) čuva i baza, ne samo aplikacija.
- Adresa objavljenog spomena se ne mijenja, ni nakon povlačenja i ponovne objave.
- Memorijali „samo s linkom" i privatni nikad nisu u sitemapu, na Livadi, na obiteljskoj stranici ni u slikama za dijeljenje sa sadržajem.
- IP adrese se ne spremaju; samo sažetak s dnevno rotiranom soli. Adresa se čita kroz `clientIp()` (`src/server/public/visitor.ts`), koji uz `CLIENT_IP_HEADER` vjeruje samo zaglavlju posrednika.
- U Supabaseu mora biti uključena potvrda e-maila („Confirm email"). Bez nje se e-mail dodjeljuje nacrtu bez provjere koda i spomen bi se mogao objaviti pod tuđom adresom.
- Prijava je bez lozinke: kod iz e-maila ili poveznica koja traži klik na gumb (skeneri pošte je ne mogu potrošiti). Nacrt prije prijave pripada anonimnom korisniku Supabasea.

## Novac

- Cijene i popusti žive u bazi i na poslužitelju. Klijent nikad ne šalje iznos.
- Narudžbu ispunjava isključivo Stripe webhook nakon provjere potpisa, idempotentno.
- Bez pretplata. Bez odbrojavanja, lažne oskudice i pritiska na naplati. Bez e-mailova koji požuruju kupnju ili obnovu.
- Azil i partneri se ne izmišljaju; prikazuje se samo ono što je vlasnik unio.
- Gdje god se prikazuje cijena proizvoda, uz nju stoji bazna cijena (`products.base_amount_cents`; ZZP čl. 7.). Cjenik za strojno čitanje na `/cjenik.csv` stvara baza pri svakoj izmjeni proizvoda; ne slaže se ručno. Izvori su u README-u, korak h).

## AI

- AI pomaže vlasniku naći riječi. Nikad ne piše u ime ljubimca i ne oponaša ga.
- AI portret je uvijek označen kao AI. Izvorna fotografija ostaje netaknuta.

## Sadržaj

- Svaka cijena i pravna tvrdnja ima izvor i datum pristupa. Ništa se ne izmišlja.
- Članci o zdravlju i eutanaziji nose oznaku zdravstvene teme (`needs_vet_review`) i ne objavljuju se bez vlasnikova odobrenja; to provjerava i baza. Odlukom vlasnika od 26. 11. 2026. pišu se iz veterinarskih izvora navedenih uz tekst i objavljuju i prije pregleda veterinara; dok pregleda nema, stranica sama prikazuje napomenu da tekst nije pregledao veterinar i upućuje na najbližu veterinarsku ambulantu.
- Članci i prodajne sekcije uređuju se u adminu, bez deploya. Nacrti članaka žive u `content/clanci/` i u bazu ulaze kroz `node scripts/seed-articles.mjs`, uvijek kao „na pregledu".
- Alati su u `src/lib/tools/registry.ts`; alat o zdravlju ili propisima kreće kao `draft` (vidi ga samo admin) i objavljuje se tek nakon pregleda i vlasnikova odobrenja.
- Izvor posjeta (članak, alat, UTM) putuje u adresi i skrivenim poljima obrasca (`src/lib/attribution.ts`), bez kolačića i bez pohrane u pregledniku.

## Tekst i ton

- Jezik je hrvatski, obraćanje s „ti". Mirno i iskreno, bez patetike i lažne utjehe.
- Svi tekstovi sučelja su u središnjim porukama (`src/messages/hr/`), ne u komponentama.
- Tekstovi sučelja ne sklanjaju ime ljubimca; rečenica se piše tako da ime stoji u nominativu ili ga nema.
- Fontovi moraju imati č, ć, ž, š i đ.

## Sučelje

- Prvo mobitel. Vizualno toplo i svijetlo; bez crno-zlatne estetike i bez kiča.
- Vremenska logika računa se u zoni `Europe/Zagreb`.

## Testovi

- Plaćanje, dozvole i privatnost memorijala imaju testove. Promjena u tim područjima bez testa nije gotova.

## Kod: struktura i konvencije

- **Next.js 16 s Cache Components** (`cacheComponents: true`). Stranica se prerenderira; sve što čita kolačiće, zaglavlja, `params`, `searchParams` ili nepredmemorirane podatke mora biti u komponenti unutar `<Suspense>`. Javni podaci čitaju se kroz funkcije s `"use cache"`, `cacheLife` i `cacheTag`; nakon izmjene se zove `updateTag` (poslužiteljska akcija) ili `revalidateTag(tag, "max")` (route handler). Prije pisanja nove vrste rute pročitaj odgovarajući vodič u `node_modules/next/dist/docs/`.
- **Sesija je uvijek stvarni zahtjev.** `createSessionClient()` zove `connection()`, jer Supabase pri čitanju sesije uspoređuje istek tokena s trenutnim vremenom. Isto vrijedi za svaki kod koji čita `Date.now()` izvan `"use cache"`.
- **Oznake predmemorije:** `memorial:{id}` i `memorial-slug:{slug}` za memorijal, `livada` za popise javnih spomena, `family:{slug}` za obiteljsku stranicu, `sitemap`, `products` za cjenik, `donations` za donacije, `articles` i `article:{slug}` za Vodič. Sve što mijenja objavu ili vidljivost spomena osvježava i `livada` i `sitemap`.
- **Mape:** `src/server/` je samo poslužitelj (svaka datoteka počinje s `import "server-only"`); `src/lib/` je čista logika bez I/O, dijeljena s klijentom; `src/components/ui/` su osnovne komponente; `src/messages/hr/*.ts` su svi tekstovi sučelja, po područjima.
- **Supabase klijenti** (`src/server/supabase/`): `createSessionClient()` za sve što radi prijavljeni ili anonimni korisnik (RLS kao on); `createAnonClient()` za javno, predmemorirano čitanje; `createAdminClient()` zaobilazi RLS i smije se koristiti samo u Stripe webhooku, stvaranju narudžbe, zakazanim poslovima, endpointima za javne unose, čitanju slike nakon RLS provjere i brisanju vlastitog računa. Admin sučelje ga ne koristi: admin radi kroz RLS politike za ulogu `admin`.
- **Stupci se navode izričito.** Javne uloge nemaju pravo na sve stupce (`share_key`, `author_email`, `ip_hash`), pa `select("*")` ne radi.
- **Stanja koja nose novac ili vidljivost** (`tier`, `status`, `visibility`) mijenjaju se samo kroz funkcije u bazi (`publish_memorial`, `set_memorial_visibility`, `fulfill_order`…), nikad izravnim `update`.
- **Shema baze** je u `supabase/migrations/`. Promjena sheme je nova migracija; postojeće se ne mijenjaju. Nakon migracije: `npx supabase gen types typescript > src/server/supabase/database.types.ts`.
- **Stil:** Tailwind s tokenima iz `src/app/globals.css` (`vanilla`, `butter`, `sun`, `terracotta`, `terracotta-deep`, `plum`, `plum-soft`, `teal`, `teal-deep`, `mint`, `line`, `danger`; `font-display`, `font-sans`). Bez proizvoljnih boja u komponentama. Dodirne površine najmanje 44 px. Ikone iz `src/components/icons.tsx`, bez emojija.
- **Teme memorijala** mijenjaju vrijednosti istih tokena unutar `[data-theme]` (vidi kraj `globals.css` i `src/lib/themes.ts`). Nova tema mora zadržati čitljiv bijeli tekst na `terracotta`, `teal` i `plum` te tamni na `butter`, `sun` i `mint`.
- **Izmjena `globals.css` ne učitava se uživo** u razvojnom poslužitelju: nakon nje ga treba ponovno pokrenuti. Nove Tailwind klase u komponentama učitavaju se normalno.
- **Obrasci s `useActionState`** uz `action` dobivaju i `onSubmit={keepValues(action)}` (`src/lib/keep-values.ts`). Bez toga React nakon greške u provjeri vrati polja na početne vrijednosti i posjetitelj izgubi upisano.
- **Identifikatori u kodu su na engleskom**, tekstovi sučelja i putanje ruta na hrvatskom (`/spomen`, `/izradi`, `/moji-ljubimci`).
- **Lokalni rad:** `npx supabase start`, `npm run dev`; provjere: `npx tsc --noEmit`, `npm run lint`, `npm test`. E-mailovi lokalno stižu u Mailpit na `http://127.0.0.1:54324`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
