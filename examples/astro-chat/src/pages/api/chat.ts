import type { APIRoute } from "astro";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { pipeJsonRender } from "@json-render/core";

import { SYSTEM_PROMPT } from "../../lib/system-prompt";
import { PROVIDERS, resolveModelId } from "../../lib/models";
import { configuredProviders, resolveModel } from "../../lib/providers.server";

export const prerender = false;

interface ChatRequest {
  messages: UIMessage[];
  model?: string;
}

/**
 * Turn a provider error into one line worth showing.
 *
 * OpenRouter wraps the upstream provider's error in a JSON body; the useful
 * part is `error.metadata.raw`, which carries the actual remedy ("rate-limited
 * upstream, retry shortly"). Without digging that out the user sees a generic
 * failure and has no idea the fix is to wait or switch model.
 */
interface ProviderError {
  message?: string;
  statusCode?: number;
  responseBody?: string;
  /** AI_RetryError wraps the real failure; the last attempt is the useful one. */
  lastError?: unknown;
  errors?: unknown[];
  cause?: unknown;
}

/** Walk retry/cause wrappers down to the error that carries a response body. */
function unwrap(error: unknown, depth = 0): ProviderError {
  const current = (error ?? {}) as ProviderError;
  if (depth > 5 || typeof current.responseBody === "string") return current;

  const inner =
    current.lastError ??
    (Array.isArray(current.errors)
      ? current.errors[current.errors.length - 1]
      : undefined) ??
    current.cause;

  return inner ? unwrap(inner, depth + 1) : current;
}

function describeError(error: unknown): string {
  const anyError = unwrap(error);
  const body = anyError?.responseBody;
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body) as {
        error?: { message?: string; metadata?: { raw?: string } };
      };
      const raw = parsed.error?.metadata?.raw;
      if (raw) return raw;
      if (parsed.error?.message) return parsed.error.message;
    } catch {
      /* fall through to the generic message */
    }
  }

  if (anyError?.statusCode === 429) {
    return "The provider is rate-limiting this model. Retry shortly, or pick another model.";
  }

  return anyError?.message ?? "The model request failed.";
}

function jsonError(status: number, error: string, message: string): Response {
  return new Response(JSON.stringify({ error, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return jsonError(400, "Bad request", "Body must be JSON.");
  }

  if (!Array.isArray(body.messages)) {
    return jsonError(400, "Bad request", "`messages` must be an array.");
  }

  const resolved = resolveModel(resolveModelId(body.model));

  if (!resolved) {
    const names = Object.values(PROVIDERS)
      .map((provider) => provider.envVar)
      .join(" or ");
    return jsonError(
      500,
      "No provider configured",
      `Set ${names} in .env to enable AI. OpenRouter has a free tier: https://openrouter.ai/keys`,
    );
  }

  const result = streamText({
    model: resolved.model,
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(body.messages),
    abortSignal: request.signal,
  });

  // pipeJsonRender lifts the spec stream out of the text channel and republishes
  // it as typed data parts, so the client gets prose and spec separately.
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // onError belongs on toUIMessageStream, not on createUIMessageStream:
      // the failure happens inside the merged stream and is already converted
      // to an error part before the outer stream would ever see it. The default
      // conversion emits "An error occurred.", which is useless for the failure
      // that actually happens here — a free model on a shared upstream pool
      // returning 429.
      writer.merge(
        pipeJsonRender(result.toUIMessageStream({ onError: describeError })),
      );
    },
    onError: describeError,
  });

  const response = createUIMessageStreamResponse({ stream });

  // Tell the client which model actually served this turn. The UI surfaces a
  // substitution rather than letting a different model answer silently.
  response.headers.set("x-served-model", resolved.served.id);
  if (resolved.fellBackFrom) {
    response.headers.set("x-fell-back-from", resolved.fellBackFrom.id);
  }
  response.headers.set(
    "x-providers",
    configuredProviders().join(",") || "none",
  );

  return response;
};
