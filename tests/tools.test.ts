import { describe, expect, it } from "vitest";
import { interpolate, parseAgeMonths } from "@/lib/tools/age";
import { CAT_EARLY_POINTS, catLifeStage, catToHumanYears } from "@/lib/tools/cat-age";
import { FIRST_DAY_STORAGE_KEY, parseChecked, serializeChecked, toggleChecked } from "@/lib/tools/checklist";
import {
  CONDOLENCE_ADDRESSES,
  CONDOLENCE_FAMILIARITIES,
  CONDOLENCE_RELATIONS,
  CONDOLENCE_TONES,
  buildCondolences,
  type CondolenceInput,
} from "@/lib/tools/condolence";
import {
  DEDICATION_MAX,
  DEDICATION_NAME_MAX,
  DEDICATION_PART_MAX,
  DEDICATION_TONES,
  DEDICATION_TOPICS,
  DEDICATION_VOICES,
  buildDedications,
  fitDedication,
  hasDedicationInput,
  type DedicationInput,
  type DedicationTopic,
} from "@/lib/tools/dedication";
import {
  DOG_HUMAN_YEARS,
  DOG_SIZES,
  DOG_TABLE_MAX_YEARS,
  SENIOR_START_YEARS,
  dogLifeStage,
  dogToHumanYears,
  epigeneticHumanYears,
} from "@/lib/tools/dog-age";
import {
  FAREWELL_QUESTIONS,
  FAREWELL_WAYS,
  isFarewellComplete,
  recommendFarewells,
  scoreFarewell,
  type FarewellAnswers,
} from "@/lib/tools/farewell";
import {
  QOL_DIMENSIONS,
  QOL_MAX_TOTAL,
  QOL_REFERENCE_TOTAL,
  summarizeQuality,
  type QolAnswers,
} from "@/lib/tools/quality-of-life";
import { TOOLS, getTool, nextStepHref, publicTools, toolMetadata, toolPath } from "@/lib/tools/registry";
import { capitalizeFirst, cleanPart, uniqueTexts } from "@/lib/tools/text";
import { tools, type ToolSource } from "@/messages/hr/tools";

describe("registar alata", () => {
  it("ima jedinstvene adrese, naslove i opise", () => {
    const slugs = TOOLS.map((tool) => tool.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const tool of TOOLS) {
      expect(tool.title.length).toBeGreaterThan(0);
      expect(tool.description.length).toBeGreaterThan(0);
      expect(toolPath(tool.slug)).toBe(`/alati/${tool.slug}`);
    }
  });

  it("alate o zdravlju i propisima drži kao nacrt dok ih veterinar i vlasnik ne odobre", () => {
    expect(getTool("kvaliteta-zivota").status).toBe("draft");
    expect(getTool("prva-24-sata").status).toBe("draft");
  });

  it("na popis stavlja samo javne alate", () => {
    const listed = publicTools().map((tool) => tool.slug);
    expect(listed).toEqual(["psece-godine", "macje-godine", "posveta", "sucut", "oprostaj"]);
    expect(listed).not.toContain("kvaliteta-zivota");
    expect(listed).not.toContain("prva-24-sata");
  });

  it("nacrt ne nudi tražilicama i ne odaje naslov ni opis, a javni alat nudi sve", () => {
    for (const slug of ["kvaliteta-zivota", "prva-24-sata"] as const) {
      const draft = toolMetadata(slug, { title: "Tajni naslov", description: "Tajni opis" });
      expect(draft.robots).toEqual({ index: false, follow: false });
      expect(JSON.stringify(draft)).not.toMatch(/Tajni/);
      expect(draft.alternates).toBeUndefined();
    }
    const open = toolMetadata("psece-godine", { title: "Naslov", description: "Opis" });
    expect(open.robots).toBeUndefined();
    expect(open.title).toBe("Naslov");
    expect(open.description).toBe("Opis");
    expect(open.alternates).toEqual({ canonical: "/alati/psece-godine" });
  });

  it("sljedeći korak nosi oznaku alata i poziva", () => {
    expect(nextStepHref("/izradi", "posveta", "spomen")).toBe("/izradi?iz=alat-posveta&cta=spomen");
    expect(nextStepHref("/poklon", "sucut", "poklon")).toBe("/poklon?iz=alat-sucut&cta=poklon");
  });
});

