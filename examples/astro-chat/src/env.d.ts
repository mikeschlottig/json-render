/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly AI_GATEWAY_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
