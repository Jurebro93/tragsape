/**
 * Tekstovi alata na /alati.
 *
 * Svaka brojka, formula, prag i tvrdnja o zdravlju ili propisima ima izvor naveden u `sources`
 * istog alata; svi su izvori otvoreni i provjereni na dan `common.accessed`. Tekst se ne mijenja
 * bez novog izvora i novog datuma pristupa. Opisi područja u upitnicima naše su riječi, ne prijevodi.
 * Vitičaste zagrade ({name}, {text}, {count}…) popunjava `fill` iz `@/lib/text`.
 * Ime ljubimca nikad se ne sklanja: rečenice ga drže u nominativu ili ga nemaju.
 */

export type ToolSource = {
  publisher: string;
  title: string;
  url: string;
  /** Što točno ovaj izvor podupire na stranici. */
  supports: string;
};

export const tools = {
  common: {
    eyebrow: "Alati",
    allTools: "Svi alati",
    accessed: "25. studenoga 2026.",
    sourcesTitle: "Izvori",
    sourcesIntro: "Brojke i tvrdnje na ovoj stranici dolaze iz ovih izvora. Svi su otvoreni i provjereni {date}",
    sourceSupports: "Što podupire:",
    sourceAccessed: "Pristupljeno {date}",
    methodTitle: "Kako računamo",
    faqTitle: "Česta pitanja",
    nextStepLabel: "Sljedeći korak",
    draftBar: "Nacrt — čeka pregled veterinara i odobrenje vlasnika",
    copy: "Kopiraj",
    copied: "Kopirano.",
    copyFailed: "Kopiranje nije uspjelo. Označi tekst i kopiraj ga ručno.",
    charCount: "{count} od {max} znakova",
    yearsLabel: "Godine",
    monthsLabel: "Mjeseci",
    calculate: "Izračunaj",
    ageRequired: "Upiši dob: godine, mjesece ili oboje.",
    ageInvalid: "Upiši cijele brojeve: mjesece od 0 do 11, a godine najviše do 30.",
    humanYears: { one: "ljudska godina", few: "ljudske godine", other: "ljudskih godina" },
    about: "Otprilike",
  },

  index: {
    metaTitle: "Besplatni alati za vlasnike ljubimaca",
    metaDescription:
      "Pseće i mačje godine u ljudskima, pomoćnik za posvetu, poruka sućuti i kviz o oproštaju. Besplatno, bez prijave, s navedenim izvorima.",
    title: "Alati",
    intro:
      "Mali, besplatni pomoćnici: za računanje dobi, za pronalaženje riječi i za razmišljanje o oproštaju. Ne traže prijavu, a ono što upišeš ostaje u tvom pregledniku.",
    open: "Otvori",
  },

  registry: {
    "psece-godine": {
      title: "Pseće godine u ljudskima",
      description: "Koliko je tvoj pas star u ljudskim godinama i u kojoj je životnoj fazi, prema veličini.",
    },
    "macje-godine": {
      title: "Mačje godine u ljudskima",
      description: "Koliko je tvoja mačka stara u ljudskim godinama, u kojoj je životnoj fazi i koliko mačke žive.",
    },
    posveta: {
      title: "Pomoćnik za posvetu",
      description: "Od tvojih riječi slaže nekoliko polaznih rečenica za posvetu do 300 znakova.",
    },
    sucut: {
      title: "Poruka sućuti kad nekome ugine ljubimac",
      description: "Kratke poruke koje možeš prilagoditi i popis rečenica koje je bolje preskočiti.",
    },
    oprostaj: {
      title: "Koji oproštaj odgovara vašoj obitelji",
      description: "Šest kratkih pitanja i dva do tri načina oproštaja, opisana bez ocjene što je ispravno.",
    },
    "kvaliteta-zivota": {
      title: "Kvaliteta života starog ili bolesnog ljubimca",
      description: "Upitnik od sedam područja koji pomaže posložiti opažanja prije razgovora s veterinarom.",
    },
    "prva-24-sata": {
      title: "Prva 24 sata nakon što ljubimac ugine",
      description: "Miran popis: što napraviti redom, koga nazvati i što kažu propisi.",
    },
  },

  dogAge: {
    metaTitle: "Pseće godine u ljudskima: kalkulator po veličini psa",
    metaDescription:
      "Izračunaj pseće godine u ljudskima prema veličini psa. Pravilo »puta sedam« ne vrijedi: evo što kažu AKC, AVMA i AAHA, s izvorima.",
    title: "Pseće godine u ljudskima",
    intro:
      "Pravilo »jedna pseća godina je sedam ljudskih« nije točno: psi u prve dvije godine odrastu puno brže, a veliki psi stare brže od malih. Ovaj kalkulator koristi tablicu Američkoga kinološkog saveza (AKC) po veličini psa i pokazuje životnu fazu prema smjernicama veterinarskih udruga.",
    form: {
      ageLegend: "Dob psa",
      sizeLegend: "Veličina odraslog psa",
      sizeRequired: "Odaberi veličinu psa.",
      sizeHint:
        "Kategorije su iz tablice AKC-a (do 20, 21–50, 51–100 i više od 100 funti), preračunate u kilograme i zaokružene.",
      sizes: {
        small: { label: "Mali", hint: "do 9 kg" },
        medium: { label: "Srednji", hint: "9–23 kg" },
        large: { label: "Veliki", hint: "23–45 kg" },
        giant: { label: "Divovski", hint: "više od 45 kg" },
      },
    },
    result: {
      title: "Rezultat",
      interpolated:
        "Tablica daje vrijednosti za pune godine. Za mjesece između računamo ravnomjerno između dviju susjednih vrijednosti.",
      underOne:
        "Za prvu godinu izvor ne daje brojke po mjesecima, pa ih ne izmišljamo. Orijentir: s navršenih godinu dana pas ove veličine ima otprilike {value} prema tablici AKC-a.",
      beyondTable:
        "Tablica AKC-a završava na 16 godina, a to je za ovu veličinu {value}. Za stariju dob izvor ne daje brojku, pa je ne izmišljamo.",
      stageLabel: "Životna faza",
      epigenetic:
        "Druga metoda: prema formuli iz istraživanja na 104 labrador retrivera (Wang i sur., 2020.) to bi bilo približno {value}. Formula je izvedena na jednoj pasmini i ne uzima u obzir veličinu psa.",
      caveat:
        "Svaka je pretvorba gruba procjena: pasmine i pojedini psi stare različito. Ovo nije procjena zdravlja; za to i za stvarnu dob psa pitaj veterinara.",
    },
    stages: {
      puppy: {
        label: "Štene",
        body: "Od rođenja do kraja naglog rasta, koji završava u dobi od 6 do 9 mjeseci (AAHA).",
      },
      "puppy-or-young-adult": {
        label: "Na prijelazu iz šteneta u mladog odraslog psa",
        body: "Nagli rast završava između 6. i 9. mjeseca, ovisno o pasmini i veličini (AAHA).",
      },
      "young-adult": {
        label: "Mladi odrasli pas",
        body: "Od kraja naglog rasta do tjelesne i socijalne zrelosti, koja nastupa s 3 do 4 godine (AAHA).",
      },
      "young-or-mature-adult": {
        label: "Na prijelazu iz mladog u zrelog odraslog psa",
        body: "Tjelesna i socijalna zrelost nastupa između 3. i 4. godine (AAHA).",
      },
      "mature-adult": {
        label: "Zreli odrasli pas",
        body: "Od pune zrelosti do početka posljednje četvrtine očekivanoga životnog vijeka, što ovisi o pasmini i veličini (AAHA).",
      },
      "mature-or-senior": {
        label: "Na prijelazu u seniorsku dob",
        body: "Za ovu veličinu AVMA navodi da seniorska dob u prosjeku počinje između {min}. i {max}. godine; točan trenutak ovisi o pasmini.",
      },
      senior: {
        label: "Senior",
        body: "Posljednja četvrtina očekivanoga životnog vijeka. Za ovu veličinu AVMA navodi da u prosjeku počinje između {min}. i {max}. godine.",
      },
    },
    method: [
      "Ljudske godine uzimamo iz tablice AKC-a »How Old Is My Dog in Human Years?«. Ona daje vrijednosti za pune godine od 1 do 16 i za četiri veličine psa.",
      "Za dob između punih godina računamo ravnomjerno (linearno) između dviju susjednih vrijednosti iz tablice. To je naše pojednostavljenje, a ne dio izvora.",
      "Za dob ispod jedne i iznad 16 godina tablica nema vrijednosti, pa brojku ne prikazujemo.",
      "Životnu fazu određujemo prema smjernicama AAHA-e iz 2019.: štene do kraja naglog rasta (6–9 mjeseci), mladi odrasli pas do 3–4 godine, zreli odrasli pas do početka posljednje četvrtine očekivanog vijeka, a zatim senior. Kad dob padne unutar raspona koji izvor navodi, prikazujemo prijelaz, a ne lažno točnu granicu.",
      "Početak seniorske dobi po veličini uzimamo iz brošure AVMA-e (2023.): male pasmine 8–11 godina, srednje 8–10, velike 8–9, divovske 6–7.",
      "Granice veličine u izvorima nisu posve iste: AKC divovskima smatra pse teže od 100 funti (oko 45 kg), a AVMA teže od 90 funti (oko 41 kg). Ako je tvoj pas blizu granice, pogledaj obje veličine.",
      "Druga brojka dolazi iz formule ljudska dob = 16 × ln(pseća dob) + 31 (Wang i sur., Cell Systems, 2020.). Prikazujemo je od navršene prve do šesnaeste godine.",
    ],
    faq: [
      {
        question: "Vrijedi li pravilo da je jedna pseća godina sedam ljudskih?",
        answer:
          "Ne. AKC to pravilo naziva zastarjelim i netočnim: ono ne uzima u obzir da psi u ranoj dobi odrastaju puno brže ni da pasmine i veličine stare različito. Prema AKC-u, omjer 7 : 1 vjerojatno potječe iz grube računice da ljudi žive oko 70, a psi oko 10 godina.",
      },
      {
        question: "Kako se onda računaju pseće godine?",
        answer:
          "Kao opću smjernicu AKC prenosi računicu Američke veterinarske udruge (AVMA): prva godina života srednje velikog psa odgovara otprilike 15 ljudskih godina, druga još oko devet, a svaka sljedeća oko pet. Tablica AKC-a to razrađuje po veličini psa i nju koristi ovaj kalkulator.",
      },
      {
        question: "Zašto veliki psi stare brže od malih?",
        answer:
          "Zna se da veće pasmine u prosjeku žive kraće od manjih (AVMA), ali ne i zašto: prema AKC-u, istraživanja još nisu objasnila vezu između tjelesne mase i životnog vijeka psa. AKC prenosi i procjenu istraživača da svake 4,4 funte tjelesne mase (oko 2 kg) skraćuju očekivani život psa za otprilike mjesec dana.",
      },
      {
        question: "Kada je pas senior?",
        answer:
          "Nema jedne dobi za sve pse. AVMA navodi da se pas smatra seniorom kad uđe u posljednju četvrtinu očekivanoga životnog vijeka svoje pasmine. U prosjeku to znači: male pasmine (do oko 9 kg) s 8 do 11 godina, srednje (9–23 kg) s 8 do 10, velike (23–41 kg) s 8 do 9, a divovske (iznad 41 kg) sa 6 do 7 godina. AVMA pritom podsjeća da starost nije bolest.",
      },
      {
        question: "Koliko žive psi?",
        answer:
          "Ovisi ponajprije o pasmini. Analiza 30 563 psa uginula u Ujedinjenom Kraljevstvu od 2016. do 2020. izračunala je očekivani životni vijek pri rođenju od 11,23 godine. Razlike među pasminama bile su velike: od 12,72 godine za Jack Russell terijera do 4,53 godine za francuskog buldoga (Teng i sur., Scientific Reports, 2022.). To su podaci za britanske pse u veterinarskoj skrbi, ne za Hrvatsku.",
      },
      {
        question: "Postoji li znanstvena formula?",
        answer:
          "Postoji jedna poznata: ljudska dob = 16 × ln(pseća dob) + 31. Izveli su je istraživači Sveučilišta Kalifornije u San Diegu uspoređujući promjene na DNK (metilaciju) kod 104 labrador retrivera i kod ljudi (Wang i sur., Cell Systems, 2020.). AKC upozorava da je istraživanje obuhvatilo samo jednu pasminu, pa se rezultat za druge pse ne mora poklapati.",
      },
    ],
    nextStep: {
      body: "Ako računaš za psa kojeg više nema, njegovu priču možeš sačuvati na spomen-stranici.",
      link: "Izradi spomen",
    },
    sources: [
      {
        publisher: "American Kennel Club (AKC)",
        title: "How to Calculate Dog Years to Human Years",
        url: "https://www.akc.org/expert-advice/health/how-to-calculate-dog-years-to-human-years/",
        supports:
          "Tablica ljudskih godina po dobi i veličini psa; ocjena da je pravilo »puta sedam« zastarjelo i odakle potječe; smjernica 15 + 9 + 5; veza tjelesne mase i životnog vijeka; upozorenje uz epigenetsku formulu.",
      },
      {
        publisher: "American Veterinary Medical Association (AVMA)",
        title: "Senior Pets (brošura za vlasnike, 2023.)",
        url: "https://ebusiness.avma.org/files/ProductDownloads/mcm-client-brochures-senior-pets-2023.pdf",
        supports:
          "Pas je senior u posljednjoj četvrtini očekivanoga životnog vijeka; dob po veličini (8–11, 8–10, 8–9, 6–7 godina); veće pasmine žive kraće; starost nije bolest.",
      },
      {
        publisher: "American Animal Hospital Association (AAHA)",
        title: "2019 AAHA Canine Life Stage Guidelines — plakat »What's your dog's life stage?«",
        url: "https://www.aaha.org/globalassets/02-guidelines/canine-life-stage-2019/aaha_caninelifestages_poster.pdf",
        supports: "Definicije životnih faza: štene, mladi odrasli pas, zreli odrasli pas, senior.",
      },
      {
        publisher: "Journal of the American Animal Hospital Association (PubMed)",
        title: "Creevy K. E. i sur. (2019.): 2019 AAHA Canine Life Stage Guidelines",
        url: "https://pubmed.ncbi.nlm.nih.gov/31622127/",
        supports: "Podjela života psa na pet faza u smjernicama iz 2019.",
      },
      {
        publisher: "Cell Systems (PubMed Central)",
        title:
          "Wang T. i sur. (2020.): Quantitative Translation of Dog-to-Human Aging by Conserved Remodeling of the DNA Methylome",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7484147/",
        supports: "Formula ljudska dob = 16 × ln(pseća dob) + 31; uzorak od 104 labrador retrivera.",
      },
      {
        publisher: "Scientific Reports (PubMed)",
        title:
          "Teng K. T. i sur. (2022.): Life tables of annual life expectancy and mortality for companion dogs in the United Kingdom",
        url: "https://pubmed.ncbi.nlm.nih.gov/35484374/",
        supports:
          "Očekivani životni vijek pasa pri rođenju (11,23 godine), uzorak od 30 563 psa i razlike među pasminama.",
      },
    ] satisfies readonly ToolSource[],
  },

  catAge: {
    metaTitle: "Mačje godine u ljudskima: kalkulator i koliko žive mačke",
    metaDescription:
      "Izračunaj mačje godine u ljudskima prema tablici organizacije International Cat Care, saznaj životnu fazu mačke i koliko mačke žive. S izvorima.",
    title: "Mačje godine u ljudskima",
    intro:
      "Mačke odrastu brzo: prema organizaciji International Cat Care, prve dvije godine mačjeg života odgovaraju otprilike 24 ljudske godine, a svaka sljedeća još četiri. Kalkulator koristi njihovu tablicu i pokazuje u kojoj je životnoj fazi tvoja mačka.",
    form: {
      ageLegend: "Dob mačke",
    },
    result: {
      title: "Rezultat",
      interpolated:
        "Tablica nema vrijednost baš za ovu dob, pa računamo ravnomjerno između dviju susjednih vrijednosti.",
      stageLabel: "Životna faza",
      caveat:
        "Ovo je orijentir, ne procjena zdravlja. Mačke stare različito; ako te brine zdravlje ili stvarna dob mačke, pitaj veterinara.",
    },
    stages: {
      kitten: {
        label: "Mače (do 6 mjeseci)",
        body: "Brzo raste i upoznaje svijet oko sebe.",
      },
      junior: {
        label: "Junior (7 mjeseci – 2 godine)",
        body: "Doseže punu veličinu. Faza je usporediva s ljudskim tinejdžerskim i ranim odraslim godinama.",
      },
      adult: {
        label: "Odrasla mačka (3–6 godina)",
        body: "Tjelesno i ponašanjem zrela.",
      },
      mature: {
        label: "Zrela mačka (7–10 godina)",
        body: "Usporediva s ljudima od sredine četrdesetih do sredine pedesetih; obično manje aktivna nego prije.",
      },
      senior: {
        label: "Senior (11–14 godina)",
        body: "Vjerojatno manje aktivna. Može joj trebati pomoć u kući, primjerice niži rub posude s pijeskom ili rampa do omiljenog ležaja.",
      },
      "super-senior": {
        label: "Super senior (15 godina i više)",
        body: "Mnoge mačke dožive ovu dob, a neke je ničim ne pokazuju. Vrijedi pozorno pratiti i male promjene u ponašanju.",
      },
    },
    method: [
      "Koristimo tablicu organizacije International Cat Care: prve dvije godine odgovaraju 24 ljudske godine, a svaka sljedeća još četiri.",
      "Za prve dvije godine tablica daje vrijednosti za 1 do 7, 12, 18 i 24 mjeseca. Za dob između tih točaka (primjerice 9 ili 15 mjeseci) i za mjesece nakon druge godine računamo ravnomjerno između susjednih vrijednosti. To je naše pojednostavljenje, a ne dio izvora.",
      "Životna faza je jedna od šest faza iz iste tablice. Rasponi su zadani punim godinama, pa faza traje do sljedećeg rođendana.",
      "Američke smjernice AAHA/AAFP iz 2021. dijele život mačke jednostavnije, na četiri dobne faze: mače (do 1 godine), mlada odrasla mačka (1–6 godina), zrela odrasla mačka (7–10 godina) i senior (više od 10 godina). Autori ističu da su te granice okvirne, a ne apsolutne.",
    ],
    faq: [
      {
        question: "Koliko žive mačke?",
        answer:
          "International Cat Care navodi da mačke u prosjeku žive oko 12 do 14 godina i da nije neobično da dožive kasne tinejdžerske ili rane dvadesete. Istraživanje autora s britanskoga Kraljevskog veterinarskog koledža (RVC) na 7936 mačaka uginulih 2019. u Ujedinjenom Kraljevstvu izračunalo je očekivani životni vijek pri rođenju od 11,74 godine: 12,51 za ženke i 11,18 za mužjake. Kraći vijek bio je povezan s time da mačka nije kastrirana, da je čistokrvna i da nema idealnu tjelesnu masu (Teng i sur., Journal of Feline Medicine and Surgery, 2024.). Očekivani vijek pri rođenju računa se iz svih uginuća, pa i mladih mačaka; to su britanski podaci, ne hrvatski.",
      },
      {
        question: "Kako se računaju mačje godine?",
        answer:
          "Prema organizaciji International Cat Care: prve dvije godine mačke odgovaraju 24 ljudske, a svaka sljedeća još četiri. Mačka od 10 godina tako ima otprilike 56 ljudskih godina.",
      },
      {
        question: "Vrijedi li za mačke pravilo »puta sedam«?",
        answer:
          "Ne. Prema tablici International Cat Carea mačka s godinu dana ima oko 15 ljudskih godina, a s dvadeset oko 96. Množenje sa sedam dalo bi 7 i 140: podcjenjuje mladu, a precjenjuje staru mačku.",
      },
      {
        question: "Kada je mačka senior?",
        answer:
          "International Cat Care seniorima smatra mačke od 11 do 14 godina, a od 15. godine govori o »super seniorima«. AVMA navodi da se mačke općenito smatraju seniorima nakon desete godine, a smjernice AAHA/AAFP iz 2021. seniorom nazivaju mačku stariju od 10 godina.",
      },
      {
        question: "Čemu služi usporedba s ljudskim godinama?",
        answer:
          "Mačke dobro skrivaju znakove boli i bolesti. International Cat Care zato predlaže usporedbu s ljudskom dobi: lakše je predvidjeti na koje tegobe u toj životnoj fazi treba obratiti pozornost. Usporedba ne zamjenjuje pregled kod veterinara.",
      },
    ],
    nextStep: {
      body: "Ako računaš za mačku koje više nema, njezinu priču možeš sačuvati na spomen-stranici.",
      link: "Izradi spomen",
    },
    sources: [
      {
        publisher: "International Cat Care",
        title: "How to tell your cat's age in human years",
        url: "https://icatcare.org/articles/how-to-tell-your-cats-age-in-human-years",
        supports:
          "Tablica mačje i ljudske dobi; pravilo 24 + 4; šest životnih faza i njihovi opisi; prosječan životni vijek od oko 12 do 14 godina; zašto je usporedba korisna.",
      },
      {
        publisher: "Journal of Feline Medicine and Surgery (PubMed Central)",
        title: "Quimby J. i sur. (2021.): 2021 AAHA/AAFP Feline Life Stage Guidelines",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10812130/",
        supports:
          "Četiri dobne faze (mače, mlada odrasla, zrela odrasla, senior) s granicama dobi i napomena da su granice okvirne.",
      },
      {
        publisher: "Journal of Feline Medicine and Surgery (PubMed)",
        title:
          "Teng K. T. i sur. (2024.): Life tables of annual life expectancy and risk factors for mortality in cats in the UK",
        url: "https://pubmed.ncbi.nlm.nih.gov/38714312/",
        supports:
          "Očekivani životni vijek mačaka pri rođenju (11,74 godine; ženke 12,51, mužjaci 11,18), uzorak od 7936 uginuća i čimbenici povezani s kraćim vijekom.",
      },
      {
        publisher: "American Veterinary Medical Association (AVMA)",
        title: "Senior Pets (brošura za vlasnike, 2023.)",
        url: "https://ebusiness.avma.org/files/ProductDownloads/mcm-client-brochures-senior-pets-2023.pdf",
        supports: "Mačke se općenito smatraju seniorima nakon desete godine.",
      },
    ] satisfies readonly ToolSource[],
  },

  quality: {
    metaTitle: "Kvaliteta života starog ili bolesnog ljubimca: upitnik",
    metaDescription:
      "Upitnik od sedam područja po uzoru na veterinarske ljestvice kvalitete života. Pomaže posložiti opažanja prije razgovora s veterinarom; ne odlučuje umjesto tebe.",
    title: "Kvaliteta života starog ili bolesnog ljubimca",
    intro:
      "Kad je ljubimac star ili teško bolestan, teško je vidjeti jasno: dani se razlikuju, a ti ga gledaš svaki dan. Ovaj upitnik pomaže posložiti opažanja u sedam područja prije razgovora s veterinarom. Ne postavlja dijagnozu i ne odlučuje umjesto tebe.",
    privacy:
      "Ništa se ne sprema i ne šalje. Odgovori postoje samo na ovoj stranici u tvom pregledniku i nestaju kad je zatvoriš ili osvježiš.",
    origin:
      "Upitnik je oblikovan po ljestvici kvalitete života »HHHHHMM« veterinarske onkologinje dr. Alice Villalobos: sedam područja, svako se ocjenjuje od 0 do 10, pri čemu je 10 najbolje. Autorica ju je namijenila skrbnicima i veterinarskim timovima za praćenje palijativne skrbi. Opisi područja naše su riječi, a ne prijevod izvornika.",
    how: "Ocijeni kako je bilo zadnjih dana, a ne u najboljem ni u najgorem trenutku.",
    scaleLow: "0 je najlošije",
    scaleHigh: "10 je najbolje",
    dimensions: {
      pain: {
        label: "Bol i disanje",
        question: "Je li bol pod kontrolom? Diše li mirno i bez napora?",
        low: "bol ili otežano disanje ne popuštaju",
        high: "bez boli, diše lako",
      },
      appetite: {
        label: "Jelo",
        question: "Jede li dovoljno, sam ili uz tvoju pomoć?",
        low: "odbija hranu",
        high: "jede s tekom",
      },
      hydration: {
        label: "Piće",
        question: "Pije li dovoljno?",
        low: "gotovo ne pije",
        high: "pije kao i inače",
      },
      hygiene: {
        label: "Čistoća",
        question: "Može li ostati čist i suh, osobito nakon nužde? Ima li rana ili nažuljanih mjesta od ležanja?",
        low: "stalno je uprljan ili ima rane",
        high: "čist i njegovan",
      },
      joy: {
        label: "Raspoloženje",
        question: "Pokazuje li radost i zanimanje za obitelj, igračke i okolinu? Ili je povučen, tjeskoban, uplašen?",
        low: "povučen, bez zanimanja",
        high: "veseo i znatiželjan",
      },
      mobility: {
        label: "Kretanje",
        question: "Može li ustati i hodati bez pomoći? Želi li u šetnju ili po kući?",
        low: "ne može ustati bez pomoći",
        high: "kreće se slobodno",
      },
      goodDays: {
        label: "Dobri i loši dani",
        question: "Kad pogledaš zadnje dane: ima li više dobrih ili loših?",
        low: "gotovo samo loši dani",
        high: "gotovo samo dobri dani",
      },
    },
    scoreLabel: "{label}: ocjena {score}",
    notRated: "nije ocijenjeno",
    extras: {
      title: "Ispis za veterinara",
      intro: "Ime, datum i bilješke nisu obavezni i služe samo za ispis.",
      petName: "Ime ljubimca",
      date: "Datum",
      notes: "Bilješke za veterinara",
      notesHint: "Primjerice: što se promijenilo od zadnjeg pregleda, koje lijekove prima, što želiš pitati.",
    },
    result: {
      title: "Što odgovori pokazuju",
      incomplete: "Ocijeni svih sedam područja da vidiš zbroj. Ocijenjeno: {count} od 7.",
      total: "Zbroj: {total} od {max}",
      above:
        "Zbroj je veći od 35. Dr. Villalobos navodi da zbroj iznad 35 znači prihvatljivu kvalitetu života za nastavak palijativne skrbi.",
      notAbove:
        "Zbroj nije veći od 35. Prema dr. Villalobos, tek zbroj iznad 35 znači prihvatljivu kvalitetu života za nastavak palijativne skrbi.",
      lowest: "Najniže ocijenjeno: {list}.",
      lowestItem: "{label} ({score})",
      beyondTotal:
        "Zbroj ne govori sve. Na ljestvici dr. Villalobos bol i disanje su na prvom mjestu, a otežano disanje preteže nad svim ostalim. Sveučilište Ohio State u svom vodiču navodi da i jedna jedina stavka, primjerice bol, može značiti lošu kvalitetu života iako je ostalo dobro.",
      notDecision:
        "Ovo nije dijagnoza ni odluka i ne zamjenjuje veterinara. Sljedeći je korak razgovor s tvojim veterinarom: ponesi ove ocjene, a veterinar će ih povezati s nalazima i reći ti koje mogućnosti postoje.",
      tipsTitle: "Da slika bude potpunija",
      tips: [
        "Ponovi upitnik u pravilnim razmacima, primjerice svaka tri dana ili jednom tjedno, i usporedi rezultate (Ohio State).",
        "Neka svaki član obitelji ispuni svoj, pa usporedite odgovore (Ohio State, Lap of Love).",
        "Ispuni ga u različito doba dana. Lap of Love navodi da je većini ljubimaca danju bolje nego noću.",
        "Na kalendaru bilježi dobre i loše dane (Ohio State).",
      ],
    },
    print: "Ispiši / spremi za veterinara",
    printHint: "U prozoru za ispis možeš odabrati i »Spremi kao PDF«.",
    printNeedsAll: "Ispis je moguć kad ocijeniš svih sedam područja.",
    clear: "Obriši odgovore",
    printout: {
      title: "Kvaliteta života ljubimca — bilješke za veterinara",
      petName: "Ljubimac:",
      date: "Datum:",
      area: "Područje",
      score: "Ocjena (0–10)",
      notes: "Bilješke:",
      footer:
        "Ocjene je unio vlasnik. Upitnik je oblikovan po ljestvici HHHHHMM dr. Alice Villalobos (10 je najbolje; autorica navodi zbroj iznad 35 kao prihvatljivu kvalitetu života za nastavak palijativne skrbi). Nije dijagnoza.",
    },
    nextStep: {
      body: "Ako želiš na miru razmisliti i o oproštaju, postoji kratak upitnik o tome što odgovara vašoj obitelji.",
      link: "Koji oproštaj odgovara vašoj obitelji",
    },
    sources: [
      {
        publisher: "Veterinary Practice News",
        title: "Villalobos A. (2009.): Quality Of Life Scale",
        url: "https://www.veterinarypracticenews.com/quality-of-life-scale/",
        supports:
          "Ljestvica HHHHHMM: sedam kriterija, ocjene 0–10, zbroj iznad 35 kao prihvatljiv; bol i disanje na prvom mjestu; namjena ljestvice.",
      },
      {
        publisher: "Dr. Alice Villalobos (obrazac ljestvice; kopiju uz dopuštenje autorice objavljuje Tripawds)",
        title: "Quality of Life Scale (The HHHHHMM Scale)",
        url: "https://downloads.tripawds.com/files/2014/06/QualityofLifeScale-1.pdf",
        supports:
          "Ocjenjivanje od 0 do 10, pri čemu je 10 idealno; otežano disanje preteže nad svim ostalim; zbroj iznad 35; povijest ljestvice (2004., 2007., 2011.) i kome je namijenjena.",
      },
      {
        publisher: "The Ohio State University Veterinary Medical Center, program Honoring the Bond",
        title: "How Will I Know? Assessing Quality of Life and Making Difficult Decisions for Your Pet",
        url: "https://vmc.vet.osu.edu/sites/default/files/documents/how%20will%20i%20know.pdf",
        supports:
          "I jedna stavka (npr. bol) može značiti lošu kvalitetu života; ponavljanje upitnika u pravilnim razmacima; svaki član obitelji ispunjava svoj; kalendar dobrih i loših dana; veterinar ne odlučuje umjesto vlasnika, ali daje medicinsku procjenu.",
      },
      {
        publisher: "Lap of Love Veterinary Hospice",
        title: "Pet Quality-of-Life Scale (2024.)",
        url: "https://www.lapoflove.com/how-will-i-know-it-is-time/Lap-of-Love-Quality-of-Life-Scale-2024.pdf",
        supports:
          "Ispunjavanje u različito doba dana (danju je većini ljubimaca bolje nego noću); usporedba odgovora više članova obitelji; rezultat se raspravlja s veterinarom.",
      },
    ] satisfies readonly ToolSource[],
  },

  firstDay: {
    metaTitle: "Prva 24 sata nakon što ljubimac ugine: što napraviti",
    metaDescription:
      "Miran popis za prvi dan: što napraviti redom, koga nazvati i što hrvatski propisi kažu o ukopu i prijavi uginuća. S izvorima.",
    title: "Prva 24 sata nakon što ljubimac ugine",
    intro:
      "Žao nam je što ti ovo treba. Ovo je kratak popis onoga što prvi dan obično treba napraviti, redom. Idi svojim tempom: označi što je gotovo i preskoči što ti ne treba.",
    vetNote:
      "Popis ne zamjenjuje veterinara. Za sve oko tijela, uzroka smrti i zbrinjavanja nazovi svoju veterinarsku ambulantu ili dežurnu službu.",
    storageNote: "Kvačice se pamte samo u ovom pregledniku, na ovom uređaju. Nama se ništa ne šalje.",
    listLabel: "Popis za prvi dan",
    progress: "Označeno: {done} od {total}",
    clear: "Očisti popis",
    cleared: "Popis je očišćen.",
    items: [
      {
        id: "pause",
        title: "Zastani. Prvih nekoliko minuta ne moraš ništa.",
        body: "Ostani uz njega koliko ti treba. Pogladiti ga ili mu nešto reći može pomoći i tebi i obitelji (Lap of Love).",
      },
      {
        id: "confirm",
        title: "Ako postoji sumnja je li uginuo, nazovi veterinara.",
        body: "Znakovi koje navodi Lap of Love: nema disanja ni pomicanja prsa, nema otkucaja srca, zjenice su nepomične i ne reagiraju. Sitni trzaji mogući su i nakon smrti i nisu znak života. Ako sumnja ostane, veterinar će to potvrditi.",
      },
      {
        id: "place",
        title: "Položi ga na deku ili ručnik, u prirodan položaj za ležanje.",
        body: "Tijelo se počinje hladiti i kočiti unutar jednog do dva sata, pa ga je lakše namjestiti ranije. Mjehur i crijeva mogu se opustiti; ispod stavi nešto što upija. Ako su mu oči otvorene, možeš ih nježno zatvoriti (Lap of Love).",
      },
      {
        id: "cool",
        title: "Premjesti ga na hladno mjesto, dalje od sunca i grijanja.",
        body: "Dobro rashlađeno tijelo može ostati kod kuće do 24 sata, ali što prije bude predano ili pokopano, to bolje (ASPCA). Lap of Love savjetuje da se ukop ili prijevoz dogovori unutar 12 do 24 sata, a za toplog vremena i ranije; tada pomaže umotan hladni uložak.",
      },
      {
        id: "necropsy",
        title: "Želiš li znati uzrok smrti, reci to veterinaru što prije.",
        body: "Ako razmišljaš o razudbi (obdukciji), ASPCA navodi da se tijelo smije hladiti, ali ne i zamrzavati, i da veterinara treba nazvati što prije.",
      },
      {
        id: "vet",
        title: "Nazovi svoju veterinarsku ambulantu ili dežurnu službu.",
        body: "Pitaj koje mogućnosti zbrinjavanja postoje kod vas (kremiranje, groblje kućnih ljubimaca, preuzimanje tijela), tko dolazi po tijelo i kada, što moraš organizirati ti i koliko to stoji. Ako želiš pepeo, pitaj za pojedinačno kremiranje (ASPCA).",
      },
      {
        id: "family",
        title: "Odluči tko se još želi oprostiti.",
        body: "Djeci reci istinu jednostavnim riječima. Sveučilište Ohio State savjetuje izbjegavati izraz »uspavali smo ga« jer ga mala djeca mogu shvatiti doslovno, a veterinarski fakultet Sveučilišta Floride savjetuje ne govoriti da se ljubimac izgubio ili pobjegao. Ako imaš druge ljubimce: Ohio State prenosi iskustva vlasnika da su preostale životinje manje mijenjale ponašanje kad su smjele vidjeti i pomirisati tijelo.",
      },
      {
        id: "burial",
        title: "Ako razmišljaš o ukopu na vlastitom zemljištu, prvo provjeri uvjete.",
        body: "Hrvatski pravilnik (NN 129/2022, čl. 42. i 43.) dopušta vlasniku da sam zakopa kućnog ljubimca ako su ispunjeni ovi uvjeti: nema sumnje na bolest koja se obvezno prijavljuje; ukop je u skladu s propisima tvoje općine ili grada te s propisima o zaštiti podzemnih voda i okoliša; tijelo je zakopano dovoljno duboko da ga druge životinje ne mogu otkopati, s najmanje 50 cm zemlje iznad; spriječen je rizik za zdravlje ljudi i životinja i za okoliš; a ako zemljište nije tvoje, imaš pisanu suglasnost vlasnika. Što vrijedi baš u tvojoj općini ili gradu, odavde ne možemo znati: prije kopanja pitaj općinu, grad ili komunalno poduzeće, a veterinara ako je ljubimac bio bolestan.",
      },
      {
        id: "keepsake",
        title: "Ako želiš, sačuvaj nešto opipljivo prije predaje tijela.",
        body: "Ogrlicu, pločicu s imenom, pramen dlake ili otisak šape. Ne moraš odmah znati što ćeš s tim.",
      },
      {
        id: "chip",
        title: "Ako je bio čipiran, prijavi uginuće u roku od sedam dana.",
        body: "Zakon o zdravlju životinja (NN 152/2022, čl. 66. st. 6.) obvezuje vlasnika označenog psa, mačke ili pitome vretice da uginuće prijavi najkasnije sedam dana od uginuća, radi izmjene podataka u Upisniku kućnih ljubimaca. Pitaj veterinara kako se to radi kod njega; možda se može riješiti u istom razgovoru.",
      },
      {
        id: "rest",
        title: "Ostalo može pričekati.",
        body: "Zdjelice, ležaj i igračke ne moraš micati danas. Pojedi nešto, popij vode i javi se nekome tko ga je poznavao.",
      },
    ],
    law: {
      title: "Što kažu propisi",
      items: [
        "Tijelo uginulog kućnog ljubimca po propisima Europske unije spada u nusproizvode životinjskog podrijetla kategorije 1 (Uredba (EZ) br. 1069/2009, čl. 8.). Ista uredba dopušta da nadležno tijelo odobri zakopavanje uginulih kućnih ljubimaca (čl. 19. st. 1. t. (a)).",
        "Zakon o veterinarstvu (čl. 101. st. 3.) kao opće pravilo propisuje da posjednik lešinu životinje predaje koncesionaru ili osobama koje sakupljaju nusproizvode, a do predaje s njom postupa na propisani način.",
        "Pravilnik NN 129/2022 (čl. 43. st. 3.) uređuje iznimku za kućne ljubimce: vlasnik ih smije zakopati uz uvjete navedene u popisu. Isti pravilnik groblje kućnih ljubimaca određuje kao mjesto za zakapanje uginulih ili usmrćenih kućnih ljubimaca, kojim upravlja registrirani subjekt.",
        "Ako je životinja uginula na javnoj površini, primjerice na cesti, sakupljanje i zbrinjavanje dužni su osigurati općina ili grad (Zakon o veterinarstvu, čl. 102.).",
        "Vlasnik označenog psa, mačke ili pitome vretice dužan je uginuće prijaviti u roku od sedam dana (Zakon o zdravlju životinja, čl. 66. st. 6.).",
        "Ovaj sažetak govori o kućnim ljubimcima. Konje i druge kopitare pravilnik kod groblja kućnih ljubimaca izričito izuzima, pa za njih pitaj veterinara.",
      ],
      disclaimer:
        "Ovo je sažetak propisa kakvi su bili {date}, a ne pravni savjet. Propisi se mijenjaju; mjerodavan je tekst objavljen u Narodnim novinama.",
    },
    nextStep: {
      body: "Kad prođe prvi dan: kratak upitnik o tome kakav oproštaj odgovara vašoj obitelji.",
      link: "Koji oproštaj odgovara vašoj obitelji",
    },
    sources: [
      {
        publisher: "Narodne novine",
        title:
          "Pravilnik o registraciji i odobravanju objekata i subjekata u poslovanju s nusproizvodima životinjskog podrijetla koji nisu za prehranu ljudi (NN 129/2022)",
        url: "https://narodne-novine.nn.hr/clanci/sluzbeni/2022_11_129_1954.html",
        supports:
          "Čl. 43. st. 3.: vlasnik smije zakopati kućnog ljubimca; uvjeti iz čl. 42. st. 2. (lokalni propisi, zaštita voda i okoliša, najmanje 50 cm zemlje) i čl. 43. st. 1. t. c) i f) (suglasnost vlasnika zemljišta, sprječavanje rizika); definicija groblja kućnih ljubimaca.",
      },
      {
        publisher: "Zakon.hr",
        title:
          "Pravilnik NN 129/2022 — podatak da je propis na snazi (baza ažurirana 19. 11. 2026.)",
        url: "https://www.zakon.hr/cms.htm?id=54451",
        supports: "Status »na snazi« pravilnika na dan pristupa.",
      },
      {
        publisher: "Narodne novine",
        title: "Zakon o veterinarstvu (NN 82/2013)",
        url: "https://narodne-novine.nn.hr/clanci/sluzbeni/2013_06_82_1734.html",
        supports:
          "Čl. 101. st. 3. i 4.: predaja lešine ovlaštenom sakupljaču; veterinarski inspektor može odobriti zakapanje. Čl. 102.: općine i gradovi osiguravaju sakupljanje lešina s javnih površina.",
      },
      {
        publisher: "Zakon.hr",
        title: "Zakon o veterinarstvu — pročišćeni tekst (NN 82/13, 148/13, 115/18, 52/21, 83/22, 152/22, 18/23)",
        url: "https://www.zakon.hr/z/468/Zakon-o-veterinarstvu",
        supports: "Potvrda da čl. 101. i 102. glase jednako u pročišćenom tekstu na snazi od 23. 2. 2023.",
      },
      {
        publisher: "Narodne novine",
        title: "Zakon o zdravlju životinja (NN 152/2022)",
        url: "https://narodne-novine.nn.hr/clanci/sluzbeni/2022_12_152_2373.html",
        supports:
          "Čl. 66. st. 6.: prijava uginuća označenog psa, mačke ili pitome vretice u roku od sedam dana; Upisnik kućnih ljubimaca.",
      },
      {
        publisher: "EUR-Lex",
        title: "Uredba (EZ) br. 1069/2009 o nusproizvodima životinjskog podrijetla (pročišćeni tekst 14. 12. 2019.)",
        url: "https://eur-lex.europa.eu/legal-content/HR/TXT/HTML/?uri=CELEX:02009R1069-20191214",
        supports:
          "Čl. 8. t. (a) iii.: tijela kućnih ljubimaca su materijal kategorije 1; čl. 19. st. 1. t. (a): nadležno tijelo može odobriti zakopavanje uginulih kućnih ljubimaca.",
      },
      {
        publisher: "Lap of Love Veterinary Hospice",
        title: "What Happens If My Pet Passes Away at Home Before Euthanasia?",
        url: "https://www.lapoflove.com/blog/end-of-life-care-and-euthanasia/what-to-do-if-pet-passes-away-home-before-euthanasia",
        supports:
          "Znakovi smrti; hlađenje i kočenje tijela unutar jednog do dva sata; opuštanje mjehura i crijeva; položaj na deki; hladno mjesto i rok od 12 do 24 sata; vrijeme za oproštaj.",
      },
      {
        publisher: "ASPCA",
        title: "End of Life Care",
        url: "https://www.aspca.org/pet-care/pet-loss",
        supports:
          "Dobro rashlađeno tijelo može se čuvati do 24 sata; tijelo predviđeno za razudbu ne zamrzava se; pojedinačno kremiranje ako se želi pepeo.",
      },
      {
        publisher: "The Ohio State University Veterinary Medical Center, program Honoring the Bond",
        title: "How Will I Know? Assessing Quality of Life and Making Difficult Decisions for Your Pet",
        url: "https://vmc.vet.osu.edu/sites/default/files/documents/how%20will%20i%20know.pdf",
        supports:
          "Razgovor s djecom jednostavnim i jasnim riječima, bez izraza »uspavati«; iskustva vlasnika s drugim ljubimcima koji vide i pomirišu tijelo.",
      },
      {
        publisher: "University of Florida, College of Veterinary Medicine — Small Animal Hospital",
        title: "How to Support a Loved One who is Grieving",
        url: "https://smallanimal.vethospital.ufl.edu/resources-2/pet-loss-support/how-to-support-a-loved-one-who-is-grieving/",
        supports: "Djeci treba reći istinu; ne govoriti da se ljubimac izgubio ili pobjegao.",
      },
    ] satisfies readonly ToolSource[],
  },

  dedication: {
    metaTitle: "Pomoćnik za posvetu ljubimcu: pronađi prve riječi",
    metaDescription:
      "Upiši nekoliko svojih riječi i dobij tri do četiri polazne rečenice za posvetu ljubimcu, do 300 znakova. Bez umjetne inteligencije; sve ostaje u tvom pregledniku.",
    title: "Pomoćnik za posvetu",
    intro:
      "Prva rečenica je najteža. Odaberi ton, upiši nekoliko svojih riječi i dobit ćeš tri do četiri polazne rečenice koje možeš mijenjati dok ne zvuče kao ti. Posveta na spomen-stranici ima najviše 300 znakova.",
    privacy:
      "Ovo nije umjetna inteligencija: rečenice se slažu samo od onoga što upišeš, u tvom pregledniku. Ništa se ne sprema i ne šalje.",
    form: {
      name: "Ime ljubimca",
      nameHint: "Ime ostaje točno kako ga upišeš; ne sklanjamo ga.",
      toneLegend: "Ton",
      tones: {
        warm: "Toplo",
        simple: "Jednostavno",
        smile: "S osmijehom",
      },
      voiceLegend: "Tko govori",
      voices: {
        we: "Obitelj (mi)",
        i: "Ja",
      },
      topicsLegend: "Što želiš spomenuti?",
      topicsHint: "Odaberi koliko želiš i nastavi rečenicu svojim riječima.",
      topics: {
        habit: {
          chip: "Navika",
          label: "Navika ili sitnica — nastavi: »Pamtim kako…«",
          placeholder: "si svako jutro čekala kraj vrata",
        },
        place: {
          chip: "Mjesto",
          label: "Omiljeno mjesto — nastavi: »Tvoje mjesto:…«",
          placeholder: "kauč kraj prozora",
        },
        thanks: {
          chip: "Zahvala",
          label: "Zahvala — nastavi: »Hvala ti za…«",
          placeholder: "svaku šetnju i sve strpljenje",
        },
        words: {
          chip: "U nekoliko riječi",
          label: "Opis u nekoliko riječi",
          placeholder: "tvrdoglava, nježna, uvijek gladna",
        },
        years: {
          chip: "Zajedničko vrijeme",
          label: "Koliko ste bili zajedno — dovrši: »… zajedno«",
          placeholder: "četrnaest godina",
        },
      },
      submit: "Složi prijedloge",
      empty: "Upiši barem ime ili jednu sitnicu, pa ćemo složiti prijedloge.",
    },
    templates: {
      name: "{text}.",
      habit: { i: "Pamtim kako {text}.", we: "Pamtimo kako {text}." },
      place: "Tvoje mjesto: {text}.",
      thanks: "Hvala ti za {text}.",
      words: "{text}.",
      years: "{text} zajedno.",
      thanksAll: "Hvala ti za sve.",
      closings: {
        warm: {
          i: ["Nedostaješ mi.", "Ostaješ sa mnom."],
          we: ["Nedostaješ nam.", "Ostaješ s nama."],
        },
        simple: {
          i: ["Pamtim te.", ""],
          we: ["Pamtimo te.", ""],
        },
        smile: {
          i: ["Uz tebe nikad nije bilo dosadno.", "I dalje se nasmijem kad te se sjetim."],
          we: ["Uz tebe nikad nije bilo dosadno.", "I dalje se nasmijemo kad te se sjetimo."],
        },
      },
    },
    result: {
      title: "Polazne rečenice",
      intro: "Svaku možeš mijenjati. Kad ti jedna odgovara, kopiraj je.",
      itemLabel: "Prijedlog {index}",
    },
    nextStep: {
      body: "Posvetu možeš zalijepiti u spomen-stranicu. Osnovni spomen je besplatan.",
      link: "Izradi spomen",
    },
  },

  condolence: {
    metaTitle: "Poruka sućuti kad nekome ugine ljubimac: što napisati",
    metaDescription:
      "Kratke poruke sućuti za prijatelja, kolegu, člana obitelji ili susjeda kojem je uginuo ljubimac, i što radije ne reći. Prema savjetima organizacija za podršku u žalovanju.",
    title: "Poruka sućuti kad nekome ugine ljubimac",
    intro:
      "Ne treba ti savršena rečenica. Organizacije koje pomažu ljudima u žalovanju za ljubimcem slažu se u jednom: dovoljno je priznati gubitak i biti tu. Odaberi kome pišeš i dobit ćeš nekoliko kratkih poruka koje možeš prilagoditi.",
    privacy: "Poruke se slažu u tvom pregledniku. Ništa se ne sprema i ne šalje.",
    form: {
      relationLegend: "Kome pišeš?",
      relations: {
        friend: "Prijatelju",
        colleague: "Kolegi",
        family: "Članu obitelji",
        neighbour: "Susjedu",
      },
      addressLegend: "Kako se obraćaš?",
      addresses: {
        ti: "S »ti«",
        vi: "S »Vi«",
      },
      familiarityLegend: "Koliko dobro znaš ljubimca?",
      familiarities: {
        well: "Dobro",
        little: "Malo",
        none: "Samo iz priča",
      },
      toneLegend: "Ton",
      tones: {
        warm: "Toplo",
        short: "Kratko",
        help: "S ponudom pomoći",
      },
      petName: "Ime ljubimca",
      petNameHint: "Ime ostaje točno kako ga upišeš; ne sklanjamo ga.",
      memory: "Jedno sjećanje — nastavi: »Uvijek ću pamtiti…«",
      memoryPlaceholder: "kako me dočekivala na vratima",
      submit: "Složi poruke",
    },
    blocks: {
      opening: {
        warm: "Jako mi je žao.",
        short: "Žao mi je.",
        help: "Jako mi je žao.",
      },
      bond: {
        well: {
          named: { ti: "{name} nedostaje i meni.", vi: "{name} nedostaje i meni." },
          unnamed: { ti: "Znam koliko ti znači, a nedostaje i meni.", vi: "Znam koliko Vam znači, a nedostaje i meni." },
        },
        little: {
          named: { ti: "Znam koliko ti {name} znači.", vi: "Znam koliko Vam {name} znači." },
          unnamed: { ti: "Znam koliko ti znači.", vi: "Znam koliko Vam znači." },
        },
        none: {
          named: {
            ti: "Iz tvojih priča znam koliko ti {name} znači.",
            vi: "Iz Vaših priča znam koliko Vam {name} znači.",
          },
          unnamed: {
            ti: "Iz tvojih priča znam koliko ti znači.",
            vi: "Iz Vaših priča znam koliko Vam znači.",
          },
        },
      },
      memory: "Uvijek ću pamtiti {text}.",
      closing: {
        friend: {
          warm: {
            ti: "Tu sam kad god želiš razgovarati, ili samo šutjeti u društvu.",
            vi: "Tu sam kad god želite razgovarati, ili samo šutjeti u društvu.",
          },
          short: { ti: "Mislim na tebe.", vi: "Mislim na Vas." },
          help: {
            ti: "Mogu li ti ovih dana nešto olakšati? Skuhati, prošetati s tobom, svratiti?",
            vi: "Mogu li Vam ovih dana nešto olakšati? Samo recite.",
          },
        },
        colleague: {
          warm: {
            ti: "Uzmi si vremena koliko ti treba.",
            vi: "Uzmite si vremena koliko Vam treba.",
          },
          short: { ti: "Mislim na tebe ovih dana.", vi: "Mislim na Vas ovih dana." },
          help: {
            ti: "Ako ti na poslu ovih dana treba zamjena ili malo mira, samo reci.",
            vi: "Ako Vam na poslu ovih dana treba zamjena ili malo mira, samo recite.",
          },
        },
        family: {
          warm: { ti: "Tu sam, zovi u bilo koje doba.", vi: "Tu sam, zovite u bilo koje doba." },
          short: { ti: "Grlim te.", vi: "Mislim na Vas." },
          help: {
            ti: "Dolazim kad god kažeš i mogu preuzeti što treba.",
            vi: "Doći ću kad god kažete i mogu preuzeti što treba.",
          },
        },
        neighbour: {
          warm: {
            ti: "Kad god poželiš društvo, pokucaj.",
            vi: "Kad god poželite društvo, pokucajte.",
          },
          short: { ti: "Mislim na tebe.", vi: "Mislim na Vas." },
          help: {
            ti: "Ako ti ovih dana što zatreba, tu sam, vrata do.",
            vi: "Ako Vam ovih dana što zatreba, tu sam, vrata do.",
          },
        },
      },
      invite: {
        ti: "Ako želiš, ispričaj mi neku uspomenu. Rado ću slušati.",
        vi: "Ako želite, ispričajte mi neku uspomenu. Rado ću slušati.",
      },
      thinking: { ti: "Mislim na tebe.", vi: "Mislim na Vas." },
      noReply: { ti: "Ne moraš odgovarati na ovu poruku.", vi: "Ne morate odgovarati na ovu poruku." },
    },
    result: {
      title: "Poruke",
      intro: "Svaku možeš mijenjati. Dodaj nešto svoje ako želiš: jedna prava uspomena vrijedi više od lijepe fraze.",
      itemLabel: "Poruka {index}",
    },
    helps: {
      title: "Što pomaže",
      items: [
        "Priznati gubitak. Već »jako mi je žao« puno znači (RSPCA).",
        "Spomenuti ljubimca imenom (RSPCA).",
        "Zapisati nešto čega se sjećaš o ljubimcu i dati to osobi koja žaluje (Sveučilište Floride).",
        "Ponuditi nešto konkretno: obrok, prijevoz, šetnju (RSPCA).",
        "Slušati bez prosuđivanja i savjeta. I sjediti u tišini uz nekoga tko plače pomaže (Sveučilište Floride).",
        "Poštovati potrebu za mirom i ne uzimati je osobno (RSPCA).",
      ],
    },
    avoid: {
      title: "Što radije ne reći",
      intro: "Ove rečenice ljudi izgovore iz najbolje namjere. Evo zašto ih organizacije za podršku savjetuju preskočiti.",
      items: [
        {
          phrase: "»Bio je to samo pas.« / »Samo mačka.«",
          why: "Umanjuje gubitak. Ta osoba nije izgubila »samo ljubimca«, nego svog suputnika (RSPCA, Državno sveučilište Washington).",
        },
        {
          phrase: "»Uzmi drugoga.«",
          why: "Ljubimac nije zamjenjiv, a kada je vrijeme za novog, odlučuje svatko sam (RSPCA, Sveučilište Floride).",
        },
        {
          phrase: "»Znam točno kako ti je.«",
          why: "Nitko ne proživljava gubitak na isti način. Neka razgovor ostane o njima (RSPCA, Državno sveučilište Washington).",
        },
        {
          phrase: "»Vrijeme liječi sve.« / »Sad je na boljem mjestu.«",
          why: "Fraze i mudrosti, koliko god dobronamjerne, često bole (Državno sveučilište Washington, Sveučilište Floride).",
        },
        {
          phrase: "»Imao je lijep i dug život.«",
          why: "Dobronamjerno je, ali može zatvoriti razgovor o onome što osoba stvarno osjeća (RSPCA).",
        },
        {
          phrase: "Usporedbe s tuđim gubicima, savjeti i pokušaji da se tuga »popravi«.",
          why: "Usporedbe umanjuju gubitak i sugeriraju da postoji »ispravan« način žalovanja, a ne postoji (Državno sveučilište Washington).",
        },
      ],
    },
    nextStep: {
      body: "Memorijal možeš i pokloniti.",
      link: "Pogledaj kako",
    },
    sources: [
      {
        publisher: "RSPCA",
        title: "How to support someone through pet bereavement",
        url: "https://www.rspca.org.uk/adviceandwelfare/pets/bereavement/support",
        supports:
          "Što pomaže (priznati gubitak, ime ljubimca, praktična pomoć, poštovanje mira) i četiri rečenice koje treba izbjegavati, s obrazloženjem.",
      },
      {
        publisher: "Washington State University, Veterinary Teaching Hospital",
        title: "Supporting a friend who is experiencing loss of a pet",
        url: "https://hospital.vetmed.wsu.edu/2023/11/03/supporting-a-friend-who-is-experiencing-loss-of-a-pet/",
        supports:
          "Ne govoriti »samo pas«, »znam točno kako ti je«, »vrijeme liječi sve« ni »na boljem je mjestu«; ne uspoređivati gubitke i ne »popravljati« tugu.",
      },
      {
        publisher: "University of Florida, College of Veterinary Medicine — Small Animal Hospital",
        title: "How to Support a Loved One who is Grieving",
        url: "https://smallanimal.vethospital.ufl.edu/resources-2/pet-loss-support/how-to-support-a-loved-one-who-is-grieving/",
        supports:
          "Slušati bez prosuđivanja i savjeta; tišina pomaže; izbjegavati fraze; zapisati sjećanje na ljubimca; ne nagovarati na novog ljubimca.",
      },
    ] satisfies readonly ToolSource[],
  },

  farewell: {
    metaTitle: "Koji oproštaj od ljubimca odgovara vašoj obitelji: kratki kviz",
    metaDescription:
      "Šest pitanja o privatnosti, djeci, mjestu i uspomenama, i dva do tri načina oproštaja od ljubimca opisana bez ocjene što je ispravno.",
    title: "Koji oproštaj odgovara vašoj obitelji",
    intro:
      "Nema ispravnog načina za oproštaj od ljubimca. Ovih šest pitanja pomaže vidjeti što je vašoj obitelji važno, a na kraju dobivaš dva do tri načina koji se s tim slažu. Bez cijena i bez preporuka što »treba«.",
    privacy: "Odgovori ostaju u tvom pregledniku. Ništa se ne sprema i ne šalje.",
    questions: {
      privacy: {
        legend: "Koliko želite da oproštaj bude privatan?",
        options: {
          household: "Samo mi ukućani",
          close: "Obitelj i nekoliko bliskih ljudi",
          everyone: "Svi koji su ga poznavali",
        },
      },
      children: {
        legend: "Sudjeluju li djeca?",
        options: {
          small: "Da, mala djeca",
          older: "Da, veća djeca ili tinejdžeri",
          none: "Ne",
        },
      },
      place: {
        legend: "Želite li mjesto na koje možete doći?",
        options: {
          yes: "Da, to nam je važno",
          either: "Svejedno nam je",
          carry: "Radije nešto što je uvijek uz nas",
        },
      },
      tangible: {
        legend: "Želite li sačuvati nešto opipljivo?",
        options: {
          yes: "Da",
          little: "Možda nešto malo",
          no: "Ne, dovoljna su nam sjećanja",
        },
      },
      sharing: {
        legend: "Kako vaša obitelj najradije dijeli sjećanja?",
        options: {
          talk: "Razgovorom, uživo",
          photos: "Fotografijama i porukama",
          quiet: "Svatko za sebe, u tišini",
        },
      },
      timing: {
        legend: "Što vam je bliže?",
        options: {
          now: "Oprostiti se odmah, ovih dana",
          later: "Pričekati da se malo slegne",
          lasting: "Nešto trajno, čemu se vraćamo",
        },
      },
    },
    submit: "Pokaži prijedloge",
    incomplete: "Odgovori na svih šest pitanja. Odgovoreno: {count} od 6.",
    result: {
      title: "Što bi vam moglo odgovarati",
      intro:
        "Ovo su prijedlozi, a ne preporuke. Možete uzeti jedan, spojiti više njih ili napraviti nešto posve svoje.",
    },
    ways: {
      gathering: {
        title: "Malo obiteljsko okupljanje",
        body: "Okupite se nakratko, kod kuće ili na omiljenom mjestu vašeg ljubimca. Svatko može reći jednu uspomenu, a može se i samo zajedno šutjeti. Program nije potreban.",
      },
      box: {
        title: "Kutija sjećanja",
        body: "U jednu kutiju stavite ono što vam nešto znači: ogrlicu, igračku, fotografiju, pločicu s imenom. Djeca mogu dodati crtež. Kutija može stajati na polici ili u ormaru, kako vam odgovara.",
      },
      plant: {
        title: "Posaditi nešto",
        body: "Stablo, grm ili cvijeće u vrtu, ili biljku u tegli na balkonu. Nešto što raste i o čemu se brinete postaje mjesto kojem se možete vraćati.",
      },
      page: {
        title: "Spomen-stranica",
        body: "Stranica s fotografijom, posvetom i porukama onih koji su ga poznavali. Odgovara kad je obitelj na više mjesta ili kad sjećanja želite skupiti na jednom mjestu.",
      },
      letter: {
        title: "Pismo ili dnevnik",
        body: "Napisati ono što niste stigli reći, samo za sebe. Pismo možete sačuvati, staviti u kutiju sjećanja ili ga nikome ne pokazati.",
      },
      walk: {
        title: "Šetnja omiljenom rutom",
        body: "Još jednom proći put kojim ste najčešće išli ili otići na mjesto koje je bilo vaše. Bez govora i bez obveze da to postane običaj.",
      },
    },
    nextStep: {
      body: "Ako vam je bliska spomen-stranica: osnovni spomen je besplatan i možeš ga započeti kad god želiš.",
      link: "Izradi spomen",
    },
  },
} as const;
