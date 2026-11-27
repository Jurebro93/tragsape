/** Tekstovi newslettera: obrazac, skočni prozor, potvrda, odjava i e-mail za potvrdu. */
export const newsletter = {
  eyebrow: "Vodič u tvom sandučiću",
  title: "Novi vodiči jednom mjesečno",
  lead: "Jedan e-mail mjesečno: novi članci i alati za vlasnike ljubimaca, s izvorima. Bez reklama, odjava jednim klikom.",
  popupTitle: "Želiš li nove vodiče u sandučiću?",
  email: "Tvoj e-mail",
  emailPlaceholder: "ime@primjer.hr",
  /** Točan tekst privole; sprema se uz prijavu. Mijenja li se, mijenja se i ono što se sprema. */
  consent:
    "Pristajem da mi Trag šape jednom mjesečno šalje e-mail s novim vodičima. Privolu mogu povući u svakom trenutku poveznicom za odjavu u svakom e-mailu.",
  privacyLink: "Pravila privatnosti",
  submit: "Prijavi me",
  sending: "Šaljem…",
  sent: "Hvala. Poslali smo ti e-mail s gumbom za potvrdu; prijava vrijedi tek kad je potvrdiš.",
  invalidEmail: "Upiši ispravnu e-mail adresu.",
  consentRequired: "Za prijavu označi privolu.",
  error: "Prijava nije uspjela. Pokušaj ponovno za trenutak.",
  tooFast: "Previše pokušaja. Pokušaj ponovno malo kasnije.",
  close: "Zatvori",
  notNow: "Ne sada",
  confirm: {
    metaTitle: "Potvrda prijave na newsletter",
    title: "Potvrdi prijavu",
    body: "Pritisni gumb i potvrdi da želiš primati e-mail s novim vodičima jednom mjesečno.",
    button: "Potvrđujem prijavu",
    done: "Prijava je potvrđena. Prvi e-mail stiže s idućim izborom novih vodiča.",
    invalid: "Poveznica nije valjana ili je prijava već potvrđena.",
    back: "Natrag na Vodič",
  },
  unsubscribe: {
    metaTitle: "Odjava s newslettera",
    title: "Odjava s newslettera",
    body: "Pritisni gumb i više ti nećemo slati e-mail s vodičima.",
    button: "Odjavi me",
    done: "Odjavljen si. Više ti nećemo slati newsletter.",
    invalid: "Poveznica za odjavu nije valjana.",
  },
  email_: {
    subject: "Potvrdi prijavu na vodiče Traga šape",
    heading: "Još jedan korak",
    paragraph:
      "Netko je ovu adresu prijavio za mjesečni e-mail s novim vodičima Traga šape. Ako si to bio ti, potvrdi prijavu gumbom ispod.",
    button: "Potvrdi prijavu",
    footnote: "Ako se nisi prijavio, zanemari ovu poruku. Bez potvrde ti nećemo slati ništa.",
  },
} as const;
