import type { APIRoute } from "astro";
import { configuredProviders } from "../../lib/providers.server";

export const prerender = false;

/**
 * Which providers have keys.
 *
 * The picker calls this on mount so a model whose provider is unconfigured can
 * be shown as unavailable, instead of the user finding out by sending a message
 * and getting someone else's model back.
 *
 * It reports only which provider names are usable — never key values.
 */
export const GET: APIRoute = () =>
  new Response(JSON.stringify({ configured: configuredProviders() }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
