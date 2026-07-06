export default defineNuxtConfig({
  css: [
    '~/assets/css/iati-quality.css',
    '~/assets/css/design-canvas.css',
  ],
  app: {
    head: {
      title: 'IATI Publishing Quality',
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700;800&family=Nunito+Sans:wght@400;600;700;800&display=swap',
        },
      ],
    },
  },
  components: {
    dirs: [{ path: '~/components', pathPrefix: false }],
  },
})
