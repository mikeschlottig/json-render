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
cp .env.example .env      # add your AI_GATEWAY_API_KEY
pnpm install
pnpm dev
```

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
| Models | Dropdown over an allowlist in `src/lib/models.ts`; the server rejects anything not on it |
| History | Conversations in `localStorage` — search, rename, delete, grouped by recency |
| Export | Markdown, JSON (lossless, keeps every spec), or plain text; copy or download |
| Code | Dependency-free highlighter for 10 languages, copy button, soft-wrap toggle |
| Streaming | Token-by-token render, stop, regenerate, edit-and-resend, follow-scroll that yields when you scroll up |
| Theme | Light/dark, applied inline before first paint so there is no flash |
| Keyboard | `/` focuses the composer, `Ctrl/Cmd+K` new chat, `Ctrl/Cmd+B` sidebar |

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
    system-prompt Voice rules + catalog.prompt(), so the two cannot drift
  pages/
    index.astro   The chat
    gallery.astro The catalog gallery
    api/chat.ts   streamText → pipeJsonRender → UI message stream
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
