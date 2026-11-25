/**
 * Kviz „Koji oproštaj odgovara vašoj obitelji". Nema izvora ni činjeničnih tvrdnji: odgovori
 * samo zbrajaju sklonosti i izdvajaju dva do tri načina oproštaja. Bez cijena i bez prava.
 */

export const FAREWELL_WAYS = ["gathering", "box", "plant", "page", "letter", "walk"] as const;
export type FarewellWay = (typeof FAREWELL_WAYS)[number];

export const FAREWELL_QUESTIONS = {
  privacy: ["household", "close", "everyone"],
  children: ["small", "older", "none"],
  place: ["yes", "either", "carry"],
  tangible: ["yes", "little", "no"],
  sharing: ["talk", "photos", "quiet"],
  timing: ["now", "later", "lasting"],
} as const;

export type FarewellQuestion = keyof typeof FAREWELL_QUESTIONS;
export const FAREWELL_QUESTION_IDS = Object.keys(FAREWELL_QUESTIONS) as FarewellQuestion[];
export type FarewellOption<Q extends FarewellQuestion = FarewellQuestion> = (typeof FAREWELL_QUESTIONS)[Q][number];
export type FarewellAnswers = { [Q in FarewellQuestion]?: FarewellOption<Q> };

type Weights = Partial<Record<FarewellWay, number>>;

/** Koliko pojedini odgovor govori u prilog kojem načinu. */
const WEIGHTS: { [Q in FarewellQuestion]: Record<FarewellOption<Q>, Weights> } = {
  privacy: {
    household: { letter: 2, box: 2, plant: 1 },
    close: { gathering: 2, walk: 1, plant: 1 },
    everyone: { page: 3, gathering: 1 },
  },
  children: {
    small: { plant: 2, box: 2 },
    older: { letter: 1, page: 1, box: 1, gathering: 1 },
    none: {},
  },
  place: {
    yes: { plant: 3, walk: 2 },
    either: {},
    carry: { page: 2, box: 2, letter: 1 },
  },
  tangible: {
    yes: { box: 3, plant: 1 },
    little: { box: 1, letter: 1 },
    no: { walk: 2, page: 1, gathering: 1 },
  },
  sharing: {
    talk: { gathering: 3, walk: 1 },
    photos: { page: 3, box: 1 },
    quiet: { letter: 3, plant: 1 },
  },
  timing: {
    now: { gathering: 2, walk: 2 },
    later: { letter: 1, box: 1, page: 1 },
    lasting: { page: 2, plant: 2 },
  },
};

export function isFarewellComplete(answers: FarewellAnswers): boolean {
  return FAREWELL_QUESTION_IDS.every((question) => {
    const answer = answers[question];
    return answer !== undefined && (FAREWELL_QUESTIONS[question] as readonly string[]).includes(answer);
  });
}

export function scoreFarewell(answers: FarewellAnswers): Record<FarewellWay, number> {
  const scores = Object.fromEntries(FAREWELL_WAYS.map((way) => [way, 0])) as Record<FarewellWay, number>;
  for (const question of FAREWELL_QUESTION_IDS) {
    const answer = answers[question];
    if (answer === undefined) {
      continue;
    }
    const weights = (WEIGHTS[question] as Record<string, Weights>)[answer] ?? {};
    for (const way of FAREWELL_WAYS) {
      scores[way] += weights[way] ?? 0;
    }
  }
  return scores;
}

/**
 * Dva do tri načina oproštaja s najviše bodova, ili prazno dok nisu odgovorena sva pitanja.
 * Izjednačene bodove razrješava stalni redoslijed u FAREWELL_WAYS, pa je ishod uvijek isti.
 */
export function recommendFarewells(answers: FarewellAnswers): FarewellWay[] {
  if (!isFarewellComplete(answers)) {
    return [];
  }
  const scores = scoreFarewell(answers);
  const ranked = [...FAREWELL_WAYS].sort(
    (a, b) => scores[b] - scores[a] || FAREWELL_WAYS.indexOf(a) - FAREWELL_WAYS.indexOf(b),
  );
  const top = ranked.slice(0, 3);
  return scores[top[2]] > 0 ? top : top.slice(0, 2);
}
