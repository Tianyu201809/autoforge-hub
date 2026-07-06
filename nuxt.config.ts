// https://nuxt.com/docs/api/configuration/nuxt-config
const NUXT_ENV = process.env.NUXT_ENV?.trim().toLowerCase() || "development"

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/icon'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: NUXT_ENV === 'production'
        ? 'Autoforge Hub'
        : `Autoforge Hub (${NUXT_ENV})`,
      link: [
        { rel: 'icon', type: 'image/png', href: '/logo.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap'
        }
      ],
      meta: [
        { name: 'theme-color', content: '#08080c' }
      ]
    }
  },
  nitro: {
    rollupConfig: {
      plugins: [
        {
          name: 'resolve-ali-oss-js',
          resolveId(id: string, importer: string | undefined) {
            if (importer?.includes('ali-oss') && id.startsWith('.')) {
              // Force .js resolution for ali-oss internal imports
              return this.resolve(id + '.js', importer, { skipSelf: true })
            }
            return null
          },
        },
      ],
    },
  },
  runtimeConfig: {
    env: NUXT_ENV,
    oss: {
      accessKeyId: "",
      accessKeySecret: "",
      bucket: "",
      region: "oss-cn-hangzhou",
      endpoint: "",
    },
  },
})
