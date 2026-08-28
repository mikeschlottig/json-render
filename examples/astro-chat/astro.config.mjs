// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";

// The chat island is interactive and the /api routes stream, so the whole app
// is rendered on demand. Static marketing pages could opt back in per-route
// with `export const prerender = true`.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
  vite: {
    ssr: {
      noExternal: [
        // These ship browser-targeted ESM; let Vite process them rather than
        // externalising them into the Node SSR bundle.
        "@json-render/react",
        "@json-render/core",
        // Bundled so `mode: "standalone"` is actually standalone. Left
        // external, `import "cookie"` is resolved by Node at runtime from
        // whatever node_modules happens to be above dist/ — which can be an
        // older major outside the workspace, and Astro 7 needs cookie v2's
        // named exports.
        "cookie",
      ],
    },
  },
});
