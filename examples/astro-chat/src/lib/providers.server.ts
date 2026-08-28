import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

import {
  FALLBACK_MODEL_ID,
  MODELS,
  PROVIDERS,
  findModel,
  type ModelOption,
  type ProviderId,
} from "./models";

/**
 * Server-only provider resolution.
 *
 * Never import this from the island — it reads API keys. The `.server` suffix
 * is the reminder, since Astro will happily bundle anything an island imports.
 */

function env(name: string): string | undefined {
  // Astro exposes server-only vars on import.meta.env; process.env is the
  // fallback so the built standalone server picks them up from the shell.
  return (
    (import.meta.env as Record<string, string | undefined>)[name] ??
    process.env[name]
  );
}

export function hasKey(provider: ProviderId): boolean {
  const value = env(PROVIDERS[provider].envVar);
  return typeof value === "string" && value.length > 0;
}

export function configuredProviders(): ProviderId[] {
  return (Object.keys(PROVIDERS) as ProviderId[]).filter(hasKey);
}

/**
 * OpenRouter speaks the OpenAI chat-completions protocol, so the first-party
 * openai-compatible provider covers it without a third-party package. The
 * referer and title headers are OpenRouter's attribution convention; they are
 * optional but show the app by name in the dashboard.
 */
function openrouter(modelId: string): LanguageModel {
  return createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: env("OPENROUTER_API_KEY"),
    headers: {
      "HTTP-Referer": "https://json-render.dev",
      "X-Title": "json-render astro-chat",
    },
  }).chatModel(modelId);
}

export interface ResolvedModel {
  /** What to hand to `streamText`. */
  model: LanguageModel;
  /** The model actually serving the request. */
  served: ModelOption;
  /** Set when `served` is not what the client asked for. */
  fellBackFrom?: ModelOption;
}

/**
 * Resolve a requested model to something runnable.
 *
 * If the requested model's provider has no key but another provider does, the
 * request is served by the fallback model rather than failing — an example that
 * degrades to a free model is more useful than one that returns 500 because the
 * wrong key is missing. The substitution is reported back so the UI can say so
 * rather than silently answering as a different model.
 *
 * Returns null only when no provider is configured at all.
 */
export function resolveModel(requestedId: string): ResolvedModel | null {
  const requested = findModel(requestedId);

  if (hasKey(requested.provider)) {
    return { model: build(requested), served: requested };
  }

  const fallback = findModel(FALLBACK_MODEL_ID);
  if (fallback.id !== requested.id && hasKey(fallback.provider)) {
    return {
      model: build(fallback),
      served: fallback,
      fellBackFrom: requested,
    };
  }

  // Last resort: any model whose provider is configured.
  const alternative = MODELS.find(
    (model) => model.id !== requested.id && hasKey(model.provider),
  );
  if (alternative) {
    return {
      model: build(alternative),
      served: alternative,
      fellBackFrom: requested,
    };
  }

  return null;
}

function build(model: ModelOption): LanguageModel {
  // AI Gateway accepts the bare `provider/model` string; the SDK resolves it
  // from AI_GATEWAY_API_KEY without a provider constructor.
  return model.provider === "gateway" ? model.id : openrouter(model.id);
}