describe("unos dobi", () => {
  it("pretvara godine i mjesece u mjesece", () => {
    expect(parseAgeMonths("3", "6")).toBe(42);
    expect(parseAgeMonths("", "7")).toBe(7);
    expect(parseAgeMonths("12", "")).toBe(144);
    expect(parseAgeMonths(" 2 ", "0")).toBe(24);
    expect(parseAgeMonths("0", "0")).toBe(0);
    expect(parseAgeMonths("30", "0")).toBe(360);
  });

  it("odbija prazno, negativno, decimalno i preveliko", () => {
    expect(parseAgeMonths("", "")).toBeNull();
    expect(parseAgeMonths("-1", "0")).toBeNull();
    expect(parseAgeMonths("2.5", "0")).toBeNull();
    expect(parseAgeMonths("2,5", "0")).toBeNull();
    expect(parseAgeMonths("dvije", "0")).toBeNull();
    expect(parseAgeMonths("3", "12")).toBeNull();
    expect(parseAgeMonths("31", "0")).toBeNull();
    expect(parseAgeMonths("30", "1")).toBeNull();
  });

  it("računa ravnomjerno između dviju točaka", () => {
    expect(interpolate(6, 0, 15, 12, 24)).toBe(19.5);
    expect(interpolate(0, 0, 15, 12, 24)).toBe(15);
    expect(interpolate(5, 5, 7, 5, 9)).toBe(7);
  });
});

