# astro-chat

A chat UI built with json-render, running as a single React island inside an
Astro 7 app. The assistant answers in prose, and when the answer is structured —
a comparison, a set of numbers, a sequence of steps — it streams a json-render
spec that the page renders as real components.

Two routes:

- `/` — the chat
- `/gallery` — every component in the catalog, rendered from one spec

## Running it

```bash
cp .env.example .env      # add OPENROUTER_API_KEY, AI_GATEWAY_API_KEY, or both
pnpm install
pnpm dev
```

Either key is enough. The default model is `xiaomi/mimo-v2.5-pro` on OpenRouter
— paid, but cheap at $0.43/$0.87 per 1M tokens. If you would rather not spend,
pick one of the `:free` models in the dropdown; they work, but they sit on a
shared pool that rate-limits under load.

The dev server runs under [portless](https://github.com/vercel-labs/portless) at
`astro-chat-demo.json-render.localhost:1355`. Install it globally first
(`npm i -g portless`).

For a production build:

```bash
pnpm build
pnpm start                # node ./dist/server/entry.mjs
```

## What it demonstrates

**json-render in Astro.** The renderer is framework-agnostic React; Astro treats
it as any other island. `astro.config.mjs` adds `@json-render/react` and
`@json-render/core` to `vite.ssr.noExternal` so Vite processes their
browser-targeted ESM instead of externalising it into the Node SSR bundle.

**Two hydration strategies, chosen per route.** `/` uses `client:only="react"` —
the chat's first render depends on `localStorage`, so there is no meaningful
server HTML to hydrate. `/gallery` uses `client:load`, so the markup is
server-rendered and readable before JavaScript arrives. Everything outside the
islands ships zero JS.

**Prose and UI in one stream.** The endpoint pipes the model's output through
`pipeJsonRender`, which lifts the spec stream out of the text channel and
republishes it as typed data parts. On the client, `useJsonRenderMessage`
splits each message back into `{ text, spec }`.

**Generated UI that can drive the conversation.** The catalog defines an `ask`
action. A `Suggestions` chip or a `Button` in a generated spec dispatches it,
and the chat sends that prompt as the next user message.

## Features

| Area | What's there |
| --- | --- |
| Providers | OpenRouter (OpenAI-compatible endpoint) and Vercel AI Gateway; each model declares which serves it |
| Models | Dropdown grouped by provider, over an allowlist in `src/lib/models.ts`; the server rejects anything not on it |
| Fallback | A model whose provider has no key is served by the free default instead of failing, and the UI says so |
| History | Conversations in `localStorage` — search, rename, delete, grouped by recency |
| Export | Markdown, JSON (lossless, keeps every spec), or plain text; copy or download |
| Code | Dependency-free highlighter for 10 languages, copy button, soft-wrap toggle |
| Streaming | Token-by-token render, stop, regenerate, edit-and-resend, follow-scroll that yields when you scroll up |
| Theme | Light/dark, applied inline before first paint so there is no flash |
| Keyboard | `/` focuses the composer, `Ctrl/Cmd+K` new chat, `Ctrl/Cmd+B` sidebar |

## Providers and fallback

Each entry in `src/lib/models.ts` declares a `provider`. AI Gateway takes the
bare `provider/model` string; OpenRouter is reached through
`@ai-sdk/openai-compatible` pointed at `https://openrouter.ai/api/v1`.

`src/lib/providers.server.ts` resolves a requested model to something runnable:

- If its provider has a key, use it.
- If not, serve the default (`xiaomi/mimo-v2.5-pro`) instead and report the
  substitution in the `x-served-model` and `x-fell-back-from` response headers.
  The chat surfaces that as a notice rather than letting a different model
  answer silently.
- If no provider has a key at all, return a 500 that names both variables.

`GET /api/providers` reports which providers are configured — never key values —
so the picker can show unavailable models greyed out instead of letting you
discover the problem by sending a message.

The `.server.ts` suffix is load-bearing: that module reads API keys, and Astro
will bundle anything an island imports.

**On free models.** The `:free` OpenRouter tiers run on a shared upstream pool
and return 429 fairly often. The endpoint unwraps the provider error so you get
OpenRouter's actual message ("temporarily rate-limited upstream, retry shortly")
rather than a generic failure. Retry, switch model, or add your own provider key
in OpenRouter's integrations settings.

## Layout

```
src/
  components/     Chat island and its parts (Composer, Sidebar, ModelPicker, …)
  render/
    catalog.ts    What the model may emit — Zod props per component
    registry.tsx  How each of those renders in React
    SpecRenderer  Providers + Renderer, one set per assistant message
  lib/
    models.ts     The picker allowlist, shared by client and server
    providers.server.ts  Key detection, provider construction, fallback
    system-prompt Voice rules + catalog.prompt(), so the two cannot drift
  pages/
    index.astro   The chat
    gallery.astro The catalog gallery
    api/chat.ts   streamText → pipeJsonRender → UI message stream
    api/providers.ts  Which providers have keys
```

## Adding a component

1. Add it to `components` in `src/render/catalog.ts` with a Zod props schema, a
   `description`, and an `example`. The description is what the model reads.
2. Implement it in `src/render/registry.tsx`.
3. Add it to `src/render/gallery-spec.ts`.

Step 3 is not optional busywork — `/gallery` is how you find out that a catalog
entry has no implementation, because the unimplemented one renders as the
`jr-unknown` fallback.

## Notes

The dependency-free markdown and syntax highlighting are deliberate: they keep
the island small and make the example readable end to end. A production app
would likely reach for `streamdown` and Shiki instead, as the Next.js examples
in this repo do.
