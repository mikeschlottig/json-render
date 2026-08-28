# AGENTS.md

Instructions for AI coding agents working with this codebase.

## Package Management

**Always check the latest version before installing a package.**

Before adding or updating any dependency, verify the current latest version on npm:

```bash
npm view <package-name> version
```

Or check multiple packages at once:

```bash
npm view ai version
npm view @ai-sdk/provider-utils version
npm view zod version
```

This ensures we don't install outdated versions that may have incompatible types or missing features.

## Code Style

- Do not use emojis in code or UI
- Use shadcn CLI to add shadcn/ui components: `pnpm dlx shadcn@latest add <component>`
- **Web app docs (`apps/web/`):** Never use Markdown table syntax (`| col | col |`). Always use HTML `<table>` with `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`. Markdown tables do not render correctly in the web app. Inside HTML table cells, curly braces must be escaped as JSX expressions (e.g. `<code>{'{ "$state": "/path" }'}</code>`) because MDX parses `{` as a JSX expression boundary.

## AI SDK / AI Gateway

When using the Vercel AI SDK (`ai` package) with AI Gateway, pass the model as a plain string identifier -- do not import a provider constructor:

```ts
import { streamText } from "ai";

const result = streamText({
  model: "anthropic/claude-haiku-4.5",
  prompt: "...",
});
```

This requires `AI_GATEWAY_API_KEY` to be set in the environment. See `tests/e2e/` for examples.

## Dev Servers