describe("pseće godine", () => {
  it("za pune godine vraća točno vrijednost iz tablice AKC-a", () => {
    expect(dogToHumanYears("small", 12)).toEqual({ kind: "table", humanYears: 15, exact: true });
    expect(dogToHumanYears("giant", 12)).toEqual({ kind: "table", humanYears: 12, exact: true });
    expect(dogToHumanYears("medium", 7 * 12)).toEqual({ kind: "table", humanYears: 47, exact: true });
    expect(dogToHumanYears("large", 10 * 12)).toEqual({ kind: "table", humanYears: 66, exact: true });
    expect(dogToHumanYears("giant", 16 * 12)).toEqual({ kind: "table", humanYears: 121, exact: true });
    for (const size of DOG_SIZES) {
      expect(DOG_HUMAN_YEARS[size]).toHaveLength(DOG_TABLE_MAX_YEARS);
      DOG_HUMAN_YEARS[size].forEach((value, index) => {
        expect(dogToHumanYears(size, (index + 1) * 12)).toEqual({ kind: "table", humanYears: value, exact: true });
      });
    }
  });

  it("između punih godina računa ravnomjerno i to označava", () => {
    expect(dogToHumanYears("small", 18)).toEqual({ kind: "table", humanYears: 19.5, exact: false });
    const result = dogToHumanYears("large", 5 * 12 + 4);
    expect(result.kind).toBe("table");
    if (result.kind === "table") {
      expect(result.humanYears).toBeCloseTo(39, 5);
      expect(result.exact).toBe(false);
    }
  });

  it("raste s dobi za svaku veličinu", () => {
    for (const size of DOG_SIZES) {
      let previous = 0;
      for (let months = 12; months <= DOG_TABLE_MAX_YEARS * 12; months += 1) {
        const result = dogToHumanYears(size, months);
        expect(result.kind).toBe("table");
        if (result.kind === "table") {
          expect(result.humanYears).toBeGreaterThanOrEqual(previous);
          previous = result.humanYears;
        }
      }
    }
  });

  it("ne izmišlja brojku ispod jedne godine ni iznad kraja tablice", () => {
    expect(dogToHumanYears("medium", 0)).toEqual({ kind: "under-one", atOneYear: 15 });
    expect(dogToHumanYears("giant", 11)).toEqual({ kind: "under-one", atOneYear: 12 });
    expect(dogToHumanYears("small", 16 * 12 + 1)).toEqual({ kind: "beyond-table", atTableEnd: 80 });
    expect(dogToHumanYears("large", 25 * 12)).toEqual({ kind: "beyond-table", atTableEnd: 99 });
  });

  it("epigenetska formula: 16 × ln(dob) + 31, samo od 1 do 16 godina", () => {
    expect(epigeneticHumanYears(12)).toBe(31);
    expect(epigeneticHumanYears(24)).toBeCloseTo(16 * Math.log(2) + 31, 10);
    expect(epigeneticHumanYears(12 * 12)).toBeCloseTo(70.76, 2);
    expect(epigeneticHumanYears(11)).toBeNull();
    expect(epigeneticHumanYears(0)).toBeNull();
    expect(epigeneticHumanYears(16 * 12)).not.toBeNull();
    expect(epigeneticHumanYears(16 * 12 + 1)).toBeNull();
  });

  it("životne faze slijede granice AAHA-e", () => {
    expect(dogLifeStage("medium", 0)).toBe("puppy");
    expect(dogLifeStage("medium", 5)).toBe("puppy");
    expect(dogLifeStage("medium", 6)).toBe("puppy-or-young-adult");
    expect(dogLifeStage("medium", 8)).toBe("puppy-or-young-adult");
    expect(dogLifeStage("medium", 9)).toBe("young-adult");
    expect(dogLifeStage("medium", 35)).toBe("young-adult");
    expect(dogLifeStage("medium", 36)).toBe("young-or-mature-adult");
    expect(dogLifeStage("medium", 47)).toBe("young-or-mature-adult");
    expect(dogLifeStage("medium", 48)).toBe("mature-adult");
  });

  it("seniorska dob ovisi o veličini (AVMA)", () => {
    expect(SENIOR_START_YEARS).toEqual({
      small: { min: 8, max: 11 },
      medium: { min: 8, max: 10 },
      large: { min: 8, max: 9 },
      giant: { min: 6, max: 7 },
    });
    for (const size of DOG_SIZES) {
      const { min, max } = SENIOR_START_YEARS[size];
      expect(dogLifeStage(size, min * 12 - 1)).toBe("mature-adult");
      expect(dogLifeStage(size, min * 12)).toBe("mature-or-senior");
      expect(dogLifeStage(size, max * 12)).toBe("mature-or-senior");
      expect(dogLifeStage(size, max * 12 + 1)).toBe("senior");
    }
    // Isti pas od sedam i pol godina: divovski je već senior, mali još nije.
    expect(dogLifeStage("giant", 90)).toBe("senior");
    expect(dogLifeStage("small", 90)).toBe("mature-adult");
  });
});

describe("mačje godine", () => {
  it("za točke iz tablice vraća točnu vrijednost", () => {
    for (const [months, human] of CAT_EARLY_POINTS) {
      expect(catToHumanYears(months)).toEqual({ humanYears: human, exact: true });
    }
    expect(catToHumanYears(36)).toEqual({ humanYears: 28, exact: true });
    expect(catToHumanYears(10 * 12)).toEqual({ humanYears: 56, exact: true });
    expect(catToHumanYears(20 * 12)).toEqual({ humanYears: 96, exact: true });
    expect(catToHumanYears(25 * 12)).toEqual({ humanYears: 116, exact: true });
  });

  it("između točaka računa ravnomjerno i to označava", () => {
    const nine = catToHumanYears(9);
    expect(nine.humanYears).toBeCloseTo(13.2, 5);
    expect(nine.exact).toBe(false);
    expect(catToHumanYears(15)).toEqual({ humanYears: 18, exact: false });
    expect(catToHumanYears(30)).toEqual({ humanYears: 26, exact: false });
  });

  it("raste s dobi", () => {
    let previous = -1;
    for (let months = 0; months <= 30 * 12; months += 1) {
      const { humanYears } = catToHumanYears(months);
      expect(humanYears).toBeGreaterThan(previous);
      previous = humanYears;
    }
  });

  it("životne faze slijede raspone International Cat Carea", () => {
    expect(catLifeStage(0)).toBe("kitten");
    expect(catLifeStage(6)).toBe("kitten");
    expect(catLifeStage(7)).toBe("junior");
    expect(catLifeStage(35)).toBe("junior");
    expect(catLifeStage(36)).toBe("adult");
    expect(catLifeStage(83)).toBe("adult");
    expect(catLifeStage(84)).toBe("mature");
    expect(catLifeStage(131)).toBe("mature");
    expect(catLifeStage(132)).toBe("senior");
    expect(catLifeStage(179)).toBe("senior");
    expect(catLifeStage(180)).toBe("super-senior");
    expect(catLifeStage(300)).toBe("super-senior");
  });
});

