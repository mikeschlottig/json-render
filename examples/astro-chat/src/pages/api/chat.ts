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
import { resolveModelId } from "../../lib/models";

export const prerender = false;

interface ChatRequest {
  messages: UIMessage[];
  model?: string;
}

function jsonError(status: number, error: string, message: string): Response {
  return new Response(JSON.stringify({ error, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  // Astro exposes server-only vars on import.meta.env; fall back to process.env
  // so the built standalone server picks the key up from the shell too.
  const apiKey =
    import.meta.env.AI_GATEWAY_API_KEY ?? process.env.AI_GATEWAY_API_KEY;

  if (!apiKey) {
    return jsonError(
      500,
      "Missing AI_GATEWAY_API_KEY",
      "Set AI_GATEWAY_API_KEY in .env to enable AI. See https://vercel.com/ai-gateway.",
    );
  }

  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return jsonError(400, "Bad request", "Body must be JSON.");
  }

  if (!Array.isArray(body.messages)) {
    return jsonError(400, "Bad request", "`messages` must be an array.");
  }

  const result = streamText({
    model: resolveModelId(body.model),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(body.messages),
    abortSignal: request.signal,
  });

  // pipeJsonRender lifts the spec stream out of the text channel and republishes
  // it as typed data parts, so the client gets prose and spec separately.
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.merge(pipeJsonRender(result.toUIMessageStream()));
    },
  });

  return createUIMessageStreamResponse({ stream });
};
