/**
 * Pravni tekstovi: uvjeti korištenja, pravila privatnosti i kolačići.
 *
 * SVE JE OVO NACRT. Prije lansiranja tekstove mora pregledati pravnik, a svaku uglatu
 * zagradu ([NAZIV I ADRESA TVRTKE], [OIB]…) treba zamijeniti provjerenim podatkom.
 * U tekstu namjerno nema brojeva članaka ni naziva zakona: dodaje ih pravnik, s izvorom.
 */

/**
 * Dok je `true`, stranice prikazuju oznaku nacrta, nose `noindex` i nisu u sitemapu.
 * Nakon pravnog pregleda postavi na `false`.
 */
export const LEGAL_DRAFT: boolean = true;

export type LegalBlock = string | { readonly list: readonly string[] };

export type LegalSection = {
  readonly heading: string;
  readonly blocks: readonly LegalBlock[];
};

export type LegalDocument = {
  readonly title: string;
  readonly description: string;
  readonly version: string;
  readonly sections: readonly LegalSection[];
  readonly related: readonly { readonly label: string; readonly href: string }[];
};

/** Dijeli tekst na običan dio i mjesta koja još treba popuniti (uglate zagrade), da se mogu istaknuti. */
export function splitPlaceholders(text: string): { text: string; placeholder: boolean }[] {
  return text
    .split(/(\[[^\]]+\])/)
    .filter((part) => part !== "")
    .map((part) => ({ text: part, placeholder: part.startsWith("[") && part.endsWith("]") }));
}

