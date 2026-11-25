/** Prijava bez lozinke: e-mail, zatim kod ili poveznica. */
export const auth = {
  signIn: {
    title: "Prijava",
    intro: "Upiši e-mail i poslat ćemo ti kod. Lozinka ne treba.",
    emailLabel: "E-mail",
    emailPlaceholder: "ime@primjer.hr",
    send: "Pošalji mi kod",
    sending: "Šaljem…",
  },
  code: {
    title: "Upiši kod",
    sentTo: "Poslali smo šesteroznamenkasti kod na {email}. Vrijedi jedan sat.",
    label: "Kod iz e-maila",
    confirm: "Potvrdi",
    confirming: "Provjeravam…",
    otherEmail: "Upiši drugi e-mail",
    spamHint: "Ne vidiš poruku? Pogledaj neželjenu poštu ili pričekaj minutu.",
  },
  link: {
    title: "Još jedan korak",
    body: "Potvrdi da želiš nastaviti na ovom uređaju.",
    confirm: "Potvrdi i nastavi",
    invalid: "Poveznica više ne vrijedi. Zatraži novi kod.",
  },
  errors: {
    email: "Provjeri e-mail adresu.",
    code: "Kod nije ispravan ili je istekao. Provjeri ga ili zatraži novi.",
    rate: "Kod smo ti upravo poslali. Pričekaj minutu prije novog pokušaja.",
    generic: "Slanje nije uspjelo. Pokušaj ponovno za trenutak.",
  },
  signOut: "Odjava",
} as const;