describe("kvaliteta života", () => {
  const all = (score: number): QolAnswers =>
    Object.fromEntries(QOL_DIMENSIONS.map((dimension) => [dimension, score])) as QolAnswers;

  it("ne daje zbroj dok nisu ocijenjena sva područja", () => {
    expect(summarizeQuality({})).toEqual({
      answered: 0,
      complete: false,
      total: null,
      aboveReference: null,
      lowest: [],
      lowestScore: null,
    });
    const partial = summarizeQuality({ pain: 3, joy: 8 });
    expect(partial.answered).toBe(2);
    expect(partial.complete).toBe(false);
    expect(partial.total).toBeNull();
    expect(partial.aboveReference).toBeNull();
  });

  it("zbraja sedam ocjena od 0 do 10", () => {
    expect(QOL_MAX_TOTAL).toBe(70);
    expect(QOL_REFERENCE_TOTAL).toBe(35);
    expect(summarizeQuality(all(10)).total).toBe(70);
    expect(summarizeQuality(all(0)).total).toBe(0);
    expect(summarizeQuality({ ...all(5), pain: 2, mobility: 9 }).total).toBe(36);
  });

  it("prihvatljivo je tek iznad 35, ne i točno 35", () => {
    expect(summarizeQuality(all(5)).total).toBe(35);
    expect(summarizeQuality(all(5)).aboveReference).toBe(false);
    expect(summarizeQuality({ ...all(5), joy: 6 }).aboveReference).toBe(true);
    expect(summarizeQuality({ ...all(5), joy: 4 }).aboveReference).toBe(false);
  });

  it("izdvaja najniže ocijenjena područja, osim kad su sve ocjene jednake", () => {
    const summary = summarizeQuality({ ...all(7), pain: 2, mobility: 2 });
    expect(summary.lowest).toEqual(["pain", "mobility"]);
    expect(summary.lowestScore).toBe(2);
    expect(summarizeQuality(all(6)).lowest).toEqual([]);
  });

  it("ne broji ocjene izvan raspona ni decimalne", () => {
    expect(summarizeQuality({ ...all(5), pain: 11 }).complete).toBe(false);
    expect(summarizeQuality({ ...all(5), pain: -1 }).complete).toBe(false);
    expect(summarizeQuality({ ...all(5), pain: 2.5 }).complete).toBe(false);
    expect(summarizeQuality({ ...all(5), pain: Number.NaN }).answered).toBe(6);
  });
});