const terms = {
  title: "Uvjeti korištenja",
  description: "Uvjeti korištenja servisa Trag šape: besplatni i plaćeni spomeni, plaćanje, sadržaj i prava korisnika.",
  version: "Nacrt od 25. studenoga 2026. Stupa na snagu: [DATUM STUPANJA NA SNAGU].",
  sections: [
    {
      heading: "1. Tko stoji iza servisa",
      blocks: [
        "Trag šape je internetski servis koji vodi [NAZIV I ADRESA TVRTKE], OIB: [OIB], upisan u [REGISTAR I BROJ UPISA] (dalje: „mi”).",
        "Možeš nam pisati na [KONTAKT E-MAIL].",
      ],
    },
    {
      heading: "2. Što je Trag šape",
      blocks: [
        "Trag šape služi za izradu trajne spomen-stranice kućnog ljubimca kojeg više nema: s fotografijama, posvetom, pričom i knjigom sjećanja u koju obitelj i prijatelji mogu upisati poruku.",
        "Korištenjem servisa prihvaćaš ove uvjete. Ako se s njima ne slažeš, nemoj koristiti servis.",
        "Za izradu računa i kupnju moraš imati najmanje [DOBNA GRANICA] godina.",
      ],
    },
    {
      heading: "3. Račun",
      blocks: [
        "Spomen možeš početi izrađivati bez računa. Nacrt je tada vezan uz preglednik u kojem je započet.",
        "Za objavu spomena potrebno je potvrditi e-mail adresu. Prijava je bez lozinke: na e-mail ti šaljemo poveznicu i jednokratni kod.",
        "Čuvaj pristup svom e-mailu: tko može otvoriti tvoj e-mail, može se prijaviti i u tvoj račun.",
        "Radi zaštite od zlouporabe broj besplatnih spomena po računu je ograničen (trenutačno 10).",
        "Spomen možeš u svakom trenutku povući iz objave ili obrisati, a možeš obrisati i cijeli račun.",
      ],
    },
    {
      heading: "4. Besplatni spomen",
      blocks: [
        "Besplatni spomen sadrži: ime, vrstu, pasminu i datume, jednu fotografiju, posvetu do 300 znakova, knjigu sjećanja koju moderiraš, mjesto na Livadi sjećanja i karticu za dijeljenje.",
        "Besplatni spomen je uvijek javan: može ga vidjeti svatko, a mogu ga pronaći i tražilice.",
        "Besplatni spomen ostaje besplatan. Ne tražimo karticu i ne naplaćujemo ga naknadno.",
      ],
    },
    {
      heading: "5. Plaćeni paketi, geste i poklon",
      blocks: [
        "Memorijal dodaje: do 50 fotografija, poveznicu na video, životnu priču (uz AI pomoćnika), osobine i omiljene stvari, vremensku crtu, pisma ljubimcu, izbor privatnosti, suradnike iz obitelji, QR kod, e-mail podsjetnike i teme.",
        "Memorijal + Portret uz sve to sadrži tri AI portreta izrađena iz fotografije i spomen-list za ispis (PDF).",
        "Geste su virtualni znakovi pažnje (svijeća, šapica, cvijet, poslastica ili loptica) s imenom i porukom. Gesta je vidljiva na spomenu tijekom razdoblja odabranog pri kupnji: 7 dana, 30 dana ili godinu dana.",
        "Vlasnik spomena odlučuje što se na spomenu prikazuje, pa može sakriti gestu ili njezinu poruku. [PRAVILO O POVRATU NOVCA ZA SKRIVENU GESTU]",
        "Poklon: memorijal možeš platiti za drugu osobu. Primatelj dobiva e-mail s tvojom osobnom porukom i poveznicom kojom preuzima poklon. Upisom e-mail adrese primatelja potvrđuješ da mu smijemo poslati tu poruku.",
        "Važeće cijene su na stranici Cjenik i izražene su u eurima. [NAPOMENA O PDV-U]",
        "Svaki sljedeći plaćeni memorijal na istom računu ima popust naveden u cjeniku.",
        "Od svakog plaćenog memorijala dio iznosa ide azilu za životinje. Evidencija je javna na stranici Donacije.",
        "[PRIJE LANSIRANJA USKLADITI: popis mogućnosti mora odgovarati onome što je u tom trenutku stvarno dostupno]",
      ],
    },
    {
      heading: "6. Plaćanje",
      blocks: [
        "Sva plaćanja su jednokratna. Nema pretplate ni automatske obnove.",
        "Plaćaš tek nakon što pregledaš spomen, i samo ako želiš više od besplatnog spomena.",
        "Kartično plaćanje obrađuje Stripe. Podatke o kartici upisuješ na njegovoj stranici; mi ih ne vidimo i ne spremamo.",
        "Plaćeni sadržaj postaje dostupan kad od Stripea zaprimimo potvrdu plaćanja, obično unutar nekoliko trenutaka.",
        "Račun za kupnju: [NAČIN IZDAVANJA I DOSTAVE RAČUNA].",
      ],
    },
    {
      heading: "7. Digitalni sadržaj i pravo na jednostrani raskid ugovora",
      blocks: [
        "Plaćeni paketi, pokloni i geste su digitalni sadržaj koji se ne isporučuje na fizičkom mediju. Isporuka počinje odmah nakon plaćanja.",
        "Potrošač koji kupuje na daljinu u pravilu može jednostrano raskinuti ugovor u roku od [ROK ZA JEDNOSTRANI RASKID], bez navođenja razloga. Kod digitalnog sadržaja to pravo prestaje ako isporuka počne uz tvoj prethodni izričit pristanak i tvoju potvrdu da znaš da ga time gubiš.",
        "Zato te prije plaćanja tražimo dvije stvari: izričit pristanak da isporuka počne odmah i potvrdu da znaš da time gubiš pravo na jednostrani raskid ugovora. Bez toga kupnju nije moguće dovršiti.",
        "Vrijeme pristanka spremamo uz narudžbu. [POTVRDA UGOVORA I PRISTANKA NA TRAJNOM MEDIJU, npr. e-mail nakon kupnje]",
        "Prije plaćanja možeš odustati u svakom trenutku: ništa se ne naplaćuje, a nacrt ostaje spremljen.",
        "[OBRAZAC I UPUTE ZA JEDNOSTRANI RASKID, ako su primjenjivi]",
      ],
    },
    {
      heading: "8. Povrat novca",
      blocks: [
        "Ako ti vratimo novac za plaćeni paket, prava iz tog paketa prestaju. Spomen se tada vraća na besplatni paket i u nacrt, kako sadržaj koji je bio privatan ne bi postao javan bez tvoje odluke. Možeš ga ponovno objaviti kao besplatni spomen.",
        "Povratom novca za gestu gesta se uklanja sa spomena.",
        "Donacija azilu vezana uz vraćenu kupnju se stornira.",
        "[UVJETI I ROKOVI POVRATA NOVCA]",
      ],
    },
    {
      heading: "9. Prigovori i reklamacije",
      blocks: [
        "Ako nešto ne radi kako je opisano ili imaš prigovor na uslugu, piši nam na [KONTAKT E-MAIL] ili poštom na adresu [NAZIV I ADRESA TVRTKE]. Navedi e-mail adresu računa i, ako ga imaš, broj narudžbe.",
        "Na pisani prigovor odgovaramo u roku od [ROK ZA ODGOVOR NA PRIGOVOR].",
        "Za nedostatke digitalnog sadržaja odgovaramo prema propisima o zaštiti potrošača. [ODGOVORNOST ZA NEDOSTATKE DIGITALNOG SADRŽAJA: formulaciju potvrditi s pravnikom]",
        "Spor možeš pokušati riješiti i izvansudski: [TIJELO ZA IZVANSUDSKO RJEŠAVANJE POTROŠAČKIH SPOROVA].",
      ],
    },
    {
      heading: "10. Tvoj sadržaj",
      blocks: [
        "Tekstovi i fotografije koje učitaš ostaju tvoji. Daješ nam neisključivo, besplatno pravo da ih pohranimo, obradimo (primjerice smanjimo fotografiju) i prikažemo prema tvojim postavkama: na spomenu, na Livadi sjećanja i na kartici za dijeljenje. To pravo traje dok sadržaj ne obrišeš.",
        "Objavljuj samo ono na što imaš pravo: svoje fotografije i tekstove ili one za koje imaš dopuštenje autora.",
        "Nije dopušteno objavljivati:",
        {
          list: [
            "sadržaj koji vrijeđa, prijeti, uznemirava ili potiče mržnju",
            "tuđe fotografije i tekstove bez dopuštenja",
            "osobne podatke drugih ljudi bez njihova pristanka",
            "oglase, neželjene poruke i poveznice kojima je svrha prevara",
            "prikaze okrutnosti prema životinjama",
            "sadržaj koji nema veze sa sjećanjem na ljubimca",
            "bilo što protivno zakonu",
          ],
        },
        "Isto vrijedi za poruke u knjizi sjećanja i za poruke uz geste.",
      ],
    },
    {
      heading: "11. Knjiga sjećanja",
      blocks: [
        "Poruke posjetitelja objavljuju se nakon što ih vlasnik spomena odobri, osim ako vlasnik uključi objavu bez odobrenja. Vlasnik može svaku poruku sakriti.",
        "Tko ostavlja poruku, odgovara za njezin sadržaj.",
      ],
    },
    {
      heading: "12. Prijava i uklanjanje sadržaja",
      blocks: [
        "Svatko može prijaviti spomen, fotografiju, poruku ili gestu koji krše ove uvjete ili nečija prava: poveznicom za prijavu na stranici spomena ili e-mailom na [KONTAKT E-MAIL].",
        "Prijave pregledavamo u roku od [ROK ZA OBRADU PRIJAVE]. Sadržaj koji krši uvjete možemo sakriti ili ukloniti, a kod teških ili ponovljenih kršenja zatvoriti račun.",
        "Kad sakrijemo ili uklonimo sadržaj, vlasniku javljamo što smo učinili i zašto, osim ako nam to zakon brani. Ako misliš da smo pogriješili, odgovori na tu poruku i pogledat ćemo ponovno.",
        "[POSTUPAK PRIJAVE I PRIGOVORA NA ODLUKU: uskladiti s propisima o digitalnim uslugama]",
      ],
    },
    {
      heading: "13. Privatnost spomena",
      blocks: [
        "Besplatni spomen je uvijek javan.",
        "Na plaćenim paketima biraš: javno, samo s poveznicom ili privatno. Spomen „samo s poveznicom” vidi svatko tko ima poveznicu, pa je dijeli samo s onima kojima vjeruješ.",
        "Spomene „samo s poveznicom” i privatne spomene ne prikazujemo na Livadi sjećanja i ne prijavljujemo ih tražilicama.",
        "Kako obrađujemo osobne podatke, piše u Pravilima privatnosti.",
      ],
    },
    {
      heading: "14. AI pomoćnik i AI portret",
      blocks: [
        "AI pomoćnik pomaže ti pronaći riječi za priču. Nikad ne piše u ime ljubimca. Nacrt koji predloži pregledaj i uredi; za objavljeni tekst odgovaraš ti.",
        "AI portret izrađuje se iz fotografije koju odabereš. Uvijek je označen kao AI, a izvorna fotografija ostaje netaknuta.",
        "Odgovore i fotografiju šaljemo pružatelju AI usluge tek kad ti pokreneš tu funkciju, uz napomenu prije slanja.",
      ],
    },
    {
      heading: "15. Trajnost i prestanak rada servisa",
      blocks: [
        "Spomen-stranice radimo da traju i namjeravamo ih održavati dugoročno.",
        "Ne možemo obećati da će servis postojati zauvijek. Zato se obvezujemo: ako ikad odlučimo prestati s radom, javit ćemo ti e-mailom najmanje [ROK NAJAVE PRESTANKA RADA] unaprijed i u tom ti razdoblju omogućiti da preuzmeš sadržaj svojih spomena: tekstove, fotografije i poruke iz knjige sjećanja. [OBLIK IZVOZA, npr. PDF i arhiva fotografija]",
        "Isti izvoz možeš zatražiti i dok servis radi.",
      ],
    },
    {
      heading: "16. Dostupnost i odgovornost",
      blocks: [
        "Trudimo se da servis radi stalno i ispravno, ali ne možemo jamčiti rad bez prekida. Povremeno ga moramo zaustaviti radi održavanja.",
        "Za sadržaj spomena i poruka odgovaraju osobe koje su ga objavile.",
        "[OGRANIČENJE ODGOVORNOSTI: formulaciju potvrditi s pravnikom]",
        "Ništa u ovim uvjetima ne umanjuje prava koja kao potrošač imaš prema prisilnim propisima.",
      ],
    },
    {
      heading: "17. Izmjene uvjeta",
      blocks: [
        "Uvjete možemo mijenjati, primjerice kad dodamo novu mogućnost ili kad se promijene propisi. Datum zadnje izmjene piše na vrhu.",
        "O bitnim izmjenama javljamo e-mailom ili obaviješću na stranici najmanje [ROK NAJAVE IZMJENA] prije nego što počnu vrijediti.",
      ],
    },
    {
      heading: "18. Mjerodavno pravo i sporovi",
      blocks: ["Na ove uvjete primjenjuje se [MJERODAVNO PRAVO]. Za sporove je nadležan [NADLEŽNI SUD]."],
    },
    {
      heading: "19. Kontakt",
      blocks: ["[NAZIV I ADRESA TVRTKE], e-mail: [KONTAKT E-MAIL]."],
    },
  ],
  related: [
    { label: "Pravila privatnosti", href: "/privatnost" },
    { label: "Kolačići", href: "/kolacici" },
    { label: "Cjenik", href: "/cjenik" },
    { label: "Donacije", href: "/donacije" },
  ],
} as const satisfies LegalDocument;

