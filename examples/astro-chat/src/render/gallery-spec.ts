import type { Spec } from "@json-render/core";

/**
 * One spec that exercises every component in the catalog.
 *
 * It is what `/gallery` renders. Keeping it in the repo means the registry has
 * a page that fails visibly when a component is added to the catalog but never
 * implemented — and it doubles as the reference the prompt's examples describe.
 */
export const gallerySpec: Spec = {
  root: "page",
  elements: {
    page: {
      type: "Stack",
      props: { direction: "vertical", gap: "lg", align: null, wrap: null },
      children: [
        "intro",
        "metricsHeading",
        "metrics",
        "chartsCard",
        "dataHeading",
        "table",
        "kv",
        "stepsHeading",
        "steps",
        "progress",
        "textHeading",
        "list",
        "quote",
        "code",
        "signalsHeading",
        "badges",
        "alertWarning",
        "alertSuccess",
        "divider",
        "interactiveHeading",
        "buttonRow",
        "suggestions",
      ],
    },

    intro: {
      type: "Text",
      props: {
        content:
          "Every component in the catalog, rendered from a single spec. This page is **server-rendered** — the same registry runs in the chat transcript.",
        muted: null,
        size: null,
      },
    },

    metricsHeading: {
      type: "Heading",
      props: { content: "Metrics", level: 2 },
    },

    metrics: {
      type: "Grid",
      props: { columns: 3, gap: "md" },
      children: ["m1", "m2", "m3"],
    },
    m1: {
      type: "Metric",
      props: {
        label: "p95 latency",
        value: "184ms",
        delta: "-12%",
        trend: "down",
        hint: "vs. last deploy",
      },
    },
    m2: {
      type: "Metric",
      props: {
        label: "Weekly active",
        value: "12.4k",
        delta: "+8.1%",
        trend: "up",
        hint: null,
      },
    },
    m3: {
      type: "Metric",
      props: {
        label: "Error rate",
        value: "0.04%",
        delta: "flat",
        trend: "flat",
        hint: null,
      },
    },

    chartsCard: {
      type: "Card",
      props: {
        title: "Charts",
        subtitle: "Bar, line, and horizontal bars",
        tone: null,
      },
      children: ["bar", "line", "hbar"],
    },
    bar: {
      type: "BarChart",
      props: {
        unit: "ms",
        horizontal: null,
        data: [
          { label: "Mon", value: 210 },
          { label: "Tue", value: 184 },
          { label: "Wed", value: 236 },
          { label: "Thu", value: 172 },
          { label: "Fri", value: 149 },
          { label: "Sat", value: 96 },
          { label: "Sun", value: 88 },
        ],
      },
    },
    line: {
      type: "LineChart",
      props: {
        unit: "k",
        area: true,
        data: [
          { label: "Jan", value: 4.2 },
          { label: "Feb", value: 5.1 },
          { label: "Mar", value: 4.8 },
          { label: "Apr", value: 6.9 },
          { label: "May", value: 8.4 },
          { label: "Jun", value: 12.4 },
        ],
      },
    },
    hbar: {
      type: "BarChart",
      props: {
        unit: " kB",
        horizontal: true,
        data: [
          { label: "core", value: 14 },
          { label: "react", value: 21 },
          { label: "svelte", value: 18 },
          { label: "vue", value: 19 },
        ],
      },
    },

    dataHeading: { type: "Heading", props: { content: "Data", level: 2 } },

    table: {
      type: "Table",
      props: {
        caption: "Renderer packages, gzipped",
        columns: ["Package", "Framework", "Size"],
        align: ["left", "left", "right"],
        rows: [
          ["@json-render/react", "React 19", "21 kB"],
          ["@json-render/svelte", "Svelte 5", "18 kB"],
          ["@json-render/vue", "Vue 3", "19 kB"],
          ["@json-render/solid", "Solid", "16 kB"],
        ],
      },
    },

    kv: {
      type: "KeyValue",
      props: {
        items: [
          { key: "Runtime", value: "Node 24" },
          { key: "Adapter", value: "`@astrojs/node` (standalone)" },
          { key: "Hydration", value: "One island, `client:only`" },
        ],
      },
    },

    stepsHeading: { type: "Heading", props: { content: "Process", level: 2 } },

    steps: {
      type: "Steps",
      props: {
        items: [
          {
            title: "Define the catalog",
            body: "Zod props per component.",
            status: "done",
          },
          {
            title: "Register components",
            body: "One React function each.",
            status: "done",
          },
          {
            title: "Stream a spec",
            body: "The model emits JSONL patches.",
            status: "active",
          },
          { title: "Render", body: null, status: "todo" },
        ],
      },
    },

    progress: {
      type: "Progress",
      props: { label: "Catalog coverage", value: 78, max: 100 },
    },

    textHeading: { type: "Heading", props: { content: "Text", level: 2 } },

    list: {
      type: "List",
      props: {
        ordered: true,
        items: [
          "Inline `code` renders inside list items",
          "So does **bold** and *italic*",
          "And [links](https://json-render.dev)",
        ],
      },
    },

    quote: {
      type: "Quote",
      props: {
        content: "JSON becomes real things.",
        cite: "json-render",
      },
    },

    code: {
      type: "Code",
      props: {
        language: "tsx",
        filename: "src/pages/index.astro",
        code: `---
import { Chat } from "../components/Chat";
---

<Chat client:only="react" />`,
      },
    },

    signalsHeading: {
      type: "Heading",
      props: { content: "Signals", level: 2 },
    },

    badges: {
      type: "Stack",
      props: {
        direction: "horizontal",
        gap: "sm",
        align: "center",
        wrap: true,
      },
      children: ["b1", "b2", "b3", "b4"],
    },
    b1: { type: "Badge", props: { label: "neutral", tone: null } },
    b2: { type: "Badge", props: { label: "accent", tone: "accent" } },
    b3: { type: "Badge", props: { label: "success", tone: "success" } },
    b4: { type: "Badge", props: { label: "danger", tone: "danger" } },

    alertWarning: {
      type: "Alert",
      props: {
        title: "Heads up",
        content:
          "Charts take at most 12 points before they stop being readable.",
        tone: "warning",
      },
    },
    alertSuccess: {
      type: "Alert",
      props: { title: null, content: "Type check passed.", tone: "success" },
    },

    divider: { type: "Divider", props: { label: "interactive" } },

    interactiveHeading: {
      type: "Heading",
      props: { content: "Actions", level: 2 },
    },

    buttonRow: {
      type: "Stack",
      props: {
        direction: "horizontal",
        gap: "sm",
        align: "center",
        wrap: true,
      },
      children: ["askBtn", "copyBtn", "docsLink"],
    },
    askBtn: {
      type: "Button",
      props: { label: "Ask a follow-up", tone: "accent" },
      on: {
        click: {
          action: "ask",
          params: { prompt: "Explain how the spec stream is compiled." },
        },
      },
    },
    copyBtn: {
      type: "Button",
      props: { label: "Copy install command", tone: null },
      on: {
        click: {
          action: "copy",
          params: { text: "pnpm add @json-render/core @json-render/react" },
        },
      },
    },
    docsLink: {
      type: "Link",
      props: { label: "json-render.dev", href: "https://json-render.dev" },
    },

    suggestions: {
      type: "Suggestions",
      props: {
        prompts: [
          "How do actions reach the chat?",
          "Show me the catalog definition",
          "What does pipeJsonRender do?",
        ],
      },
    },
  },
};