describe("popis za prva 24 sata", () => {
  const ids = ["a", "b", "c"] as const;

  it("čita samo poznate oznake, redom popisa i bez ponavljanja", () => {
    expect(parseChecked('["c","a","a","x"]', ids)).toEqual(["a", "c"]);
    expect(parseChecked("[]", ids)).toEqual([]);
  });

  it("oštećen ili tuđi zapis tiho odbacuje", () => {
    expect(parseChecked(null, ids)).toEqual([]);
    expect(parseChecked(undefined, ids)).toEqual([]);
    expect(parseChecked("", ids)).toEqual([]);
    expect(parseChecked("{nije json", ids)).toEqual([]);
    expect(parseChecked('{"a":true}', ids)).toEqual([]);
    expect(parseChecked("[1,null,{}]", ids)).toEqual([]);
    expect(parseChecked('"a"', ids)).toEqual([]);
  });

  it("označava, odznačava i sprema", () => {
    expect(toggleChecked([], "b", ids)).toEqual(["b"]);
    expect(toggleChecked(["b"], "a", ids)).toEqual(["a", "b"]);
    expect(toggleChecked(["a", "b"], "a", ids)).toEqual(["b"]);
    expect(toggleChecked(["a"], "nepoznato", ids)).toEqual(["a"]);
    expect(parseChecked(serializeChecked(["a", "c"]), ids)).toEqual(["a", "c"]);
    expect(FIRST_DAY_STORAGE_KEY).toBe("trag-sape-prva-24-sata");
  });

  it("stavke popisa imaju jedinstvene oznake", () => {
    const itemIds = tools.firstDay.items.map((item) => item.id);
    expect(new Set(itemIds).size).toBe(itemIds.length);
    expect(itemIds.length).toBeGreaterThanOrEqual(8);
  });
});

describe("čišćenje unosa", () => {
  it("svodi unos na jedan red bez završne interpunkcije", () => {
    expect(cleanPart("  svaku   šetnju. ", 60)).toBe("svaku šetnju");
    expect(cleanPart("kauč\nkraj prozora!!!", 60)).toBe("kauč kraj prozora");
    expect(cleanPart(null, 60)).toBe("");
    expect(cleanPart("a".repeat(100), 60)).toHaveLength(60);
    expect(cleanPart("riječ ".repeat(20), 11)).toBe("riječ riječ");
  });

  it("veliko početno slovo radi i s hrvatskim znakovima", () => {
    expect(capitalizeFirst("čupava i nježna")).toBe("Čupava i nježna");
    expect(capitalizeFirst("đumbir")).toBe("Đumbir");
    expect(capitalizeFirst("")).toBe("");
  });

  it("izbacuje ponavljanja i prazno", () => {
    expect(uniqueTexts(["a", "", "b", "a"])).toEqual(["a", "b"]);
  });
});

