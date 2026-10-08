// Typed, fail-loud access to server-side configuration.
//
// Values are read lazily so `next build` doesn't need every secret, but any
// route that touches one throws a clear error if it's missing. Never import
// this from client components: it holds secrets.

if (typeof window !== "undefined") {
  throw new Error("lib/server/env.ts must not be imported in the browser.");
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Add it to .env.local (see .env.example).`
    );
  }
  return value;
}

// Each variable is referenced statically (not process.env[name]) so Next can
// inline NEXT_PUBLIC_* values in every runtime, including middleware.
export const env = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  // Bypasses row level security. Server routes only.
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  get openaiApiKey() {
    return required("OPENAI_API_KEY", process.env.OPENAI_API_KEY);
  },

  // Render engine settings. The key is optional: without it /api/generate falls
  // back to the illustrative placeholder, so the UI still works in local dev.
  get openaiApiKeyIfSet() {
    return process.env.OPENAI_API_KEY || undefined;
  },
  get openaiBaseUrl() {
    return process.env.OPENAI_BASE_URL || "https://api.openai.com";
  },
  get imageModel() {
    return process.env.IMAGE_MODEL || "gpt-image-1";
  },
  // Text model used for the "improve my description" helper in the studio.
  get textModel() {
    return process.env.TEXT_MODEL || "gpt-4o-mini";
  },
  get renderQuality() {
    return process.env.RENDER_QUALITY || "medium"; // low | medium | high
  },
  get maxRendersPerDay() {
    return Number(process.env.MAX_RENDERS_PER_DAY) || 100;
  },
  // Spend controls (all count non-failed renders in the last 24 hours).
  get maxRendersPerIpPerDay() {
    return Number(process.env.MAX_RENDERS_PER_IP_PER_DAY) || 300;
  },
  get maxRendersGlobalPerDay() {
    return Number(process.env.MAX_RENDERS_GLOBAL_PER_DAY) || 1000;
  },
  // How many times one look can be refined before starting again from the photo.
  get maxRefinements() {
    return Number(process.env.MAX_REFINEMENTS) || 6;
  },
  // Venue photos sent to the model per render (the view to restyle + references).
  get maxReferencePhotos() {
    return Number(process.env.MAX_REFERENCE_PHOTOS) || 4;
  },
  // Orders: each one makes work for a stylist, so they're capped like renders.
  get maxOrdersPerDay() {
    return Number(process.env.MAX_ORDERS_PER_DAY) || 5;
  },
  get maxOrdersPerIpPerDay() {
    return Number(process.env.MAX_ORDERS_PER_IP_PER_DAY) || 20;
  },
  // Optional: what one render costs you, recorded on each render row. Left unset
  // by default because it depends on your model, quality and negotiated pricing.
  get renderCostPence() {
    const n = Number(process.env.RENDER_COST_PENCE);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  },

  // Transactional email (supplier order notifications). Optional: without a
  // Resend API key, emails are logged instead of sent, so local dev and preview
  // work without a provider. NOTIFY_FROM_EMAIL must be a verified Resend sender
  // in production.
  get resendApiKeyIfSet() {
    return process.env.RESEND_API_KEY || undefined;
  },
  get notifyFromEmail() {
    return process.env.NOTIFY_FROM_EMAIL || "Styled <onboarding@resend.dev>";
  },
  // Absolute base URL for links in emails (the portal, order pages).
  get siteUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL || "https://styled-landing-zeta.vercel.app").replace(/\/$/, "");
  },

  // Shared secret for scheduled jobs (Vercel Cron sends it as a Bearer token).
  // Without it the cron endpoint refuses to run, so set it to enable auto-sync.
  get cronSecretIfSet() {
    return process.env.CRON_SECRET || undefined;
  },
};
