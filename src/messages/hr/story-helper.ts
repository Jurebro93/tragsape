/** Pomoćnik za priču: osam pitanja, zatim nacrt koji vlasnik uređuje. */
export const storyHelper = {
  title: "Pomoć pri pisanju priče",
  intro:
    "Odgovori na pitanja koja ti nešto znače; ostala preskoči. Iz tvojih odgovora nastat će nacrt priče koji zatim uređuješ ti.",
  privacy:
    "Kad zatražiš nacrt, tvoji odgovori i osnovni podaci o ljubimcu šalju se pružatelju AI usluge samo radi pisanja tog nacrta.",
  link: "Trebaš pomoć pri pisanju? Odgovori na nekoliko pitanja",
  paidNote: "Pomoćnik za priču dolazi uz Memorijal.",
  questions: [
    { key: "pocetak", label: "Kako je počela vaša zajednička priča?", hint: "Gdje ste se našli, tko je koga odabrao." },
    { key: "prvi-dani", label: "Koji ti je prvi dan ili prvi tjedan ostao u sjećanju?", hint: "" },
    { key: "karakter", label: "Kakav karakter pamtiš?", hint: "Tri riječi ili jedna zgoda." },
    { key: "navika", label: "Koja vas je navika uvijek nasmijavala?", hint: "" },
    { key: "mjesto", label: "Gdje ste najradije provodili vrijeme zajedno?", hint: "" },
    {
      key: "za-druge",
      label: "Što bi trebao znati netko tko nije imao priliku upoznati tvog ljubimca?",
      hint: "",
    },
    { key: "trenutak", label: "Koji trenutak želiš zauvijek zapamtiti?", hint: "" },
    { key: "hvala", label: "Za što želiš reći hvala?", hint: "" },
  ],
  submit: "Napiši nacrt",
  submitting: "Pišem nacrt… ovo može potrajati do pola minute",
  again: "Napiši drugačiji nacrt",
  draftTitle: "Nacrt priče",
  draftHint: "Ovo je polazište. Promijeni sve što ne zvuči kao ti.",
  save: "Spremi kao priču",
  saving: "Spremam…",
  replaceNote: "Priča koju već imaš bit će zamijenjena ovim tekstom.",
  back: "Natrag na priču i fotografije",
  errors: {
    tooFew: "Odgovori na barem dva pitanja, da nacrt ima od čega nastati.",
    notConfigured: "Pomoćnik trenutačno nije uključen. Priču možeš napisati sam u polju „Priča”.",
    limit: "Danas je za ovaj spomen već napisano nekoliko nacrta. Pokušaj ponovno sutra.",
    refused: "Za ove odgovore nacrt nije mogao nastati. Pokušaj ih drugačije sročiti.",
    failed: "Nacrt nije nastao. Pokušaj ponovno za trenutak.",
    paid: "Pomoćnik za priču dolazi uz Memorijal.",
  },
} as const;

export type StoryQuestionKey = (typeof storyHelper.questions)[number]["key"];
