/**
 * Tekstovi javnih stranica: naslovnica, cjenik i donacije.
 * Vitičaste zagrade ({price}, {amount}, {pct}, {shelter}) popunjava `fill` iz `@/lib/text`;
 * iznosi i postoci uvijek dolaze iz baze, nikad iz ovog teksta.
 */
export const marketing = {
  home: {
    hero: {
      eyebrow: "Spomen-stranica za ljubimca",
      title: "Spomen koji čuva priču tvog ljubimca",
      promise:
        "Stranica s fotografijom, posvetom i knjigom sjećanja za ljubimca kojeg više nema; osnovni spomen je besplatan i takav ostaje.",
      primaryCta: "Izradi besplatni spomen",
      secondaryCta: "Pogledaj primjer",
      note: "Počinješ bez računa i bez kartice.",
    },
    steps: {
      title: "Kako to ide",
      intro: "Tri koraka, svojim tempom.",
      items: [
        {
          title: "Ljubimac",
          body: "Upiši ime, vrstu i datume koje znaš. Ako se točnog dana ne možeš sjetiti, dovoljni su mjesec ili godina.",
        },
        {
          title: "Priča i fotografije",
          body: "Dodaj fotografiju i posvetu: nekoliko rečenica o onome što pamtiš.",
        },
        {
          title: "Pregled i objava",
          body: "Prvo vidiš kako stranica izgleda. Objavljuješ je tek kad ti odgovara.",
        },
      ],
      paymentNote: "Plaćanje dolazi tek nakon pregleda, i samo ako želiš više od besplatnog spomena.",
    },
    free: {
      eyebrow: "Besplatno",
      title: "Što sadrži besplatni spomen",
      items: [
        "Ime, vrsta, pasmina i datumi",
        "Jedna fotografija",
        "Posveta do 300 znakova",
        "Knjiga sjećanja: poruke obitelji i prijatelja, koje ti odobravaš",
        "Mjesto na Livadi sjećanja, zajedničkoj livadi javnih spomena",
        "Kartica za dijeljenje",
      ],
      note: "Besplatni spomen je uvijek javan i ostaje besplatan.",
    },
    memorial: {
      eyebrow: "Memorijal",
      title: "Kad želiš ispričati više",
      body: "Memorijal daje prostor za cijelu priču i za odluku tko je smije vidjeti.",
      items: [
        "Do 50 fotografija i poveznica na video",
        "Životna priča, uz pomoćnika koji ti pomaže naći riječi",
        "Vremenska crta i pisma ljubimcu",
        "Privatnost: javno, samo s poveznicom ili privatno",
      ],
      price: "{price} jednokratno, bez pretplate.",
      cta: "Pogledaj cjenik",
    },
    gestures: {
      eyebrow: "Geste",
      title: "Svijeća, šapica, cvijet",
      candle: "Svaki posjetitelj može jednom dnevno upaliti besplatnu svijeću. Ona se samo broji.",
      paid: "Tko želi ostaviti nešto s imenom i porukom, može odabrati gestu. Ona ostaje na spomenu 7 dana, 30 dana ili godinu dana.",
      price: "Geste su od {price}.",
      kinds: {
        candle: "Svijeća",
        paw: "Šapica",
        flower: "Cvijet",
        treat: "Poslastica",
        ball: "Loptica",
      },
    },
    gift: {
      eyebrow: "Poklon",
      title: "Za prijatelja koji se oprašta",
      body: "Možeš platiti memorijal za nekoga tko tuguje. Na e-mail dobiva tvoju osobnu poruku i poveznicu.",
      cta: "Pokloni memorijal",
    },
    donation: {
      eyebrow: "Donacija",
      title: "Dio svakog memorijala ide azilu",
      body: "Od svakog plaćenog memorijala {amount} ide azilu za životinje.",
      shelterSet: "Trenutačno je to {shelter}.",
      shelterPending:
        "Azil još nije odabran; objavit ćemo ga čim bude. Do tada se svaki iznos bilježi, a zbroj je javan.",
      cta: "Pogledaj donacije",
    },
    closing: {
      title: "Počni s imenom",
      body: "Ostalo može pričekati. Nacrt se sprema, pa možeš stati i vratiti se.",
      cta: "Izradi besplatni spomen",
    },
  },

  pricing: {
    metaTitle: "Cjenik",
    metaDescription:
      "Besplatni spomen i plaćeni paketi za više fotografija, priču i privatnost. Sva plaćanja su jednokratna, bez pretplate.",
    title: "Cjenik",
    intro: "Osnovni spomen je besplatan. Tko želi više prostora za priču, plaća jednom. Pretplate nema.",
    tiersTitle: "Paketi",
    oneOff: "jednokratno",
    machine: {
      title: "Cjenik i bazne cijene",
      baseNote: "Bazna cijena je cijena na dan kad je usluga stavljena u ponudu. Ističemo je uz svaku cijenu, kako traži Zakon o zaštiti potrošača.",
      current: "Važeći cjenik u CSV obliku",
      archiveTitle: "Prethodni cjenici ({count})",
      archiveNote: "Dostupni su 15 dana nakon zamjene.",
      archiveItem: "Vrijedio do {date}",
    },
    payAfterPreview: "Paket biraš i plaćaš tek nakon pregleda.",
    tiers: {
      free: {
        name: "Besplatni spomen",
        priceNote: "bez kartice",
        lead: "Sadrži:",
        features: [
          "Ime, vrsta, pasmina i datumi",
          "Jedna fotografija",
          "Posveta do 300 znakova",
          "Knjiga sjećanja koju moderiraš",
          "Mjesto na Livadi sjećanja",
          "Kartica za dijeljenje",
        ],
        note: "Uvijek javan.",
        cta: "Izradi besplatni spomen",
      },
      memorial: {
        name: "Memorijal",
        lead: "Sve iz besplatnog spomena, i:",
        features: [
          "Do 50 fotografija",
          "Poveznica na video",
          "Životna priča, uz AI pomoćnika koji ti pomaže naći riječi i nikad ne piše u ime ljubimca",
          "Osobine i omiljene stvari",
          "Vremenska crta",
          "Pisma ljubimcu",
          "Privatnost: javno, samo s poveznicom ili privatno",
          "Obitelj kao suradnici",
          "QR kod",
          "E-mail podsjetnici: rođendan, dan udomljenja, godišnjica",
          "Teme",
        ],
        cta: "Počni izradu",
      },
      portrait: {
        name: "Memorijal + Portret",
        lead: "Sve iz Memorijala, i:",
        features: [
          "Tri umjetnička AI portreta izrađena iz fotografije; uvijek su označena kao AI, a izvorna fotografija ostaje netaknuta",
          "Spomen-list za ispis (PDF)",
        ],
        cta: "Počni izradu",
      },
    },
    gestures: {
      title: "Geste",
      body: "Svijeća, šapica, cvijet, poslastica ili loptica, s imenom i porukom. Gesta ostaje na spomenu onoliko koliko odabereš.",
      durations: {
        gesture_7d: "7 dana",
        gesture_30d: "30 dana",
        gesture_365d: "Godinu dana",
      },
      freeCandle: "Besplatno: svaki posjetitelj može jednom dnevno upaliti svijeću. Ona se samo broji.",
    },
    gift: {
      title: "Poklon",
      body: "Memorijal možeš platiti za prijatelja koji tuguje. Na e-mail dobiva tvoju osobnu poruku i poveznicu.",
      cta: "Pokloni memorijal",
    },
    repeat: {
      title: "Više ljubimaca",
      body: "Svaki sljedeći plaćeni memorijal na istom računu ima {pct}\u00a0% popusta.",
    },
    donation: {
      title: "Donacija azilu",
      body: "Od svakog plaćenog memorijala {amount} ide azilu za životinje.",
      shelterSet: "Trenutačno je to {shelter}.",
      shelterPending:
        "Azil još nije odabran; objavit ćemo ga čim bude. Do tada se svaki iznos bilježi, a zbroj je javan.",
      cta: "Pogledaj donacije",
    },
    faq: {
      title: "Česta pitanja",
      items: [
        {
          question: "Plaća li se jednom ili svaki mjesec?",
          answer: "Jednom. Sva plaćanja su jednokratna; nema pretplate ni automatske obnove.",
          link: null,
        },
        {
          question: "Što ako odustanem?",
          answer:
            "Prije plaćanja možeš odustati kad god želiš i ništa se ne naplaćuje; plaćanje dolazi tek nakon pregleda. Što vrijedi nakon kupnje, piše u uvjetima korištenja.",
          link: { label: "Uvjeti korištenja", href: "/uvjeti" },
        },
        {
          question: "Može li spomen ostati besplatan zauvijek?",
          answer: "Može. Besplatni spomen ostaje besplatan i ne moraš ga nikad nadograditi.",
          link: null,
        },
      ],
    },
  },

  donations: {
    metaTitle: "Donacije",
    metaDescription: "Javna evidencija donacija azilu za životinje: koliko je prikupljeno i koliko isplaćeno.",
    title: "Donacije",
    intro:
      "Od svakog plaćenog memorijala {amount} ide azilu za životinje. Ovdje je javna evidencija: koliko se skupilo i što je isplaćeno.",
    introNoAmount: "Ovdje je javna evidencija donacija azilu za životinje: koliko se skupilo i što je isplaćeno.",
    totalsTitle: "Stanje",
    accrued: "Prikupljeno do sada",
    paidOut: "Isplaćeno",
    shelterTitle: "Kome ide",
    shelterSet: "Donacije trenutačno idu azilu:",
    shelterPending:
      "Azil još nije odabran. Objavit ćemo ga ovdje čim bude dogovoren. Do tada se svaki iznos bilježi i čeka isplatu.",
    payoutsTitle: "Isplate",
    payoutsEmpty: "Još nema isplata. Svaka će biti objavljena ovdje, s datumom i iznosom.",
    proof: "Potvrda o uplati",
    howTitle: "Kako se računa",
    how: [
      "Donacija se bilježi kad je memorijal plaćen.",
      "Ako se kupnja vrati, stornira se i ta donacija.",
      "Isplate objavljujemo ovdje nakon što su izvršene.",
    ],
  },
} as const;
