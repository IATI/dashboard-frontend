<script setup>
// The document language, kept in step with the switcher in the header. Without
// it a screen reader reads the page in whatever voice it defaults to, and
// nothing tells it the language changed when the switcher is used.
const { locale, locales } = useI18n({ useScope: 'global' })
const bcp47 = computed(() =>
  locales.value.find(l => l.code === locale.value)?.language ?? locale.value,
)
// The IATI favicon, copied from the design system package into public/ — the
// same files iatistandard.org serves, byte for byte, rather than hotlinked.
//
// Declared here rather than in nuxt.config because the hrefs need the base
// path: GitHub Pages serves this under /dashboard-frontend/, and a leading
// slash would look for the icons at the domain root.
const { app: { baseURL } } = useRuntimeConfig()
const icon = name => `${baseURL.replace(/\/$/, '')}/${name}`

useHead({
  htmlAttrs: { lang: bcp47 },
  link: [
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: icon('favicon-32x32.png') },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: icon('favicon-16x16.png') },
    // For anything that asks for /favicon.ico regardless of what is declared
    { rel: 'icon', type: 'image/x-icon', href: icon('favicon.ico') },
  ],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
@import 'iati-design-system/dist/css/iati.css';
@import 'bootstrap-vue-next/dist/bootstrap-vue-next.css';
@import './assets/css/iati-quality.scss';
</style>
