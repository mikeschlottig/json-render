# json-render — worklog

**Newest first. Append; never edit an older entry.** A contract says how to operate
this project. This says what state the work is in and what happens next — the one
thing a fresh agent cannot derive from the tree.

Append with:

```bash
uv run --no-project --with pydantic python /mnt/c/Dev/projectstd/projectstd.py log . -m "what changed"
```

## 2026-08-28 — Astro evaluation + astro-chat example

**What:** Indexed the repo into codebase-intel (`indexes/json-render/`, 1,542
files) — no index existed. Built `examples/astro-chat`: an Astro 7 app whose chat
UI is a json-render React island, with model selection, localStorage history,
export, streaming, a dependency-free markdown/highlighter, and a 22-component
catalog rendered by `/gallery`. Published the Astro integration evaluation as an
artifact.

**Why:** the question was whether json-render components can integrate into Astro
projects. They can, unchanged — the only Astro-specific step is adding the
renderer packages to `vite.ssr.noExternal`. The example exists so that claim is
backed by a build rather than a reading of the source.

**Next:** two things. (1) Nothing has streamed a live model response — no
`AI_GATEWAY_API_KEY` was available, so `streamText → pipeJsonRender →
useJsonRenderMessage` is typed and built but unobserved; run it with a key first.
(2) The evaluation's top recommendation is an Astro-native zero-JS renderer that
emits HTML for specs with no actions, state or visibility conditions — that is the
capability Astro can have and the other renderers structurally cannot.

## 2026-08-25 — standardised

**What:** `projectstd` generated `AGENTS.md`, `README.md` and `CLAUDE.md` here and
seeded this worklog.
**Why:** the directory had no contract, so an agent landing in it had to read the
tree to find out what it was.
**Next:** unknown. Whoever works here next writes the Purpose paragraph in
`README.md` and replaces this line with what actually needs doing.
