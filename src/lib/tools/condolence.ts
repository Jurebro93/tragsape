import { fill } from "@/lib/text";
import { cleanPart, uniqueTexts } from "@/lib/tools/text";
import { tools } from "@/messages/hr/tools";

/**
 * Pomoćnik za poruku sućuti. Poruke se slažu od kratkih rečenica iz poruka i riječi koje pošiljatelj
 * upiše. Rečenice ne ovise o spolu pošiljatelja ni ljubimca, a ime ljubimca stoji u nominativu.
 * Što radije ne reći i što pomaže dolazi iz izvora navedenih u porukama (RSPCA, WSU, UF).
 */

export const CONDOLENCE_NAME_MAX = 30;
export const CONDOLENCE_MEMORY_MAX = 80;
export const CONDOLENCE_MESSAGES = 4;

export const CONDOLENCE_RELATIONS = ["friend", "colleague", "family", "neighbour"] as const;
export type CondolenceRelation = (typeof CONDOLENCE_RELATIONS)[number];

export const CONDOLENCE_FAMILIARITIES = ["well", "little", "none"] as const;
export type CondolenceFamiliarity = (typeof CONDOLENCE_FAMILIARITIES)[number];

export const CONDOLENCE_TONES = ["warm", "short", "help"] as const;
export type CondolenceTone = (typeof CONDOLENCE_TONES)[number];

export const CONDOLENCE_ADDRESSES = ["ti", "vi"] as const;
export type CondolenceAddress = (typeof CONDOLENCE_ADDRESSES)[number];

export type CondolenceInput = {
  relation: CondolenceRelation;
  familiarity: CondolenceFamiliarity;
  tone: CondolenceTone;
  address: CondolenceAddress;
  petName: string;
  memory: string;
};

const blocks = tools.condolence.blocks;

function join(sentences: readonly string[]): string {
  return sentences.filter((sentence) => sentence !== "").join(" ");
}

/** Tri do četiri kratke poruke sućuti koje pošiljatelj može doraditi. */
export function buildCondolences(input: CondolenceInput): string[] {
  const name = cleanPart(input.petName, CONDOLENCE_NAME_MAX);
  const memoryText = cleanPart(input.memory, CONDOLENCE_MEMORY_MAX);
  const { address, relation, tone } = input;

  const bondSet = blocks.bond[input.familiarity];
  const bond = name ? fill(bondSet.named[address], { name }) : bondSet.unnamed[address];
  const memory = memoryText ? fill(blocks.memory, { text: memoryText }) : "";
  const closing = blocks.closing[relation];
  const otherTone: CondolenceTone = tone === "help" ? "warm" : "help";

  return uniqueTexts([
    // Glavna poruka u odabranom tonu.
    join([blocks.opening[tone], bond, memory, closing[tone][address]]),
    // Poziv na razgovor: vlastito sjećanje ako postoji, inače priznanje koliko ljubimac znači.
    join([blocks.opening.warm, memory || bond, blocks.invite[address]]),
    // Sasvim kratko, bez očekivanja odgovora.
    join([blocks.opening.short, blocks.thinking[address], blocks.noReply[address]]),
    // Ista toplina, drukčiji završetak.
    join([bond, closing[otherTone][address]]),
  ]).slice(0, CONDOLENCE_MESSAGES);
}
