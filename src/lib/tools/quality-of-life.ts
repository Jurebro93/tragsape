/**
 * Upitnik o kvaliteti života, po uzoru na ljestvicu „HHHHHMM" dr. Alice Villalobos.
 *
 * Izvori (pristupljeno 25. 11. 2026.): A. Villalobos, „Quality Of Life Scale", Veterinary Practice
 * News (30. 11. 2009.) i autoričin obrazac ljestvice (izvorno VPN 09/2004; knjiga Canine and Feline
 * Geriatric Oncology, Blackwell 2007; revidirano za IVAPM 2011.): sedam kriterija, svaki 0–10
 * (10 je idealno), zbroj veći od 35 = prihvatljiva kvaliteta života za nastavak palijativne skrbi.
 * Ovdje su samo struktura i zbrajanje; opisi područja naši su i nalaze se u porukama.
 */

export const QOL_DIMENSIONS = ["pain", "appetite", "hydration", "hygiene", "joy", "mobility", "goodDays"] as const;
export type QolDimension = (typeof QOL_DIMENSIONS)[number];

export const QOL_MIN_SCORE = 0;
export const QOL_MAX_SCORE = 10;
export const QOL_MAX_TOTAL = QOL_DIMENSIONS.length * QOL_MAX_SCORE;
/** Vrijednost koju navodi autorica ljestvice: prihvatljivo je tek ono iznad nje. */
export const QOL_REFERENCE_TOTAL = 35;

export type QolAnswers = Partial<Record<QolDimension, number>>;

export type QolSummary = {
  answered: number;
  complete: boolean;
  /** Zbroj; null dok nisu ocijenjena sva područja. */
  total: number | null;
  /** Je li zbroj veći od 35; null dok upitnik nije potpun. */
  aboveReference: boolean | null;
  /** Područja s najnižom ocjenom; prazno ako su sve ocjene jednake ili upitnik nije potpun. */
  lowest: QolDimension[];
  lowestScore: number | null;
};

export function isValidQolScore(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= QOL_MIN_SCORE && value <= QOL_MAX_SCORE;
}

export function summarizeQuality(answers: QolAnswers): QolSummary {
  const rated = QOL_DIMENSIONS.filter((dimension) => isValidQolScore(answers[dimension]));
  const complete = rated.length === QOL_DIMENSIONS.length;
  if (!complete) {
    return { answered: rated.length, complete: false, total: null, aboveReference: null, lowest: [], lowestScore: null };
  }
  const scores = QOL_DIMENSIONS.map((dimension) => answers[dimension] as number);
  const total = scores.reduce((sum, score) => sum + score, 0);
  const lowestScore = Math.min(...scores);
  const allEqual = scores.every((score) => score === lowestScore);
  return {
    answered: rated.length,
    complete: true,
    total,
    aboveReference: total > QOL_REFERENCE_TOTAL,
    lowest: allEqual ? [] : QOL_DIMENSIONS.filter((dimension) => answers[dimension] === lowestScore),
    lowestScore,
  };
}
