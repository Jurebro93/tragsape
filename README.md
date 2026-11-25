# Trag šape

Trag šape je hrvatski servis na kojem vlasnik izradi trajnu spomen-stranicu za ljubimca kojeg više nema. Osnovni spomen je besplatan, a prošireni paketi, geste i poklon plaćaju se jednokratno.

Pravila rada su u [`AGENTS.md`](AGENTS.md), a arhitektura u [`docs/arhitektura.md`](docs/arhitektura.md).

## Lokalni razvoj

Treba ti Node 22 ili noviji i Docker (za lokalni Supabase).

1. Instaliraj pakete:

   ```bash
   npm install
   ```

2. Pokreni lokalni Supabase (baza, prijava, pohrana, testni poštanski sandučić). Prvo pokretanje preuzima slike, pa traje dulje; migracije iz `supabase/migrations/` primjenjuju se same.

   ```bash
   npx supabase start
   ```

3. Kopiraj primjer varijabli i popuni ga:

   ```bash
   cp .env.example .env.local
   npx supabase status -o env
   ```

   | Iz `supabase status` | U `.env.local` |
   |---|---|
   | `API_URL` | `NEXT_PUBLIC_SUPABASE_URL` |
   | `PUBLISHABLE_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
   | `SECRET_KEY` | `SUPABASE_SECRET_KEY` |
   | `MAILPIT_URL` | `MAILPIT_URL` |

   `HASH_SECRET` je bilo koji dug nasumičan niz, npr. iz `openssl rand -base64 48`. Stripe, Resend i Turnstile lokalno mogu ostati prazni: kupnja je tada isključena, a e-mailovi idu u Mailpit.

4. Pokreni aplikaciju i otvori <http://localhost:3000>:

   ```bash
   npm run dev
   ```

5. E-mailovi (kod za prijavu, obavijesti) lokalno stižu u Mailpit: <http://127.0.0.1:54324>.

### Provjere

```bash
npx tsc --noEmit   # tipovi
npm run lint       # ESLint
npm test           # Vitest
npm run smoke      # dimni test cijelog besplatnog toka u pregledniku (treba pokrenuta aplikacija i Playwright)
```

Testovi dozvola i plaćanja rade nad lokalnim Supabaseom, pa on mora biti pokrenut, a `.env.local` popunjen.

Nakon nove migracije osvježi tipove baze: `npm run db:types`.

## Postavljanje za produkciju

Redoslijed je bitan: Render pri buildu čita cjenik iz baze, pa Supabase mora biti gotov prije prvog deploya. U koracima ispod `DOMENA` znači tvoju domenu (npr. `tragsape.hr`). Gdje se spominje stavka u nekom sučelju, naziv u sučelju može se razlikovati.

Trag šape ima vlastite račune kod svih pružatelja (Supabase, Stripe, Resend, Render, domena). Ne koristi postojeće račune drugih projekata.

### a) Supabase

1. Stvori novi projekt u regiji EU (Frankfurt). Lozinku baze spremi na sigurno.
2. Poveži repozitorij s projektom i primijeni migracije. `REF` je oznaka projekta iz njegove adrese.

   ```bash
   npx supabase login
   npx supabase link --project-ref REF
   npx supabase db push --remote --dry-run   # samo ispis onoga što bi se primijenilo
   npx supabase db push --remote
   ```

   Pazi na `--remote`: bez njega ova inačica CLI-ja migracije šalje u lokalnu bazu.

3. U **Authentication** postavi (nazivi u sučelju mogu se razlikovati):
   - uključi anonimne prijave („Allow anonymous sign-ins”); na njima počiva nacrt prije upisa e-maila
   - uključi potvrdu e-maila („Confirm email”); ovo je obavezno, jer bi se bez toga spomen mogao objaviti pod tuđom adresom
   - **Site URL**: `https://DOMENA`
   - **Redirect URLs**: `https://DOMENA/**`
   - duljina koda iz e-maila 6 znamenaka i trajanje 3600 sekundi, kao u `supabase/config.jsonc`
