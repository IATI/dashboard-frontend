<script setup>
// The document language, kept in step with the switcher in the header. Without
// it a screen reader reads the page in whatever voice it defaults to, and
// nothing tells it the language changed when the switcher is used.
const { locale, locales } = useI18n({ useScope: 'global' })
const bcp47 = computed(() =>
  locales.value.find(l => l.code === locale.value)?.language ?? locale.value,
)
useHead({ htmlAttrs: { lang: bcp47 } })
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