All apps and examples with dev servers use [portless](https://github.com/vercel-labs/portless) to avoid hardcoded ports. Portless assigns random ports and exposes each app via `.localhost` URLs.

Naming convention:
- Main web app: `json-render` → `json-render.localhost:1355`
- Examples: `[name]-demo.json-render` → `[name]-demo.json-render.localhost:1355`

When adding a new example that runs a dev server, wrap its `dev` script with `portless <name>`:

```json
{
  "scripts": {
    "dev": "portless my-example-demo.json-render next dev --turbopack"
  }
}
```

Do **not** add `--port` flags -- portless handles port assignment automatically. Do **not** add portless as a project dependency; it must be installed globally.

## Workflow

- Run `pnpm type-check` after each turn to ensure type safety
- When making user-facing changes (new packages, API changes, new features, renamed exports, changed behavior), update the relevant documentation:
  - Package `README.md` files in `packages/*/README.md`
  - Root `README.md` (if packages table, install commands, or examples are affected)
  - Web app docs in `apps/web/` (if guides, API references, or examples need updating)
  - Skills in `skills/*/SKILL.md` (if the package has a corresponding skill)
  - `AGENTS.md` (if workflow or conventions change)

## Releasing

Releases are manual, single-PR affairs. The maintainer controls the changelog voice and format.

All public `@json-render/*` packages share the same version. The canonical version lives in `packages/core/package.json`.

### Preparing a release

When asked to prepare a release (e.g. "prepare v0.17.0"):

1. Create a branch (e.g. `prepare-v0.17.0`)
2. Bump the version in `packages/core/package.json`
3. Run `pnpm run version:sync` to update all other `@json-render/*` packages
4. Write the changelog entry in `CHANGELOG.md`, wrapped in `<!-- release:start -->` and `<!-- release:end -->` markers (move the markers from the previous entry to the new one)
5. **Fill documentation gaps** — every public package should have:
   - A row in the root `README.md` packages table
   - A renderer section in the root `README.md` (if it's a renderer)
   - An API reference page at `apps/web/app/(main)/docs/api/<name>/page.mdx`
   - An entry in `apps/web/lib/page-titles.ts` and `apps/web/lib/docs-navigation.ts`
   - An entry in the docs-chat system prompt (`apps/web/app/api/docs-chat/route.ts`)
   - A skill at `skills/<name>/SKILL.md`
   - A `packages/<name>/README.md`
6. **Run `pnpm type-check`** after all changes to verify nothing is broken
7. Open a PR and merge to `main`

CI compares the `@json-render/core` version to what's on npm. If it differs, it builds, publishes all public packages, and creates the GitHub release automatically. The release body is extracted from the content between the markers.

### Scripts

- `pnpm run version:sync` — sync all `@json-render/*` package versions to match `@json-render/core`
- `pnpm run version:check` — verify all versions are in sync (runs in CI)
- `pnpm run ci:publish` — build all packages and publish to npm (CI only)

<!-- opensrc:start -->

## Source Code Reference

Source code for dependencies is available in `opensrc/` for deeper understanding of implementation details.

See `opensrc/sources.json` for the list of available packages and their versions.

Use this source code when you need to understand how a package works internally, not just its types/interface.

### Fetching Additional Source Code

To fetch source code for a package or repository you need to understand, run:

```bash
npx opensrc <package>           # npm package (e.g., npx opensrc zod)
npx opensrc pypi:<package>      # Python package (e.g., npx opensrc pypi:requests)
npx opensrc crates:<package>    # Rust crate (e.g., npx opensrc crates:serde)
npx opensrc <owner>/<repo>      # GitHub repo (e.g., npx opensrc vercel/ai)
```

<!-- opensrc:end -->

## Where the intel lives

<!-- projectstd:begin id=pointer v=1 -->
**Never grep to find context. Follow pointer → index → query.**

| store | where | what it answers |
|---|---|---|
| **CONTENT** | `/home/mikes/corpusidx` | words — docs, transcripts, pages |
| **CODE** | `/home/mikes/codebase-intel-toolkit` | structure — symbols, files, deps |
| **CONDUCT** | `/home/mikes/session-audit` | what agents did — findings, lessons |
| **WORK** | `/home/mikes/roadmap` | planned, in progress, done |
| **LAYOUT** | `/home/mikes/projectstd` | the shape every project root must have |

**What is next here:** [`WORKLOG.md`](WORKLOG.md) — 1 entry, newest first. Append with `uv run --no-project --with pydantic python /mnt/c/Dev/projectstd/projectstd.py log . -m "what changed"` when you finish work here.
<!-- projectstd:end id=pointer -->

## CLI toolkit

<!-- projectstd:begin id=toolkit v=1 -->
| when you need | run |
|---|---|
| What is in the corpus? | `uv run --project /home/mikes/corpusidx corpusidx query search "<question>"` |
| Where does this symbol live? | `uv run --project /home/mikes/codebase-intel-toolkit intel show <symbol> --body` |
| How is this codebase laid out? | `uv run --project /home/mikes/codebase-intel-toolkit intel map <dir>` |
| What went wrong in past sessions? | `uv run --project /home/mikes/session-audit sessaudit query findings --rule <RULE>` |
| What should I work on? | `uv run --project /home/mikes/roadmap rmap next` |
| Is this project compliant? | `uv run --no-project --with pydantic python /mnt/c/Dev/projectstd/projectstd.py check <dir>` |

**Python runs through `uv`, never a bare interpreter.** `uv run --project <dir>` for a project with a `pyproject.toml`; `uv run --no-project --python 3.13 python <file>` for a loose script. `python3` and bare `python` hit the Microsoft Store stub and print an advertisement instead of running.

**Where output goes:** a tool never writes its index into the tree it indexed. Store output stays in the store.
<!-- projectstd:end id=toolkit -->

## Layout

<!-- projectstd:begin id=layout v=1 -->
```
/home/mikes/json-render  (tool, 1,604 files, 8.8 MB)
  apps/
  examples/
  packages/
  scripts/   one-off and operational scripts
  skills/
  tests/     tests
```
<!-- projectstd:end id=layout -->

## Run and verify

<!-- projectstd:begin id=run v=1 -->
Run it:

- dev — `cd /home/mikes/json-render && npm run dev`
- build — `cd /home/mikes/json-render && npm run build`

Verify it:

- test — `cd /home/mikes/json-render && npm run test`
- lint — `cd /home/mikes/json-render && npm run lint`
<!-- projectstd:end id=run -->

## Output locations

<!-- projectstd:begin id=output v=1 -->
_This project writes no artifacts outside itself._
<!-- projectstd:end id=output -->

## Trust boundary

<!-- projectstd:begin id=trust v=1 -->
_No trust boundary declared. If this project infers anything, say which fields are measured and which are guessed — an agent that cannot tell will either trust everything or nothing._
<!-- projectstd:end id=trust -->

## Cost table

<!-- projectstd:begin id=cost v=1 -->
_No cost table declared._
<!-- projectstd:end id=cost -->

## Known issues

<!-- projectstd:begin id=known v=1 -->
- Seeded automatically on 2026-08-25. Nothing below the generated blocks has been written by a human yet — treat the prose as absent, not as a claim.
<!-- projectstd:end id=known -->
