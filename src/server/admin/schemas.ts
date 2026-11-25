import "server-only";
import { z } from "zod";
import type { ProductKey } from "@/lib/pricing";
import { adminPanel } from "@/messages/hr/admin-panel";
import {
  formText,
  isUuid,
  parseDay,
  parseEuroToCents,
  parseInteger,
  zagrebDayEndIso,
  zagrebDayStartIso,
} from "./forms";

/**
 * Provjera adminovih obrazaca. Sheme primaju sirove vrijednosti polja i vraćaju redak spreman
 * za bazu; poruke grešaka su iz središnjih tekstova. Ograničenja prate ona u bazi
 * (`promo_partner_kind`, `promo_percent_range`, duljine), pa admin dobije razumljivu poruku
 * umjesto odbijenog upisa.
 */

const t = adminPanel;

/** Proizvodi na koje kod može vrijediti. Zapis po ključu javlja grešku ako se popis i tip raziđu. */
const PRODUCT_KEY_SET: Record<ProductKey, true> = {
  memorial: true,
  memorial_portrait: true,
  upgrade_portrait: true,
  gesture_7d: true,
  gesture_30d: true,
  gesture_365d: true,
};
export const PRODUCT_KEYS = Object.keys(PRODUCT_KEY_SET) as [ProductKey, ...ProductKey[]];

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function firstIssue<T>(result: z.ZodSafeParseResult<T>, fallback: string): Parsed<T> {
  if (result.success) {
    return { ok: true, value: result.data };
  }
  return { ok: false, error: result.error.issues[0]?.message || fallback };
}

/** Prekida obradu s porukom za admina. */
function reject(ctx: { issues: unknown[] }, input: unknown, message: string): never {
  ctx.issues.push({ code: "custom", message, input });
  return z.NEVER;
}

// ---------------------------------------------------------------------------------------------
// Kodovi za popust
// ---------------------------------------------------------------------------------------------

const promoSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9][A-Z0-9_-]{2,39}$/, t.codes.promo.errors.code),
    kind: z.enum(["promo", "partner"], t.common.invalid),
    partnerId: z.string(),
    discountType: z.enum(["percent", "fixed"], t.common.invalid),
    discountValue: z.string(),
    appliesTo: z
      .array(z.enum(PRODUCT_KEYS, t.common.invalid))
      .min(1, t.codes.promo.errors.appliesTo)
      .transform((keys) => Array.from(new Set(keys))),
    maxRedemptions: z.string(),
    validFrom: z.string(),
    validTo: z.string(),
    active: z.boolean(),
  })
  .transform((input, ctx) => {
    const e = t.codes.promo.errors;

    // promo_partner_kind: partnerski kod ima partnera, promo kod ga nema.
    let partnerId: string | null = null;
    if (input.kind === "partner") {
      if (!isUuid(input.partnerId)) {
        return reject(ctx, input, e.partnerRequired);
      }
      partnerId = input.partnerId;
    }

    // promo_percent_range: postotak je 1–100; fiksni iznos se upisuje u eurima, sprema u centima.
    const discountValue =
      input.discountType === "percent"
        ? parseInteger(input.discountValue, 1, 100)
        : parseEuroToCents(input.discountValue);
    if (discountValue === null || discountValue <= 0) {
      return reject(ctx, input, input.discountType === "percent" ? e.percent : e.fixed);
    }

    let maxRedemptions: number | null = null;
    if (input.maxRedemptions !== "") {
      maxRedemptions = parseInteger(input.maxRedemptions, 1, 1_000_000);
      if (maxRedemptions === null) {
        return reject(ctx, input, e.maxRedemptions);
      }
    }

    const fromDay = input.validFrom === "" ? null : parseDay(input.validFrom);
    const toDay = input.validTo === "" ? null : parseDay(input.validTo);
    if ((input.validFrom !== "" && !fromDay) || (input.validTo !== "" && !toDay)) {
      return reject(ctx, input, e.date);
    }
    if (fromDay && toDay && toDay < fromDay) {
      return reject(ctx, input, e.dateOrder);
    }

    return {
      code: input.code,
      kind: input.kind,
      partner_id: partnerId,
      discount_type: input.discountType,
      discount_value: discountValue,
      applies_to: input.appliesTo as string[],
      max_redemptions: maxRedemptions,
      valid_from: fromDay ? zagrebDayStartIso(fromDay) : null,
      valid_to: toDay ? zagrebDayEndIso(toDay) : null,
      active: input.active,
    };
  });

export type PromoRow = z.output<typeof promoSchema>;

export function parsePromoForm(formData: FormData): Parsed<PromoRow> {
  return firstIssue(
    promoSchema.safeParse({
      code: formText(formData, "code"),
      kind: formText(formData, "kind"),
      partnerId: formText(formData, "partner_id"),
      discountType: formText(formData, "discount_type"),
      discountValue: formText(formData, "discount_value"),
      appliesTo: formData.getAll("applies_to").filter((value) => typeof value === "string"),
      maxRedemptions: formText(formData, "max_redemptions"),
      validFrom: formText(formData, "valid_from"),
      validTo: formText(formData, "valid_to"),
      active: formData.get("active") === "on",
    }),
    t.common.invalid,
  );
}

// ---------------------------------------------------------------------------------------------
// Partneri
// ---------------------------------------------------------------------------------------------

