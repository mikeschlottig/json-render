/**
 * The models offered in the picker.
 *
 * Ids are AI Gateway identifiers (`provider/model`), so adding a model here is
 * the only change needed — the server passes the string straight through to
 * `streamText`. Shared by the island and the endpoint so the allowlist that
 * the server enforces is the same list the UI renders.
 */

export interface ModelOption {
  id: string;
  name: string;
  vendor: string;
  /** One line shown under the name in the dropdown. */
  blurb: string;
  /** Rough positioning, rendered as a chip. */
  tier: "frontier" | "balanced" | "fast";
  contextLabel: string;
}

export const MODELS: ModelOption[] = [
  {
    id: "anthropic/claude-opus-5",
    name: "Claude Opus 5",
    vendor: "Anthropic",
    blurb: "Deepest reasoning. Best for hard analysis and long tasks.",
    tier: "frontier",
    contextLabel: "1M context",
  },
  {
    id: "anthropic/claude-sonnet-5",
    name: "Claude Sonnet 5",
    vendor: "Anthropic",
    blurb: "Strong general model at a lower price than Opus.",
    tier: "balanced",
    contextLabel: "1M context",
  },
  {
    id: "anthropic/claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    vendor: "Anthropic",
    blurb: "Fastest and cheapest. Good for quick lookups and drafts.",
    tier: "fast",
    contextLabel: "200K context",
  },
];

export const DEFAULT_MODEL_ID = MODELS[0]!.id;

export function findModel(id: string | null | undefined): ModelOption {
  return MODELS.find((model) => model.id === id) ?? MODELS[0]!;
}

/** Reject anything not in the list — the model id arrives from the client. */
export function resolveModelId(id: unknown): string {
  return typeof id === "string" && MODELS.some((model) => model.id === id)
    ? id
    : DEFAULT_MODEL_ID;
}
