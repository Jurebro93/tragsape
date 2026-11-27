import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Nedostaje varijabla okruženja ${name}. Pogledaj .env.example.`);
  }
  return value;
}

function optional(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : null;
}

/** Sve varijable okruženja čitaju se ovdje i tek kad zatrebaju, pa build ne traži tajne. */
export const env = {
  get siteUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabasePublishableKey() {
    return required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  },
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY");
  },
  get hashSecret() {
    return required("HASH_SECRET");
  },
  get stripeSecretKey() {
    return optional("STRIPE_SECRET_KEY");
  },
  get stripeWebhookSecret() {
    return optional("STRIPE_WEBHOOK_SECRET");
  },
  get resendApiKey() {
    return optional("RESEND_API_KEY");
  },
  get emailFrom() {
    return optional("EMAIL_FROM") ?? "Trag šape <pozdrav@tragsape.com>";
  },
  get mailpitUrl() {
    return optional("MAILPIT_URL");
  },
  get turnstileSecretKey() {
    return optional("TURNSTILE_SECRET_KEY");
  },
  /** Tajna kojom se zakazani poslovi predstavljaju endpointu /api/cron/*. */
  get cronSecret() {
    return optional("CRON_SECRET");
  },
  get anthropicApiKey() {
    return optional("ANTHROPIC_API_KEY");
  },
  /** OIB (pravna osoba) ili matični broj (fizička osoba) trgovca; ulazi u naziv datoteke cjenika. */
  get sellerTaxId() {
    return optional("SELLER_TAX_ID")?.replace(/[^0-9A-Za-z]/g, "") || null;
  },
  /**
   * Zaglavlje u koje posrednik domaćina upisuje pravu adresu posjetitelja (npr. `cf-connecting-ip`).
   * Bez njega se uzima prva adresa iz `x-forwarded-for`, koju posjetitelj ponekad može sam podmetnuti.
   */
  get clientIpHeader() {
    return optional("CLIENT_IP_HEADER")?.toLowerCase() ?? null;
  },
};