const privacy = {
  title: "Pravila privatnosti",
  description: "Koje podatke Trag šape obrađuje, zašto, tko ih još vidi i koja su tvoja prava.",
  version: "Nacrt od 25. studenoga 2026. Stupa na snagu: [DATUM STUPANJA NA SNAGU].",
  sections: [
    {
      heading: "1. Tko obrađuje tvoje podatke",
      blocks: [
        "Voditelj obrade je [NAZIV I ADRESA TVRTKE], OIB: [OIB]. Za sva pitanja o osobnim podacima piši na [KONTAKT E-MAIL].",
        "[SLUŽBENIK ZA ZAŠTITU PODATAKA, ako je imenovan]",
      ],
    },
    {
      heading: "2. Ukratko",
      blocks: [
        {
          list: [
            "Prikupljamo samo ono što je potrebno da spomen radi.",
            "Ne prodajemo podatke i ne prikazujemo oglase.",
            "Ne koristimo kolačiće za praćenje.",
            "IP adrese ne spremamo u svoju bazu; koristimo sažetak koji se svaki dan mijenja.",
            "Podatke o kartici ne vidimo; plaćanje obrađuje Stripe.",
          ],
        },
      ],
    },
    {
      heading: "3. Koje podatke obrađujemo",
      blocks: [
        {
          list: [
            "Račun: e-mail adresa i, ako ga upišeš, ime za prikaz. Dok ne upišeš e-mail, nacrt se vodi pod privremenim računom bez e-mail adrese.",
            "Spomen: sve što upišeš i učitaš, dakle ime ljubimca, vrsta, pasmina, datumi, posveta, priča, osobine, vremenska crta, pisma, poveznica na video i fotografije. Pri učitavanju s fotografije uklanjamo metapodatke (EXIF), uključujući lokaciju.",
            "Knjiga sjećanja: ime koje posjetitelj upiše i poruka. E-mail adresa je neobavezna i nikad se ne prikazuje.",
            "Geste: ime za prikaz i poruka te e-mail adresa kupca.",
            "Besplatna svijeća: ne bilježimo tko ju je upalio, samo dnevni sažetak izračunat iz IP adrese i oznake preglednika, koji sprječava da se ista svijeća broji više puta.",
            "Narudžbe: e-mail adresa, što je kupljeno, iznos, vrijeme kupnje, vrijeme pristanka na početak isporuke i oznaka plaćanja koju dodjeljuje Stripe.",
            "Poklon: ime kupca, ime i e-mail adresa primatelja te osobna poruka.",
            "Suradnici: e-mail adresa osobe koju pozoveš da uređuje spomen s tobom.",
            "Prijave sadržaja: razlog i opis prijave te, ako je ostaviš, e-mail adresa.",
            "Podsjetnici: datumi iz spomena (rođendan, dan udomljenja, godišnjica) i tvoj izbor podsjetnika.",
            "Newsletter: e-mail adresa, stranica na kojoj si se prijavio, tekst privole koju si potvrdio i vremena prijave, potvrde i odjave. Prijava vrijedi tek kad je potvrdiš gumbom iz e-maila.",
            "Velika livada: ime ljubimca, vrsta i boja cvijeta te e-mail adresa na koju šaljemo potvrdu, tekst privole i vrijeme potvrde. Trag postaje vidljiv tek kad ga potvrdiš gumbom iz e-maila; nepotvrđeni trag brišemo nakon 7 dana. Ako uz trag označiš i newsletter, potvrda traga potvrđuje i tu prijavu.",
            "Zaštita od zlouporabe: umjesto IP adrese spremamo njezin sažetak izračunat uz tajni dodatak koji se mijenja svaki dan. Iz sažetka se IP adresa ne može vratiti, a isti posjetitelj sljedeći dan ima drugi sažetak.",
            "Put do kupnje: bilježimo korake izrade (započet nacrt, pregled, naplata, plaćeno) i koja je naša stranica, primjerice članak, dovela do izrade. To je vezano uz nacrt ili narudžbu, bez identifikatora posjetitelja.",
            "Tehnički zapisi: pružatelji hostinga i baze mogu u svojim sigurnosnim zapisima kratkotrajno bilježiti IP adrese zahtjeva. [ROKOVI ČUVANJA TEHNIČKIH ZAPISA KOD PRUŽATELJA]",
          ],
        },
      ],
    },
    {
      heading: "4. Zašto ih obrađujemo i na temelju čega",
      blocks: [
        {
          list: [
            "Izvršenje ugovora: vođenje računa, izrada i prikaz spomena, isporuka plaćenih paketa, gesta i poklona te slanje podsjetnika koje uključiš.",
            "Legitimni interes: zaštita od neželjenih poruka i zlouporabe, moderiranje i obrada prijava, sigurnost servisa te razumijevanje gdje ljudi u izradi zapinju, bez praćenja pojedinca.",
            "Zakonska obveza: izdavanje i čuvanje računa te odgovori nadležnim tijelima.",
            "Privola: samo ondje gdje je izričito zatražimo, primjerice za newsletter. Možeš je povući u svakom trenutku; za newsletter poveznicom za odjavu u svakom e-mailu.",
          ],
        },
        "[PRAVNE OSNOVE PO SVRHAMA: potvrditi s pravnikom]",
      ],
    },
    {
      heading: "5. Što je javno",
      blocks: [
        "Javni spomen može vidjeti svatko, a mogu ga pronaći i tražilice. Javni spomeni prikazuju se i na Livadi sjećanja.",
        "Poruke u knjizi sjećanja vide se uz ime koje je autor upisao, nakon odobrenja vlasnika spomena. Uz gestu se vide ime i poruka.",
        "Na Velikoj livadi vide se ime ljubimca, vrsta, boja cvijeta, broj i datum traga. E-mail adresa se nikad ne prikazuje. Ako želiš da trag uklonimo, javi nam se s adrese na koju je stigla potvrda.",
        "U spomen i poruke ne upisuj osobne podatke drugih ljudi.",
        "Spomene „samo s poveznicom” i privatne spomene ne prikazujemo na Livadi sjećanja i ne prijavljujemo ih tražilicama.",
      ],
    },
    {
      heading: "6. Tko još obrađuje podatke",
      blocks: [
        "Za rad servisa koristimo pružatelje usluga koji podatke obrađuju po našim uputama:",
        {
          list: [
            "baza podataka, prijava i pohrana fotografija, u Europskoj uniji (Frankfurt)",
            "hosting aplikacije, u Europskoj uniji (Frankfurt)",
            "plaćanje: Stripe",
            "slanje e-mailova (prijava, obavijesti, podsjetnici, poklon, newsletter)",
            "zaštita javnih obrazaca od automatiziranih prijava, ako je uključena",
            "AI usluge za tekst i slike, samo kad pokreneš AI pomoćnika ili izradu portreta",
          ],
        },
        "[POPIS IZVRŠITELJA OBRADE S NAZIVIMA I SJEDIŠTIMA]",
        "[PRIJENOS PODATAKA IZVAN EUROPSKOG GOSPODARSKOG PROSTORA I ZAŠTITNE MJERE]",
        "Podatke ne dajemo nikome drugome, osim kad nas na to obvezuje zakon.",
      ],
    },
    {
      heading: "7. AI funkcije",
      blocks: [
        "Odgovore na pitanja o ljubimcu i fotografiju koju odabereš šaljemo pružatelju AI usluge tek kad pokreneš AI pomoćnika ili izradu portreta. Prije slanja to jasno piše na zaslonu.",
        "[PRUŽATELJ AI USLUGE, ROK ČUVANJA I KORIŠTENJE PODATAKA ZA UČENJE MODELA]",
      ],
    },
    {
      heading: "8. Koliko dugo čuvamo podatke",
      blocks: [
        {
          list: [
            "Račun i spomene čuvamo dok ih ne obrišeš.",
            "E-mail adresu za newsletter čuvamo dok se ne odjaviš. Nepotvrđenu prijavu brišemo nakon [ROK BRISANJA NEPOTVRĐENIH PRIJAVA].",
            "Nakon brisanja podaci se uklanjaju iz servisa, a iz sigurnosnih kopija u roku od [ROK BRISANJA IZ SIGURNOSNIH KOPIJA].",
            "Nacrte započete bez e-mail adrese brišemo nakon [ROK BRISANJA NEDOVRŠENIH NACRTA].",
            "Podatke o narudžbama i račune čuvamo koliko propisi nalažu: [ZAKONSKI ROK ČUVANJA RAČUNA].",
            "Dnevne sažetke za zaštitu od zlouporabe čuvamo [ROK ČUVANJA SAŽETAKA].",
          ],
        },
      ],
    },
    {
      heading: "9. Tvoja prava",
      blocks: [
        "Imaš pravo na pristup podacima, ispravak, brisanje, ograničenje obrade, prijenos podataka i prigovor na obradu koja se temelji na legitimnom interesu.",
        "Izvoz i brisanje podataka pokrećeš u svom računu. Za sve ostalo, ili ako ti to ne uspije, piši na [KONTAKT E-MAIL]. Odgovaramo u roku od [ROK ZA ODGOVOR NA ZAHTJEV].",
        "Ako smatraš da podatke obrađujemo protivno propisima, možeš podnijeti pritužbu nadzornom tijelu: [NAZIV I KONTAKT NADZORNOG TIJELA].",
        "Ako je netko o tebi nešto objavio na spomenu ili u poruci, prijavi to poveznicom za prijavu na toj stranici ili na isti e-mail.",
      ],
    },
    {
      heading: "10. Djeca",
      blocks: ["Servis nije namijenjen osobama mlađima od [DOBNA GRANICA] godina."],
    },
    {
      heading: "11. Sigurnost",
      blocks: [
        {
          list: [
            "Svaki upit u bazu prolazi provjeru prava u samoj bazi, pa tuđe nacrte i privatne spomene ne mogu čitati drugi korisnici ni posjetitelji.",
            "Privatni spomen vide vlasnik i suradnici koje pozove. Naš administrator može mu pristupiti samo radi moderiranja i podrške. Privatna pisma vidi samo njihov autor.",
            "Fotografije su u privatnoj pohrani i poslužuju se tek nakon provjere pristupa.",
            "Veza sa servisom je šifrirana (HTTPS).",
          ],
        },
      ],
    },
    {
      heading: "12. Izmjene ovih pravila",
      blocks: [
        "Pravila možemo mijenjati kad se promijeni servis ili propisi. Datum zadnje izmjene piše na vrhu, a o bitnim izmjenama javljamo e-mailom ili obaviješću na stranici.",
      ],
    },
    {
      heading: "13. Kontakt",
      blocks: ["[NAZIV I ADRESA TVRTKE], e-mail: [KONTAKT E-MAIL]."],
    },
  ],
  related: [
    { label: "Kolačići", href: "/kolacici" },
    { label: "Uvjeti korištenja", href: "/uvjeti" },
  ],
} as const satisfies LegalDocument;

