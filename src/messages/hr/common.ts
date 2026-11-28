/** Zajednički tekstovi: navigacija, podnožje, opće poruke. */
export const common = {
  brand: "Trag šape",
  tagline: "Trag koji ostaje.",
  /** Slika koja se prikazuje kad netko podijeli poveznicu na stranicu bez vlastite slike. */
  social: {
    subtitle: "Spomen-stranica za tvog ljubimca",
    alt: "Trag šape: spomen-stranica za tvog ljubimca",
  },
  /** Bazna cijena: cijena na dan kad je usluga stavljena u ponudu (ZZP čl. 7.). Ističe se uz svaku cijenu. */
  price: {
    base: "Bazna cijena: {amount}",
  },
  nav: {
    create: "Izradi spomen",
    createShort: "Izradi",
    myPets: "Moji ljubimci",
    meadow: "Livada sjećanja",
    pricing: "Cjenik",
    example: "Primjer",
    guide: "Vodič",
    tools: "Alati",
    home: "Početna",
    menu: "Izbornik",
  },
  footer: {
    line: "Besplatan spomen za svakog ljubimca.",
    donations: "Donacije",
    terms: "Uvjeti korištenja",
    privacy: "Privatnost",
    cookies: "Kolačići",
    contact: "Kontakt",
    signIn: "Prijava",
  },
  actions: {
    save: "Spremi",
    saving: "Spremam…",
    saved: "Spremljeno",
    next: "Dalje",
    back: "Natrag",
    cancel: "Odustani",
    close: "Zatvori",
    delete: "Obriši",
    share: "Podijeli",
    copyLink: "Kopiraj poveznicu",
    copied: "Poveznica je kopirana",
    tryAgain: "Pokušaj ponovno",
  },
  errors: {
    generic: "Nešto nije uspjelo. Pokušaj ponovno za trenutak.",
    notFoundTitle: "Ove stranice nema",
    notFoundBody: "Možda je poveznica pogrešna ili je spomen u međuvremenu postao privatan.",
    tooFast: "Previše pokušaja u kratkom vremenu. Pričekaj malo pa pokušaj ponovno.",
    required: "Ovo polje je obavezno.",
  },
  cookieNotice: {
    body: "Koristimo samo kolačiće nužne za rad stranice: prijavu i spremanje nacrta. Ne pratimo te.",
    more: "Više o kolačićima",
    ok: "U redu",
  },
  exampleBadge: "Primjer memorijala · izmišljeni ljubimac",
} as const;
