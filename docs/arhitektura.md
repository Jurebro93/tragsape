# Trag šape — arhitektura, model podataka i redoslijed izrade

**Status:** prijedlog v0.1 od 25. 11. 2026. — čeka odobrenje vlasnika. Ništa od ovoga još nije izgrađeno.
Vizualni smjerovi su na platnu: https://claude.ai/artifact/ST62Bbt8Uk5U9Ea7y13Zsk

## 1. Stog

Preporučeni stog (Next.js + Supabase + Stripe Checkout) je dobar izbor i ne vidim razlog za drugo.

| Sloj | Izbor | Zašto |
|---|---|---|
| Aplikacija | Next.js (App Router), TypeScript, React Server Components | SSR za SEO, OG slike i kartice na poslužitelju, članci bez deploya |
| Stil | Tailwind CSS + CSS varijable (tokeni) | teme memorijala su skupovi tokena, bez dupliciranja komponenti |
| Baza, auth, pohrana | Supabase (Postgres, regija EU/Frankfurt) | RLS kao jedini sloj prava, prijava bez lozinke, privatna pohrana |
| Plaćanje | Stripe Checkout (jednokratno) + webhook | bez vlastite obrade kartica; iznose računa poslužitelj |
| E-mail | transakcijski servis (prijedlog: Resend) | prijava, nastavak nacrta, moderacija, poklon, podsjetnici |
| AI tekst | Claude preko poslužiteljske rute | pomoćnik za priču, posvetu i poruku sućuti |
| AI slike | pružatelj se bira u cjelini 6 | portret iz fotografije |
| Tekstovi | `next-intl`, sve u `messages/hr.json` | drugi jezici kasnije bez prepravljanja komponenti |
| Testovi | Vitest, testovi RLS-a nad lokalnim Supabaseom, Playwright | plaćanje, dozvole, privatnost |

Načela:

