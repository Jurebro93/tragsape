/** Naplata: poruke pri stvaranju narudžbe, stranice nakon plaćanja i e-mail s poklonom. */
export const checkout = {
  errors: {
    notConfigured: "Kupnja trenutačno nije uključena. Pokušaj ponovno kasnije.",
    invalid: "Nešto u narudžbi nije u redu. Provjeri podatke pa pokušaj ponovno.",
    promoInvalid: "Ovaj kod ne vrijedi ili je istekao.",
    promoNotApplicable: "Ovaj kod ne vrijedi za ono što kupuješ.",
    waiverRequired: "Prije plaćanja potvrdi da pristaješ na početak isporuke odmah nakon plaćanja.",
    signInRequired: "Za ovu kupnju se prvo prijavi i potvrdi svoju e-mail adresu.",
    notAllowed: "Ovu kupnju ne možeš napraviti za taj spomen.",
    memorialHasPackage: "Ovaj spomen već ima plaćeni paket.",
    upgradeUnavailable: "Nadogradnja na Portret moguća je samo za spomen s paketom Memorijal.",
    duplicateMemorial: "Isti spomen je u narudžbi više puta. Ostavi ga samo jednom.",
    publishNeedsName: "Prije objave upiši ime ljubimca.",
    gestureUnavailable: "Na ovaj spomen trenutačno nije moguće ostaviti gestu.",
    productUnavailable: "Ovo trenutačno nije u ponudi.",
    amountTooSmall: "Iznos nakon popusta je premalen za kartično plaćanje. Javi nam se pa ćemo to riješiti.",
    failed: "Plaćanje nije pokrenuto i ništa nije naplaćeno. Pokušaj ponovno za trenutak.",
    quoteFailed: "Cijenu trenutačno ne možemo izračunati. Pokušaj ponovno za trenutak.",
  },

  /** Nazivi stavki na Stripeovoj stranici za plaćanje. */
  lines: {
    products: {
      memorial: "Memorijal",
      memorial_portrait: "Memorijal + Portret",
      upgrade_portrait: "Nadogradnja na Portret",
    },
    gift: "Poklon: {product}",
    gesture: "{gesture}, {duration}",
    gestureKinds: {
      svijeca: "Svijeća",
      sapica: "Šapica",
      cvijet: "Cvijet",
      poslastica: "Poslastica",
      loptica: "Loptica",
    },
    gestureDurations: {
      gesture_7d: "7 dana",
      gesture_30d: "30 dana",
      gesture_365d: "godinu dana",
    },
  },

  success: {
    metaTitle: "Hvala",
    loading: "Provjeravamo plaćanje…",
    paid: {
      title: "Plaćanje je uspjelo",
      body: "Hvala ti. Tvoja kupnja je potvrđena.",
      total: "Plaćeno: {amount}",
      openMemorial: "Otvori spomen",
      unnamedMemorial: "Spomen bez imena",
      giftNote: "Primatelj dobiva e-mail s poveznicom na poklon: odmah ili na datum koji je naveden u narudžbi.",
      gestureNote: "Tvoja gesta je sada na spomenu.",
      myPets: "Moji ljubimci",
      home: "Na početnu",
    },
    pending: {
      title: "Plaćanje se obrađuje",
      body: "Čekamo potvrdu plaćanja. Obično traje nekoliko sekundi, a stranica se osvježava sama.",
      slow: "Potvrda traje dulje nego inače. Ne moraš ništa ponavljati; osvježi stranicu malo kasnije.",
    },
    notPaid: {
      title: "Ova narudžba nije naplaćena",
      body: "Plaćanje nije dovršeno ili je isteklo. Ništa nije naplaćeno.",
    },
    refunded: {
      title: "Za ovu narudžbu je vraćen novac",
      body: "Ono što je bilo uključeno u ovu narudžbu više nije aktivno.",
    },
    neutral: {
      title: "Hvala ti",
      body: "Ako je plaćanje dovršeno, tvoja kupnja bit će vidljiva za nekoliko trenutaka.",
      home: "Na početnu",
    },
  },

  cancel: {
    metaTitle: "Plaćanje nije dovršeno",
    title: "Plaćanje nije dovršeno",
    body: "Ništa nije naplaćeno i ništa se nije promijenilo. Možeš se vratiti kad god želiš.",
    home: "Na početnu",
    myPets: "Moji ljubimci",
  },

  giftEmail: {
    subject: "Stigao ti je poklon: spomen-stranica za ljubimca",
    subjectWithBuyer: "{buyer} ti poklanja spomen-stranicu za ljubimca",
    heading: "Stigao ti je poklon",
    greeting: "Bok,",
    greetingWithName: "Bok, {name},",
    intro:
      "Netko tko misli na tebe poklanja ti spomen-stranicu na Tragu šape: mjesto za fotografije, priču i sjećanja na tvog ljubimca.",
    introWithBuyer:
      "{buyer} ti poklanja spomen-stranicu na Tragu šape: mjesto za fotografije, priču i sjećanja na tvog ljubimca.",
    tiers: {
      memorial: "Poklon uključuje paket Memorijal.",
      portrait: "Poklon uključuje paket Memorijal + Portret.",
    },
    messageLabel: "Poruka uz poklon:",
    cta: "Otvori poklon",
    noRush: "Ne moraš žuriti. Poklon te čeka i možeš ga otvoriti kad za to dođe vrijeme.",
  },
} as const;
