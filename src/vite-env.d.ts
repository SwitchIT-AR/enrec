/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GTAG_ID: string
  readonly VITE_GTAG_CONVERSION_LABEL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
