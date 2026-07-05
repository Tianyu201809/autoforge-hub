// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/icon'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'Autoforge Hub',
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
  runtimeConfig: {
    oss: {
      accessKeyId: "",
      accessKeySecret: "",
      bucket: "",
      region: "oss-cn-hangzhou",
      endpoint: "",
    },
  },
})