describe("posveta", () => {
  const base: DedicationInput = { name: "", tone: "warm", voice: "we", parts: {} };
  const long = (letter: string, length: number) => letter.repeat(length);

  /** Svi podskupovi tema (2^5 = 32). */
  function topicSubsets(): DedicationTopic[][] {
    const subsets: DedicationTopic[][] = [];
    for (let mask = 0; mask < 1 << DEDICATION_TOPICS.length; mask += 1) {
      subsets.push(DEDICATION_TOPICS.filter((_, index) => (mask & (1 << index)) !== 0));
    }
    return subsets;
  }

  it("bez unosa ne nudi ništa", () => {
    expect(hasDedicationInput(base)).toBe(false);
    expect(buildDedications(base)).toEqual([]);
    expect(buildDedications({ ...base, name: "   ", parts: { habit: " . " } })).toEqual([]);
  });

  it("nudi tri do četiri različita prijedloga čim postoji ime ili jedna sitnica", () => {
    for (const tone of DEDICATION_TONES) {
      for (const voice of DEDICATION_VOICES) {
        const onlyName = buildDedications({ ...base, tone, voice, name: "Luna" });
        const onlyPart = buildDedications({ ...base, tone, voice, parts: { thanks: "svaku šetnju" } });
        for (const suggestions of [onlyName, onlyPart]) {
          expect(suggestions.length).toBeGreaterThanOrEqual(3);
          expect(suggestions.length).toBeLessThanOrEqual(4);
          expect(new Set(suggestions).size).toBe(suggestions.length);
        }
      }
    }
  });

  it("svaka složena posveta ima najviše 300 znakova, i s najdužim unosima", () => {
    let checked = 0;
    for (const tone of DEDICATION_TONES) {
      for (const voice of DEDICATION_VOICES) {
        for (const subset of topicSubsets()) {
          for (const name of ["", "Luna", long("N", DEDICATION_NAME_MAX), long("N", 500)]) {
            for (const partLength of [1, DEDICATION_PART_MAX, 1000]) {
              const parts = Object.fromEntries(subset.map((topic) => [topic, long("š", partLength)]));
              for (const suggestion of buildDedications({ name, tone, voice, parts })) {
                expect(suggestion.length).toBeLessThanOrEqual(DEDICATION_MAX);
                expect(suggestion.length).toBeGreaterThan(0);
                checked += 1;
              }
            }
          }
        }
      }
    }
    expect(DEDICATION_MAX).toBe(300);
    expect(checked).toBeGreaterThan(5000);
  });

  it("gradi rečenice od vlasnikovih riječi", () => {
    const [first] = buildDedications({
      name: "Luna",
      tone: "warm",
      voice: "we",
      parts: {
        habit: "si svako jutro čekala kraj vrata",
        place: "kauč kraj prozora",
        thanks: "svaku šetnju.",
        words: "tvrdoglava, nježna, uvijek gladna",
        years: "četrnaest godina",
      },
    });
    expect(first).toBe(
      "Luna. Tvrdoglava, nježna, uvijek gladna. Pamtimo kako si svako jutro čekala kraj vrata. Tvoje mjesto: kauč kraj prozora. Četrnaest godina zajedno. Hvala ti za svaku šetnju. Nedostaješ nam.",
    );
  });

  it("razlikuje »ja« i »mi«", () => {
    const parts = { habit: "si krao čarape" };
    expect(buildDedications({ ...base, voice: "i", name: "Rex", parts })[0]).toBe(
      "Rex. Pamtim kako si krao čarape. Nedostaješ mi.",
    );
    expect(buildDedications({ ...base, voice: "we", name: "Rex", parts })[0]).toBe(
      "Rex. Pamtimo kako si krao čarape. Nedostaješ nam.",
    );
  });

  it("ime nikad ne sklanja: stoji samo, kao zasebna rečenica, ili ga nema", () => {
    for (const tone of DEDICATION_TONES) {
      for (const voice of DEDICATION_VOICES) {
        const suggestions = buildDedications({
          name: "Luna",
          tone,
          voice,
          parts: { thanks: "sve", habit: "si spavala na jastuku", place: "balkon" },
        });
        for (const suggestion of suggestions) {
          expect(suggestion).not.toMatch(/Lun[eiuo]\b/);
          if (suggestion.includes("Luna")) {
            expect(suggestion.startsWith("Luna. ")).toBe(true);
            expect(suggestion.match(/Luna/g)).toHaveLength(1);
          }
          // Prijedlog nikad nije samo ime.
          expect(suggestion).not.toBe("Luna.");
        }
      }
    }
  });

  it("govori vlasnik, a ne ljubimac: nema rečenica u prvom licu ljubimca", () => {
    const closings = Object.values(tools.dedication.templates.closings)
      .flatMap((byVoice) => [...byVoice.i, ...byVoice.we])
      .join(" ");
    expect(closings).not.toMatch(/\b(čekam vas|moji ljudi|moja obitelj|bio sam|bila sam|volim vas)\b/i);
  });

  it("kad je predugo, ispušta cijele rečenice, a prvu i završnu čuva dok može", () => {
    const fitted = fitDedication(
      [
        { text: "Ime.", keep: true },
        { text: "a".repeat(200) + "." },
        { text: "b".repeat(150) + "." },
        { text: "Kraj.", keep: true },
      ],
      300,
    );
    expect(fitted).toBe(`Ime. ${"a".repeat(200)}. Kraj.`);
    expect(fitDedication([{ text: "x".repeat(400) }], 300)).toHaveLength(300);
    expect(fitDedication([{ text: "" }, { text: "Samo ovo." }])).toBe("Samo ovo.");
  });
});