4. Postavi hrvatske predloške e-maila (Authentication → e-mail predlošci):

   | Predložak | Predmet | Sadržaj |
   |---|---|---|
   | Magic Link | `Tvoj kod za Trag šape` | `supabase/templates/prijava.html` |
   | Confirm signup | `Tvoj kod za Trag šape` | `supabase/templates/prijava.html` |
   | Change Email Address | `Potvrdi e-mail za Trag šape` | `supabase/templates/potvrda-emaila.html` |

   Umjesto ručnog unosa postoji i `npx supabase config push`, ali ta naredba šalje sve što je zapisano u `supabase/config.jsonc`, a ondje su lokalne vrijednosti (Site URL `http://localhost:3000`, lokalne adrese za preusmjeravanje, nisko ograničenje broja e-mailova). Ako je koristiš, prvo pogledaj razlike s `npx supabase config diff`, a nakon nje ponovno postavi Site URL, Redirect URLs i ograničenja.

5. Postavi vlastiti SMTP (Authentication → postavke e-maila → SMTP), da e-mailovi za prijavu stižu s tvoje domene. Ugrađeni pošiljatelj Supabasea služi samo isprobavanju. Podatke daje pružatelj e-maila; za Resend su prema njegovim uputama: host `smtp.resend.com`, port `465`, korisnik `resend`, lozinka je Resend API ključ. Adresa pošiljatelja mora biti na domeni potvrđenoj u koraku c). Nakon toga podigni ograničenje broja poslanih e-mailova (Authentication → Rate Limits) na vrijednost koja odgovara očekivanom prometu.
6. Iz postavki projekta (API ključevi) prepiši za Render: URL projekta, publishable ključ i secret ključ. Secret ključ zaobilazi sva pravila pristupa; smije stajati samo u varijablama okruženja poslužitelja.

### b) Stripe

1. Otvori zaseban Stripe račun za Trag šape.
2. Počni u testnom načinu: testni tajni ključ (`sk_test_…`) ide u `STRIPE_SECRET_KEY`.
3. Dodaj webhook na adresu `https://DOMENA/api/stripe/webhook` i pretplati ga na događaje:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `charge.refunded`
4. Prepiši tajnu potpisa tog webhooka (`whsec_…`) u `STRIPE_WEBHOOK_SECRET`.
5. U postavkama računa postavi opis na izvodu kartice („statement descriptor”) na ime brenda, da kupac prepozna terećenje.
6. Kad sve radi u testnom načinu, ponovi korake 2–4 sa stvarnim ključevima. Stvarni webhook ima vlastitu tajnu potpisa.

Prije prve stvarne naplate s knjigovođom potvrdi kako se izdaju računi; to je otvoreno pitanje iz `docs/arhitektura.md`.

### c) E-mail (Resend)

1. Dodaj domenu u Resend i u DNS upiši zapise koje Resend prikaže. Pričekaj da domena bude potvrđena.
2. Stvori API ključ i upiši ga u `RESEND_API_KEY`.
3. `EMAIL_FROM` postavi na adresu s te domene, npr. `Trag šape <pozdrav@DOMENA>`.

Bez `RESEND_API_KEY` aplikacija obavijesti ne šalje, nego ih samo zapisuje u dnevnik poslužitelja.

### d) Render

1. Poveži repozitorij s Renderom i odaberi **New → Blueprint**. Render čita [`render.yaml`](render.yaml) iz korijena repozitorija.
2. Upiši vrijednosti varijabli okruženja (tablica je na dnu). Render ih za varijable označene `sync: false` traži samo pri stvaranju Blueprinta; kasnije se dodaju ručno u **Environment** servisa.
3. Provjeri plan. U `render.yaml` je Renderov zadani plan za web servis, koji se naplaćuje; besplatni plan postoji, ali servis na njemu zaspi nakon 15 minuta bez prometa. Promijeni `plan` prije potvrde ako želiš drugo.
4. Potvrdi („Deploy Blueprint”). Zdravlje servisa Render provjerava na `/api/zdravlje`.
5. U postavkama servisa dodaj vlastitu domenu (Settings → Custom Domains).

