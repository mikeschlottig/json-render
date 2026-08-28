import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

// =============================================================================
// Shared prop fragments
// =============================================================================

const tone = z.enum(["neutral", "accent", "success", "warning", "danger"]);

const dataPoint = z.object({
  label: z.string(),
  value: z.number(),
});

// =============================================================================
// Catalog
//
// The vocabulary the model may use when it answers with a UI instead of (or
// alongside) prose. Kept deliberately small and general: these are the shapes
// that actually help in a conversation — comparisons, numbers, steps, tables —
// not a component library.
// =============================================================================

export const chatCatalog = defineCatalog(schema, {
  components: {
    // ---------------------------------------------------------------- layout

    Stack: {
      props: z.object({
        direction: z.enum(["vertical", "horizontal"]).nullable(),
        gap: z.enum(["none", "sm", "md", "lg"]).nullable(),
        align: z.enum(["start", "center", "end", "stretch"]).nullable(),
        wrap: z.boolean().nullable(),
      }),
      description:
        "Layout container. Use direction 'horizontal' for side-by-side content, otherwise omit.",
      example: { direction: "vertical", gap: "md" },
    },

    Grid: {
      props: z.object({
        columns: z.number().nullable(),
        gap: z.enum(["none", "sm", "md", "lg"]).nullable(),
      }),
      description:
        "Responsive grid. columns is the desktop count (1-4); it collapses on narrow screens. Ideal for a row of Metric cards.",
      example: { columns: 3, gap: "md" },
    },

    Card: {
      props: z.object({
        title: z.string().nullable(),
        subtitle: z.string().nullable(),
        tone: tone.nullable(),
      }),
      description:
        "Bordered container that groups related children under an optional title.",
      example: { title: "Deployment summary" },
    },

    Divider: {
      props: z.object({
        label: z.string().nullable(),
      }),
      description: "Horizontal rule, optionally with a centred label.",
      example: {},
    },

    // ------------------------------------------------------------------ text

    Heading: {
      props: z.object({
        content: z.string(),
        level: z.number().nullable(),
      }),
      description: "Section heading. level is 1-3, default 2.",
      example: { content: "Results", level: 2 },
    },

    Text: {
      props: z.object({
        content: z.string(),
        muted: z.boolean().nullable(),
        size: z.enum(["sm", "md", "lg"]).nullable(),
      }),
      description:
        "A paragraph. Supports inline `code`, **bold** and *italic* markdown.",
      example: { content: "Three of the five checks passed." },
    },

    Quote: {
      props: z.object({
        content: z.string(),
        cite: z.string().nullable(),
      }),
      description: "Pull quote or cited passage.",
      example: { content: "Ship early.", cite: "Engineering handbook" },
    },

    Code: {
      props: z.object({
        code: z.string(),
        language: z.string().nullable(),
        filename: z.string().nullable(),
      }),
      description:
        "Syntax-highlighted code block with a copy button. Prefer this over a fenced block when the code is the answer.",
      example: { code: "npm i astro", language: "bash" },
    },

    // ------------------------------------------------------------------ data

    Metric: {
      props: z.object({
        label: z.string(),
        value: z.string(),
        delta: z.string().nullable(),
        trend: z.enum(["up", "down", "flat"]).nullable(),
        hint: z.string().nullable(),
      }),
      description:
        "A single headline number with an optional change indicator. Put several inside a Grid.",
      example: {
        label: "p95 latency",
        value: "184ms",
        delta: "-12%",
        trend: "down",
      },
    },

    KeyValue: {
      props: z.object({
        items: z.array(z.object({ key: z.string(), value: z.string() })),
      }),
      description:
        "Definition list for attributes, config, or specs. Use when the data is name/value pairs rather than a table.",
      example: { items: [{ key: "Runtime", value: "Node 24" }] },
    },

    Table: {
      props: z.object({
        columns: z.array(z.string()),
        rows: z.array(z.array(z.string())),
        caption: z.string().nullable(),
        align: z.array(z.enum(["left", "right"])).nullable(),
      }),
      description:
        "Tabular comparison. Every row must have exactly as many cells as there are columns. align, if given, must match the column count.",
      example: {
        columns: ["Package", "Size"],
        rows: [["core", "14 kB"]],
      },
    },

    List: {
      props: z.object({
        items: z.array(z.string()),
        ordered: z.boolean().nullable(),
      }),
      description: "Bulleted or numbered list. Items support inline markdown.",
      example: { items: ["First", "Second"], ordered: true },
    },

    Steps: {
      props: z.object({
        items: z.array(
          z.object({
            title: z.string(),
            body: z.string().nullable(),
            status: z.enum(["done", "active", "todo"]).nullable(),
          }),
        ),
      }),
      description:
        "Vertical numbered timeline. Use for procedures and for reporting progress through a plan.",
      example: {
        items: [{ title: "Install", body: "pnpm install", status: "done" }],
      },
    },

    BarChart: {
      props: z.object({
        data: z.array(dataPoint),
        unit: z.string().nullable(),
        horizontal: z.boolean().nullable(),
      }),
      description:
        "Bar chart for comparing categories. Keep to 12 points or fewer; use horizontal when labels are long.",
      example: { data: [{ label: "Mon", value: 42 }] },
    },

    LineChart: {
      props: z.object({
        data: z.array(dataPoint),
        unit: z.string().nullable(),
        area: z.boolean().nullable(),
      }),
      description: "Line or area chart for a trend over an ordered sequence.",
      example: { data: [{ label: "Jan", value: 12 }], area: true },
    },

    Progress: {
      props: z.object({
        label: z.string().nullable(),
        value: z.number(),
        max: z.number().nullable(),
      }),
      description: "Progress bar. max defaults to 100.",
      example: { label: "Coverage", value: 78 },
    },

    // ------------------------------------------------------------- signalling

    Badge: {
      props: z.object({
        label: z.string(),
        tone: tone.nullable(),
      }),
      description: "Small inline status pill.",
      example: { label: "beta", tone: "accent" },
    },

    Alert: {
      props: z.object({
        title: z.string().nullable(),
        content: z.string(),
        tone: tone.nullable(),
      }),
      description:
        "Callout for a caveat, warning, or important note. Use sparingly.",
      example: {
        content: "This overwrites the existing file.",
        tone: "warning",
      },
    },

    // ----------------------------------------------------------- interactive

    Suggestions: {
      props: z.object({
        prompts: z.array(z.string()),
      }),
      description:
        "Row of follow-up question chips. Clicking one sends it as the next user message. End a UI answer with these when there is an obvious next question.",
      example: { prompts: ["Show me the config", "Why is it slow?"] },
    },

    Button: {
      props: z.object({
        label: z.string(),
        tone: tone.nullable(),
      }),
      description: "Action button. Bind onClick to one of the catalog actions.",
      example: { label: "Explain this" },
    },

    Link: {
      props: z.object({
        label: z.string(),
        href: z.string(),
      }),
      description: "External link, opens in a new tab.",
      example: { label: "Astro docs", href: "https://docs.astro.build" },
    },
  },

  actions: {
    ask: {
      params: z.object({
        prompt: z.string(),
      }),
      description:
        "Send `prompt` as the next user message in this conversation. This is how generated UI asks its own follow-up.",
    },

    copy: {
      params: z.object({
        text: z.string(),
      }),
      description: "Copy `text` to the clipboard.",
    },

    openUrl: {
      params: z.object({
        url: z.string(),
      }),
      description: "Open `url` in a new tab.",
    },
  },
});

export type ChatCatalog = typeof chatCatalog;
