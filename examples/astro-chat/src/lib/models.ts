/**
 * The models offered in the picker.
 *
 * Two providers are supported. Vercel AI Gateway takes a plain `provider/model`
 * string; OpenRouter is reached over its OpenAI-compatible endpoint. Each entry
 * declares which one serves it, so the server can route on the model alone.
 *
 * Shared by the island and the endpoint, so the allowlist the server enforces
 * is exactly the list the UI renders.
 */

export type ProviderId = "openrouter" | "gateway";

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  /** Environment variable that must be set for this provider to be usable. */
  envVar: string;
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    envVar: "OPENROUTER_API_KEY",
  },
  gateway: {
    id: "gateway",
    label: "AI Gateway",
    envVar: "AI_GATEWAY_API_KEY",
  },
};

export interface ModelOption {
  id: string;
  name: string;
  provider: ProviderId;
  vendor: string;
  /** One line shown under the name in the dropdown. */
  blurb: string;
  tier: "frontier" | "balanced" | "fast";
  contextLabel: string;
  /** Shown as a chip. Free models are the ones that work with no billing set up. */
  free?: boolean;
}

export const MODELS: ModelOption[] = [
  // --------------------------------------------------------------- OpenRouter

  {
    id: "xiaomi/mimo-v2.5-pro",
    name: "MiMo V2.5 Pro",
    provider: "openrouter",
    vendor: "Xiaomi",
    blurb:
      "The default. Strong on agentic and long-horizon work, and cheap at $0.43/$0.87 per 1M.",
    tier: "frontier",
    contextLabel: "1.05M context",
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Gemma 4 31B",
    provider: "openrouter",
    vendor: "Google",
    blurb: "Free tier. Fine for quick turns, but the shared pool rate-limits.",
    tier: "balanced",
    contextLabel: "262K context",
    free: true,
  },
  {
    id: "z-ai/glm-5.2:free",
    name: "GLM 5.2",
    provider: "openrouter",
    vendor: "Z.ai",
    blurb: "Free, strong at structured output. Good second opinion.",
    tier: "balanced",
    contextLabel: "256K context",
    free: true,
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Gemma 4 26B A4B",
    provider: "openrouter",
    vendor: "Google",
    blurb: "Free sparse variant. Faster than the 31B, slightly weaker.",
    tier: "fast",
    contextLabel: "262K context",
    free: true,
  },

  // ------------------------------------------------------------- AI Gateway

  {
    id: "anthropic/claude-opus-5",
    name: "Claude Opus 5",
    provider: "gateway",
    vendor: "Anthropic",
    blurb: "Deepest reasoning. Best for hard analysis and long tasks.",
    tier: "frontier",
    contextLabel: "1M context",
  },
  {
    id: "anthropic/claude-sonnet-5",
    name: "Claude Sonnet 5",
    provider: "gateway",
    vendor: "Anthropic",
    blurb: "Strong general model at a lower price than Opus.",
    tier: "balanced",
    contextLabel: "1M context",
  },
  {
    id: "anthropic/claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    provider: "gateway",
    vendor: "Anthropic",
    blurb: "Fastest and cheapest. Good for quick lookups and drafts.",
    tier: "fast",
    contextLabel: "200K context",
  },
];

/**
 * MiMo V2.5 Pro on OpenRouter. Paid, but cheap, and it does not sit on the
 * shared free pool that rate-limits under load — which matters for a default,
 * since a first-run 429 reads as "the example is broken".
 *
 * The free models stay in the picker for anyone who would rather not spend.
 */
export const DEFAULT_MODEL_ID = "xiaomi/mimo-v2.5-pro";

/** Where a request goes when the selected model's provider has no key. */
export const FALLBACK_MODEL_ID = DEFAULT_MODEL_ID;

export function findModel(id: string | null | undefined): ModelOption {
  return (
    MODELS.find((model) => model.id === id) ??
    MODELS.find((model) => model.id === DEFAULT_MODEL_ID) ??
    MODELS[0]!
  );
}

/** Reject anything not in the list — the model id arrives from the client. */
export function resolveModelId(id: unknown): string {
  return typeof id === "string" && MODELS.some((model) => model.id === id)
    ? id
    : DEFAULT_MODEL_ID;
}

/** The picker renders one group per provider, in MODELS order. */
export function groupByProvider(): Array<{
  provider: ProviderInfo;
  models: ModelOption[];
}> {
  const order: ProviderId[] = [];
  for (const model of MODELS) {
    if (!order.includes(model.provider)) order.push(model.provider);
  }
  return order.map((id) => ({
    provider: PROVIDERS[id],
    models: MODELS.filter((model) => model.provider === id),
  }));
}
