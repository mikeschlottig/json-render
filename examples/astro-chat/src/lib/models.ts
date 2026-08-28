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
    id: "google/gemma-4-31b-it:free",
    name: "Gemma 4 31B",
    provider: "openrouter",
    vendor: "Google",
    blurb:
      "Free and capable. The default, and the one that works with no billing.",
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
 * Gemma on OpenRouter: free, so the example runs for anyone who has only an
 * OpenRouter key, which is the common case.
 */
export const DEFAULT_MODEL_ID = "google/gemma-4-31b-it:free";

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