describe("poruka sućuti", () => {
  const base: CondolenceInput = {
    relation: "friend",
    familiarity: "little",
    tone: "warm",
    address: "ti",
    petName: "",
    memory: "",
  };

  function everyInput(): CondolenceInput[] {
    const inputs: CondolenceInput[] = [];
    for (const relation of CONDOLENCE_RELATIONS) {
      for (const familiarity of CONDOLENCE_FAMILIARITIES) {
        for (const tone of CONDOLENCE_TONES) {
          for (const address of CONDOLENCE_ADDRESSES) {
            for (const petName of ["", "Miki"]) {
              for (const memory of ["", "kako me dočekivao na vratima"]) {
                inputs.push({ relation, familiarity, tone, address, petName, memory });
              }
            }
          }
        }
      }
    }
    return inputs;
  }

  it("za svaku kombinaciju nudi tri do četiri različite kratke poruke", () => {
    const inputs = everyInput();
    expect(inputs).toHaveLength(4 * 3 * 3 * 2 * 2 * 2);
    for (const input of inputs) {
      const messages = buildCondolences(input);
      expect(messages.length).toBeGreaterThanOrEqual(3);
      expect(messages.length).toBeLessThanOrEqual(4);
      expect(new Set(messages).size).toBe(messages.length);
      for (const message of messages) {
        expect(message.length).toBeGreaterThan(10);
        expect(message.length).toBeLessThanOrEqual(300);
        expect(message).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it("drži se odabranog obraćanja", () => {
    for (const input of everyInput()) {
      const text = buildCondolences(input).join(" ");
      if (input.address === "vi") {
        expect(text).not.toMatch(/\b(ti|te|tebe|tobom|tvoj\w*|želiš|ne moraš|reci|zovi|pokucaj|kažeš|poželiš)\b/);
      } else {
        expect(text).not.toMatch(/\b(Vas|Vam|Vaš\w*|želite|recite|zovite|pokucajte|kažete|poželite)\b/);
      }
    }
  });

  it("ime ljubimca ostaje u nominativu, a sjećanje ulazi doslovno", () => {
    const messages = buildCondolences({ ...base, familiarity: "well", petName: "Miki", memory: "kako je lajao na poštara." });
    expect(messages[0]).toBe(
      "Jako mi je žao. Miki nedostaje i meni. Uvijek ću pamtiti kako je lajao na poštara. Tu sam kad god želiš razgovarati, ili samo šutjeti u društvu.",
    );
    for (const input of everyInput()) {
      for (const message of buildCondolences(input)) {
        expect(message).not.toMatch(/Miki(ja|ju|jem|ju)\b/);
      }
    }
  });

  it("ne nudi ono što sama savjetuje izbjegavati", () => {
    const banned = /samo (pas|mačka|životinja)|uzmi drug|nabavi nov|znam (točno )?kako ti je|vrijeme liječi|boljem mjestu|lijep i dug život/i;
    for (const input of everyInput()) {
      for (const message of buildCondolences(input)) {
        expect(message).not.toMatch(banned);
      }
    }
  });
});

describe("kviz o oproštaju", () => {
  const complete: FarewellAnswers = {
    privacy: "close",
    children: "none",
    place: "either",
    tangible: "little",
    sharing: "talk",
    timing: "now",
  };

  function everyAnswerSet(): FarewellAnswers[] {
    const sets: FarewellAnswers[] = [];
    for (const privacy of FAREWELL_QUESTIONS.privacy) {
      for (const children of FAREWELL_QUESTIONS.children) {
        for (const place of FAREWELL_QUESTIONS.place) {
          for (const tangible of FAREWELL_QUESTIONS.tangible) {
            for (const sharing of FAREWELL_QUESTIONS.sharing) {
              for (const timing of FAREWELL_QUESTIONS.timing) {
                sets.push({ privacy, children, place, tangible, sharing, timing });
              }
            }
          }
        }
      }
    }
    return sets;
  }

  it("ne predlaže ništa dok nisu odgovorena sva pitanja", () => {
    expect(recommendFarewells({})).toEqual([]);
    const { timing: _timing, ...withoutOne } = complete;
    expect(isFarewellComplete(withoutOne)).toBe(false);
    expect(recommendFarewells(withoutOne)).toEqual([]);
    expect(isFarewellComplete(complete)).toBe(true);
  });

  it("za svaku od 729 kombinacija daje dva do tri različita načina, uvijek isto", () => {
    const sets = everyAnswerSet();
    expect(sets).toHaveLength(729);
    const reached = new Set<string>();
    for (const answers of sets) {
      const ways = recommendFarewells(answers);
      expect(ways.length).toBeGreaterThanOrEqual(2);
      expect(ways.length).toBeLessThanOrEqual(3);
      expect(new Set(ways).size).toBe(ways.length);
      expect(recommendFarewells({ ...answers })).toEqual(ways);
      for (const way of ways) {
        expect(FAREWELL_WAYS).toContain(way);
        reached.add(way);
      }
      const scores = scoreFarewell(answers);
      expect(scores[ways[0]]).toBe(Math.max(...Object.values(scores)));
    }
    // Svaki opisani način može se pojaviti kao prijedlog.
    expect([...reached].sort()).toEqual([...FAREWELL_WAYS].sort());
  });

  it("prati ono što je obitelji važno", () => {
    expect(
      recommendFarewells({
        privacy: "household",
        children: "none",
        place: "either",
        tangible: "little",
        sharing: "quiet",
        timing: "later",
      })[0],
    ).toBe("letter");
    expect(
      recommendFarewells({
        privacy: "everyone",
        children: "older",
        place: "carry",
        tangible: "no",
        sharing: "photos",
        timing: "lasting",
      })[0],
    ).toBe("page");
    expect(
      recommendFarewells({
        privacy: "household",
        children: "small",
        place: "yes",
        tangible: "yes",
        sharing: "quiet",
        timing: "lasting",
      })[0],
    ).toBe("plant");
    expect(recommendFarewells(complete)[0]).toBe("gathering");
  });

  it("opisi načina ne spominju cijene ni propise", () => {
    const text = Object.values(tools.farewell.ways)
      .map((way) => `${way.title} ${way.body}`)
      .join(" ");
    expect(text).not.toMatch(/€|eur|kun|cijen|zakon|pravilnik|dopušten|zabranjen|kazn/i);
  });
});

describe("izvori i tekstovi", () => {
  const sourced: Array<[string, readonly ToolSource[]]> = [
    ["dogAge", tools.dogAge.sources],
    ["catAge", tools.catAge.sources],
    ["quality", tools.quality.sources],
    ["firstDay", tools.firstDay.sources],
    ["condolence", tools.condolence.sources],
  ];

  it("svaki alat s činjeničnim tvrdnjama ima izvore s izdavačem, naslovom, poveznicom i svrhom", () => {
    for (const [name, sources] of sourced) {
      expect(sources.length, name).toBeGreaterThanOrEqual(3);
      const urls = sources.map((source) => source.url);
      expect(new Set(urls).size, name).toBe(urls.length);
      for (const source of sources) {
        expect(source.url).toMatch(/^https:\/\/[^\s]+$/);
        expect(source.publisher.length).toBeGreaterThan(2);
        expect(source.title.length).toBeGreaterThan(5);
        expect(source.supports.length).toBeGreaterThan(10);
      }
    }
    expect(tools.common.accessed).toBe("25. studenoga 2026.");
  });

  it("u tekstovima nema emojija ni nepopunjenih oznaka izvan predložaka", () => {
    const everything = JSON.stringify(tools);
    expect(everything).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(everything).not.toMatch(/dugin most|preko duge/i);
  });

  it("predlošci posvete i sućuti ne nude lažnu utjehu", () => {
    const templates = JSON.stringify([tools.dedication.templates, tools.condolence.blocks]);
    expect(templates).not.toMatch(/boljem mjestu|anđeo|duge|vrijeme liječi|sve se događa s razlogom/i);
  });

  it("tablica u tekstu odgovara tablici u kodu", () => {
    // Primjeri iz čestih pitanja računaju se iz iste tablice.
    expect(catToHumanYears(10 * 12).humanYears).toBe(56);
    expect(catToHumanYears(12).humanYears).toBe(15);
    expect(catToHumanYears(20 * 12).humanYears).toBe(96);
    expect(tools.catAge.faq[1].answer).toContain("56");
    expect(tools.catAge.faq[2].answer).toContain("96");
  });
});
