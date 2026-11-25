import { fill } from "@/lib/text";
import { capitalizeFirst, cleanPart, uniqueTexts } from "@/lib/tools/text";
import { tools } from "@/messages/hr/tools";

/**
 * Pomoćnik za posvetu. Nema AI-ja: prijedlozi se slažu isključivo od riječi koje je vlasnik upisao
 * i nekoliko kratkih rečenica iz poruka. Govori vlasnik (ja ili mi), nikad ljubimac.
 * Ime se ne sklanja: stoji samo, kao zasebna rečenica u nominativu, ili ga nema.
 */

/** Koliko znakova posveta smije imati na spomen-stranici. */
export const DEDICATION_MAX = 300;
export const DEDICATION_NAME_MAX = 30;
export const DEDICATION_PART_MAX = 60;
/** Najviše prijedloga koje nudimo odjednom. */
export const DEDICATION_SUGGESTIONS = 4;

export const DEDICATION_TONES = ["warm", "simple", "smile"] as const;
export type DedicationTone = (typeof DEDICATION_TONES)[number];

export const DEDICATION_VOICES = ["we", "i"] as const;
export type DedicationVoice = (typeof DEDICATION_VOICES)[number];

export const DEDICATION_TOPICS = ["habit", "place", "thanks", "words", "years"] as const;
export type DedicationTopic = (typeof DEDICATION_TOPICS)[number];

export type DedicationInput = {
  name: string;
  tone: DedicationTone;
  voice: DedicationVoice;
  parts: Partial<Record<DedicationTopic, string>>;
};

type Sentence = { text: string; keep?: boolean };

const templates = tools.dedication.templates;

/** Ima li dovoljno za prijedloge: ime ili barem jedna upisana sitnica. */
export function hasDedicationInput(input: DedicationInput): boolean {
  return (
    cleanPart(input.name, DEDICATION_NAME_MAX) !== "" ||
    DEDICATION_TOPICS.some((topic) => cleanPart(input.parts[topic], DEDICATION_PART_MAX) !== "")
  );
}

/**
 * Spaja rečenice i drži se granice od 300 znakova. Kad je predugo, ispuštaju se cijele rečenice
 * s kraja (prvo one bez oznake `keep`), nikad dio rečenice; prva rečenica ostaje.
 */
export function fitDedication(sentences: readonly Sentence[], max = DEDICATION_MAX): string {
  const kept = sentences.filter((sentence) => sentence.text !== "");
  const join = () => kept.map((sentence) => sentence.text).join(" ");
  while (join().length > max && kept.length > 1) {
    let dropIndex = -1;
    for (let index = kept.length - 1; index >= 1; index -= 1) {
      if (!kept[index].keep) {
        dropIndex = index;
        break;
      }
    }
    kept.splice(dropIndex === -1 ? kept.length - 1 : dropIndex, 1);
  }
  const text = join();
  return text.length > max ? text.slice(0, max).trim() : text;
}

/** Tri do četiri polazne posvete, svaka najviše 300 znakova; prazno ako nema unosa. */
export function buildDedications(input: DedicationInput): string[] {
  if (!hasDedicationInput(input)) {
    return [];
  }
  const name = cleanPart(input.name, DEDICATION_NAME_MAX);
  const part = (topic: DedicationTopic) => cleanPart(input.parts[topic], DEDICATION_PART_MAX);

  const nameSentence: Sentence = { text: name ? fill(templates.name, { text: name }) : "", keep: true };
  const sentences: Record<DedicationTopic, Sentence> = {
    habit: { text: part("habit") ? fill(templates.habit[input.voice], { text: part("habit") }) : "" },
    place: { text: part("place") ? fill(templates.place, { text: part("place") }) : "" },
    thanks: { text: part("thanks") ? fill(templates.thanks, { text: part("thanks") }) : "" },
    words: { text: part("words") ? fill(templates.words, { text: capitalizeFirst(part("words")) }) : "" },
    years: { text: part("years") ? fill(templates.years, { text: capitalizeFirst(part("years")) }) : "" },
  };
  const thanksAll: Sentence = { text: templates.thanksAll };
  const [firstClosing, secondClosing] = templates.closings[input.tone][input.voice];
  const closing: Sentence = { text: firstClosing, keep: true };
  const otherClosing: Sentence = { text: secondClosing, keep: true };

  const firstDetail =
    [sentences.words, sentences.years, sentences.place, sentences.habit].find((sentence) => sentence.text !== "") ??
    ({ text: "" } satisfies Sentence);
  const hasParts = DEDICATION_TOPICS.some((topic) => sentences[topic].text !== "");
  const thanks = sentences.thanks.text !== "" ? sentences.thanks : thanksAll;

  const candidates: Sentence[][] = [
    // Sve što je upisano, redom.
    [nameSentence, sentences.words, sentences.habit, sentences.place, sentences.years, sentences.thanks, closing],
    // U središtu zahvala.
    [nameSentence, thanks, sentences.habit, closing],
    // Kratko: ime, jedna sitnica i završna rečenica.
    [nameSentence, firstDetail, otherClosing],
    // Bez imena, samo sjećanja.
    hasParts ? [sentences.habit, sentences.place, sentences.years, sentences.thanks, otherClosing] : [],
    // Rezerve kad je upisano malo, da prijedloga bude barem tri.
    [nameSentence, thanksAll, otherClosing],
    [nameSentence, closing],
    [thanksAll, closing],
  ];

  return uniqueTexts(candidates.map((candidate) => fitDedication(candidate))).slice(0, DEDICATION_SUGGESTIONS);
}
