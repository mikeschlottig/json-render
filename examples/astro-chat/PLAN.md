# Plan — json-render Astro chat

Goal: an Astro 7 app whose chat UI is a json-render React island, at claude.ai
quality, that also serves as the proof-of-concept for the Astro integration
evaluation.

## Tasks

- [x] T1 Scaffold: package.json, astro.config.mjs, tsconfig, env.d.ts
- [x] T2 Design system: global.css tokens (light/dark), typography, layout
- [x] T3 Catalog: generative-UI components the model may emit
- [x] T4 Registry: React implementations of the catalog
- [x] T5 Server: `/api/chat` endpoint (AI Gateway, model routing, pipeJsonRender)
- [x] T6 Models: allowlist shared by client and server (`src/lib/models.ts`)
- [x] T7 Island: chat shell — sidebar, header, composer
- [x] T8 Island: model dropdown
- [x] T9 Island: conversation history (localStorage, rename, delete, search)
- [x] T10 Island: export (Markdown, JSON, plain text; copy or download)
- [x] T11 Island: markdown + code blocks (highlight, copy, soft wrap)
- [x] T12 Island: streaming affordances — stop, regenerate, edit, copy
- [x] T13 Astro page + layout wiring, theme (no-flash inline script)
- [x] T14 Install, type-check, build, runtime smoke test
- [x] T15 README + Astro evaluation

Added mid-plan: `/gallery` (T4b). It began as a way to verify the registry
without an API key and stayed because it is the only thing that catches a
catalog entry with no implementation.

## Verification run

| Check | Command | Result |
| --- | --- | --- |
| Types | `astro check --minimumSeverity error` | 26 files, 0 errors |
| Build | `astro build` | server + client built; client bundle 464 kB |
| Standalone server | `node ./dist/server/entry.mjs` | boots, `/` 200, unknown route 404 |
| Island wiring | GET `/` | `astro-island` marker, Chat CSS and client entry linked |
| Endpoint | POST `/api/chat` | structured 500 naming the missing key |
| Registry | GET `/gallery` | 22/22 catalog components rendered, 0 `jr-unknown` fallbacks |

## Not verified

No `AI_GATEWAY_API_KEY` was available in this environment, so no live model
response was ever streamed. Everything up to the model call is exercised; the
`streamText` → `pipeJsonRender` → `useJsonRenderMessage` path is typed and built
but not observed end to end. That is the first thing to run with a key.