Varijable koje počinju s `NEXT_PUBLIC_` ugrađuju se u aplikaciju pri buildu. Moraju biti upisane prije prvog builda, a nakon svake promjene treba novi deploy. Ako prvi deploy radiš na privremenoj adresi `…onrender.com`, kod prelaska na domenu promijeni `NEXT_PUBLIC_SITE_URL`, Site URL i Redirect URLs u Supabaseu te adresu Stripe webhooka, pa pokreni novi deploy.

### e) Domena i DNS

1. Odluči koja je adresa glavna: `DOMENA` ili `www.DOMENA`. Ista mora stajati u `NEXT_PUBLIC_SITE_URL` i u Supabaseovu Site URL-u. Render drugu sam preusmjerava na glavnu.
2. Kod registra domene upiši zapise koje Render prikaže uz dodanu domenu. Prema Renderovim uputama to su: za `www` zapis `CNAME` na adresu servisa `…onrender.com`; za korijen domene `ANAME`/`ALIAS` na istu adresu ili, ako ih registar ne podržava, zapis `A` na adresu Renderova raspoređivača opterećenja.
3. Ukloni zapise `AAAA` za tu domenu; Render koristi samo IPv4.
4. U Renderu pritisni **Verify** uz domenu. Certifikat (HTTPS) Render izdaje sam.
5. Ne zaboravi zapise za e-mail iz koraka c).

### f) Admin

Prvo se na stranici prijavi svojom e-mail adresom, da račun nastane. Zatim u Supabaseovu SQL uređivaču pokreni, sa svojom adresom umjesto `...`:

```sql
update public.profiles set role = 'admin' where id = (select id from auth.users where email = '...');
```

### g) Zakazani posao: podsjetnici i odgođeni pokloni

Jednom dnevno treba pozvati `https://DOMENA/api/cron/podsjetnici` s tajnom iz `CRON_SECRET`. Taj poziv šalje podsjetnike (rođendan, dan dolaska u obitelj, godišnjica) i poklone kojima je došao zakazani datum. Ponovljeni poziv istog dana ne šalje ništa dvaput.

Najjednostavnije je to zakazati u samom Supabaseu (Integrations → Cron), bez dodatnog servisa. U SQL uređivaču, sa svojom domenom i istom tajnom koju si upisao u `CRON_SECRET` na Renderu:

```sql
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Tajna i adresa čuvaju se u Supabase Vaultu, ne u tekstu posla.
select vault.create_secret('https://DOMENA', 'site_url');
select vault.create_secret('ISTA_TAJNA_KAO_CRON_SECRET', 'cron_secret');

select cron.schedule(
  'trag-sape-podsjetnici',
  '15 6 * * *', -- svaki dan u 6:15 UTC (7:15 zimi, 8:15 ljeti po hrvatskom vremenu)
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'site_url') || '/api/cron/podsjetnici',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 30000
  );
  $$
);
```

Je li posao prošao, vidi se u `cron.job_run_details`, a odgovor poslužitelja u `net._http_response`. Isti poziv može slati i bilo koji drugi planer (npr. Render Cron Job), ako ga radije koristiš.

### h) Provjera nakon postavljanja

Provjeri ono što je u tom trenutku izgrađeno:

- [ ] `https://DOMENA/api/zdravlje` vraća `{"ok":true}`
- [ ] naslovnica i `/cjenik` prikazuju cijene iz baze
- [ ] `/donacije` prikazuje zbroj i poruku da azil još nije odabran
- [ ] `/robots.txt` i `/sitemap.xml` sadrže adrese s `https://DOMENA`
- [ ] nepostojeća adresa prikazuje stranicu „Ove stranice nema”
- [ ] izrada besplatnog spomena na mobitelu: nacrt, upis e-maila, kod stigne na hrvatskom i s tvoje domene, objava
- [ ] poveznica iz e-maila radi i kad se otvori u drugom pregledniku
- [ ] poruka u knjizi sjećanja stiže vlasniku na odobrenje; besplatna svijeća se broji jednom dnevno
- [ ] kupnja Stripeovom testnom karticom: u Stripeu je isporuka webhooka uspješna, a spomen dobiva paket
- [ ] povrat novca u Stripeu vraća spomen na besplatni paket i u nacrt
- [ ] spomen „samo s poveznicom” i privatni nisu u `/sitemap.xml`
- [ ] `/uvjeti`, `/privatnost` i `/kolacici` više nisu nacrt: pravnik ih je pregledao, uglate zagrade su popunjene, a `LEGAL_DRAFT` u `src/messages/hr/legal.ts` je `false`

