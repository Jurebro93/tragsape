"use client";

import { ActionForm, type AdminAction } from "@/components/admin/action-form";
import { Field } from "@/components/ui/field";
import { adminPanel } from "@/messages/hr/admin-panel";
import type { AdminActionState } from "@/server/admin/forms";

const t = adminPanel.donations.payouts.proof;

/** Ista granica kao na poslužitelju i u pohrani; ovdje samo štedi slanje prevelike datoteke. */
const MAX_BYTES = 10 * 1024 * 1024;

/** Preusmjeravanje i 404 Next javlja iznimkom; njih se ne smije progutati. */
function isNavigationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_")
  );
}

/**
 * Učitavanje dokaza o isplati. Datoteku prima poslužiteljska akcija; ako zahtjev do nje i ne
 * stigne (npr. poslužitelj odbije preveliko tijelo), admin dobije poruku umjesto srušene stranice.
 */
export function ProofUploadForm({ action }: { action: AdminAction }) {
  async function upload(previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
    const file = formData.get("proof");
    if (!(file instanceof File) || file.size === 0) {
      return { error: t.errors.missing };
    }
    if (file.size > MAX_BYTES) {
      return { error: t.errors.tooLarge };
    }
    try {
      return await action(previous, formData);
    } catch (error) {
      if (isNavigationError(error)) {
        throw error;
      }
      return { error: t.errors.failed };
    }
  }

  return (
    <ActionForm
      action={upload}
      submitLabel={t.upload}
      pendingLabel={t.uploading}
      doneLabel={t.uploaded}
      variant="secondary"
      resetOnDone
    >
      <Field label={t.file} htmlFor="payout-proof" hint={t.hint}>
        <input
          id="payout-proof"
          name="proof"
          type="file"
          required
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="min-h-11 w-full text-[15px] file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-full file:border-2 file:border-plum file:bg-white file:px-4 file:font-bold file:text-plum"
        />
      </Field>
    </ActionForm>
  );
}
