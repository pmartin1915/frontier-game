/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NARRATOR_PROVIDER: 'anthropic' | 'moonshot' | 'gemini';
  readonly VITE_APP_DOMAIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
