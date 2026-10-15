<script setup>
/**
 * The banner, header, page and footer.
 *
 * Extracted from the layout only so the layout can render it in two places —
 * directly for a public route, and inside the access gate's ClientOnly for a
 * guarded one — without the markup being written twice and drifting.
 */
defineProps({ active: { type: String, default: '' } })
const banner = defineModel('banner', { type: Boolean, default: true })

/**
 * The provisional-data notice is off unless asked for; see showDevBanner in
 * nuxt.config.ts for how to turn it back on. The dismiss state above still
 * applies when it is shown.
 */
const { public: { showDevBanner } } = useRuntimeConfig()
</script>

<template>
  <div>
    <BAlert
      v-if="showDevBanner"
      v-model="banner"
      variant="primary"
      dismissible
      style="margin: 0; border-radius: 0; border-left: none; border-right: none; border-top: none"
    >
      <strong>Development version.</strong>
      This site is a development version for the new front-end of the IATI Data Quality Dashboard.
      Data may be incomplete, provisional, or include fictional placeholder text.
      Please do not rely on or cite this data during this phase.
    </BAlert>
    <Header :active="active" />
    <slot />
    <Footer />
  </div>
</template>