const partnerSchema = z
  .object({
    name: z.string().min(1, t.codes.partners.errors.name).max(160, t.codes.partners.errors.name),
    type: z.enum(["vet", "crematorium", "other"], t.common.invalid),
    contact: z.string().max(300, t.codes.partners.errors.contact),
    commissionType: z.enum(["percent", "fixed"], t.common.invalid),
    commissionValue: z.string(),
    active: z.boolean(),
    notes: z.string().max(2000, t.codes.partners.errors.notes),
  })
  .transform((input, ctx) => {
    const e = t.codes.partners.errors;
    const commissionValue =
      input.commissionType === "percent"
        ? parseInteger(input.commissionValue, 0, 100)
        : parseEuroToCents(input.commissionValue);
    if (commissionValue === null) {
      return reject(ctx, input, input.commissionType === "percent" ? e.percent : e.fixed);
    }
    return {
      name: input.name,
      type: input.type,
      contact: input.contact === "" ? null : input.contact,
      commission_type: input.commissionType,
      commission_value: commissionValue,
      active: input.active,
      notes: input.notes === "" ? null : input.notes,
    };
  });

export type PartnerRow = z.output<typeof partnerSchema>;

export function parsePartnerForm(formData: FormData): Parsed<PartnerRow> {
  return firstIssue(
    partnerSchema.safeParse({
      name: formText(formData, "name"),
      type: formText(formData, "type"),
      contact: formText(formData, "contact"),
      commissionType: formText(formData, "commission_type"),
      commissionValue: formText(formData, "commission_value"),
      active: formData.get("active") === "on",
      notes: formText(formData, "notes"),
    }),
    t.common.invalid,
  );
}

/** Bilješka uz isplatu provizije; prazna se sprema kao null. */
export function parseCommissionNote(formData: FormData): Parsed<string | null> {
  const result = z.string().max(500, t.codes.commissions.noteError).safeParse(formText(formData, "note"));
  if (!result.success) {
    return { ok: false, error: t.codes.commissions.noteError };
  }
  return { ok: true, value: result.data === "" ? null : result.data };
}

// ---------------------------------------------------------------------------------------------
// Donacije: postavke, azili, isplate
// ---------------------------------------------------------------------------------------------

const donationSettingsSchema = z
  .object({
    perMemorial: z.string(),
    shelterId: z.string(),
  })
  .transform((input, ctx) => {
    const e = t.donations.settings.errors;
    const cents = parseEuroToCents(input.perMemorial);
    if (cents === null) {
      return reject(ctx, input, e.amount);
    }
    if (input.shelterId !== "" && !isUuid(input.shelterId)) {
      return reject(ctx, input, e.shelter);
    }
    return {
      donation_per_memorial_cents: cents,
      active_shelter_id: input.shelterId === "" ? null : input.shelterId,
    };
  });

export type DonationSettingsRow = z.output<typeof donationSettingsSchema>;

export function parseDonationSettingsForm(formData: FormData): Parsed<DonationSettingsRow> {
  return firstIssue(
    donationSettingsSchema.safeParse({
      perMemorial: formText(formData, "per_memorial"),
      shelterId: formText(formData, "shelter_id"),
    }),
    t.common.invalid,
  );
}

/** Samo http(s) adrese; sve drugo (npr. javascript:) ne smije postati poveznica na javnoj stranici. */
function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const shelterSchema = z
  .object({
    name: z.string().min(1, t.donations.shelters.errors.name).max(160, t.donations.shelters.errors.name),
    url: z
      .string()
      .max(300, t.donations.shelters.errors.url)
      .refine((value) => value === "" || isHttpUrl(value), t.donations.shelters.errors.url),
    active: z.boolean(),
  })
  .transform((input) => ({
    name: input.name,
    url: input.url === "" ? null : input.url,
    active: input.active,
  }));

export type ShelterRow = z.output<typeof shelterSchema>;

export function parseShelterForm(formData: FormData): Parsed<ShelterRow> {
  return firstIssue(
    shelterSchema.safeParse({
      name: formText(formData, "name"),
      url: formText(formData, "url"),
      active: formData.get("active") === "on",
    }),
    t.common.invalid,
  );
}

const payoutSchema = z
  .object({
    shelterId: z.string().refine(isUuid, t.donations.payouts.errors.shelter),
    amount: z.string(),
    paidOn: z.string(),
    note: z.string().max(500, t.donations.payouts.errors.note),
    published: z.boolean(),
  })
  .transform((input, ctx) => {
    const e = t.donations.payouts.errors;
    const cents = parseEuroToCents(input.amount);
    if (cents === null || cents <= 0) {
      return reject(ctx, input, e.amount);
    }
    const paidOn = parseDay(input.paidOn);
    if (!paidOn) {
      return reject(ctx, input, e.paidOn);
    }
    return {
      shelter_id: input.shelterId,
      amount_cents: cents,
      paid_on: paidOn,
      note: input.note === "" ? null : input.note,
      published: input.published,
    };
  });

export type PayoutRow = z.output<typeof payoutSchema>;

export function parsePayoutForm(formData: FormData): Parsed<PayoutRow> {
  return firstIssue(
    payoutSchema.safeParse({
      shelterId: formText(formData, "shelter_id"),
      amount: formText(formData, "amount"),
      paidOn: formText(formData, "paid_on"),
      note: formText(formData, "note"),
      published: formData.get("published") === "on",
    }),
    t.common.invalid,
  );
}

// ---------------------------------------------------------------------------------------------
// Cijene i postavke
// ---------------------------------------------------------------------------------------------

/** Popust za drugi memorijal: cijeli postotak 0–100. */
export function parseRepeatDiscount(formData: FormData): Parsed<number> {
  const result = z
    .string()
    .transform((value, ctx) => parseInteger(value, 0, 100) ?? reject(ctx, value, t.settings.repeat.error))
    .safeParse(formText(formData, "repeat_discount_pct"));
  return firstIssue(result, t.settings.repeat.error);
}
