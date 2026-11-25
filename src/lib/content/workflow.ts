import type { ArticleStatus } from "@/lib/content/types";

/**
 * Tijek objave članka: nacrt → na pregledu → odobreno → objavljeno. Čista logika koju dijele
 * poslužiteljske akcije i sučelje, pa obje strane uvijek odlučuju isto. Bazu ovo ne zamjenjuje:
 * ograničenje `articles_publish_gate` odbija objavu bez odobrenja i bez potrebnog pregleda.
 */

export type ReviewState = {
  status: ArticleStatus;
  needsVetReview: boolean;
  vetReviewedAt: string | null;
  ownerApprovedAt: string | null;
};

export function vetReviewMissing(state: Pick<ReviewState, "needsVetReview" | "vetReviewedAt">): boolean {
  return state.needsVetReview && state.vetReviewedAt === null;
}

export const WORKFLOW_INTENTS = [
  "submit_review",
  "vet_review",
  "approve",
  "publish",
  "unpublish",
  "to_draft",
] as const;
export type WorkflowIntent = (typeof WORKFLOW_INTENTS)[number];

export function isWorkflowIntent(value: string): value is WorkflowIntent {
  return (WORKFLOW_INTENTS as readonly string[]).includes(value);
}

/** Status iz kojeg korak redovito kreće. */
const INTENT_FROM: Record<WorkflowIntent, ArticleStatus> = {
  submit_review: "draft",
  vet_review: "in_review",
  approve: "in_review",
  publish: "approved",
  unpublish: "published",
  to_draft: "archived",
};

/**
 * Smije li poslužitelj pokušati korak iz zadanog stanja. Ovdje se gleda samo redoslijed koraka;
 * smije li članak doista biti objavljen, odlučuje baza. Odobrenje se može dati i članku koji je
 * označen kao odobren, a odobrenja nema (takvo stanje nastaje samo mimo sučelja).
 */
export function intentPermitted(state: ReviewState, intent: WorkflowIntent): boolean {
  if (intent === "approve" && state.status === "approved") {
    return state.ownerApprovedAt === null;
  }
  return state.status === INTENT_FROM[intent];
}

/** Koraci koje sučelje nudi u zadanom stanju. Odobrenje uz pregled koji nedostaje nije među njima. */
export function allowedIntents(state: ReviewState): WorkflowIntent[] {
  switch (state.status) {
    case "draft":
      return ["submit_review"];
    case "in_review":
      if (!state.needsVetReview) {
        return ["approve"];
      }
      return vetReviewMissing(state) ? ["vet_review"] : ["vet_review", "approve"];
    case "approved": {
      const blocker = publishBlocker(state);
      if (blocker === null) {
        return ["publish"];
      }
      // Bez pregleda nema ni odobrenja: takav se članak spremanjem vraća na pregled.
      return blocker === "not_approved" ? ["approve"] : [];
    }
    case "published":
      return ["unpublish"];
    case "archived":
      return ["to_draft"];
  }
}

export type PublishBlocker = "vet_missing" | "not_approved";

/** Zašto se članak još ne može objaviti; null znači da je sve na mjestu. */
export function publishBlocker(state: ReviewState): PublishBlocker | null {
  if (vetReviewMissing(state)) {
    return "vet_missing";
  }
  if (state.ownerApprovedAt === null || (state.status !== "approved" && state.status !== "published")) {
    return "not_approved";
  }
  return null;
}

export type EditEffect = {
  status: ArticleStatus;
  clearVetReview: boolean;
  clearOwnerApproval: boolean;
};

/**
 * Što izmjena znači za pregled i odobrenje. Pregledan tekst se ne smije promijeniti neprimjetno:
 * - Pregled veterinara vrijedi za točno onaj tekst koji je pregledan, pa ga izmjena teksta ili
 *   izvora briše, u kojem god stanju članak bio.
 * - Odobren ili objavljen članak kojem treba pregled, a više ga nema, vraća se na pregled i gubi
 *   odobrenje (time se i povlači s objave).
 * - Članak kojem pregled ne treba ostaje u svom stanju; objavljen ostaje objavljen.
 */
export function reviewAfterEdit(
  current: ReviewState,
  edit: { needsVetReview: boolean; contentChanged: boolean },
): EditEffect {
  const clearVetReview = edit.contentChanged && current.vetReviewedAt !== null;
  const vetMissing = edit.needsVetReview && (current.vetReviewedAt === null || clearVetReview);
  const wasCleared = current.status === "approved" || current.status === "published";
  if (wasCleared && vetMissing) {
    return { status: "in_review", clearVetReview, clearOwnerApproval: true };
  }
  return { status: current.status, clearVetReview, clearOwnerApproval: false };
}

/** Izmjena koja briše pregled ili odobrenje traži izričitu potvrdu prije spremanja. */
export function editNeedsConfirmation(current: ReviewState, effect: EditEffect): boolean {
  return effect.clearVetReview || effect.clearOwnerApproval || effect.status !== current.status;
}