- Preglednik nikad ne dobiva servisni ključ. Podaci se čitaju na poslužitelju s korisnikovom sesijom, pa RLS vrijedi za svaki upit.
- Servisni ključ koriste samo tri mjesta: Stripe webhook, zakazani poslovi i poslužiteljski endpointi za javne unose. Svi žive u `src/server/` i označeni su `server-only`.
- Sva vremenska logika (godišnjice, „jednom dnevno", sat svijeća) računa se u zoni `Europe/Zagreb`.
- Tekstovi sučelja ne sklanjaju ime ljubimca. Hrvatski padeži bi tražili ručni unos oblika, pa rečenice pišemo tako da ime stoji u nominativu ili ga nema („Ostavi gestu", ne „Ostavi gestu za Medu").

## 2. Rute

```
/                         naslovnica
/izradi                   izrada u tri koraka (ljubimac → priča i fotografije → pregled)
/spomen/[slug]            javna stranica memorijala
/s/[kljuc]                memorijal „samo s linkom" (neizvediv ključ)
/livada                   Livada sjećanja, filtri ?vrsta=&pasmina=; u 21:00 sat svijeća
/obitelj/[slug]           obiteljska stranica (samo javni ljubimci računa)
/poklon, /poklon/[kod]    kupnja poklona i preuzimanje
/moji-ljubimci/...        vlasnikov prostor: uređivanje, poruke, privatnost, suradnici, pisma, QR, portret
/vodic/[slug]             članci
/alati/...                psece-godine, macje-godine, kvaliteta-zivota, prva-24-sata, posveta, sucut, oprostaj
/donacije                 ukupno prikupljeno, isplate i dokazi
/cjenik, /uvjeti, /privatnost, /kolacici
/admin/...                prodaja, lijevak, geste, kodovi, partneri, donacije, članci, moderacija
/api/stripe/webhook       jedini ulaz za ispunjenje narudžbi
/api/...                  knjiga sjećanja, svijeće, prijave sadržaja, kartice i OG slike, zakazani poslovi
```

## 3. Model podataka

RLS je uključen na svakoj tablici. Kratice: V = vlasnik, S = suradnik, A = admin, J = javnost (anonimno).

### Računi

- **profiles** — `id` (= auth.users), `display_name`, `role` (user | admin), `locale`. Čita i mijenja samo vlasnik profila; `role` mijenja samo A.
- **families** — `owner_id` (jedinstven), `slug`, `title`, `intro`, `is_public`. Obiteljska stranica; prikazuje samo javne memorijale.

### Memorijal

- **memorials** — `owner_id`, `slug`, `share_key`, `status` (draft | published | hidden | deleted), `tier` (free | memorial | portrait), `visibility` (public | unlisted | private), `name`, `species`, `breed`, `sex`, `birth_date`, `death_date`, `adoption_date` (svaki s preciznošću dan/mjesec/godina), `dedication` (≤ 300), `story_md`, `nicknames[]`, `traits[]`, `favorite_toy`, `favorite_treat`, `favorite_place`, `funny_habits`, `video_url`, `theme`, `cover_photo_id`, `guestbook_mode` (premoderate | open | off), `candle_count`, `content_score`, `is_indexable`, `attribution` (članak, CTA, UTM), `published_at`.
  - Ograničenje u bazi: `tier = 'free'` ⇒ `visibility = 'public'`.
  - Ograničenja po paketu (broj fotografija, pisma, vremenska crta…) provjerava baza, ne samo sučelje.
- **memorial_members** — `memorial_id`, `user_id`, `role` (owner | editor), `invited_email`, `invite_token_hash`, `accepted_at`. Suradnik uređuje sadržaj i piše pisma; privatnost, brisanje, suradnike i kupnje mijenja samo vlasnik.
- **memorial_photos** — `memorial_id`, `storage_path`, `variants`, `width`, `height`, `caption`, `taken_on`, `sort_order`, `kind` (photo | ai_portrait), `source_photo_id`. AI portret je novi zapis; izvornik se nikad ne mijenja.
- **timeline_events** — `memorial_id`, `event_date`, `title`, `body`, `photo_id`.
- **letters** — `memorial_id`, `author_id`, `written_on`, `title`, `body`, `visibility` (private | public). Privatno pismo vidi samo autor.
- **reminder_prefs**, **reminder_log** — koje podsjetnike vlasnik želi; dnevnik poslanih (jedinstveno po memorijalu, vrsti i godini) da se isti podsjetnik ne pošalje dvaput.

### Javni unosi (upis isključivo kroz poslužiteljske endpointove)

- **guestbook_entries** — `memorial_id`, `author_name`, `author_email` (neobavezno, nikad se ne prikazuje), `body`, `status` (pending | approved | hidden | removed), `ip_hash`.
- **candles** — `memorial_id`, `day`, `visitor_hash` (primarni ključ sva tri). Besplatna dnevna svijeća; samo se broji.
- **gestures** — `memorial_id`, `order_line_id`, `kind` (candle | paw | flower | treat | ball), `display_name`, `message`, `starts_at`, `expires_at`, `status` (active | hidden | refunded).
- **reports** — `target_type`, `target_id`, `reason`, `details`, `status` (open | actioned | dismissed).
- **rate_limits** — brojači po ključu i vremenskom prozoru.

`ip_hash` i `visitor_hash` su HMAC s dnevno rotiranom soli; IP adrese se ne spremaju.

### Prodaja

- **products** — `key` (memorial, memorial_portrait, upgrade_portrait, gesture_7d, gesture_30d, gesture_365d), `unit_amount_cents`, `active`. Cijene žive ovdje i mijenjaju se u adminu.
- **settings** — `repeat_discount_pct` (30), `donation_per_memorial_cents` (100), `active_shelter_id`.
- **orders** — `user_id` (može biti prazno za kupca geste), `email`, `status` (pending | paid | failed | refunded | partially_refunded), `subtotal_cents`, `discount_cents`, `total_cents`, `promo_code_id`, `stripe_checkout_session_id` (jedinstven), `stripe_payment_intent_id`, `withdrawal_waiver_at`, `attribution`, `paid_at`.
- **order_lines** — `order_id`, `kind` (memorial | upgrade | gift | gesture), `product_key`, `memorial_id`, `unit_amount_cents`, `discount_cents`, `total_cents`, `discount_reason`.
- **entitlements** — `order_line_id`, `tier`, `owner_id`, `memorial_id`, `status` (available | applied | revoked). Plaćeni paket je pravo koje se primjenjuje na memorijal; tako isto radi i kupnja, i nadogradnja, i poklon.
- **gifts** — `order_line_id`, `entitlement_id`, `buyer_name`, `recipient_email`, `message`, `code_hash`, `send_at`, `sent_at`, `redeemed_by`, `redeemed_at`.
- **stripe_events** — `event_id` (primarni ključ), `type`, `processed_at`. Isti događaj se obrađuje najviše jednom.
- **promo_codes** — `code`, `kind` (promo | partner), `partner_id`, `discount_type`, `discount_value`, `applies_to[]`, `max_redemptions`, `valid_from`, `valid_to`.
- **partners** — `name`, `type` (vet | crematorium | other), `commission_type`, `commission_value`.
- **partner_commissions** — `partner_id`, `order_id`, `base_cents`, `commission_cents`, `status` (accrued | paid | void).
- **shelters** — prazno dok vlasnik ne unese azil.
- **donation_entries** — `order_line_id` (jedinstven), `amount_cents`, `shelter_id`, `status` (accrued | reversed).
- **donation_payouts** — `shelter_id`, `amount_cents`, `paid_on`, `proof_path`, `published`.

### AI

- **ai_story_sessions** — `memorial_id`, `answers`, `draft_md`, `model`, potrošnja. Ograničen broj nacrta po memorijalu.
- **ai_portrait_jobs** — `memorial_id`, `source_photo_id`, `style`, `status`, `result_photo_id`, `provider`.

### Sadržaj

- **articles** — `slug`, `locale`, `cluster`, `title`, `excerpt`, `body_md`, `status` (draft | in_review | approved | published | archived), `needs_vet_review`, `vet_reviewed_by`, `vet_reviewed_at`, `owner_approved_at`, SEO polja.
  - Ograničenje u bazi: članak ne može biti `published` bez `owner_approved_at`, a članak s `needs_vet_review` ni bez `vet_reviewed_at`.
- **article_sources** — `article_id`, `claim`, `title`, `url`, `publisher`, `accessed_on`. Svaka cijena i pravna tvrdnja ima zapis; ispod članka se prikazuju izvori s datumom pristupa.
- **cta_blocks**, **article_cta** — prodajne sekcije koje se uređuju u adminu i vežu na mjesta u članku.
- **funnel_events** — koraci lijevka vezani uz nacrt ili narudžbu (započet nacrt, korak, pregled, naplata, plaćeno). Bez identifikatora posjetitelja.
- **audit_log** — tko je od admina što promijenio.

## 4. Prava i privatnost

| Podatak | J (anonimno) | Prijavljen, nije član | S | V | A |
|---|---|---|---|---|---|
| Javni objavljeni memorijal | čita | čita | čita, uređuje sadržaj | sve | čita, skriva |
| „Samo s linkom" | samo uz ispravan ključ | samo uz ključ | čita, uređuje | sve | čita, skriva |
| Privatni | ništa | ništa | čita, uređuje | sve | čita, skriva |
| Nacrt | ništa | ništa | ništa | sve | ništa |
| Poruke na čekanju | ništa | ništa | čita | odobrava, skriva | čita, uklanja |
| Privatna pisma | ništa | ništa | samo svoja | samo svoja | ništa |
| Narudžbe | ništa | samo svoje | samo svoje | samo svoje | čita |

- **Jedna funkcija za pristup.** Sve stranice memorijal dohvaćaju kroz isti poslužiteljski modul, koji vraća ili podatke za prikaz ili „ne postoji". Nema drugog puta do memorijala.
- **Javni unosi.** Poruke, svijeće, geste i prijave idu kroz poslužiteljske endpointove: validacija, zaštita od spama, zatim upis. Primatelj obavijesti izvodi se iz `memorials.owner_id`, nikad iz zahtjeva. Anonimna uloga nema pravo upisa ni u jednu od tih tablica.
- **Fotografije.** Jedna privatna pohrana. Slike se poslužuju kroz rutu koja provjerava pristup: za javne memorijale s predmemorijom, za privatne bez nje i samo uz sesiju. Pri učitavanju se briše EXIF (uključujući GPS lokaciju) i generiraju manje inačice.
- **Indeksiranje.** `is_indexable` vrijedi samo za javni objavljeni memorijal s fotografijom i dovoljno teksta (prijedlog: posveta od barem 80 znakova ili priča od barem 100 riječi). Ostali javni dobivaju `noindex`. „Samo s linkom" i privatni nikad nisu u sitemapu, na Livadi, na obiteljskoj stranici ni u OG slici sa sadržajem.
- **Nacrt prije prijave.** Posjetitelj počinje bez računa kao anonimni korisnik Supabasea, pa nacrt i fotografije od prve sekunde štiti isti RLS. Upisom e-maila taj korisnik postaje trajan; link ili kod iz e-maila nastavlja nacrt na bilo kojem uređaju.
- **Prijava bez lozinke** linkom i šesteroznamenkastim kodom. Kod je nužan jer se linkovi iz e-maila u preglednicima unutar Instagrama i Facebooka otvaraju u drugom pregledniku.
- **Spam.** Zamka (honeypot), minimalno vrijeme ispunjavanja, ograničenje učestalosti i provjera Turnstile na javnim obrascima i na anonimnoj prijavi.

## 5. Plaćanje

1. Poslužitelj izračuna košaricu iz `products`, pravila popusta i koda. Klijent šalje samo što kupuje, nikad iznos.
2. Narudžba se upiše kao `pending` sa snimkom cijena, pa se otvara Stripe Checkout s tim iznosima.
3. Ispunjenje radi isključivo webhook nakon provjere potpisa: u jednoj transakciji označi narudžbu plaćenom, stvori prava (`entitlements`), geste ili poklon, upiše donaciju i proviziju partnera.
4. `stripe_events` jamči da ponovljeni događaj ne ispuni narudžbu dvaput. Povrat novca opoziva prava i stornira donaciju i proviziju.
5. Stranica nakon plaćanja ne ispunjava ništa; samo čeka da webhook završi.

Pravila koja treba potvrditi su u odjeljku 11.

Prije plaćanja kupac izričito pristaje da isporuka digitalnog sadržaja počne odmah i potvrđuje da time gubi pravo na jednostrani raskid; vrijeme pristanka sprema se uz narudžbu. Točan članak Zakona o zaštiti potrošača navest ću s izvorom kad budem pisao uvjete, a tekst uvjeta treba pregledati pravnik.

## 6. AI

- **Pomoćnik za priču.** Osam pitanja, zatim nacrt koji vlasnik uređuje. Piše u trećem licu ili iz perspektive vlasnika; nikad u ime ljubimca i nikad ga ne oponaša. To je pravilo u sistemskoj uputi i u testovima.
- **Portret.** Asinkroni posao, rezultat je nova slika s trajnom oznakom „AI portret" na stranici i u metapodacima. Tri portreta po paketu uz ograničen broj ponovnih pokušaja.
- **Privatnost.** Fotografija i odgovori šalju se pružatelju AI-ja samo kad vlasnik pokrene funkciju, uz jasnu napomenu prije slanja.

## 7. Sadržaj i atribucija

- Članci su u bazi (Markdown s malim skupom oznaka za prodajne sekcije i alate). Objava i izmjena iz admina osvježava stranicu bez deploya.
- Alati su komponente u kodu; tekstovi su im u središnjim porukama.
- Upitnik kvalitete života radim prema objavljenim veterinarskim ljestvicama, s navedenim izvorima i napomenom da ne zamjenjuje veterinara. Izvore provjeravam prije izrade, ne iz sjećanja.
- **Atribucija bez kolačića za praćenje.** Poveznica iz članka ili alata nosi oznaku izvora, koja se sprema na nacrt i zatim na narudžbu. Admin tako vidi koji je članak doveo do kupnje, a posjetitelja se ne prati.

## 8. GDPR i kolačići

- Bez pristanka se koriste samo nužni kolačići (sesija, nacrt). Analitika bez kolačića ili tek uz privolu. Ugrađeni video učitava se tek na klik.
- Izvoz i brisanje podataka iz korisničkog računa. Popis izvršitelja obrade u pravilima privatnosti.
- Pravne tekstove (uvjeti, privatnost, kolačići, odustanak, reklamacije) pripremam kao nacrt; prije lansiranja ih treba pregledati pravnik.

## 9. Odvojenost brenda

Zaseban repozitorij, Supabase projekt, Stripe račun, domena, pošiljatelj e-maila, hosting projekt i analitika. Nema zajedničkih identifikatora, poveznica ni kolačića s drugim servisima vlasnika. U kodu, sadržaju i metapodacima ne spominju se drugi servisi.

Jedino što se ne može odvojiti: ako oba servisa vodi ista pravna osoba, njezin naziv mora stajati u uvjetima, na računu i u impresumu.

## 10. Redoslijed izrade

Svaka cjelina završava nečim što se može isprobati, uz popis onoga što radi i onoga što nije provjereno.

| # | Cjelina | Što možeš isprobati | Treba prije početka |
|---|---|---|---|
| 1 | Temelj i besplatni spomen | izrada u tri koraka na mobitelu, nacrt i nastavak e-mailom, jedna fotografija, objava, javna stranica, knjiga sjećanja s moderacijom i prijavom, dnevna svijeća, kartica i OG slika | vizualni smjer, Supabase, hosting, e-mail |
| 2 | Plaćanje i Memorijal | kupnja i nadogradnja u Stripe testnom načinu, popust 30 %, kodovi, donacija u evidenciji, galerija do 50 fotografija, privatnost, video, osobine, vremenska crta, teme | Stripe testni ključevi |
| 3 | Sadržajni sustav i prvi alati | uređivanje članaka i prodajnih sekcija u adminu, kalkulatori godina, prvi članci bez zdravstvenih tema | — |
| 4 | Geste, Livada, obitelj | kupnja više gesta odjednom, Livada s filtrima, sat svijeća, obiteljska stranica | — |
| 5 | Pisma, suradnici, QR, podsjetnici, AI priča, poklon | cijeli tok poklona, pozivanje suradnika, podsjetnici | AI ključ za tekst |
| 6 | Portret | tri AI portreta, spomen-list u PDF-u | pružatelj AI slika |
| 7 | Admin i ostatak sadržaja | prodaja, lijevak, atribucija, partneri, donacije s dokazima, svih 12 članaka i svi alati | pregled veterinara za zdravstvene članke |
| 8 | Lansiranje | pravni tekstovi, izvoz i brisanje podataka, pristupačnost, brzina, produkcijski ključevi | domena, računi, pravnik |

Sadržaj ide rano (cjelina 3) jer mu treba najviše vremena izvan koda: pregled veterinara, tvoje odobrenje i indeksiranje. Članke istražujem usporedno s cjelinama 4–6.

## 11. Pretpostavke o proizvodu koje treba potvrditi

1. Nadogradnja s Memorijala na Memorijal + Portret naplaćuje razliku (10 €).
2. Popust od 30 % i promo ili partnerski kod se ne zbrajaju; primjenjuje se povoljniji. Popust ne vrijedi za poklone.
3. Poruke u knjizi sjećanja objavljuju se nakon vlasnikova odobrenja; vlasnik može uključiti automatsku objavu.
4. Geste se mogu kupiti i na besplatnom spomenu. Nakon isteka ostaju u tihoj arhivi; ne šaljemo e-mailove o isteku ni pozive na obnovu.
5. Sat svijeća: od 21:00 do 22:00 Livada prikazuje svijeće upaljene tog dana od 18:00.
6. Besplatni spomen objavljuje se tek nakon potvrde e-maila; najviše 10 besplatnih po računu radi zaštite od zlouporabe.
7. Donacija od 1 € bilježi se i za poklonjene memorijale, a stornira se pri povratu novca.

## 12. Poznati rizici

- **Sadržaj koji učitavaju korisnici.** Besplatni spomen je uvijek javan, pa netko može učitati neprimjerenu sliku. U MVP-u to pokrivaju potvrđen e-mail, ograničenja, prijava sadržaja i adminovo skrivanje. Automatska provjera slika nije u MVP-u.
- **Izdavanje računa.** Porezna uprava navodi da se od 1. 1. 2026. fiskalizacija računa u krajnjoj potrošnji odnosi na sve načine plaćanja ([izvor](https://porezna-uprava.gov.hr/hr/racuni-u-krajnjoj-potrosnji-azurirano-30-1-2026/8034), pristupljeno 25. 11. 2026.). Kako to riješiti za kartična plaćanja preko Stripea treba potvrditi s knjigovođom prije cjeline 8, a bolje ranije.
- **Trajnost.** Servis obećava trajnu stranicu. Uvjeti moraju reći što se događa ako servis prestane raditi; prijedlog je jamstvo izvoza (PDF i arhiva fotografija).