## Dobro je znati

- Cijene, popust i iznos donacije žive u bazi (`products`, `settings`). Javne stranice ih predmemoriraju do sat vremena, pa se izmjena izravno u bazi ne vidi odmah.
- Pravni tekstovi su nacrt. Dok je `LEGAL_DRAFT` uključen, nose oznaku nacrta, nisu u sitemapu i tražilice ih ne indeksiraju.
- Azil se na stranicama imenuje tek kad `settings.active_shelter_id` pokazuje na redak u tablici `shelters`.

## Varijable okruženja

| Varijabla | Čemu služi | Obavezna |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Javna adresa stranice, bez kose crte na kraju. Koriste je poveznice u e-mailovima, sitemap, robots i povratak sa Stripea. Ugrađuje se pri buildu. | da |
| `NEXT_PUBLIC_SUPABASE_URL` | Adresa Supabase projekta. Ugrađuje se pri buildu. | da |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Javni ključ Supabasea; njime se čita ono što smije i anonimni posjetitelj. Ugrađuje se pri buildu. | da |
| `SUPABASE_SECRET_KEY` | Tajni ključ Supabasea koji zaobilazi pravila pristupa. Samo na poslužitelju: Stripe webhook, narudžbe, javni unosi. | da |
| `HASH_SECRET` | Tajna za sažetke posjetitelja (dnevna svijeća, ograničenja učestalosti). Dug nasumičan niz. | da |
| `STRIPE_SECRET_KEY` | Tajni ključ Stripea. Bez njega je kupnja isključena. | za naplatu |
| `STRIPE_WEBHOOK_SECRET` | Tajna potpisa Stripe webhooka; bez nje se događaji plaćanja ne prihvaćaju. | za naplatu |
| `RESEND_API_KEY` | Ključ za slanje obavijesti e-mailom. Bez njega se poruke samo zapisuju u dnevnik. | za e-mail |
| `EMAIL_FROM` | Pošiljatelj obavijesti, npr. `Trag šape <pozdrav@DOMENA>`. | za e-mail |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Javni ključ Cloudflare Turnstilea za zaštitu javnih obrazaca. Ugrađuje se pri buildu. | ne |
| `TURNSTILE_SECRET_KEY` | Tajni ključ Turnstilea. Bez ključeva rade zamka i ograničenja učestalosti. | ne |
| `CLIENT_IP_HEADER` | Zaglavlje u koje posrednik hostinga upisuje pravu adresu posjetitelja (npr. `cf-connecting-ip`). Bez njega se uzima prva adresa iz `x-forwarded-for`, koju posjetitelj možda može podmetnuti i tako zaobići ograničenja učestalosti. Što stiže do poslužitelja pokazuje admin, „Stanje sustava". | ne |
| `CRON_SECRET` | Tajna kojom se zakazani posao predstavlja adresi `/api/cron/podsjetnici`. Dug nasumičan niz. Bez nje se podsjetnici i odgođeni pokloni ne šalju. | za podsjetnike |
| `ANTHROPIC_API_KEY` | Ključ za AI pomoćnika za priču. Bez njega je pomoćnik isključen, a sve ostalo radi. | ne |
| `MAILPIT_URL` | Samo lokalno: adresa testnog poštanskog sandučića. Na Renderu se ne postavlja. | ne |
| `NODE_VERSION` | Samo na Renderu: inačica Nodea. Postavljena je u `render.yaml`. | — |

Prave vrijednosti nikad ne idu u repozitorij ni u razgovor, samo u `.env.local` i u varijable okruženja kod pružatelja hostinga.
