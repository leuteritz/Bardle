/// <reference types="vite/client" />

export {}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $formatNumber: (n: number) => string
  }
}
