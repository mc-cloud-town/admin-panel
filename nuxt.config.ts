// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: [
    '@nuxt/ui',
    '@nuxt/image',
    '@nuxt/eslint',
    '@nuxtjs/i18n',
    '@vueuse/nuxt',
  ],
  runtimeConfig: {
    databaseURL: '',
  },
  nitro: {
    experimental: { websocket: true },
  },
  i18n: {
    vueI18n: '~/i18n/i18n.config.ts',
    defaultLocale: 'zh-TW',
    locales: [
      { code: 'zh-TW', name: '繁體中文' },
      { code: 'zh-CN', name: '简体中文' },
      { code: 'en', name: 'English' },
    ],
  },
  logLevel: 'verbose',
  vite: {
    build: { minify: 'terser' },
    server: {
      allowedHosts: process.env.ALLOW_HOSTS?.split(',') || [],
    },
  },
  $production: {
    build: { transpile: ['zod'] },
  },
});