const cookies = {
  title: "Kolačići",
  description: "Trag šape koristi samo kolačiće nužne za prijavu i spremanje nacrta. Bez praćenja.",
  version: "Nacrt od 25. studenoga 2026.",
  sections: [
    {
      heading: "1. Ukratko",
      blocks: [
        "Koristimo samo kolačiće bez kojih stranica ne može raditi: za prijavu i za spremanje nacrta. Ne koristimo kolačiće za praćenje, oglašavanje ni analitiku.",
        "Zato ne prikazujemo upit za privolu, nego samo obavijest. [POTVRDITI S PRAVNIKOM: izuzeće nužnih kolačića od privole]",
      ],
    },
    {
      heading: "2. Koje kolačiće postavljamo",
      blocks: [
        {
          list: [
            "Sesija (nazivi počinju sa „sb-”): pamti tvoju prijavu i čuva pristup tvojim spomenima. Trajanje: [TRAJANJE KOLAČIĆA SESIJE].",
            "Nacrt: dok još nema upisane e-mail adrese, isti kolačić sesije veže nacrt uz tvoj preglednik, pa ga možeš nastaviti. [NAZIV I TRAJANJE DODATNOG KOLAČIĆA NACRTA, ako postoji]",
          ],
        },
        "To su kolačići prve strane: postavlja ih samo ova stranica.",
      ],
    },
    {
      heading: "3. Lokalna pohrana",
      blocks: [
        "U lokalnu pohranu preglednika spremamo jedan zapis („trag-sape-kolacici”) koji pamti da je obavijest o kolačićima zatvorena. Ne sadrži osobne podatke.",
      ],
    },
    {
      heading: "4. Plaćanje",
      blocks: [
        "Plaćanje se obavlja na stranici Stripea. Ondje vrijede Stripeova pravila i njegovi kolačići, potrebni za sigurnu obradu plaćanja.",
      ],
    },
    {
      heading: "5. Ugrađeni video",
      blocks: [
        "Video na spomenu učitava se tek kad ga pokreneš. Do tada se s vanjskog servisa ne dohvaća ništa i on ne postavlja kolačiće. Nakon pokretanja vrijede pravila servisa na kojem je video objavljen.",
      ],
    },
    {
      heading: "6. Zaštita obrazaca",
      blocks: [
        "Na javnim obrascima može se učitati provjera vanjskog pružatelja koja razlikuje ljude od automatiziranih prijava. [KOLAČIĆI I PODACI TE PROVJERE: upisati kad se uključi]",
      ],
    },
    {
      heading: "7. Analitika",
      blocks: [
        "Posjete ne mjerimo alatima koji koriste kolačiće. Ako to ikad uvedemo, bit će samo uz tvoju privolu, a ova će stranica biti dopunjena.",
      ],
    },
    {
      heading: "8. Kako obrisati kolačiće",
      blocks: [
        "Kolačiće možeš obrisati ili blokirati u postavkama preglednika. Bez kolačića sesije prijava i spremanje nacrta ne rade.",
        "Ako je nacrt započet bez e-mail adrese, upiši e-mail prije brisanja kolačića. Inače nacrtu više nećeš moći pristupiti.",
      ],
    },
    {
      heading: "9. Kontakt",
      blocks: ["Pitanja o kolačićima šalji na [KONTAKT E-MAIL]."],
    },
  ],
  related: [
    { label: "Pravila privatnosti", href: "/privatnost" },
    { label: "Uvjeti korištenja", href: "/uvjeti" },
  ],
} as const satisfies LegalDocument;

export const legal = {
  draftNotice: "Nacrt — čeka pravni pregled prije lansiranja.",
  relatedTitle: "Povezano",
  terms,
  privacy,
  cookies,
} as const;
